import type { CertificateTemplate } from "../template";

const WIDTH = 1200;
const HEIGHT = 800;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
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
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" fill="none" stroke="url(#accent)" stroke-width="4" rx="16"/>
  <rect x="60" y="60" width="${WIDTH - 120}" height="4" fill="url(#accent)"/>
  <rect x="60" y="${HEIGHT - 64}" width="${WIDTH - 120}" height="4" fill="url(#accent)"/>

  <text x="${WIDTH / 2}" y="180" text-anchor="middle" fill="#9aa7b8" font-family="monospace" font-size="28" letter-spacing="8">CERTIFICATE OF PARTICIPATION</text>
  <text x="${WIDTH / 2}" y="290" text-anchor="middle" fill="#b8b8c0" font-family="sans-serif" font-size="28">This certifies that</text>
  <text x="${WIDTH / 2}" y="380" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="700" font-size="64">{{recipient}}</text>
  <text x="${WIDTH / 2}" y="450" text-anchor="middle" fill="#b8b8c0" font-family="sans-serif" font-size="28">participated in</text>
  <text x="${WIDTH / 2}" y="540" text-anchor="middle" fill="#00e6ff" font-family="sans-serif" font-weight="600" font-size="44">{{event}}</text>
  <text x="${WIDTH / 2}" y="610" text-anchor="middle" fill="#9aa7b8" font-family="sans-serif" font-size="22" font-style="italic">{{note}}</text>

  <text x="120" y="${HEIGHT - 110}" fill="#9aa7b8" font-family="monospace" font-size="20">ISSUED BY</text>
  <text x="120" y="${HEIGHT - 80}" fill="#ffffff" font-family="sans-serif" font-size="26">{{issuer}}</text>

  <text x="${WIDTH - 120}" y="${HEIGHT - 110}" text-anchor="end" fill="#9aa7b8" font-family="monospace" font-size="20">DATE</text>
  <text x="${WIDTH - 120}" y="${HEIGHT - 80}" text-anchor="end" fill="#ffffff" font-family="sans-serif" font-size="26">{{date}}</text>
</svg>`;

export const APH_ATTENDANCE_TEMPLATE: CertificateTemplate = {
  id: "builtin/aph-attendance/v1",
  name: "APH Attendance",
  description: "Simple dark-themed certificate of participation",
  width: WIDTH,
  height: HEIGHT,
  svgTemplate: SVG,
  fields: [
    { key: "recipient", label: "Recipient", type: "text", required: true, maxLength: 120 },
    { key: "event", label: "Event", type: "text", required: true, maxLength: 200 },
    { key: "date", label: "Date", type: "date", required: true, maxLength: 40 },
    { key: "issuer", label: "Issuer", type: "text", required: true, maxLength: 200 },
    { key: "note", label: "Note", type: "text", required: false, maxLength: 200 }
  ]
};
