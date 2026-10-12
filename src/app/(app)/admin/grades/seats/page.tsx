import { SeatPlan } from "@/components/admin/seat-plan";
import { pickSection, SectionPicker } from "@/components/admin/section-picker";
import { listSectionStudents, listSections } from "@/lib/admin";
import { getLayout, listSeats } from "@/lib/seats";

export const metadata = { title: "Πλάνο · Διαχείριση" };

export default async function SeatsPage({ searchParams }: PageProps<"/admin/grades/seats">) {
  const params = await searchParams;
  const sections = await listSections();
  const section = pickSection(sections, params.section);

  const [students, layout, seats] = section
    ? await Promise.all([listSectionStudents(section.id), getLayout(section.id), listSeats(section.id)])
    : [[], null, []];

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden">
        <SectionPicker sections={sections} selected={section} />
      </div>
      {section && layout && (
        <SeatPlan
          key={JSON.stringify([section.id, layout, seats])}
          sectionId={section.id}
          sectionLabel={section.label}
          students={students}
          layout={layout}
          seats={seats}
        />
      )}
    </div>
  );
}
