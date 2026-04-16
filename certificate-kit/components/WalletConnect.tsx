"use client";

import { useState } from "react";
import { WalletClient } from "@bsv/sdk";
import { connectWallet, getWalletIdentity } from "../wallet-client";

type Props = {
  onConnected: (client: WalletClient, identity: { publicKey: string; address: string }) => void;
};

export default function WalletConnect({ onConnected }: Props) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [identity, setIdentity] = useState<{ publicKey: string; address: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleConnect = async () => {
    setStatus("connecting");
    setErr(null);
    try {
      const client = await connectWallet();
      const id = await getWalletIdentity(client);
      setIdentity(id);
      setStatus("connected");
      onConnected(client, id);
    } catch (e) {
      setErr((e as Error).message);
      setStatus("error");
    }
  };

  if (status === "connected" && identity) {
    return (
      <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
        <div>
          <span className="text-emerald-400">Connected</span>
        </div>
        <div className="font-mono text-xs text-zinc-300">
          {identity.address} · key {identity.publicKey.slice(0, 12)}…
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={status === "connecting"}
        className="rounded bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {status === "connecting" ? "Connecting…" : "Connect BRC-100 wallet"}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <p className="text-xs text-zinc-500">
        Requires MetaNet Desktop, Yours Wallet, or another BRC-100 compatible wallet running locally.
      </p>
    </div>
  );
}
