import { createCredentialIssuerHandler } from "@bsv/simple/server";

const handler = createCredentialIssuerHandler({
  schemas: [
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
