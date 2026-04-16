export const CERT_SCHEMA_ID = "aph-certificate/v1" as const;

export type CertificateData = {
  recipient: string;
  event: string;
  role?: string;
  date: string;
  issuer: string;
  note?: string;
};

export const CERT_PROTOCOL_ID: [0, string] = [0, "certificate poc"];
export const CERT_KEY_ID = "1";

export type CertificateMetadata = {
  v: 1;
  schema: typeof CERT_SCHEMA_ID;
  cert: CertificateData;
  issuedAt: string;
  issuerIdentityKey: string;
  issuerPubKey: string;
  signature: string;
  imageSha256: string;
  vcWrap?: unknown;
};

const CERT_FIELDS: Array<{ key: keyof CertificateData; required: boolean }> = [
  { key: "recipient", required: true },
  { key: "event", required: true },
  { key: "role", required: false },
  { key: "date", required: true },
  { key: "issuer", required: true },
  { key: "note", required: false }
];

export function validateCertificate(data: Partial<CertificateData>): string | null {
  for (const { key, required } of CERT_FIELDS) {
    const val = data[key];
    if (required && (!val || !val.trim())) return `Missing required field: ${key}`;
    if (val && val.length > 500) return `Field too long: ${key}`;
  }
  return null;
}

export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalJson((obj as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

export const EMPTY_CERTIFICATE: CertificateData = {
  recipient: "",
  event: "",
  role: "",
  date: "",
  issuer: "",
  note: ""
};
