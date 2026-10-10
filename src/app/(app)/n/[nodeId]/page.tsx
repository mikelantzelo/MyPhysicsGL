import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { SectionTabs } from "@/components/section-tabs";
import { getUser } from "@/lib/auth";
import { getNode } from "@/lib/data";

export default async function NodePage({ params }: PageProps<"/n/[nodeId]">) {
  const { nodeId } = await params;

  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.level) redirect("/");

  const data = await getNode(nodeId, user.level);
  if (!data) notFound();

  const { node, children } = data;
  const isLeaf = children.length === 0;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      {/* Η διαδρομή φαίνεται ήδη στο μενού· εδώ μόνο ο τίτλος, για να μένει
          όλος ο χώρος στο περιεχόμενο. */}
      <h1
        className={
          isLeaf
            ? "truncate text-base font-semibold sm:text-lg"
            : "text-balance text-xl font-semibold sm:text-2xl"
        }
      >
        {node.name} {node.title}
      </h1>

      {/*
        Τα tabs (Παρουσίαση, Προσομοίωση, …) εμφανίζονται ΜΟΝΟ στο τελευταίο
        επίπεδο — όταν ο επιλεγμένος κόμβος δεν έχει παιδιά. Αλλιώς δείχνουμε
        τη λίστα με τα παιδιά για να προχωρήσει ο μαθητής πιο βαθιά.
      */}
      {children.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/n/${child.id}`}
                className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="inline-flex shrink-0 items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {child.name}
                </span>
                <span className="min-w-0 flex-1 truncate">{child.title}</span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <SectionTabs />
      )}
    </div>
  );
}
