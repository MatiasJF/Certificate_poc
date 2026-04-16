import { CertificateData } from "./schema";

export type VCWrap = {
  "@context": string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: CertificateData & { id: string };
};

export function buildVcWrap(issuerDid: string, subjectId: string, data: CertificateData): VCWrap {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "HackathonAttendanceCredential"],
    issuer: issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: { id: subjectId, ...data }
  };
}
