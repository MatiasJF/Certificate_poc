"use client";

import { useState } from "react";
import { acquireCertificateVC, type AcquiredVC } from "../vc-client";
import type { CertificateTemplate, TemplateData } from "../template";

type Props = {
  template: CertificateTemplate;
  data: TemplateData;
  txid?: string;
  imageSha256?: string;
  issuedAt?: string;
  serverUrl?: string;
  onAcquired?: (vc: AcquiredVC) => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "acquired"; vc: AcquiredVC }
  | { kind: "error"; message: string };

export default function RequestVCButton({
  template,
  data,
  txid,
  imageSha256,
  issuedAt,
  serverUrl = "/api/credential-issuer",
  onAcquired
}: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ready = !!txid && !!imageSha256 && !!issuedAt;

  const handle = async () => {
    if (!ready) {
      setStatus({ kind: "error", message: "Inscribe the certificate first to bind the VC to its txid" });
      return;
    }
    setStatus({ kind: "requesting" });
    try {
      const vc = await acquireCertificateVC(serverUrl, {
        template,
        data,
        txid: txid!,
        imageSha256: imageSha256!,
        issuedAt: issuedAt!
      });
      setStatus({ kind: "acquired", vc });
      onAcquired?.(vc);
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  };

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={handle}
        disabled={!ready || status.kind === "requesting"}
        className="rounded border border-fuchsia-400/60 bg-fuchsia-500/10 px-4 py-2 font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20 disabled:opacity-40"
      >
        {status.kind === "requesting" ? "Requesting VC from issuer…" : "Acquire Verifiable Credential"}
      </button>

      {status.kind === "acquired" && (
        <div className="rounded border border-fuchsia-400/40 bg-fuchsia-500/10 p-3 text-sm text-fuchsia-100">
          <div className="font-semibold text-fuchsia-200">VC acquired and saved to wallet</div>
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs text-fuchsia-50/90">
            {JSON.stringify(status.vc, null, 2)}
          </pre>
        </div>
      )}

      {status.kind === "error" && <p className="text-sm text-red-400">{status.message}</p>}

      <p className="text-xs text-zinc-500">
        The VC binds to the on-chain certificate via <code>certificateTxid</code>, so anyone with the VC can
        resolve back to the inscription.
      </p>
    </div>
  );
}
