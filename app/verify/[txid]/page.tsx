import { VerifyPanel, verifyCertificateTx } from "@/certificate-kit";

export default async function VerifyTx({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = await params;
  const result = await verifyCertificateTx(txid);
  return (
    <main className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Verification</h1>
        <a
          href={`https://whatsonchain.com/tx/${txid}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-cyan-300 hover:underline"
        >
          Open on WhatsOnChain →
        </a>
      </div>
      <VerifyPanel result={result} />
    </main>
  );
}
