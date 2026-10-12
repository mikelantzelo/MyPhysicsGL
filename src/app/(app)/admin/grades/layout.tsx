import { Suspense } from "react";

import { GradesNav } from "@/components/admin/grades-nav";

export default function GradesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* useSearchParams → Suspense, ώστε να μη γίνεται όλη η σελίδα client-side. */}
      <Suspense fallback={<div className="h-10 border-b" />}>
        <GradesNav />
      </Suspense>
      {children}
    </div>
  );
}
