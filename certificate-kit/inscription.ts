"use client";

import { WalletClient, LockingScript, P2PKH, PublicKey, Utils } from "@bsv/sdk";
import {
  CertificateMetadataV2,
  CERT_SCHEMA_ID_V2,
  CERT_PROTOCOL_ID,
  CERT_KEY_ID,
  TemplateRef,
  canonicalJson
} from "./schema";
import { sha256Hex } from "./renderer";
import type { CertificateTemplate, TemplateData } from "./template";

const OP_FALSE = 0x00;
const OP_IF = 0x63;
const OP_ENDIF = 0x68;
const OP_1 = 0x51;
const OP_RETURN = 0x6a;

export async function buildSignedMetadataV2(
  client: WalletClient,
  template: CertificateTemplate,
  fields: TemplateData,
  imageSha256: string
): Promise<CertificateMetadataV2> {
  const { publicKey: issuerIdentityKey } = await client.getPublicKey({ identityKey: true });
  const { publicKey: issuerPubKey } = await client.getPublicKey({
    protocolID: CERT_PROTOCOL_ID,
    keyID: CERT_KEY_ID,
    counterparty: "anyone"
  });
  const templateRef: TemplateRef = {
    id: template.id,
    name: template.name,
    ...(template.publishedTxid ? { txid: template.publishedTxid } : {})
  };
  const base = {
    v: 2 as const,
    schema: CERT_SCHEMA_ID_V2,
    template: templateRef,
    fields,
    issuedAt: new Date().toISOString(),
    issuerIdentityKey,
    issuerPubKey,
    imageSha256
  };
  const canonical = canonicalJson(base);
  const sigResult = await client.createSignature({
    data: Utils.toArray(canonical, "utf8"),
    protocolID: CERT_PROTOCOL_ID,
    keyID: CERT_KEY_ID,
    counterparty: "anyone"
  });
  return { ...base, signature: Utils.toHex(sigResult.signature) };
}

function buildImageInscriptionScript(
  address: string,
  contentType: string,
  imageBytes: Uint8Array
): LockingScript {
  const p2pkh = new P2PKH().lock(address);
  const script = new LockingScript([...p2pkh.chunks]);
  script.writeOpCode(OP_FALSE);
  script.writeOpCode(OP_IF);
  script.writeBin(Utils.toArray("ord", "utf8"));
  script.writeOpCode(OP_1);
  script.writeBin(Utils.toArray(contentType, "utf8"));
  script.writeOpCode(OP_FALSE);
  script.writeBin(Array.from(imageBytes));
  script.writeOpCode(OP_ENDIF);
  return script;
}

function buildOpReturnScript(payload: string): LockingScript {
  const script = new LockingScript();
  script.writeOpCode(OP_FALSE);
  script.writeOpCode(OP_RETURN);
  script.writeBin(Utils.toArray(payload, "utf8"));
  return script;
}

export async function inscribeCertificate(
  client: WalletClient,
  template: CertificateTemplate,
  fields: TemplateData,
  imageBytes: Uint8Array,
  opts?: { basket?: string; contentType?: string; description?: string }
): Promise<{ txid: string; imageSha256: string; metadata: CertificateMetadataV2 }> {
  const { publicKey } = await client.getPublicKey({ identityKey: true });
  const address = PublicKey.fromString(publicKey).toAddress();

  const contentType = opts?.contentType ?? "image/svg+xml";
  const imageSha256 = await sha256Hex(imageBytes);
  const metadata = await buildSignedMetadataV2(client, template, fields, imageSha256);

  const imageScript = buildImageInscriptionScript(address, contentType, imageBytes);
  const metadataScript = buildOpReturnScript(JSON.stringify(metadata));

  const recipientLabel = fields.recipient || fields.name || template.name;
  const description = opts?.description ?? `Certificate: ${recipientLabel}`.slice(0, 128);

  const result = await client.createAction({
    description,
    outputs: [
      {
        satoshis: 1,
        lockingScript: imageScript.toHex(),
        outputDescription: "Certificate image inscription",
        basket: opts?.basket ?? "certificate-poc-issued",
        customInstructions: JSON.stringify({
          type: "cert-image",
          schema: CERT_SCHEMA_ID_V2,
          templateId: template.id,
          contentType,
          imageSha256
        })
      },
      {
        satoshis: 0,
        lockingScript: metadataScript.toHex(),
        outputDescription: "Certificate metadata"
      }
    ],
    labels: ["certificate", template.id]
  });

  if (!result.txid) throw new Error("Wallet did not return a txid (action may still be pending approval)");
  return { txid: result.txid, imageSha256, metadata };
}
