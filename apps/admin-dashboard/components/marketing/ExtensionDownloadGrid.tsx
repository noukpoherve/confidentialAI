import type { Dictionary } from "../../lib/i18n";
import { extensionLinks, type BrowserId } from "../../lib/extension-links";

const order: BrowserId[] = ["chrome", "edge", "firefox", "safari"];

export function ExtensionDownloadGrid({ dict }: { dict: Dictionary }) {
  const l = dict.landing;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {order.map((id) => {
        const cfg = extensionLinks[id];
        const label = l[cfg.labelKey];
        return (
          <a
            key={id}
            href={cfg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-2xl border border-emerald-200/60 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">{label}</h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  cfg.available ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {cfg.available ? l.statusLive : l.statusSoon}
              </span>
            </div>
            {cfg.hint ? <p className="mt-2 text-sm text-slate-500">{cfg.hint}</p> : null}
            <span className="mt-3 text-sm font-medium text-emerald-700 group-hover:underline">
              {cfg.available ? `${l.visitStore} →` : `${l.visitStorePlaceholder} →`}
            </span>
          </a>
        );
      })}
      <a
        href="#developer-install"
        className="flex flex-col rounded-2xl border border-dashed border-emerald-300/80 bg-white/80 p-5 transition hover:border-emerald-400 hover:bg-white"
      >
        <h3 className="text-base font-semibold text-slate-900">{l.devBuild}</h3>
        <p className="mt-2 text-sm text-slate-600">{l.devBuildHint}</p>
        <span className="mt-3 text-sm font-medium text-slate-700">↓</span>
      </a>
    </div>
  );
}
