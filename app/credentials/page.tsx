"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WalletClient } from "@bsv/sdk";
import {
  WalletConnect,
  listCertificateVCs,
  getWalletIdentity,
  getWalletNetwork,
  wocTxUrl,
  type AcquiredVC,
  type WalletNetwork
} from "@/certificate-kit";

type Tab = "vcs" | "issued";

type VCView = {
  raw: AcquiredVC;
  templateId: string;
  templateName: string;
  recipient: string;
  issuer: string;
  issuedAt: string;
  txid: string;
  imageSha256: string;
  parsedFields: Record<string, string>;
};

type IssuedCert = {
  id: string;
  txid: string;
  templateId: string | null;
  issuedAt: string;
  imageSha256: string;
  recipientData: Record<string, string>;
  template: { id: string; name: string; thumbnailUrl: string | null } | null;
};

function extractFields(vc: AcquiredVC): Record<string, string> {
  const candidates: Array<Record<string, unknown> | undefined> = [
    (vc as Record<string, unknown>).fields as Record<string, unknown> | undefined,
    ((vc as Record<string, unknown>)._bsv as { certificate?: { fields?: Record<string, unknown> } } | undefined)
      ?.certificate?.fields,
    (vc as Record<string, unknown>).credentialSubject as Record<string, unknown> | undefined
  ];
  const merged: Record<string, string> = {};
  for (const src of candidates) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === "string" && merged[k] === undefined) merged[k] = v;
    }
  }
  return merged;
}

function parseVC(raw: AcquiredVC): VCView | null {
  const fields = extractFields(raw);
  const txid = fields.certificateTxid;
  if (!txid) return null;
  let parsedFields: Record<string, string> = {};
  try {
    parsedFields = JSON.parse(fields.fieldsJson ?? "{}");
  } catch {
    parsedFields = {};
  }
  return {
    raw,
    templateId: fields.templateId ?? "",
    templateName: fields.templateName ?? "Certificate",
    recipient: fields.recipient ?? parsedFields.recipient ?? "",
    issuer: fields.issuer ?? parsedFields.issuer ?? "",
    issuedAt: fields.issuedAt ?? "",
    txid,
    imageSha256: fields.imageSha256 ?? "",
    parsedFields
  };
}

export default function CredentialsPage() {
  const [client, setClient] = useState<WalletClient | null>(null);
  const [network, setNetwork] = useState<WalletNetwork>("mainnet");
  const [tab, setTab] = useState<Tab>("vcs");

  useEffect(() => {
    if (!client) return;
    getWalletNetwork(client).then(setNetwork).catch(() => setNetwork("mainnet"));
  }, [client]);

  const [vcs, setVcs] = useState<VCView[] | null>(null);
  const [vcError, setVcError] = useState<string | null>(null);
  const [loadingVcs, setLoadingVcs] = useState(false);

  const [issued, setIssued] = useState<IssuedCert[] | null>(null);
  const [issuedError, setIssuedError] = useState<string | null>(null);
  const [loadingIssued, setLoadingIssued] = useState(false);

  useEffect(() => {
    if (!client) return;
    setLoadingVcs(true);
    setVcError(null);
    listCertificateVCs()
      .then((list) => {
        const parsed = list.map(parseVC).filter((v): v is VCView => !!v);
        setVcs(parsed);
      })
      .catch((e) => setVcError((e as Error).message))
      .finally(() => setLoadingVcs(false));
  }, [client]);

  useEffect(() => {
    if (!client || tab !== "issued") return;
    let cancelled = false;
    (async () => {
      setLoadingIssued(true);
      setIssuedError(null);
      try {
        const { address } = await getWalletIdentity(client);
        const r = await fetch(`/api/certificates?issuer=${encodeURIComponent(address)}`);
        if (!r.ok) throw new Error(`API ${r.status}`);
        const j = await r.json();
        if (!cancelled) setIssued(j.certificates ?? []);
      } catch (e) {
        if (!cancelled) setIssuedError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingIssued(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, tab]);

  const vcList = useMemo(() => vcs ?? [], [vcs]);

  return (
    <main className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">My credentials</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect your BRC-100 wallet to see the Verifiable Credentials stored in it and the certificates
          issued from this address.
        </p>
      </div>

      <WalletConnect onConnected={(c) => setClient(c)} />

      <nav className="flex gap-3 border-b border-zinc-800 text-sm">
        <button
          type="button"
          onClick={() => setTab("vcs")}
          className={`border-b-2 px-3 py-2 ${
            tab === "vcs" ? "border-cyan-400 text-zinc-100" : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Received VCs
        </button>
        <button
          type="button"
          onClick={() => setTab("issued")}
          className={`border-b-2 px-3 py-2 ${
            tab === "issued" ? "border-cyan-400 text-zinc-100" : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Issued by me
        </button>
      </nav>

      {tab === "vcs" && (
        <section className="grid gap-3">
          {!client && <p className="text-sm text-zinc-500">Connect a wallet to load your VCs.</p>}
          {client && loadingVcs && <p className="text-sm text-zinc-500">Loading VCs…</p>}
          {vcError && <p className="text-sm text-red-400">{vcError}</p>}
          {client && !loadingVcs && vcList.length === 0 && !vcError && (
            <p className="text-sm text-zinc-500">No certificate credentials found in this wallet yet.</p>
          )}
          {vcList.map((v) => (
            <article
              key={v.txid + (v.raw.serialNumber ?? "")}
              className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div className="grid gap-1">
                <div className="text-zinc-100">{v.templateName}</div>
                <div className="text-xs text-zinc-400">
                  {v.recipient && <>Recipient: <span className="text-zinc-200">{v.recipient}</span> · </>}
                  {v.issuer && <>Issuer: <span className="text-zinc-200">{v.issuer}</span> · </>}
                  {v.issuedAt && <>Issued: <span className="text-zinc-200">{v.issuedAt}</span></>}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 break-all">{v.txid}</div>
              </div>
              <div className="flex gap-3 text-xs">
                <Link href={`/verify/${v.txid}`} className="text-cyan-300 hover:underline">
                  View on-chain →
                </Link>
                <a
                  href={wocTxUrl(v.txid, network)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  WoC ({network})
                </a>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "issued" && (
        <section className="grid gap-3">
          {!client && <p className="text-sm text-zinc-500">Connect a wallet to see what you've issued.</p>}
          {client && loadingIssued && <p className="text-sm text-zinc-500">Loading issued certificates…</p>}
          {issuedError && <p className="text-sm text-red-400">{issuedError}</p>}
          {client && !loadingIssued && issued && issued.length === 0 && !issuedError && (
            <p className="text-sm text-zinc-500">No certificates issued by this address yet.</p>
          )}
          {issued?.map((c) => (
            <article key={c.id} className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="grid gap-1">
                <div className="text-zinc-100">
                  {c.template?.name ?? c.templateId ?? "Certificate"}
                  <span className="ml-2 text-xs text-zinc-400">→ {c.recipientData.recipient ?? ""}</span>
                </div>
                <div className="text-xs text-zinc-500">Issued: {new Date(c.issuedAt).toLocaleString()}</div>
                <div className="font-mono text-[10px] text-zinc-500 break-all">{c.txid}</div>
              </div>
              <div className="flex gap-3 text-xs">
                <Link href={`/verify/${c.txid}`} className="text-cyan-300 hover:underline">
                  Verify →
                </Link>
                <a
                  href={wocTxUrl(c.txid, network)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  WoC ({network})
                </a>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
