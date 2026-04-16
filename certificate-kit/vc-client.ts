"use client";

import { createWallet } from "@bsv/simple/browser";
import { CertificateData } from "./schema";

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

export async function acquireAttendanceVC(
  serverUrl: string,
  data: CertificateData
): Promise<AcquiredVC> {
  const wallet = await getSimpleWallet();
  const fields: Record<string, string> = {
    recipient: data.recipient,
    event: data.event,
    role: data.role ?? "",
    date: data.date,
    issuer: data.issuer
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
    schemaId: "aph-attendance",
    fields,
    replaceExisting: true
  });
  return vc;
}

export async function listAttendanceVCs(certifierPublicKey?: string): Promise<AcquiredVC[]> {
  const wallet = await getSimpleWallet();
  const args: { certifiers?: string[]; types?: string[] } = {};
  if (certifierPublicKey) args.certifiers = [certifierPublicKey];
  const list = await (wallet as unknown as {
    listCredentials: (args: { certifiers?: string[]; types?: string[] }) => Promise<AcquiredVC[]>;
  }).listCredentials(args);
  return list;
}

export async function getIssuerInfo(serverUrl: string): Promise<{
  did: string;
  certifierPublicKey: string;
  schemas: Array<{ id: string; name: string }>;
}> {
  const res = await fetch(`${serverUrl}?action=info`);
  if (!res.ok) throw new Error(`Issuer info failed: ${res.status}`);
  return res.json();
}
