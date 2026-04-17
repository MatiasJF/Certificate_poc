"use client";

import { WalletClient, Utils } from "@bsv/sdk";
import { canonicalJson } from "./schema";

const PROTOCOL_ID: [0, string] = [0, "certificate template"];
const KEY_ID = "1";

export async function walletSignedFetch(
  client: WalletClient,
  input: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<Response> {
  const method = (init.method ?? (init.body ? "POST" : "GET")).toUpperCase();
  const bodyCanonical = init.body === undefined ? "" : canonicalJson(init.body);
  const nonce = crypto.randomUUID();
  const path = new URL(input, typeof window !== "undefined" ? window.location.origin : "http://localhost").pathname;

  const message = canonicalJson({ path, method, nonce, body: bodyCanonical });

  const { publicKey } = await client.getPublicKey({
    protocolID: PROTOCOL_ID,
    keyID: KEY_ID,
    counterparty: "anyone",
    forSelf: true
  });
  const sig = await client.createSignature({
    data: Utils.toArray(message, "utf8"),
    protocolID: PROTOCOL_ID,
    keyID: KEY_ID,
    counterparty: "anyone"
  });

  return fetch(input, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-wallet-pubkey": publicKey,
      "x-wallet-signature": Utils.toHex(sig.signature),
      "x-wallet-nonce": nonce,
      ...(init.headers ?? {})
    },
    body: init.body === undefined ? undefined : bodyCanonical
  });
}
