import { VerifyResult } from "../verify";

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

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
        <div className="font-mono text-xs text-zinc-400 break-all">{result.txid}</div>
        <Check ok={result.onChain} label="Transaction present on chain" />
        {result.metadata && (
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

      {result.metadata?.vcWrap != null && (
        <div className="rounded border border-fuchsia-400/40 bg-fuchsia-500/10 p-3">
          <div className="mb-2 text-xs uppercase tracking-widest text-fuchsia-200">Verifiable Credential wrap</div>
          <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-fuchsia-50/90">
            {JSON.stringify(result.metadata.vcWrap, null, 2)}
          </pre>
        </div>
      )}

      {result.metadata && (
        <div className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Metadata</div>
          <pre className="overflow-auto whitespace-pre-wrap break-all text-xs text-zinc-300">
            {JSON.stringify(result.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
