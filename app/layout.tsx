import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certificate PoC — On-chain attendance certificates",
  description:
    "Whitelabel proof-of-concept: generate a certificate, inscribe it on BSV via a BRC-100 wallet, verify it against WhatsOnChain."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="mb-10 flex items-baseline justify-between">
            <a href="/" className="text-xl font-semibold tracking-tight text-zinc-100">
              certificate<span className="text-cyan-400">.poc</span>
            </a>
            <nav className="text-sm text-zinc-400">
              <a href="/" className="mr-6 hover:text-zinc-100">Generate</a>
              <a href="/templates" className="mr-6 hover:text-zinc-100">Templates</a>
              <a href="/credentials" className="mr-6 hover:text-zinc-100">Credentials</a>
              <a href="/verify" className="mr-6 hover:text-zinc-100">Verify</a>
              <a href="/admin/stuck" className="text-zinc-500 hover:text-zinc-200">Debug</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
