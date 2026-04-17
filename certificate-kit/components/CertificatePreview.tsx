"use client";

import type { CertificateTemplate, TemplateData } from "../template";
import { renderTemplateSVG } from "../template";

export default function CertificatePreview({
  template,
  data
}: {
  template: CertificateTemplate;
  data: TemplateData;
}) {
  const svg = renderTemplateSVG(template, data);
  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-zinc-800 shadow-lg [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
