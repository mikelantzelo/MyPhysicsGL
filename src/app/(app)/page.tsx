import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import { getActiveNodeIds, getNodeTree } from "@/lib/data";
import { LEVEL_LABELS, type NodeTree } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  if (!user.level) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-muted-foreground">
        Ο λογαριασμός σου δεν έχει ακόμα τάξη. Επικοινώνησε με τον καθηγητή σου.
      </div>
    );
  }

  const [tree, liveIds] = await Promise.all([
    getNodeTree(user.level),
    getActiveNodeIds(user.id),
  ]);

  // Πρώτα η ενεργή παράγραφος του τμήματος (αν ανήκει στην τάξη του μαθητή),
  // αλλιώς το πρώτο κεφάλαιο.
  const inTree = (nodes: NodeTree[], id: string): boolean =>
    nodes.some((n) => n.id === id || inTree(n.children, id));
  const live = liveIds.find((id) => inTree(tree, id));
  if (live) redirect(`/n/${live}`);
  if (tree[0]) redirect(`/n/${tree[0].id}`);

  return (
    <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-muted-foreground">
      Δεν υπάρχει ακόμα περιεχόμενο για {LEVEL_LABELS[user.level]}.
    </div>
  );
}
