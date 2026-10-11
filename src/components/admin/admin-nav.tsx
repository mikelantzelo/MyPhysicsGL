"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileQuestionIcon,
  ListChecksIcon,
  MessageSquareIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";

export const ADMIN_LINKS = [
  { href: "/admin/active", label: "Ενεργή παράγραφος", icon: TargetIcon },
  { href: "/admin/results", label: "Αποτελέσματα quiz", icon: ListChecksIcon },
  { href: "/admin/questions", label: "Ερωτήσεις quiz", icon: FileQuestionIcon },
  { href: "/admin/students", label: "Μαθητές", icon: UsersIcon },
  { href: "/admin/messages", label: "Μηνύματα", icon: MessageSquareIcon },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5">
      {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
