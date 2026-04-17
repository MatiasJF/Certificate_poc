"use client";

import { createWallet } from "@bsv/simple/browser";
import type { CertificateTemplate, TemplateData } from "./template";

type SimpleWallet = Awaited<ReturnType<typeof createWallet>>;

let cached: SimpleWallet | null = null;

export async function getSimpleWallet(): Promise<SimpleWallet> {
  if (!cached) cached = await createWallet({ didProxyUrl: "/api/resolve-did" });
  return cached;
}

export type AcquiredVC = {
  serialNumber?: string;
  type?: string;
  certifier?: string;
  subject?: string;
  fields?: Record<string, string>;
  [k: string]: unknown;
};

export const CERT_VC_SCHEMA_ID = "certificate/v2";

export type IssuerInfo = {
  did?: string;
  certifierPublicKey: string;
  certificateType: string;
  schemas: Array<{ id: string; name?: string; certificateTypeBase64: string }>;
};

export type AcquireArgs = {
  template: CertificateTemplate;
  data: TemplateData;
  txid: string;
  imageSha256: string;
  issuedAt: string;
};

export async function acquireCertificateVC(
  serverUrl: string,
  args: AcquireArgs
): Promise<AcquiredVC> {
  const wallet = await getSimpleWallet();
  const { template, data, txid, imageSha256, issuedAt } = args;
  const fields: Record<string, string> = {
    templateId: template.id,
    templateName: template.name,
    certificateTxid: txid,
    imageSha256,
    recipient: data.recipient ?? data.name ?? "",
    issuer: data.issuer ?? "",
    issuedAt,
    fieldsJson: JSON.stringify(data)
  };
  const vc = await (wallet as unknown as {
    acquireCredential: (args: {
      serverUrl: string;
      schemaId: string;
      fields: Record<string, string>;
      replaceExisting?: boolean;
    }) => Promise<AcquiredVC>;
  }).acquireCredential({
    serverUrl,
    schemaId: CERT_VC_SCHEMA_ID,
    fields,
    replaceExisting: false
  });
  return vc;
}

export async function getIssuerInfo(serverUrl: string): Promise<IssuerInfo> {
  const res = await fetch(`${serverUrl}?action=info`);
  if (!res.ok) throw new Error(`Issuer info failed: ${res.status}`);
  return res.json();
}

/**
 * Lists all VCs in the connected wallet that were issued by the certificate-poc
 * issuer, across all registered schema types.
 */
export async function listCertificateVCs(
  serverUrl: string = "/api/credential-issuer"
): Promise<AcquiredVC[]> {
  const info = await getIssuerInfo(serverUrl);
  const types = (info.schemas ?? [])
    .map((s) => s.certificateTypeBase64)
    .filter((t): t is string => typeof t === "string" && t.length > 0);

  if (types.length === 0) return [];

  const wallet = await getSimpleWallet();
  const list = await (wallet as unknown as {
    listCredentials: (args: {
      certifiers: string[];
      types: string[];
      limit?: number;
    }) => Promise<AcquiredVC[]>;
  }).listCredentials({
    certifiers: [info.certifierPublicKey],
    types,
    limit: 200
  });
  return list ?? [];
}
