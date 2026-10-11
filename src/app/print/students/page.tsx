import { headers } from "next/headers";

import { AutoPrint } from "@/components/admin/auto-print";
import { listSections, requireAdmin } from "@/lib/admin";
import { SCHOOL_NAME } from "@/lib/branding";
import { listStudents } from "@/lib/students";

export const metadata = { title: "Κάρτες σύνδεσης" };

/** Κάρτες για κόψιμο: όνομα, τμήμα, διεύθυνση και κωδικός κάθε μαθητή. */
export default async function PrintStudentsPage({
  searchParams,
}: PageProps<"/print/students">) {
  await requireAdmin();
  const params = await searchParams;
  const raw = typeof params.section === "string" ? params.section : "all";
  const section: number | "none" | "all" =
    raw === "none" || raw === "all" ? raw : Number(raw) || "all";

  const [sections, students] = await Promise.all([listSections(), listStudents(section)]);
  const label = new Map(sections.map((s) => [s.id, s.label]));
  const withCode = students.filter((s) => s.loginCode);

  // Ομάδες ανά τμήμα, με τη σειρά των τμημάτων· «Χωρίς τμήμα» στο τέλος.
  const order = new Map(sections.map((s, i) => [s.id, i]));
  const groups = new Map<number | null, typeof withCode>();
  for (const s of withCode) {
    const list = groups.get(s.sectionId) ?? [];
    list.push(s);
    groups.set(s.sectionId, list);
  }
  const grouped = [...groups.entries()].sort(
    ([a], [b]) => (a == null ? 1e9 : (order.get(a) ?? 1e8)) - (b == null ? 1e9 : (order.get(b) ?? 1e8)),
  );

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const site = `${proto}://${host}`;

  return (
    <main className="min-h-svh bg-white p-6 text-black">
      <AutoPrint />
      {withCode.length === 0 ? (
        <p>Κανένας μαθητής με κωδικό σε αυτή την επιλογή.</p>
      ) : (
        grouped.map(([sectionId, list], i) => {
          const name = sectionId == null ? "Χωρίς τμήμα" : (label.get(sectionId) ?? "—");
          return (
            // Κάθε τμήμα σε νέα σελίδα, για να μοιράζονται χωριστά.
            <section key={sectionId ?? "none"} className={i > 0 ? "mt-8 break-before-page print:mt-0" : ""}>
              <h2 className="mb-3 border-b border-gray-300 pb-1 text-lg font-bold">
                {name}{" "}
                <span className="text-sm font-normal text-gray-500">· {list.length} {list.length === 1 ? "μαθητής" : "μαθητές"}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
                {list.map((s) => (
                  <div
                    key={s.id}
                    className="break-inside-avoid rounded-lg border border-dashed border-gray-400 p-3"
                  >
                    <p className="text-xs text-gray-500">{SCHOOL_NAME}</p>
                    <p className="font-semibold leading-tight">{s.name}</p>
                    <p className="text-xs text-gray-600">Τμήμα {name}</p>
                    <p className="mt-2 text-xs text-gray-500">{site}</p>
                    <p className="font-mono text-lg tracking-widest">{s.loginCode}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
