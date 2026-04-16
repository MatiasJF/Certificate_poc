"use client";

import { CertificateData, validateCertificate } from "../schema";

type Props = {
  value: CertificateData;
  onChange: (next: CertificateData) => void;
};

type Field = {
  key: keyof CertificateData;
  label: string;
  required?: boolean;
  type?: "text" | "date";
  placeholder?: string;
};

const FIELDS: Field[] = [
  { key: "recipient", label: "Recipient", required: true, placeholder: "Ada Lovelace" },
  { key: "event", label: "Event", required: true, placeholder: "Open Run AgentPay Hackathon" },
  { key: "role", label: "Role", placeholder: "Builder / Judge / Mentor" },
  { key: "date", label: "Date", required: true, type: "date" },
  { key: "issuer", label: "Issuer", required: true, placeholder: "BSV Association" },
  { key: "note", label: "Note", placeholder: "Optional dedication" }
];

export default function CertificateForm({ value, onChange }: Props) {
  const err = validateCertificate(value);
  const update = (k: keyof CertificateData, v: string) => onChange({ ...value, [k]: v });

  return (
    <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
      {FIELDS.map((f) => (
        <label key={f.key} className="grid gap-1">
          <span className="text-xs uppercase tracking-widest text-zinc-400">
            {f.label}
            {f.required ? " *" : ""}
          </span>
          <input
            type={f.type ?? "text"}
            value={value[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => update(f.key, e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
          />
        </label>
      ))}
      {err && <p className="text-sm text-amber-400">{err}</p>}
    </form>
  );
}
