"use client";

import { useState } from "react";
import { WalletClient } from "@bsv/sdk";
import { CertificateData, CertificateMetadata, validateCertificate } from "../schema";
import { renderCertificateSVG, svgToBytes } from "../renderer";
import { inscribeCertificate } from "../inscription";

export type InscribeResult = {
  txid: string;
  imageSha256: string;
  metadata: CertificateMetadata;
};

type Props = {
  client: WalletClient | null;
  data: CertificateData;
  vcWrap?: unknown;
  onIssued?: (result: InscribeResult) => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "rendering" }
  | { kind: "signing" }
  | { kind: "issued"; txid: string }
  | { kind: "error"; message: string };

export default function InscribeButton({ client, data, vcWrap, onIssued }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleInscribe = async () => {
    if (!client) {
      setStatus({ kind: "error", message: "Connect a wallet first" });
      return;
    }
    const err = validateCertificate(data);
    if (err) {
      setStatus({ kind: "error", message: err });
      return;
    }
    try {
      setStatus({ kind: "rendering" });
      const svg = renderCertificateSVG(data);
      const bytes = svgToBytes(svg);
      setStatus({ kind: "signing" });
      const res = await inscribeCertificate(client, data, bytes, {
        contentType: "image/svg+xml",
        vcWrap
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
        {(status.kind === "idle" || status.kind === "issued" || status.kind === "error") && "Inscribe certificate on-chain"}
      </button>

      {status.kind === "issued" && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <div className="font-semibold text-emerald-300">Issued</div>
          <div className="mt-1 font-mono text-xs break-all text-zinc-200">{status.txid}</div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a
              className="text-cyan-300 hover:underline"
              href={`https://whatsonchain.com/tx/${status.txid}`}
              target="_blank"
              rel="noreferrer"
            >
              Open on WhatsOnChain →
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
