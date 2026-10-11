import type { NodeTree } from "@/lib/types";

export type NodeOption = { id: string; label: string; depth: number };

/** Το δέντρο μιας τάξης ως επίπεδη λίστα (για <select>), με βάθος για εσοχή. */
export function flattenTree(tree: NodeTree[]): NodeOption[] {
  const out: NodeOption[] = [];
  const walk = (nodes: NodeTree[]) => {
    for (const n of nodes) {
      out.push({ id: n.id, label: `${n.name} ${n.title}`.replace(/\s+/g, " ").trim(), depth: n.depth });
      walk(n.children);
    }
  };
  walk(tree);
  return out;
}

/** Ετικέτα επιλογής με εσοχή (μη-σπαστά κενά, ώστε να φαίνεται μέσα σε <option>). */
export const indented = (o: NodeOption) => "\u00A0\u00A0\u00A0".repeat(o.depth) + o.label;
