import { Transaction, PublicKey, Signature, Hash, Utils } from "@bsv/sdk";
import {
  CertificateMetadata,
  CERT_SCHEMA_ID_V1,
  CERT_SCHEMA_ID_V2,
  canonicalJson
} from "./schema";

const WOC_BASE = process.env.WOC_BASE_URL || "https://api.whatsonchain.com";

export type VerifyResult = {
  txid: string;
  onChain: boolean;
  imageBytes?: Uint8Array;
  imageContentType?: string;
  metadata?: CertificateMetadata;
  signatureValid: boolean;
  imageHashMatches: boolean;
  errors: string[];
};

async function fetchTxHex(txid: string): Promise<string | null> {
  const res = await fetch(`${WOC_BASE}/v1/bsv/main/tx/${txid}/hex`, {
    next: { revalidate: 30 }
  });
  if (!res.ok) return null;
  return (await res.text()).trim();
}

function findInscriptionInScript(
  chunks: Array<{ op?: number; data?: number[] }>
): { contentType: string; body: Uint8Array } | null {
  for (let i = 0; i < chunks.length - 5; i++) {
    const c = chunks[i];
    const next = chunks[i + 1];
    const tag = chunks[i + 2];
    if (c?.op !== 0x00) continue;
    if (next?.op !== 0x63) continue;
    if (!tag?.data) continue;
    if (Utils.toUTF8(tag.data) !== "ord") continue;
    if (chunks[i + 3]?.op !== 0x51) continue;
    const ct = chunks[i + 4]?.data;
    if (!ct) continue;
    if (chunks[i + 5]?.op !== 0x00) continue;
    const body = chunks[i + 6]?.data;
    if (!body) continue;
    return { contentType: Utils.toUTF8(ct), body: Uint8Array.from(body) };
  }
  return null;
}

function findJsonMetadataInScript(
  chunks: Array<{ op?: number; data?: number[] }>
): CertificateMetadata | null {
  for (let i = 0; i < chunks.length - 2; i++) {
    if (chunks[i]?.op !== 0x00) continue;
    if (chunks[i + 1]?.op !== 0x6a) continue;
    const payload = chunks[i + 2]?.data;
    if (!payload) continue;
    try {
      const obj = JSON.parse(Utils.toUTF8(payload));
      if (obj && (obj.schema === CERT_SCHEMA_ID_V1 || obj.schema === CERT_SCHEMA_ID_V2)) {
        return obj as CertificateMetadata;
      }
    } catch {
      // keep scanning
    }
  }
  return null;
}

async function sha256HexNode(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const d = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
    return Array.from(new Uint8Array(d))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  const hash = Hash.sha256(Array.from(bytes));
  return Utils.toHex(hash);
}

export async function verifyCertificateTx(txid: string): Promise<VerifyResult> {
  const errors: string[] = [];
  const result: VerifyResult = {
    txid,
    onChain: false,
    signatureValid: false,
    imageHashMatches: false,
    errors
  };

  const hex = await fetchTxHex(txid);
  if (!hex) {
    errors.push("Transaction not found on WhatsOnChain (unconfirmed or invalid txid)");
    return result;
  }
  result.onChain = true;

  let tx: Transaction;
  try {
    tx = Transaction.fromHex(hex);
  } catch (e) {
    errors.push("Failed to parse transaction hex: " + (e as Error).message);
    return result;
  }

  for (const output of tx.outputs) {
    const chunks = output.lockingScript.chunks;
    if (!result.imageBytes) {
      const insc = findInscriptionInScript(chunks);
      if (insc) {
        result.imageBytes = insc.body;
        result.imageContentType = insc.contentType;
      }
    }
    if (!result.metadata) {
      const meta = findJsonMetadataInScript(chunks);
      if (meta) result.metadata = meta;
    }
  }

  if (!result.imageBytes) errors.push("No image inscription found in transaction");
  if (!result.metadata) {
    errors.push("No certificate metadata (OP_RETURN) found in transaction");
    return result;
  }

  if (result.imageBytes) {
    const hash = await sha256HexNode(result.imageBytes);
    result.imageHashMatches = hash === result.metadata.imageSha256;
    if (!result.imageHashMatches) errors.push("Image hash does not match metadata");
  }

  try {
    const { signature, ...unsigned } = result.metadata;
    const canonical = canonicalJson(unsigned);
    const sigBytes = Utils.toArray(signature, "hex");
    const sig = Signature.fromDER(sigBytes);
    const pubKey = PublicKey.fromString(result.metadata.issuerPubKey);
    result.signatureValid = pubKey.verify(Utils.toArray(canonical, "utf8"), sig);
    if (!result.signatureValid) errors.push("Metadata signature is invalid");
  } catch (e) {
    errors.push("Signature verification threw: " + (e as Error).message);
  }

  return result;
}
