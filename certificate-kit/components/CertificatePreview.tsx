"use client";

import { CertificateData } from "../schema";
import { renderCertificateSVG } from "../renderer";

export default function CertificatePreview({ data }: { data: CertificateData }) {
  const svg = renderCertificateSVG(data);
  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-zinc-800 shadow-lg [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
