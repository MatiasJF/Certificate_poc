"use client";

import type { CertificateTemplate, TemplateData } from "./template";
import { renderTemplateSVG } from "./template";

export const CERT_WIDTH = 1200;
export const CERT_HEIGHT = 800;

export function renderCertificateFromTemplate(
  template: CertificateTemplate,
  data: TemplateData
): string {
  return renderTemplateSVG(template, data);
}

export function svgToBytes(svg: string): Uint8Array {
  return new TextEncoder().encode(svg);
}

export async function svgToPngBytes(
  svg: string,
  width = CERT_WIDTH,
  height = CERT_HEIGHT
): Promise<Uint8Array> {
  if (typeof window === "undefined") throw new Error("svgToPngBytes must run in the browser");

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load SVG into Image"));
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, width, height);

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null"))), "image/png")
    );
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
