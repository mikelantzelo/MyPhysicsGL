"use client";

import { useEffect } from "react";

/** Ανοίγει το παράθυρο εκτύπωσης μόλις φορτώσει η σελίδα. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mb-4 rounded-md bg-black px-4 py-1.5 text-sm text-white print:hidden"
    >
      Εκτύπωση
    </button>
  );
}
