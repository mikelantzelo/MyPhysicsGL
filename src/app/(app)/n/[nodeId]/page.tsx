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

  const { node, ancestors, children } = data;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div>
        {ancestors.length > 0 && (
          <nav className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
            {ancestors.map((a) => (
              <span key={a.id} className="flex items-center gap-1">
                <Link href={`/n/${a.id}`} className="hover:underline">
                  {a.name} {a.title}
                </Link>
                <span>/</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-balance text-xl font-semibold sm:text-2xl">
          {node.name} {node.title}
        </h1>
      </div>

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
                className="flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm hover:bg-accent"
              >
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">{child.name}</span>{" "}
                  {child.title}
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
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
