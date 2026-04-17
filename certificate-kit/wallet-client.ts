"use client";

import { WalletClient, PublicKey } from "@bsv/sdk";

let cached: WalletClient | null = null;

export type WalletNetwork = "mainnet" | "testnet";

export async function connectWallet(): Promise<WalletClient> {
  if (!cached) cached = new WalletClient("auto", "localhost");
  await cached.getPublicKey({ identityKey: true });
  return cached;
}

export async function getWalletIdentity(
  client: WalletClient
): Promise<{ publicKey: string; address: string }> {
  const { publicKey } = await client.getPublicKey({ identityKey: true });
  const address = PublicKey.fromString(publicKey).toAddress();
  return { publicKey, address };
}

export async function getWalletNetwork(client: WalletClient): Promise<WalletNetwork> {
  try {
    const r = (await client.getNetwork({})) as { network?: string };
    return r?.network === "testnet" ? "testnet" : "mainnet";
  } catch {
    return "mainnet";
  }
}

export function wocTxUrl(txid: string, network: WalletNetwork = "mainnet"): string {
  const host = network === "testnet" ? "test.whatsonchain.com" : "whatsonchain.com";
  return `https://${host}/tx/${txid}`;
}
