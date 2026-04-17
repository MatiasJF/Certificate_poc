import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWalletSignedRequest } from "@/lib/auth";

type IndexBody = {
  txid: string;
  templateId?: string;
  recipientData: Record<string, string>;
  imageSha256: string;
  schemaVersion?: string;
  issuerPubKey?: string;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const issuer = url.searchParams.get("issuer");
  const templateId = url.searchParams.get("templateId");

  const where: Record<string, string> = {};
  if (issuer) where.issuerAddress = issuer;
  if (templateId) where.templateId = templateId;

  const rows = await prisma.certificate.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    take: 200,
    include: {
      template: { select: { id: true, name: true, thumbnailUrl: true } }
    }
  });
  return NextResponse.json({ certificates: rows });
}

export async function POST(req: NextRequest) {
  let body: IndexBody;
  try {
    body = (await req.json()) as IndexBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const auth = await verifyWalletSignedRequest(req, body);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  if (!body.txid || !body.imageSha256) {
    return NextResponse.json({ error: "txid and imageSha256 required" }, { status: 400 });
  }

  // Upsert on txid (retry-safe).
  const row = await prisma.certificate.upsert({
    where: { txid: body.txid },
    create: {
      txid: body.txid,
      templateId: body.templateId ?? null,
      issuerAddress: auth.principal.address,
      issuerPubKey: body.issuerPubKey ?? auth.principal.publicKey,
      recipientData: body.recipientData,
      imageSha256: body.imageSha256,
      schemaVersion: body.schemaVersion ?? "certificate/v2"
    },
    update: {} // immutable once indexed
  });
  return NextResponse.json({ certificate: row }, { status: 201 });
}
