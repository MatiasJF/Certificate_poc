"use client";

import { CertificateData } from "./schema";

export const CERT_WIDTH = 1200;
export const CERT_HEIGHT = 800;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderCertificateSVG(data: CertificateData): string {
  const recipient = escapeXml(data.recipient || "Recipient Name");
  const event = escapeXml(data.event || "Event Title");
  const role = escapeXml(data.role || "");
  const date = escapeXml(data.date || "Date");
  const issuer = escapeXml(data.issuer || "Issuer");
  const note = escapeXml(data.note || "");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CERT_WIDTH} ${CERT_HEIGHT}" width="${CERT_WIDTH}" height="${CERT_HEIGHT}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a0a12"/>
        <stop offset="100%" stop-color="#121826"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#00e6ff"/>
        <stop offset="100%" stop-color="#003fff"/>
      </linearGradient>
    </defs>
    <rect width="${CERT_WIDTH}" height="${CERT_HEIGHT}" fill="url(#bg)"/>
    <rect x="40" y="40" width="${CERT_WIDTH - 80}" height="${CERT_HEIGHT - 80}" fill="none" stroke="url(#accent)" stroke-width="4" rx="16"/>
    <rect x="60" y="60" width="${CERT_WIDTH - 120}" height="4" fill="url(#accent)"/>
    <rect x="60" y="${CERT_HEIGHT - 64}" width="${CERT_WIDTH - 120}" height="4" fill="url(#accent)"/>

    <text x="${CERT_WIDTH / 2}" y="180" text-anchor="middle" fill="#9aa7b8" font-family="monospace" font-size="28" letter-spacing="8">CERTIFICATE OF PARTICIPATION</text>

    <text x="${CERT_WIDTH / 2}" y="310" text-anchor="middle" fill="#b8b8c0" font-family="sans-serif" font-size="28">This certifies that</text>

    <text x="${CERT_WIDTH / 2}" y="400" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="700" font-size="64">${recipient}</text>

    <text x="${CERT_WIDTH / 2}" y="470" text-anchor="middle" fill="#b8b8c0" font-family="sans-serif" font-size="28">${role ? `participated as ${role} in` : "participated in"}</text>

    <text x="${CERT_WIDTH / 2}" y="550" text-anchor="middle" fill="#00e6ff" font-family="sans-serif" font-weight="600" font-size="44">${event}</text>

    ${note ? `<text x="${CERT_WIDTH / 2}" y="620" text-anchor="middle" fill="#9aa7b8" font-family="sans-serif" font-size="22" font-style="italic">${note}</text>` : ""}

    <text x="120" y="${CERT_HEIGHT - 110}" fill="#9aa7b8" font-family="monospace" font-size="20">ISSUED BY</text>
    <text x="120" y="${CERT_HEIGHT - 80}" fill="#ffffff" font-family="sans-serif" font-size="26">${issuer}</text>

    <text x="${CERT_WIDTH - 120}" y="${CERT_HEIGHT - 110}" text-anchor="end" fill="#9aa7b8" font-family="monospace" font-size="20">DATE</text>
    <text x="${CERT_WIDTH - 120}" y="${CERT_HEIGHT - 80}" text-anchor="end" fill="#ffffff" font-family="sans-serif" font-size="26">${date}</text>
  </svg>`;
}

export function svgToBytes(svg: string): Uint8Array {
  return new TextEncoder().encode(svg);
}

export async function svgToPngBytes(svg: string, width = CERT_WIDTH, height = CERT_HEIGHT): Promise<Uint8Array> {
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
