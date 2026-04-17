import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TemplateEditor from "../../_editor/TemplateEditor";
import type { TemplateField } from "@/certificate-kit";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t) notFound();

  const fields = Array.isArray(t.fieldSchema) ? (t.fieldSchema as unknown as TemplateField[]) : [];

  return (
    <main className="grid gap-4">
      <h1 className="text-2xl font-semibold text-zinc-100">Edit · {t.name}</h1>
      <TemplateEditor
        initial={{
          id: t.id,
          name: t.name,
          description: t.description,
          width: t.width,
          height: t.height,
          fabricJson: t.fabricJson,
          svgBackground: t.svgBackground,
          fields,
          visibility: t.visibility
        }}
      />
    </main>
  );
}
