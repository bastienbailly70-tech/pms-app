"use server";

import { importFromUrl, type ImportedProperty } from "@/lib/property-importer";

type ImportResult =
  | { ok: true; data: ImportedProperty }
  | { ok: false; error: string };

export async function importPropertyFromUrl(url: string): Promise<ImportResult> {
  if (!url?.trim()) return { ok: false, error: "Entrez une URL." };

  try {
    const data = await importFromUrl(url.trim());
    if (!data.name && !data.city) {
      return { ok: false, error: "Impossible d'extraire les données de cette page. Essayez une autre URL ou remplissez le formulaire manuellement." };
    }
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}
