"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WalletClient } from "@bsv/sdk";
import { WalletConnect, BUILTIN_TEMPLATES } from "@/certificate-kit";
import {
  walletTaggedFetch,
  walletSignedFetch,
  getTemplatePubKey
} from "@/certificate-kit/signed-fetch";

type TemplateSummary = {
  id: string;
  name: string;
  description?: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  ownerAddress: string;
  ownerPublicKey?: string | null;
  updatedAt: string;
};

export default function TemplatesIndex() {
  const [client, setClient] = useState<WalletClient | null>(null);
  const [myPubKey, setMyPubKey] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      setMyPubKey(null);
      return;
    }
    getTemplatePubKey(client)
      .then(setMyPubKey)
      .catch(() => setMyPubKey(null));
  }, [client]);

  const reload = () => {
    const req = client ? walletTaggedFetch(client, "/api/templates") : fetch("/api/templates");
    setLoading(true);
    req
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((res) => setTemplates(res.templates ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const handleDelete = async (id: string, name: string) => {
    if (!client) return;
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await walletSignedFetch(client, `/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed: ${res.status}`);
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Templates</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pick a built-in, browse public templates, or create your own.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="rounded bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2 text-sm font-semibold text-zinc-950 shadow hover:brightness-110"
        >
          + New template
        </Link>
      </div>

      <WalletConnect onConnected={(c) => setClient(c)} />
      {error && <p className="text-sm text-red-400">{error}</p>}

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-widest text-zinc-400">Built-in</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_TEMPLATES.map((t) => (
            <div key={t.id} className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="text-zinc-100">{t.name}</div>
              <div className="text-xs text-zinc-500">{t.description}</div>
              <div className="font-mono text-[10px] text-zinc-600 break-all">{t.id}</div>
              <Link href={`/`} className="text-xs text-cyan-300 hover:underline">
                Use →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-widest text-zinc-400">Community & mine</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-zinc-500">No user templates yet. Be the first to create one.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const mine = !!myPubKey && t.ownerPublicKey === myPubKey;
              return (
                <div key={t.id} className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-zinc-100">{t.name}</div>
                    <div className="flex items-center gap-1">
                      {mine && (
                        <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-200">
                          mine
                        </span>
                      )}
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                        {t.visibility.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">{t.description}</div>
                  <div className="font-mono text-[10px] text-zinc-600 break-all">by {t.ownerAddress}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs">
                    <Link href={`/`} className="text-cyan-300 hover:underline">
                      Use →
                    </Link>
                    {mine && (
                      <>
                        <Link
                          href={`/templates/${t.id}/edit`}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, t.name)}
                          disabled={deletingId === t.id}
                          className="text-red-300 hover:text-red-200 disabled:opacity-40"
                        >
                          {deletingId === t.id ? "Deleting…" : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
