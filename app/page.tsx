"use client";

import { useEffect, useMemo, useState } from "react";
import { WalletClient } from "@bsv/sdk";
import {
  CertificateForm,
  CertificatePreview,
  InscribeButton,
  RequestVCButton,
  WalletConnect,
  BUILTIN_TEMPLATES,
  type CertificateTemplate,
  type TemplateData,
  type InscribeResult
} from "@/certificate-kit";
import { walletSignedFetch, walletTaggedFetch } from "@/certificate-kit/signed-fetch";

type UserTemplateSummary = {
  id: string;
  name: string;
  description?: string | null;
};

function initialDataFor(template: CertificateTemplate): TemplateData {
  const d: TemplateData = {};
  for (const f of template.fields) d[f.key] = "";
  return d;
}

export default function Home() {
  const [userTemplates, setUserTemplates] = useState<UserTemplateSummary[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<CertificateTemplate>(BUILTIN_TEMPLATES[0]);
  const [data, setData] = useState<TemplateData>(() => initialDataFor(BUILTIN_TEMPLATES[0]));
  const [client, setClient] = useState<WalletClient | null>(null);
  const [issued, setIssued] = useState<InscribeResult | null>(null);

  useEffect(() => {
    const req = client ? walletTaggedFetch(client, "/api/templates") : fetch("/api/templates");
    req
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((res) => setUserTemplates(res.templates ?? []))
      .catch(() => setUserTemplates([]));
  }, [client]);

  const templateOptions = useMemo(
    () => [
      ...BUILTIN_TEMPLATES.map((t) => ({ id: t.id, name: t.name, builtin: true })),
      ...userTemplates.map((t) => ({ id: t.id, name: t.name, builtin: false }))
    ],
    [userTemplates]
  );

  const handleSelectTemplate = async (id: string) => {
    const builtin = BUILTIN_TEMPLATES.find((t) => t.id === id);
    if (builtin) {
      setActiveTemplate(builtin);
      setData(initialDataFor(builtin));
      setIssued(null);
      return;
    }
    const r = await fetch(`/api/templates/${id}`);
    if (!r.ok) return;
    const { template } = (await r.json()) as { template: CertificateTemplate };
    setActiveTemplate(template);
    setData(initialDataFor(template));
    setIssued(null);
  };

  return (
    <main className="grid gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section className="grid gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Make a certificate</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pick a template, fill the fields, connect your BRC-100 wallet, and inscribe the certificate on BSV.
            The VC you acquire after inscription will carry the <code>certificateTxid</code> back to the chain.
          </p>
        </div>

        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Template</span>
          <select
            value={activeTemplate.id}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
          >
            {templateOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.builtin ? "★ " : ""}
                {t.name}
              </option>
            ))}
          </select>
          <a href="/templates" className="mt-1 text-xs text-cyan-300 hover:underline">
            Create a new template →
          </a>
        </label>

        <CertificateForm template={activeTemplate} value={data} onChange={setData} />
        <WalletConnect onConnected={(c) => setClient(c)} />
        <InscribeButton
          client={client}
          template={activeTemplate}
          data={data}
          onIssued={async (res) => {
            setIssued(res);
            if (!client) return;
            const isBuiltin = BUILTIN_TEMPLATES.some((t) => t.id === activeTemplate.id);
            try {
              await walletSignedFetch(client, "/api/certificates", {
                method: "POST",
                body: {
                  txid: res.txid,
                  templateId: isBuiltin ? undefined : activeTemplate.id,
                  recipientData: data,
                  imageSha256: res.imageSha256,
                  schemaVersion: "certificate/v2",
                  issuerPubKey: res.metadata.issuerPubKey
                }
              });
            } catch {
              // indexing is best-effort; the chain is the source of truth
            }
          }}
        />
        <div className="border-t border-zinc-800 pt-5">
          <RequestVCButton
            template={activeTemplate}
            data={data}
            txid={issued?.txid}
            imageSha256={issued?.imageSha256}
            issuedAt={issued?.metadata.issuedAt}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-sm uppercase tracking-widest text-zinc-400">Live preview</h2>
        <CertificatePreview template={activeTemplate} data={data} />
        <p className="text-xs text-zinc-500">
          The exact bytes rendered above become a 1-sat ordinal-style inscription. A second OP_RETURN output
          carries signed JSON metadata (schema <code>certificate/v2</code>) with a reference to this template.
        </p>
      </section>
    </main>
  );
}
