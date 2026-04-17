import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWalletSignedRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "all"; // "all" | "mine" | "public"
  const ownerPub = req.headers.get("x-wallet-pubkey");

  const templates = await prisma.template.findMany({
    where:
      scope === "mine"
        ? { ownerPublicKey: ownerPub ?? "__none__" }
        : scope === "public"
        ? { visibility: "PUBLIC" }
        : {
            OR: [
              { visibility: "PUBLIC" },
              ...(ownerPub ? [{ ownerPublicKey: ownerPub }] : [])
            ]
          },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      thumbnailUrl: true,
      visibility: true,
      ownerAddress: true,
      ownerPublicKey: true,
      createdAt: true,
      updatedAt: true
    }
  });
  return NextResponse.json({ templates });
}

type CreateTemplateBody = {
  name: string;
  description?: string;
  fabricJson: unknown;
  svgTemplate: string;
  svgBackground?: string;
  width: number;
  height: number;
  fieldSchema: unknown;
  visibility?: "PRIVATE" | "PUBLIC";
  thumbnailUrl?: string;
};

export async function POST(req: NextRequest) {
  let body: CreateTemplateBody;
  try {
    body = (await req.json()) as CreateTemplateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const auth = await verifyWalletSignedRequest(req, body);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  if (!body.name?.trim() || !body.svgTemplate) {
    return NextResponse.json({ error: "name and svgTemplate are required" }, { status: 400 });
  }

  const created = await prisma.template.create({
    data: {
      name: body.name.trim().slice(0, 120),
      description: body.description?.slice(0, 500),
      ownerAddress: auth.principal.address,
      ownerPublicKey: auth.principal.publicKey,
      fabricJson: body.fabricJson as object,
      svgTemplate: body.svgTemplate,
      svgBackground: body.svgBackground ?? null,
      width: body.width,
      height: body.height,
      fieldSchema: body.fieldSchema as object,
      visibility: body.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
      thumbnailUrl: body.thumbnailUrl ?? null
    }
  });

  return NextResponse.json({ template: created }, { status: 201 });
}
