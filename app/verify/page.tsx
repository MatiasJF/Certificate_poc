"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyIndex() {
  const [txid, setTxid] = useState("");
  const router = useRouter();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (txid.trim()) router.push(`/verify/${txid.trim()}`);
  };
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-100">Verify a certificate</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Paste a transaction id. We fetch the tx from WhatsOnChain, decode the image inscription, and
        check the signed metadata.
      </p>
      <form onSubmit={submit} className="mt-6 flex gap-2">
        <input
          value={txid}
          onChange={(e) => setTxid(e.target.value)}
          placeholder="txid"
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-cyan-400"
        />
        <button type="submit" className="rounded bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400">
          Verify
        </button>
      </form>
    </main>
  );
}
