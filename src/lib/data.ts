import "server-only";

import { Query } from "node-appwrite";

import { createAdminClient } from "./appwrite/server";
import { appwriteConfig } from "./appwrite/config";
import type { ContentNode, Level, NodeTree } from "./types";

export type { ContentNode, NodeTree } from "./types";

function toNode(row: Record<string, unknown>): ContentNode {
  return {
    id: row.$id as string,
    level: row.level as Level,
    parentId: (row.parentId as string) || null,
    name: row.name as string,
    title: row.title as string,
    order: (row.order as number) ?? 0,
  };
}

/** Όλοι οι κόμβοι μιας τάξης, με ένα query. Admin client (κενά permissions στο table). */
async function listNodes(level: Level): Promise<ContentNode[]> {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.tables.nodes,
    queries: [
      Query.equal("level", level),
      Query.orderAsc("order"),
      Query.limit(5000),
    ],
  });
  return res.rows.map((row) => toNode(row as Record<string, unknown>));
}

/**
 * Το πλήρες δέντρο πλοήγησης μιας τάξης (forest — πολλά κεφάλαια στη ρίζα).
 * Ένα query, το δέντρο χτίζεται στη μνήμη.
 */
export async function getNodeTree(level: Level): Promise<NodeTree[]> {
  const nodes = await listNodes(level);

  const byId = new Map<string, NodeTree>();
  for (const node of nodes) {
    byId.set(node.id, { ...node, depth: 0, children: [] });
  }

  const roots: NodeTree[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Βάθος + ταξινόμηση παιδιών (το query ταξινομεί συνολικά, όχι ανά κλαδί).
  const assignDepth = (node: NodeTree, depth: number) => {
    node.depth = depth;
    node.children.sort((a, b) => a.order - b.order);
    for (const child of node.children) assignDepth(child, depth + 1);
  };
  roots.sort((a, b) => a.order - b.order);
  for (const root of roots) assignDepth(root, 0);

  return roots;
}

/**
 * Ένας κόμβος μαζί με τους προγόνους του (για breadcrumb) και τα άμεσα παιδιά του.
 * `null` αν δεν βρεθεί ή δεν ανήκει στην τάξη του χρήστη.
 */
export async function getNode(
  nodeId: string,
  level: Level,
): Promise<{
  node: ContentNode;
  ancestors: ContentNode[];
  children: ContentNode[];
} | null> {
  const nodes = await listNodes(level);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const node = byId.get(nodeId);
  if (!node) return null;

  const ancestors: ContentNode[] = [];
  let cursor = node.parentId ? byId.get(node.parentId) : undefined;
  while (cursor) {
    ancestors.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  const children = nodes
    .filter((n) => n.parentId === nodeId)
    .sort((a, b) => a.order - b.order);

  return { node, ancestors, children };
}

/**
 * Οι «ενεργές» παράγραφοι (αυτές που διδάσκονται τώρα) για τον μαθητή.
 * Αλυσίδα: Appwrite user → `student.authUserId` → `sectionCrossRefStudents` →
 * τμήμα(τα) → `active` (μία γραμμή ανά τμήμα· στη στήλη `active` το $id του κόμβου).
 * Αν ένα τμήμα έχει πολλές γραμμές, κρατάμε την πιο πρόσφατα ενημερωμένη.
 */
export async function getActiveNodeIds(userId: string): Promise<string[]> {
  const { tables } = createAdminClient();
  const { databaseId } = appwriteConfig;

  const students = await tables.listRows({
    databaseId,
    tableId: appwriteConfig.tables.student,
    queries: [Query.equal("authUserId", userId), Query.limit(1)],
  });
  const studentId = students.rows[0]?.id as number | undefined;
  if (studentId == null) return [];

  const links = await tables.listRows({
    databaseId,
    tableId: appwriteConfig.tables.sectionStudents,
    queries: [Query.equal("idStudent", studentId), Query.limit(100)],
  });
  const sectionIds = links.rows.map((row) => row.idSection as number);
  if (sectionIds.length === 0) return [];

  const active = await tables.listRows({
    databaseId,
    tableId: appwriteConfig.tables.active,
    queries: [
      Query.equal("idSection", sectionIds),
      Query.orderDesc("$updatedAt"),
      Query.limit(100),
    ],
  });

  const latestPerSection = new Map<number, string>();
  for (const row of active.rows) {
    const section = row.idSection as number;
    const nodeId = row.active as string | null;
    if (nodeId && !latestPerSection.has(section)) {
      latestPerSection.set(section, nodeId);
    }
  }
  return [...new Set(latestPerSection.values())];
}
