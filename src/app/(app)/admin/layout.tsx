import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin";

/** Όλο το /admin μόνο για χρήστες με label `admin` (αλλιώς 404). */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl">Διαχείριση</h1>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
