export type FieldType = "text" | "date" | "longText";

export type TemplateField = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
};

export type CertificateTemplate = {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  svgTemplate: string;
  fabricJson?: unknown;
  fields: TemplateField[];
  ownerAddress?: string;
  visibility?: "PRIVATE" | "PUBLIC";
  publishedTxid?: string;
};

export type TemplateData = Record<string, string>;

export const TEMPLATE_PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function escapeXmlValue(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderTemplateSVG(template: CertificateTemplate, data: TemplateData): string {
  return template.svgTemplate.replace(TEMPLATE_PLACEHOLDER_RE, (_match, key: string) => {
    const raw = data[key] ?? "";
    return escapeXmlValue(raw);
  });
}

export function extractPlaceholders(svg: string): string[] {
  const keys = new Set<string>();
  for (const m of svg.matchAll(TEMPLATE_PLACEHOLDER_RE)) keys.add(m[1]);
  return [...keys];
}

export function validateTemplateData(
  template: CertificateTemplate,
  data: TemplateData
): string | null {
  for (const f of template.fields) {
    const v = data[f.key];
    if (f.required && (!v || !v.trim())) return `Missing required field: ${f.label}`;
    if (v && f.maxLength && v.length > f.maxLength) return `Field too long: ${f.label}`;
    if (v && v.length > 2000) return `Field too long: ${f.label}`;
  }
  return null;
}
