"use client";

import type { CertificateTemplate, TemplateData } from "../template";
import { validateTemplateData } from "../template";

type Props = {
  template: CertificateTemplate;
  value: TemplateData;
  onChange: (next: TemplateData) => void;
};

export default function CertificateForm({ template, value, onChange }: Props) {
  const err = validateTemplateData(template, value);
  const update = (k: string, v: string) => onChange({ ...value, [k]: v });

  return (
    <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
      {template.fields.map((f) => (
        <label key={f.key} className="grid gap-1">
          <span className="text-xs uppercase tracking-widest text-zinc-400">
            {f.label}
            {f.required ? " *" : ""}
          </span>
          {f.type === "longText" ? (
            <textarea
              value={value[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => update(f.key, e.target.value)}
              rows={3}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
            />
          ) : (
            <input
              type={f.type === "date" ? "date" : "text"}
              value={value[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => update(f.key, e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
            />
          )}
        </label>
      ))}
      {err && <p className="text-sm text-amber-400">{err}</p>}
    </form>
  );
}
