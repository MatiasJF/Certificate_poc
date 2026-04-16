"use client";

import { WalletClient, PublicKey } from "@bsv/sdk";

let cached: WalletClient | null = null;

export async function connectWallet(): Promise<WalletClient> {
  if (!cached) cached = new WalletClient("auto", "localhost");
  await cached.getPublicKey({ identityKey: true });
  return cached;
}

export async function getWalletIdentity(client: WalletClient): Promise<{ publicKey: string; address: string }> {
  const { publicKey } = await client.getPublicKey({ identityKey: true });
  const address = PublicKey.fromString(publicKey).toAddress();
  return { publicKey, address };
}
