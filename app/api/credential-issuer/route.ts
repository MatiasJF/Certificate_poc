import { createCredentialIssuerHandler } from "@bsv/simple/server";

const handler = createCredentialIssuerHandler({
  schemas: [
    {
      id: "certificate/v2",
      name: "CertificateCredential",
      fields: [
        { key: "templateId", label: "Template ID", type: "text", required: true },
        { key: "templateName", label: "Template Name", type: "text" },
        { key: "certificateTxid", label: "Certificate Txid", type: "text", required: true },
        { key: "imageSha256", label: "Image SHA-256", type: "text", required: true },
        { key: "recipient", label: "Recipient", type: "text", required: true },
        { key: "issuer", label: "Issuer", type: "text" },
        { key: "issuedAt", label: "Issued At", type: "text", required: true },
        { key: "fieldsJson", label: "Fields JSON", type: "text", required: true }
      ]
    },
    // Legacy schema retained so already-issued VCs remain listable.
    {
      id: "aph-attendance",
      name: "HackathonAttendanceCredential",
      fields: [
        { key: "recipient", label: "Recipient", type: "text", required: true },
        { key: "event", label: "Event", type: "text", required: true },
        { key: "role", label: "Role", type: "text" },
        { key: "date", label: "Date", type: "text", required: true },
        { key: "issuer", label: "Issuer", type: "text", required: true }
      ]
    }
  ]
});

export const GET = handler.GET;
export const POST = handler.POST;
