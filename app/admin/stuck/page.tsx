"use client";

import { useState } from "react";
import { WalletClient } from "@bsv/sdk";
import { WalletConnect } from "@/certificate-kit";

type ActionStatus =
  | "completed"
  | "unprocessed"
  | "sending"
  | "unproven"
  | "unsigned"
  | "nosend"
  | "nonfinal"
  | "failed";

type ActionRow = {
  txid: string;
  status: ActionStatus;
  description: string;
  satoshis: number;
  labels?: string[];
};

type OutputRow = {
  outpoint: string;
  satoshis: number;
  spendable?: boolean;
  labels?: string[];
  tags?: string[];
};

const STUCK_STATUSES: ActionStatus[] = [
  "unprocessed",
  "sending",
  "unproven",
  "unsigned",
  "nosend",
  "nonfinal",
  "failed"
];

const BASKETS = ["certificate-poc-issued", "default"];

export default function StuckAdminPage() {
  const [client, setClient] = useState<WalletClient | null>(null);
  const [actions, setActions] = useState<ActionRow[] | null>(null);
  const [outputsByBasket, setOutputsByBasket] = useState<Record<string, OutputRow[]>>({});
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const addLog = (line: string) =>
    setLog((prev) => [...prev, `${new Date().toISOString().split("T")[1].slice(0, 8)}  ${line}`]);

  const loadActions = async () => {
    if (!client) return;
    setBusy(true);
    try {
      const res = (await client.listActions({
        labels: ["certificate"],
        labelQueryMode: "any",
        includeLabels: true,
        limit: 100,
        offset: 0
      })) as unknown as { actions: ActionRow[]; totalActions: number };
      setActions(res.actions ?? []);
      addLog(`listActions returned ${res.actions?.length ?? 0} actions (of ${res.totalActions})`);
    } catch (e) {
      addLog(`listActions failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const loadOutputs = async (basket: string) => {
    if (!client) return;
    setBusy(true);
    try {
      const res = (await client.listOutputs({
        basket,
        includeTags: true,
        includeLabels: true,
        limit: 200
      })) as unknown as { outputs: OutputRow[]; totalOutputs: number };
      setOutputsByBasket((prev) => ({ ...prev, [basket]: res.outputs ?? [] }));
      addLog(`listOutputs(${basket}) returned ${res.outputs?.length ?? 0}`);
    } catch (e) {
      addLog(`listOutputs(${basket}) failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const relinquish = async (basket: string, outpoint: string) => {
    if (!client) return;
    setBusy(true);
    try {
      await client.relinquishOutput({ basket, output: outpoint });
      addLog(`relinquishOutput(${basket}, ${outpoint}) ok`);
      await loadOutputs(basket);
    } catch (e) {
      addLog(`relinquishOutput failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const cleanStuckState = async () => {
    if (!client) return;
    setBusy(true);
    addLog("Starting stuck-state sweep…");
    try {
      // 1. List certificate actions to find stuck txids
      const actionsRes = (await client.listActions({
        labels: ["certificate"],
        labelQueryMode: "any",
        includeLabels: false,
        limit: 500,
        offset: 0
      })) as unknown as { actions: ActionRow[] };
      const actions = actionsRes.actions ?? [];
      setActions(actions);
      const stuckTxids = new Set(
        actions.filter((a) => STUCK_STATUSES.includes(a.status) && a.txid).map((a) => a.txid)
      );
      addLog(`Found ${actions.length} actions, ${stuckTxids.size} stuck.`);

      if (stuckTxids.size === 0) {
        addLog("Nothing to clean.");
        return;
      }

      // 2. For each basket, list outputs and relinquish any whose parent is stuck
      let totalRelinquished = 0;
      for (const basket of BASKETS) {
        try {
          const outRes = (await client.listOutputs({
            basket,
            includeTags: true,
            includeLabels: true,
            limit: 500
          })) as unknown as { outputs: OutputRow[] };
          const outputs = outRes.outputs ?? [];
          setOutputsByBasket((prev) => ({ ...prev, [basket]: outputs }));
          const targets = outputs.filter((o) => {
            const parentTxid = o.outpoint.split(".")[0];
            return stuckTxids.has(parentTxid);
          });
          addLog(`Basket ${basket}: ${outputs.length} outputs, ${targets.length} targets.`);
          for (const o of targets) {
            try {
              await client.relinquishOutput({ basket, output: o.outpoint });
              addLog(`  relinquished ${o.outpoint}`);
              totalRelinquished++;
            } catch (e) {
              addLog(`  relinquish ${o.outpoint} failed: ${(e as Error).message}`);
            }
          }
        } catch (e) {
          addLog(`listOutputs(${basket}) failed: ${(e as Error).message}`);
        }
      }
      addLog(`Sweep done. Relinquished ${totalRelinquished} output(s).`);
    } catch (e) {
      addLog(`Sweep failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Wallet state diagnostics</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Lists certificate-labeled actions in your BRC-100 wallet and the outputs in our baskets.
          Use this to clear phantom UTXOs from failed / delayed-broadcast inscriptions.
        </p>
      </div>

      <WalletConnect onConnected={(c) => setClient(c)} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!client || busy}
          onClick={cleanStuckState}
          className="rounded bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2 text-sm font-semibold text-zinc-950 shadow hover:brightness-110 disabled:opacity-40"
        >
          🧹 Clean stuck state (auto)
        </button>
        <button
          type="button"
          disabled={!client || busy}
          onClick={loadActions}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-cyan-400 disabled:opacity-40"
        >
          List certificate actions
        </button>
        {BASKETS.map((b) => (
          <button
            key={b}
            type="button"
            disabled={!client || busy}
            onClick={() => loadOutputs(b)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-cyan-400 disabled:opacity-40"
          >
            List outputs in {b}
          </button>
        ))}
      </div>

      {actions && (
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Actions</h2>
          {actions.length === 0 ? (
            <p className="text-sm text-zinc-500">No certificate-labeled actions found.</p>
          ) : (
            <div className="grid gap-2">
              {actions.map((a) => {
                const stuck = STUCK_STATUSES.includes(a.status);
                return (
                  <div
                    key={a.txid}
                    className={`grid gap-1 rounded border p-3 text-sm ${
                      stuck
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-zinc-800 bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] ${
                          stuck ? "bg-amber-500/20 text-amber-200" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {a.status}
                      </span>
                      <span className="text-xs text-zinc-500">{a.satoshis} sat</span>
                    </div>
                    <div className="text-zinc-200">{a.description}</div>
                    <div className="font-mono text-[11px] text-zinc-500 break-all">{a.txid}</div>
                    {stuck && (
                      <div className="pt-1 text-xs text-amber-200/70">
                        Use "🧹 Clean stuck state" above to relinquish outputs referencing this tx.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {Object.entries(outputsByBasket).map(([basket, rows]) => (
        <section key={basket}>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-400">
            Outputs · basket <code>{basket}</code>
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">None.</p>
          ) : (
            <div className="grid gap-2">
              {rows.map((o) => (
                <div
                  key={o.outpoint}
                  className="grid gap-1 rounded border border-zinc-800 bg-zinc-900/60 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-300 break-all">{o.outpoint}</span>
                    <span className="text-xs text-zinc-500">{o.satoshis} sat</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => relinquish(basket, o.outpoint)}
                      className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-200 hover:bg-red-500/20"
                    >
                      Relinquish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Log</h2>
        <pre className="max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
          {log.length === 0 ? "(empty)" : log.join("\n")}
        </pre>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        <h3 className="mb-2 text-zinc-200">How to fix a stuck wallet</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Click <strong>🧹 Clean stuck state</strong>. It lists your certificate actions, finds the ones not yet confirmed on chain, and relinquishes any outputs in <code>certificate-poc-issued</code> or <code>default</code> that reference those stuck parents.</li>
          <li>Watch the log — it reports exactly what it relinquished.</li>
          <li>Reload <a href="/" className="text-cyan-300 hover:underline">/</a> and issue a new certificate. If the wallet still references phantom UTXOs after one sweep, run the sweep again or send a small amount to yourself in MetaNet Desktop to force a UTXO refresh.</li>
          <li>Use the individual "List …" buttons if you want to inspect state without mutating anything.</li>
        </ol>
      </section>
    </main>
  );
}
