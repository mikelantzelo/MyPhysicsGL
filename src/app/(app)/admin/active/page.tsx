import { ActiveSelect } from "@/components/admin/active-select";
import { flattenTree, type NodeOption } from "@/components/admin/node-options";
import { getActiveBySection, listSections } from "@/lib/admin";
import { getNodeTree } from "@/lib/data";
import { LEVEL_LABELS, type Level } from "@/lib/types";

export const metadata = { title: "Ενεργή παράγραφος · Διαχείριση" };

export default async function AdminActivePage() {
  const [sections, active] = await Promise.all([listSections(), getActiveBySection()]);

  const levels = [...new Set(sections.map((s) => s.level).filter(Boolean))] as Level[];
  const optionsByLevel = new Map<Level, NodeOption[]>(
    await Promise.all(
      levels.map(async (l) => [l, flattenTree(await getNodeTree(l))] as const),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Η ενεργή παράγραφος ανοίγει αυτόματα στους μαθητές του τμήματος όταν
        συνδέονται και φαίνεται με πορτοκαλί στο μενού τους.
      </p>

      {levels.map((level) => (
        <section key={level} className="flex flex-col gap-2">
          <h2 className="font-semibold">{LEVEL_LABELS[level]}</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {sections
              .filter((s) => s.level === level)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{s.label}</span>
                    {s.custom && (
                      <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-xs text-violet-600 dark:text-violet-400">
                        ιδιαίτερο
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {s.students} μαθητές
                    </span>
                  </div>
                  <ActiveSelect
                    sectionId={s.id}
                    sectionLabel={s.label}
                    current={active.get(s.id) ?? null}
                    options={optionsByLevel.get(level) ?? []}
                  />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
