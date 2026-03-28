import type en from "../messages/en.json";

export type Locale = "en" | "fr";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("../messages/en.json").then((m) => m.default),
  fr: () => import("../messages/fr.json").then((m) => m.default),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  const key: Locale = locale === "fr" ? "fr" : "en";
  return dictionaries[key]();
}

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "fr";
}
