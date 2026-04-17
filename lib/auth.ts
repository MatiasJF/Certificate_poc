import { PublicKey, Signature, Utils } from "@bsv/sdk";
import { NextRequest } from "next/server";
import { canonicalJson } from "@/certificate-kit/schema";

export const TEMPLATE_PROTOCOL_ID = "certificate template";

export type SignedPrincipal = {
  publicKey: string;
  address: string;
};

export type AuthResult =
  | { ok: true; principal: SignedPrincipal }
  | { ok: false; reason: string };

function parseBodyForSignature(body: unknown): string {
  if (body === undefined || body === null) return "";
  return canonicalJson(body);
}

export async function verifyWalletSignedRequest(
  req: NextRequest,
  body: unknown
): Promise<AuthResult> {
  const pubkeyHex = req.headers.get("x-wallet-pubkey");
  const sigHex = req.headers.get("x-wallet-signature");
  const nonce = req.headers.get("x-wallet-nonce") ?? "";
  const path = new URL(req.url).pathname;

  if (!pubkeyHex || !sigHex) return { ok: false, reason: "Missing wallet signature headers" };

  try {
    const message = canonicalJson({ path, method: req.method, nonce, body: parseBodyForSignature(body) });
    const sig = Signature.fromDER(Utils.toArray(sigHex, "hex"));
    const pub = PublicKey.fromString(pubkeyHex);
    const valid = pub.verify(Utils.toArray(message, "utf8"), sig);
    if (!valid) return { ok: false, reason: "Invalid signature" };
    return { ok: true, principal: { publicKey: pubkeyHex, address: pub.toAddress() } };
  } catch (e) {
    return { ok: false, reason: `Signature verification failed: ${(e as Error).message}` };
  }
}
