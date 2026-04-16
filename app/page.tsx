"use client";

import { useState } from "react";
import { WalletClient } from "@bsv/sdk";
import {
  CertificateForm,
  CertificatePreview,
  InscribeButton,
  RequestVCButton,
  WalletConnect,
  EMPTY_CERTIFICATE,
  type AcquiredVC,
  type CertificateData
} from "@/certificate-kit";

export default function Home() {
  const [data, setData] = useState<CertificateData>(EMPTY_CERTIFICATE);
  const [client, setClient] = useState<WalletClient | null>(null);
  const [vc, setVc] = useState<AcquiredVC | null>(null);

  return (
    <main className="grid gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <section className="grid gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Make a certificate</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Fill in the details, connect your BRC-100 wallet, and inscribe the certificate as a 1-sat
            image output on BSV. The transaction will display the certificate inline on WhatsOnChain.
          </p>
        </div>
        <CertificateForm value={data} onChange={setData} />
        <WalletConnect onConnected={(c) => setClient(c)} />
        <InscribeButton client={client} data={data} vcWrap={vc ?? undefined} />
        <div className="border-t border-zinc-800 pt-5">
          <RequestVCButton data={data} onAcquired={setVc} />
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-sm uppercase tracking-widest text-zinc-400">Live preview</h2>
        <CertificatePreview data={data} />
        <p className="text-xs text-zinc-500">
          The exact bytes rendered above become a 1-sat ordinal-style inscription. A second OP_RETURN
          output carries signed JSON metadata (schema <code>aph-certificate/v1</code>) for verification.
        </p>
      </section>
    </main>
  );
}
