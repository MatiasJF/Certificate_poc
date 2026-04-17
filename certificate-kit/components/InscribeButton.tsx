"use client";

import { useEffect, useState } from "react";
import { WalletClient } from "@bsv/sdk";
import { CertificateMetadataV2 } from "../schema";
import { svgToBytes } from "../renderer";
import { inscribeCertificate } from "../inscription";
import type { CertificateTemplate, TemplateData } from "../template";
import { renderTemplateSVG, validateTemplateData } from "../template";
import { getWalletNetwork, wocTxUrl, type WalletNetwork } from "../wallet-client";

export type InscribeResult = {
  txid: string;
  imageSha256: string;
  metadata: CertificateMetadataV2;
};

type Props = {
  client: WalletClient | null;
  template: CertificateTemplate;
  data: TemplateData;
  onIssued?: (result: InscribeResult) => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "rendering" }
  | { kind: "signing" }
  | { kind: "issued"; txid: string }
  | { kind: "error"; message: string };

export default function InscribeButton({ client, template, data, onIssued }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [network, setNetwork] = useState<WalletNetwork>("mainnet");

  useEffect(() => {
    if (!client) return;
    getWalletNetwork(client).then(setNetwork).catch(() => setNetwork("mainnet"));
  }, [client]);

  const handleInscribe = async () => {
    if (!client) {
      setStatus({ kind: "error", message: "Connect a wallet first" });
      return;
    }
    const err = validateTemplateData(template, data);
    if (err) {
      setStatus({ kind: "error", message: err });
      return;
    }
    try {
      setStatus({ kind: "rendering" });
      const svg = renderTemplateSVG(template, data);
      const bytes = svgToBytes(svg);
      setStatus({ kind: "signing" });
      const res = await inscribeCertificate(client, template, data, bytes, {
        contentType: "image/svg+xml"
      });
      setStatus({ kind: "issued", txid: res.txid });
      onIssued?.(res);
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  };

  const busy = status.kind === "rendering" || status.kind === "signing";

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={handleInscribe}
        disabled={!client || busy}
        className="rounded bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2 font-semibold text-zinc-950 shadow hover:brightness-110 disabled:opacity-40"
      >
        {status.kind === "rendering" && "Rendering image…"}
        {status.kind === "signing" && "Awaiting wallet signature…"}
        {(status.kind === "idle" || status.kind === "issued" || status.kind === "error") &&
          "Inscribe certificate on-chain"}
      </button>

      {status.kind === "issued" && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <div className="font-semibold text-emerald-300">Issued</div>
          <div className="mt-1 font-mono text-xs break-all text-zinc-200">{status.txid}</div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a
              className="text-cyan-300 hover:underline"
              href={wocTxUrl(status.txid, network)}
              target="_blank"
              rel="noreferrer"
            >
              Open on WhatsOnChain ({network}) →
            </a>
            <a className="text-cyan-300 hover:underline" href={`/verify/${status.txid}`}>
              Verify →
            </a>
          </div>
        </div>
      )}

      {status.kind === "error" && <p className="text-sm text-red-400">{status.message}</p>}
    </div>
  );
}
