import { VerifyResult } from "../verify";
import { isV2Metadata } from "../schema";

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${ok ? "text-emerald-300" : "text-red-400"}`}>
      <span aria-hidden>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}

export default function VerifyPanel({ result }: { result: VerifyResult }) {
  const imageDataUrl =
    result.imageBytes && result.imageContentType
      ? `data:${result.imageContentType};base64,${bytesToBase64(result.imageBytes)}`
      : null;

  const meta = result.metadata;
  const v1Wrap = meta && !isV2Metadata(meta) ? meta.vcWrap : null;
  const templateRef = meta && isV2Metadata(meta) ? meta.template : null;
  const v2Fields = meta && isV2Metadata(meta) ? meta.fields : null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
        <div className="font-mono text-xs text-zinc-400 break-all">{result.txid}</div>
        <Check ok={result.onChain} label="Transaction present on chain" />
        {meta && (
          <>
            <Check ok={result.signatureValid} label="Issuer signature valid" />
            <Check ok={result.imageHashMatches} label="Image hash matches metadata" />
          </>
        )}
        {result.errors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-amber-300">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>

      {imageDataUrl && (
        <div className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Inscribed image</div>
          <img src={imageDataUrl} alt="Inscribed certificate" className="block h-auto w-full rounded" />
        </div>
      )}

      {templateRef && (
        <div className="rounded border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm">
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200">Template</div>
          <div className="text-zinc-100">{templateRef.name ?? templateRef.id}</div>
          <div className="font-mono text-xs text-zinc-400 break-all">{templateRef.id}</div>
          {templateRef.txid && (
            <a
              className="mt-1 inline-block text-xs text-cyan-300 hover:underline"
              href={`/verify/${templateRef.txid}`}
            >
              Template on-chain →
            </a>
          )}
        </div>
      )}

      {v2Fields && (
        <div className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Fields</div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            {Object.entries(v2Fields).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-zinc-400">{k}</dt>
                <dd className="text-zinc-100 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {v1Wrap != null && (
        <div className="rounded border border-fuchsia-400/40 bg-fuchsia-500/10 p-3">
          <div className="mb-2 text-xs uppercase tracking-widest text-fuchsia-200">
            Verifiable Credential wrap (legacy v1)
          </div>
          <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-fuchsia-50/90">
            {JSON.stringify(v1Wrap, null, 2)}
          </pre>
        </div>
      )}

      {meta && (
        <div className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Metadata</div>
          <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-zinc-300">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
