import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import { getNodeTree } from "@/lib/data";
import { LEVEL_LABELS } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  if (!user.level) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Ο λογαριασμός σου δεν έχει ακόμα τάξη. Επικοινώνησε με τον καθηγητή σου.
      </div>
    );
  }

  // Πήγαινε κατευθείαν στο πρώτο κεφάλαιο, αν υπάρχει.
  const tree = await getNodeTree(user.level);
  if (tree[0]) redirect(`/n/${tree[0].id}`);

  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      Δεν υπάρχει ακόμα περιεχόμενο για {LEVEL_LABELS[user.level]}.
    </div>
  );
}
