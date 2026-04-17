export const CERT_SCHEMA_ID_V1 = "aph-certificate/v1" as const;
export const CERT_SCHEMA_ID_V2 = "certificate/v2" as const;
export const CERT_SCHEMA_ID = CERT_SCHEMA_ID_V2;

export const CERT_PROTOCOL_ID: [0, string] = [0, "certificate poc"];
export const CERT_KEY_ID = "1";

// ---- Legacy v1 types (for backwards-compatible verification) ----

export type CertificateData = {
  recipient: string;
  event: string;
  role?: string;
  date: string;
  issuer: string;
  note?: string;
  projectName?: string;
  teamName?: string;
};

export type CertificateMetadataV1 = {
  v: 1;
  schema: typeof CERT_SCHEMA_ID_V1;
  cert: CertificateData;
  issuedAt: string;
  issuerIdentityKey: string;
  issuerPubKey: string;
  signature: string;
  imageSha256: string;
  vcWrap?: unknown;
};

// ---- v2: template-driven, multi-tenant ----

export type TemplateRef = {
  id: string;
  name?: string;
  txid?: string;
  sha256?: string;
};

export type CertificateMetadataV2 = {
  v: 2;
  schema: typeof CERT_SCHEMA_ID_V2;
  template: TemplateRef;
  fields: Record<string, string>;
  issuedAt: string;
  issuerIdentityKey: string;
  issuerPubKey: string;
  signature: string;
  imageSha256: string;
};

export type CertificateMetadata = CertificateMetadataV1 | CertificateMetadataV2;

export function isV2Metadata(m: CertificateMetadata): m is CertificateMetadataV2 {
  return m.schema === CERT_SCHEMA_ID_V2;
}

// ---- Validation (v1 legacy; v2 validation lives in template.ts) ----

const CERT_FIELDS_V1: Array<{ key: keyof CertificateData; required: boolean }> = [
  { key: "recipient", required: true },
  { key: "event", required: true },
  { key: "role", required: false },
  { key: "date", required: true },
  { key: "issuer", required: true },
  { key: "note", required: false },
  { key: "projectName", required: false },
  { key: "teamName", required: false }
];

export function validateCertificate(data: Partial<CertificateData>): string | null {
  for (const { key, required } of CERT_FIELDS_V1) {
    const val = data[key];
    if (required && (!val || !val.trim())) return `Missing required field: ${key}`;
    if (val && val.length > 500) return `Field too long: ${key}`;
  }
  return null;
}

export function canonicalJson(obj: unknown): string {
  if (obj === undefined) return "null";
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",") + "]";
  }
  const entries = Object.entries(obj as Record<string, unknown>).filter(
    ([, v]) => v !== undefined
  );
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return (
    "{" +
    entries.map(([k, v]) => JSON.stringify(k) + ":" + canonicalJson(v)).join(",") +
    "}"
  );
}

export const EMPTY_CERTIFICATE: CertificateData = {
  recipient: "",
  event: "",
  role: "",
  date: "",
  issuer: "",
  note: "",
  projectName: "",
  teamName: ""
};
