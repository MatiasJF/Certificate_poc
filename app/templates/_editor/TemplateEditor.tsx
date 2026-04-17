"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Canvas, FabricObject, IText } from "fabric";
import { WalletClient } from "@bsv/sdk";
import { WalletConnect, type TemplateField, extractPlaceholders } from "@/certificate-kit";
import { walletSignedFetch } from "@/certificate-kit/signed-fetch";

type FieldTag = FabricObject & { fieldKey?: string };

type SavedPayload = {
  id?: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  fabricJson: unknown;
  svgTemplate: string;
  svgBackground?: string;
  fieldSchema: TemplateField[];
  visibility: "PRIVATE" | "PUBLIC";
};

type InitialTemplate = {
  id: string;
  name: string;
  description?: string | null;
  width: number;
  height: number;
  fabricJson: unknown;
  svgBackground?: string | null;
  fields: TemplateField[];
  visibility: "PRIVATE" | "PUBLIC";
};

type Props = {
  initial?: InitialTemplate;
};

const CANVAS_MAX_DISPLAY = 900;

export default function TemplateEditor({ initial }: Props) {
  const router = useRouter();
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const fabricModuleRef = useRef<typeof import("fabric") | null>(null);

  const [client, setClient] = useState<WalletClient | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(initial?.name ?? "Untitled certificate");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [width, setWidth] = useState(initial?.width ?? 1200);
  const [height, setHeight] = useState(initial?.height ?? 800);
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">(initial?.visibility ?? "PRIVATE");
  const [fields, setFields] = useState<TemplateField[]>(initial?.fields ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [svgBackground, setSvgBackground] = useState<string | null>(initial?.svgBackground ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Init fabric canvas ----
  useEffect(() => {
    let canceled = false;
    (async () => {
      const fabric = await import("fabric");
      if (canceled) return;
      fabricModuleRef.current = fabric;
      if (!canvasElRef.current) return;
      const c = new fabric.Canvas(canvasElRef.current, {
        backgroundColor: "#0a0a12",
        width,
        height,
        preserveObjectStacking: true
      });
      canvasRef.current = c;

      c.on("selection:created", (opt) => setSelectedId(((opt.selected?.[0] as FieldTag)?.get("id") as string) ?? null));
      c.on("selection:updated", (opt) => setSelectedId(((opt.selected?.[0] as FieldTag)?.get("id") as string) ?? null));
      c.on("selection:cleared", () => setSelectedId(null));
      c.on("object:modified", () => syncFieldsFromCanvas());
      c.on("text:changed", () => syncFieldsFromCanvas());

      if (initial?.fabricJson) {
        try {
          await c.loadFromJSON(initial.fabricJson as object);
          c.renderAll();
          syncFieldsFromCanvas();
        } catch (e) {
          setError("Could not load template JSON: " + (e as Error).message);
        }
      }

      setReady(true);
    })();
    return () => {
      canceled = true;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Resize canvas when width/height change ----
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.setDimensions({ width, height });
    c.renderAll();
  }, [width, height]);

  const syncFieldsFromCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const keys = new Set<string>();
    for (const obj of c.getObjects()) {
      const o = obj as FieldTag;
      const text = (o as IText).text;
      if (typeof text === "string") {
        for (const k of extractPlaceholders(text)) keys.add(k);
      }
      if (o.fieldKey) keys.add(o.fieldKey);
    }
    setFields((prev) => {
      const seen = new Set(prev.map((f) => f.key));
      const merged = prev.filter((f) => keys.has(f.key));
      for (const k of keys) {
        if (!seen.has(k)) {
          merged.push({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), required: false });
        }
      }
      return merged;
    });
  };

  // ---- Toolbar actions ----
  const addPlainText = () => {
    const fabric = fabricModuleRef.current;
    const c = canvasRef.current;
    if (!fabric || !c) return;
    const t = new fabric.Textbox("Text", {
      left: 100,
      top: 100,
      fill: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: 32,
      width: 400
    });
    c.add(t);
    c.setActiveObject(t);
    c.renderAll();
  };

  const addFieldText = () => {
    const fabric = fabricModuleRef.current;
    const c = canvasRef.current;
    if (!fabric || !c) return;
    const key = prompt("Field key (e.g. recipient, event, date):", "recipient");
    if (!key) return;
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "");
    if (!safeKey) {
      alert("Key must contain only letters, numbers, or underscore.");
      return;
    }
    const t = new fabric.Textbox(`{{${safeKey}}}`, {
      left: 100,
      top: 100,
      fill: "#00e6ff",
      fontFamily: "sans-serif",
      fontSize: 40,
      fontWeight: "600",
      width: 600
    });
    (t as FieldTag).fieldKey = safeKey;
    c.add(t);
    c.setActiveObject(t);
    c.renderAll();
    syncFieldsFromCanvas();
  };

  const uploadBackground = async (file: File) => {
    const fabric = fabricModuleRef.current;
    const c = canvasRef.current;
    if (!fabric || !c) return;
    const text = await file.text();
    setSvgBackground(text);
    try {
      const loaded = await fabric.loadSVGFromString(text);
      const objects = Array.isArray(loaded.objects) ? loaded.objects.filter(Boolean) : [];
      if (objects.length === 0) {
        setError("SVG had no recognizable content.");
        return;
      }
      const group = fabric.util.groupSVGElements(objects as FabricObject[], loaded.options);
      group.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        excludeFromExport: false
      });
      (group as FieldTag).fieldKey = undefined;
      if (loaded.options?.width && loaded.options?.height) {
        setWidth(Math.round(loaded.options.width as number));
        setHeight(Math.round(loaded.options.height as number));
      }
      c.add(group);
      c.sendObjectToBack(group);
      c.renderAll();
    } catch (e) {
      setError("Failed to parse SVG: " + (e as Error).message);
    }
  };

  const deleteSelected = () => {
    const c = canvasRef.current;
    if (!c) return;
    const obj = c.getActiveObject();
    if (obj) {
      c.remove(obj);
      c.discardActiveObject();
      c.renderAll();
      syncFieldsFromCanvas();
    }
  };

  // ---- Save ----
  const save = async () => {
    if (!client) {
      setError("Connect a wallet to save (templates are signed by your key).");
      return;
    }
    const c = canvasRef.current;
    if (!c) return;
    setSaving(true);
    setError(null);
    try {
      const fabricJson = c.toObject(["fieldKey"]);
      const svgTemplate = c.toSVG({
        suppressPreamble: false,
        width: String(width),
        height: String(height),
        viewBox: { x: 0, y: 0, width, height }
      });

      const payload: SavedPayload = {
        id: initial?.id,
        name: name.trim() || "Untitled",
        description: description.trim() || undefined,
        width,
        height,
        fabricJson,
        svgTemplate,
        svgBackground: svgBackground ?? undefined,
        fieldSchema: fields,
        visibility
      };

      const endpoint = initial?.id ? `/api/templates/${initial.id}` : "/api/templates";
      const method = initial?.id ? "PATCH" : "POST";
      const res = await walletSignedFetch(client, endpoint, { method, body: payload });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed: ${res.status}`);
      }
      const j = await res.json();
      const savedId: string = j.template?.id ?? initial?.id;
      router.push(savedId ? `/templates/${savedId}/edit` : "/templates");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, patch: Partial<TemplateField>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  // Visual canvas scale
  const displayScale = Math.min(1, CANVAS_MAX_DISPLAY / width);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
      {/* LEFT sidebar */}
      <aside className="grid gap-4">
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-widest text-zinc-400">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-widest text-zinc-400">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-widest text-zinc-400">Width</span>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(100, Number(e.target.value) || 0))}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-widest text-zinc-400">Height</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(100, Number(e.target.value) || 0))}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-widest text-zinc-400">Visibility</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "PRIVATE" | "PUBLIC")}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-400"
            >
              <option value="PRIVATE">Private (only me)</option>
              <option value="PUBLIC">Public (everyone)</option>
            </select>
          </label>
        </div>

        <div className="grid gap-2">
          <div className="text-xs uppercase tracking-widest text-zinc-400">Canvas</div>
          <button
            type="button"
            onClick={addPlainText}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-cyan-400"
          >
            + Text
          </button>
          <button
            type="button"
            onClick={addFieldText}
            className="rounded border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
          >
            + Field
          </button>
          <label className="cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-sm text-zinc-100 hover:border-cyan-400">
            Upload SVG background
            <input
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadBackground(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={!selectedId}
            className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-40"
          >
            Delete selected
          </button>
        </div>

        <WalletConnect onConnected={(c) => setClient(c)} />
        <button
          type="button"
          onClick={save}
          disabled={!ready || saving || !client}
          className="rounded bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2 font-semibold text-zinc-950 shadow hover:brightness-110 disabled:opacity-40"
        >
          {saving ? "Saving…" : initial?.id ? "Save changes" : "Create template"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </aside>

      {/* MIDDLE canvas */}
      <div className="overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4">
        <div
          className="relative inline-block origin-top-left"
          style={{ transform: `scale(${displayScale})`, width, height }}
        >
          <canvas ref={canvasElRef} width={width} height={height} />
        </div>
      </div>

      {/* RIGHT sidebar — fields */}
      <aside className="grid gap-3">
        <div className="text-xs uppercase tracking-widest text-zinc-400">Fields</div>
        {fields.length === 0 && (
          <p className="text-sm text-zinc-500">
            Add a <span className="text-cyan-300">+ Field</span> from the toolbar. Text objects containing{" "}
            <code className="text-cyan-300">{"{{key}}"}</code> are detected automatically.
          </p>
        )}
        {fields.map((f) => (
          <div key={f.key} className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="font-mono text-xs text-cyan-300">{`{{${f.key}}}`}</div>
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-widest text-zinc-400">Label</span>
              <input
                value={f.label}
                onChange={(e) => updateField(f.key, { label: e.target.value })}
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-cyan-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-widest text-zinc-400">Type</span>
                <select
                  value={f.type ?? "text"}
                  onChange={(e) =>
                    updateField(f.key, { type: e.target.value as TemplateField["type"] })
                  }
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-cyan-400"
                >
                  <option value="text">text</option>
                  <option value="date">date</option>
                  <option value="longText">longText</option>
                </select>
              </label>
              <label className="flex items-end gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) => updateField(f.key, { required: e.target.checked })}
                />
                required
              </label>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
