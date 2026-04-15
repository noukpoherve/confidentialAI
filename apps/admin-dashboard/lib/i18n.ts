import type en from "../i18n/en.json";

export type Locale = "en" | "fr";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("../i18n/en.json").then((m) => m.default),
  fr: () => import("../i18n/fr.json").then((m) => m.default),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  const key: Locale = locale === "fr" ? "fr" : "en";
  return dictionaries[key]();
}

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "fr";
}
