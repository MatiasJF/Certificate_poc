"use client";

import { createWallet } from "@bsv/simple/browser";
import { VerifiableCertificate, WalletClient } from "@bsv/sdk";
import type { CertificateTemplate, TemplateData } from "./template";

type SimpleWallet = Awaited<ReturnType<typeof createWallet>>;

let cached: SimpleWallet | null = null;

export async function getSimpleWallet(): Promise<SimpleWallet> {
  if (!cached) cached = await createWallet({ didProxyUrl: "/api/resolve-did" });
  return cached;
}

export type AcquiredVC = {
  serialNumber?: string;
  type?: string;
  certifier?: string;
  subject?: string;
  fields?: Record<string, string>;
  [k: string]: unknown;
};

export const CERT_VC_SCHEMA_ID = "certificate/v2";

export type IssuerInfo = {
  did?: string;
  certifierPublicKey: string;
  certificateType: string;
  schemas: Array<{ id: string; name?: string; certificateTypeBase64: string }>;
};

export type AcquireArgs = {
  template: CertificateTemplate;
  data: TemplateData;
  txid: string;
  imageSha256: string;
  issuedAt: string;
};

export async function acquireCertificateVC(
  serverUrl: string,
  args: AcquireArgs
): Promise<AcquiredVC> {
  const wallet = await getSimpleWallet();
  const { template, data, txid, imageSha256, issuedAt } = args;
  const fields: Record<string, string> = {
    templateId: template.id,
    templateName: template.name,
    certificateTxid: txid,
    imageSha256,
    recipient: data.recipient ?? data.name ?? "",
    issuer: data.issuer ?? "",
    issuedAt,
    fieldsJson: JSON.stringify(data)
  };
  const vc = await (wallet as unknown as {
    acquireCredential: (args: {
      serverUrl: string;
      schemaId: string;
      fields: Record<string, string>;
      replaceExisting?: boolean;
    }) => Promise<AcquiredVC>;
  }).acquireCredential({
    serverUrl,
    schemaId: CERT_VC_SCHEMA_ID,
    fields,
    replaceExisting: false
  });
  return vc;
}

export async function getIssuerInfo(serverUrl: string): Promise<IssuerInfo> {
  const res = await fetch(`${serverUrl}?action=info`);
  if (!res.ok) throw new Error(`Issuer info failed: ${res.status}`);
  return res.json();
}

type CertEnvelope = {
  type?: string;
  serialNumber?: string;
  subject?: string;
  certifier?: string;
  revocationOutpoint?: string;
  fields?: Record<string, string>;
  signature?: string;
};

async function decryptVCFields(
  client: WalletClient,
  vc: AcquiredVC
): Promise<Record<string, string>> {
  const cert = ((vc as Record<string, unknown>)._bsv as { certificate?: CertEnvelope } | undefined)
    ?.certificate;
  if (!cert?.fields || !cert.type || !cert.serialNumber || !cert.subject || !cert.certifier || !cert.signature) {
    console.warn("[vc-client] skipping decrypt — envelope incomplete", {
      keys: cert ? Object.keys(cert) : [],
      vcKeys: Object.keys(vc as Record<string, unknown>)
    });
    return {};
  }

  const fieldNames = Object.keys(cert.fields);
  if (fieldNames.length === 0) return {};

  try {
    const { publicKey: ourKey } = await client.getPublicKey({ identityKey: true });
    const proof = await client.proveCertificate({
      certificate: {
        type: cert.type,
        serialNumber: cert.serialNumber,
        subject: cert.subject,
        certifier: cert.certifier,
        revocationOutpoint: cert.revocationOutpoint ?? "00".repeat(32) + ".0",
        fields: cert.fields,
        signature: cert.signature
      },
      fieldsToReveal: fieldNames,
      verifier: ourKey
    });
    const keyring = proof.keyringForVerifier ?? {};
    if (Object.keys(keyring).length === 0) {
      console.warn("[vc-client] proveCertificate returned empty keyringForVerifier");
      return {};
    }
    const verifiable = VerifiableCertificate.fromCertificate(
      {
        type: cert.type,
        serialNumber: cert.serialNumber,
        subject: cert.subject,
        certifier: cert.certifier,
        revocationOutpoint: cert.revocationOutpoint ?? "00".repeat(32) + ".0",
        fields: cert.fields,
        signature: cert.signature
      },
      keyring
    );
    const decrypted = await verifiable.decryptFields(client);
    return decrypted;
  } catch (e) {
    console.error("[vc-client] decryptFields failed", {
      error: (e as Error).message,
      certifier: cert.certifier,
      subject: cert.subject,
      serialNumber: cert.serialNumber
    });
    return {};
  }
}

/**
 * Lists all VCs in the connected wallet that were issued by the certificate-poc
 * issuer, across all registered schema types. Field values returned by
 * `listCertificates` are encrypted per-subject; we decrypt them here using the
 * wallet so callers see plaintext.
 */
export async function listCertificateVCs(
  client: WalletClient,
  serverUrl: string = "/api/credential-issuer"
): Promise<AcquiredVC[]> {
  const info = await getIssuerInfo(serverUrl);
  const types = (info.schemas ?? [])
    .map((s) => s.certificateTypeBase64)
    .filter((t): t is string => typeof t === "string" && t.length > 0);

  if (types.length === 0) return [];

  const wallet = await getSimpleWallet();
  const raw = await (wallet as unknown as {
    listCredentials: (args: {
      certifiers: string[];
      types: string[];
      limit?: number;
    }) => Promise<AcquiredVC[]>;
  }).listCredentials({
    certifiers: [info.certifierPublicKey],
    types,
    limit: 200
  });

  const list = raw ?? [];
  if (list[0]) {
    try {
      // eslint-disable-next-line no-console
      console.log("[vc-client] first VC dump:", JSON.parse(JSON.stringify(list[0])));
    } catch {
      // ignore circular
    }
  }
  await Promise.all(
    list.map(async (vc) => {
      const plain = await decryptVCFields(client, vc);
      if (Object.keys(plain).length === 0) return;
      // Attach plaintext in two places for convenience.
      (vc as Record<string, unknown>).fields = plain;
      const bsv = (vc as Record<string, unknown>)._bsv as { certificate?: CertEnvelope } | undefined;
      if (bsv?.certificate) bsv.certificate.fields = plain;
    })
  );
  return list;
}
