"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "../../lib/i18n";

type KeyRow = { id: string; name: string; created: string; lastUsed: string; prefix: string };

const STORAGE = "ca-demo-api-keys";

function load(): KeyRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KeyRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(rows: KeyRow[]) {
  localStorage.setItem(STORAGE, JSON.stringify(rows));
}

function randomToken() {
  const a = typeof crypto !== "undefined" && crypto.getRandomValues;
  if (a) {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function ApiKeysClient({ dict }: { dict: Dictionary }) {
  const t = dict.apiKeys;
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [mounted, setMounted] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    setRows(load());
    setMounted(true);
  }, []);

  const create = () => {
    const secret = `ca_live_${randomToken()}`;
    const prefix = secret.slice(0, 12) + "…";
    const row: KeyRow = {
      id: randomToken(),
      name: label.trim() || "API key",
      created: new Date().toISOString().slice(0, 10),
      lastUsed: "—",
      prefix,
    };
    const next = [row, ...rows];
    setRows(next);
    save(next);
    setNewSecret(secret);
    setLabel("");
  };

  const revoke = (id: string) => {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    save(next);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-line bg-canvas p-6 text-sm text-ink-muted shadow-sm">
        …
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">{t.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t.name}
            className="min-w-[12rem] rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={create}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-canvas hover:bg-ink-muted"
          >
            {t.create}
          </button>
        </div>
      </div>

      {newSecret ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
          <p className="font-semibold">{t.once}</p>
          <code className="mt-2 block break-all rounded-lg bg-canvas px-3 py-2 font-mono text-xs text-ink">
            {newSecret}
          </code>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => copy(newSecret)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              {t.copy}
            </button>
            <button
              type="button"
              onClick={() => setNewSecret(null)}
              className="rounded-lg border border-amber-300 bg-canvas px-3 py-1.5 text-xs font-semibold text-amber-900"
            >
              {t.close}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">{t.name}</th>
              <th className="px-4 py-3">{t.created}</th>
              <th className="px-4 py-3">{t.preview}</th>
              <th className="px-4 py-3">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-line/80">
                  <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.created}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.prefix}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => revoke(r.id)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      {t.revoke}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
