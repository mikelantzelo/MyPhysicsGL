import "server-only";

import type { ContentNode, Level } from "./types";

const BOOKS_BASE = "https://micmichal.sites.sch.gr/new_books";

type Source = {
  base: string;
  folders: Partial<Record<Level, string>>;
  letterSeparator?: Partial<Record<Level, string>>;
  /** Όνομα αρχείου μέσα στον φάκελο της παραγράφου (προεπιλογή index.html). */
  file?: string;
};

/**
 * Το περιεχόμενο κάθε καρτέλας ανεβαίνει στο site του σχολείου, σε φάκελο
 * ανά τάξη. Τάξεις που λείπουν από `folders` δεν έχουν (ακόμα) αρχεία.
 * `letterSeparator`: τι μπαίνει πριν από το γράμμα της παραγράφου ανά τάξη
 * (προεπιλογή τίποτα → `1.2a`· με "." → `1.2.a`).
 */
const SOURCES = {
  presentation: {
    base: `${BOOKS_BASE}/StoryLine`,
    folders: { GA: "a", GB: "b", GC: "c" },
  },
  theory: {
    base: `${BOOKS_BASE}/Theory`,
    folders: { GA: "A", GB: "B", GC: "C" },
    letterSeparator: { GC: "." },
  },
  // Ίδιοι φάκελοι με τη θεωρία, άλλο αρχείο.
  exercises: {
    base: `${BOOKS_BASE}/Theory`,
    folders: { GA: "A", GB: "B", GC: "C" },
    letterSeparator: { GC: "." },
    file: "indexe.html",
  },
} satisfies Record<string, Source>;

export type ContentKind = keyof typeof SOURCES;

/**
 * Η διεύθυνση του index.html μιας παραγράφου, από το $id του κόμβου:
 * `c-1-2-a` (1.2α, Γ΄ Γυμνασίου) → `…/StoryLine/c/1.2a/index.html`.
 * Οι αριθμοί ενώνονται με τελεία, το γράμμα (α→a, β→b, γ→c, δ→d) κολλάει στο τέλος.
 */
export function contentUrl(kind: ContentKind, node: ContentNode): string | null {
  const source: Source = SOURCES[kind];
  const folder = source.folders[node.level];
  if (!folder) return null;

  const parts = node.id.split("-").slice(1);
  const numbers = parts.filter((p) => /^\d+$/.test(p));
  const letters = parts.filter((p) => !/^\d+$/.test(p)).join("");
  if (numbers.length === 0) return null;

  const sep = letters ? (source.letterSeparator?.[node.level] ?? "") : "";
  const name = numbers.join(".") + sep + letters;
  return `${source.base}/${folder}/${encodeURIComponent(name)}/${source.file ?? "index.html"}`;
}

/**
 * Το URL μόνο αν το index.html υπάρχει στον server
 * (ώστε να μη δείχνουμε σελίδα 404 μέσα στην εφαρμογή).
 * Το αποτέλεσμα κρατιέται 10 λεπτά, οπότε νέα αρχεία εμφανίζονται γρήγορα.
 */
async function findContent(
  kind: ContentKind,
  node: ContentNode,
): Promise<string | null> {
  const url = contentUrl(kind, node);
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

/** Όλα τα διαθέσιμα αρχεία μιας παραγράφου, ένα ανά καρτέλα (παράλληλα). */
export async function findAllContent(
  node: ContentNode,
): Promise<Partial<Record<ContentKind, string>>> {
  const kinds = Object.keys(SOURCES) as ContentKind[];
  const urls = await Promise.all(kinds.map((k) => findContent(k, node)));
  return Object.fromEntries(
    kinds.flatMap((k, i) => (urls[i] ? [[k, urls[i]]] : [])),
  );
}
