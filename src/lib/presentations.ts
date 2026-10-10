import "server-only";

import type { ContentNode, Level } from "./types";

/** Οι παρουσιάσεις Storyline ανεβαίνουν στο site του σχολείου. */
const STORYLINE_BASE = "https://micmichal.sites.sch.gr/new_books/StoryLine";

/** Φάκελος ανά τάξη. Τάξεις που λείπουν εδώ δεν έχουν (ακόμα) παρουσιάσεις. */
const LEVEL_FOLDERS: Partial<Record<Level, string>> = {
  GA: "a",
  GB: "b",
  GC: "c",
};

/**
 * Η διεύθυνση της παρουσίασης μιας παραγράφου, από το $id του κόμβου:
 * `c-1-2-a` (1.2α, Γ΄ Γυμνασίου) → `…/StoryLine/c/1.2a/index.html`.
 * Οι αριθμοί ενώνονται με τελεία, το γράμμα (α→a, β→b, γ→c, δ→d) κολλάει στο τέλος.
 */
export function presentationUrl(node: ContentNode): string | null {
  const folder = LEVEL_FOLDERS[node.level];
  if (!folder) return null;

  const parts = node.id.split("-").slice(1);
  const numbers = parts.filter((p) => /^\d+$/.test(p));
  const letters = parts.filter((p) => !/^\d+$/.test(p)).join("");
  if (numbers.length === 0) return null;

  const name = numbers.join(".") + letters;
  return `${STORYLINE_BASE}/${folder}/${encodeURIComponent(name)}/index.html`;
}

/**
 * Το URL της παρουσίασης μόνο αν το index.html υπάρχει στον server
 * (ώστε να μη δείχνουμε σελίδα 404 μέσα στην εφαρμογή).
 * Το αποτέλεσμα κρατιέται 10 λεπτά, οπότε νέα αρχεία εμφανίζονται γρήγορα.
 */
export async function findPresentation(
  node: ContentNode,
): Promise<string | null> {
  const url = presentationUrl(node);
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: "HEAD",
      next: { revalidate: 600 },
    });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}
