"use client";

import { useState } from "react";
import { CertificateData, validateCertificate } from "../schema";
import { acquireAttendanceVC, AcquiredVC } from "../vc-client";

type Props = {
  data: CertificateData;
  serverUrl?: string;
  onAcquired?: (vc: AcquiredVC) => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "acquired"; vc: AcquiredVC }
  | { kind: "error"; message: string };

export default function RequestVCButton({ data, serverUrl = "/api/credential-issuer", onAcquired }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handle = async () => {
    const err = validateCertificate(data);
    if (err) {
      setStatus({ kind: "error", message: err });
      return;
    }
    setStatus({ kind: "requesting" });
    try {
      const vc = await acquireAttendanceVC(serverUrl, data);
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
        disabled={status.kind === "requesting"}
        className="rounded border border-fuchsia-400/60 bg-fuchsia-500/10 px-4 py-2 font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20 disabled:opacity-40"
      >
        {status.kind === "requesting" ? "Requesting VC from issuer…" : "Acquire Verifiable Credential"}
      </button>

      {status.kind === "acquired" && (
        <div className="rounded border border-fuchsia-400/40 bg-fuchsia-500/10 p-3 text-sm text-fuchsia-100">
          <div className="font-semibold text-fuchsia-200">VC acquired and saved to wallet</div>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs text-fuchsia-50/90">
            {JSON.stringify(status.vc, null, 2)}
          </pre>
        </div>
      )}

      {status.kind === "error" && <p className="text-sm text-red-400">{status.message}</p>}

      <p className="text-xs text-zinc-500">
        Issued by the server-side <code>aph-attendance</code> credential issuer (BRC-52) and stored in your
        BRC-100 wallet. This is the path the hackathon web will use to deliver credentials to verified attendees.
      </p>
    </div>
  );
}
