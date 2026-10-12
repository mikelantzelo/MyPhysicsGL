import { NativeSelect } from "@/components/ui/native-select";
import type { Section } from "@/lib/admin";

/** Το τμήμα από το ?section=, αλλιώς το πρώτο με μαθητές. */
export function pickSection(sections: Section[], param: unknown): Section | undefined {
  const id = Number(param) || sections.find((s) => s.students > 0)?.id;
  return sections.find((s) => s.id === id);
}

/** Φόρμα GET «Τμήμα → Προβολή», με προαιρετικά κουμπιά δεξιά. */
export function SectionPicker({
  sections,
  selected,
  children,
}: {
  sections: Section[];
  selected: Section | undefined;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end sm:justify-between">
      <form method="get" className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Τμήμα</span>
          <NativeSelect name="section" defaultValue={selected?.id}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.students} μαθητές)
              </option>
            ))}
          </NativeSelect>
        </label>
        <button type="submit" className="h-8 rounded-lg border px-3 text-sm hover:bg-accent">
          Προβολή
        </button>
      </form>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
