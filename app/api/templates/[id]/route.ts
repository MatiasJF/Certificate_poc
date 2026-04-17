import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWalletSignedRequest } from "@/lib/auth";

function toTemplateDTO(t: {
  id: string;
  name: string;
  description: string | null;
  width: number;
  height: number;
  svgTemplate: string;
  svgBackground: string | null;
  fabricJson: unknown;
  fieldSchema: unknown;
  ownerAddress: string;
  visibility: "PRIVATE" | "PUBLIC";
  publishedTxid: string | null;
  thumbnailUrl: string | null;
}) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    width: t.width,
    height: t.height,
    svgTemplate: t.svgTemplate,
    svgBackground: t.svgBackground,
    fabricJson: t.fabricJson,
    fields: Array.isArray(t.fieldSchema) ? t.fieldSchema : [],
    ownerAddress: t.ownerAddress,
    visibility: t.visibility,
    publishedTxid: t.publishedTxid,
    thumbnailUrl: t.thumbnailUrl
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Private templates are currently readable by anyone with the link — add gating later if needed.
  return NextResponse.json({ template: toTemplateDTO(t) });
}

type UpdateBody = Partial<{
  name: string;
  description: string;
  fabricJson: unknown;
  svgTemplate: string;
  svgBackground: string | null;
  width: number;
  height: number;
  fieldSchema: unknown;
  visibility: "PRIVATE" | "PUBLIC";
  thumbnailUrl: string | null;
}>;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const auth = await verifyWalletSignedRequest(req, body);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerPublicKey !== auth.principal.publicKey) {
    return NextResponse.json({ error: "Not the owner" }, { status: 403 });
  }

  const updated = await prisma.template.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.slice(0, 120) } : {}),
      ...(body.description !== undefined ? { description: body.description?.slice(0, 500) } : {}),
      ...(body.fabricJson !== undefined ? { fabricJson: body.fabricJson as object } : {}),
      ...(body.svgTemplate !== undefined ? { svgTemplate: body.svgTemplate } : {}),
      ...(body.svgBackground !== undefined ? { svgBackground: body.svgBackground } : {}),
      ...(body.width !== undefined ? { width: body.width } : {}),
      ...(body.height !== undefined ? { height: body.height } : {}),
      ...(body.fieldSchema !== undefined ? { fieldSchema: body.fieldSchema as object } : {}),
      ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
      ...(body.thumbnailUrl !== undefined ? { thumbnailUrl: body.thumbnailUrl } : {})
    }
  });
  return NextResponse.json({ template: toTemplateDTO(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await verifyWalletSignedRequest(req, null);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerPublicKey !== auth.principal.publicKey) {
    return NextResponse.json({ error: "Not the owner" }, { status: 403 });
  }

  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
