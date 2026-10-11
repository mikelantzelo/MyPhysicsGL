"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon } from "lucide-react";

import { fetchUnreadCount } from "@/app/chat-actions";

const REFRESH_MS = 60_000;

/** Καμπανάκι με τα αδιάβαστα μηνύματα· ανανεώνεται σε κάθε πλοήγηση και κάθε λεπτό. */
export function UnreadBell({ initial, href }: { initial: number; href: string }) {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (document.hidden) return;
      fetchUnreadCount()
        .then((n) => alive && setCount(n))
        .catch(() => {});
    };
    refresh();
    const t = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname]);

  return (
    <Link
      href={href}
      aria-label={count ? `Μηνύματα: ${count} αδιάβαστα` : "Μηνύματα"}
      className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
    >
      <BellIcon className="size-4" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
