"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/admin/grades", label: "Βαθμολόγιο", exact: true },
  { href: "/admin/grades/final", label: "Αλγόριθμος" },
  { href: "/admin/grades/missing", label: "Χρωστούμενα" },
  { href: "/admin/grades/seats", label: "Πλάνο" },
  { href: "/admin/grades/exams", label: "Προγραμματισμός" },
  { href: "/admin/grades/settings", label: "Ρυθμίσεις" },
] as const;

/** Υπομενού της βαθμολογίας· κρατά το επιλεγμένο τμήμα (?section=) από σελίδα σε σελίδα. */
export function GradesNav() {
  const pathname = usePathname();
  const section = useSearchParams().get("section");
  const query = section ? `?section=${section}` : "";

  return (
    <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b px-1">
      {TABS.map((t) => {
        const active =
          "exact" in t
            ? pathname === t.href || /^\/admin\/grades\/(new|\d+)/.test(pathname)
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href + query}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
