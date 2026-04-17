import TemplateEditor from "../_editor/TemplateEditor";

export default function NewTemplatePage() {
  return (
    <main className="grid gap-4">
      <h1 className="text-2xl font-semibold text-zinc-100">New template</h1>
      <TemplateEditor />
    </main>
  );
}
