import "server-only";

export async function issueCertificateFromServer(): Promise<never> {
  throw new Error(
    "Server-side certificate issuance is stubbed. Phase B (hackathon mode) will wire this to @bsv/simple/server createServerWalletHandler and credential-issuer endpoints."
  );
}
