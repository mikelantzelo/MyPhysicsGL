"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PrinterIcon } from "lucide-react";
import { toast } from "sonner";

import { arrangeSeats, moveSeat, resizeSeats } from "@/app/seat-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { Layout, Seat, SeatPos } from "@/lib/seats";

const btn = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-accent disabled:opacity-50";
const input =
  "h-8 w-14 rounded-lg border border-input bg-transparent px-2 text-center text-sm outline-none focus-visible:border-ring dark:bg-input/30";

const key = (p: SeatPos) => `${p.row}_${p.col}_${p.slot}`;

/**
 * Πλάνο θέσεων: θρανία (γραμμές × στήλες) με 2 θέσεις, έδρα κάτω δεξιά.
 * Η 1η γραμμή (row 0, η μπροστινή) σχεδιάζεται κάτω, δίπλα στην έδρα.
 * Σύρε έναν μαθητή σε θέση — ή κλικ στον μαθητή και μετά κλικ στη θέση.
 * Σε πιασμένη θέση οι δύο μαθητές ανταλλάσσονται.
 */
export function SeatPlan({
  sectionId,
  sectionLabel,
  students,
  layout,
  seats: initialSeats,
}: {
  sectionId: number;
  sectionLabel: string;
  students: { id: number; name: string }[];
  layout: Layout;
  seats: Seat[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [seats, setSeats] = useState(initialSeats);
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState(String(layout.rows));
  const [cols, setCols] = useState(String(layout.cols));

  const nameOf = new Map(students.map((s) => [s.id, s.name]));
  const at = new Map(seats.map((s) => [key(s), s.idStudent]));
  const seated = new Set(seats.map((s) => s.idStudent));
  const unseated = students.filter((s) => !seated.has(s.id));

  /** Ίδια λογική με τον server (ανταλλαγή), για άμεση ενημέρωση της οθόνης. */
  function move(idStudent: number, target: SeatPos | null) {
    setSelected(null);
    setSeats((current) => {
      const from = current.find((s) => s.idStudent === idStudent);
      const other = target && current.find((s) => key(s) === key(target));
      let next = current.filter((s) => s.idStudent !== idStudent && s.idStudent !== other?.idStudent);
      if (other && other.idStudent !== idStudent && from) {
        next = [...next, { idStudent: other.idStudent, row: from.row, col: from.col, slot: from.slot }];
      }
      if (target) next = [...next, { idStudent, ...target }];
      return next;
    });
    startTransition(async () => {
      try {
        await moveSeat(sectionId, idStudent, target);
      } catch {
        toast.error("Η αλλαγή δεν αποθηκεύτηκε.");
        router.refresh();
      }
    });
  }

  const onDrop = (target: SeatPos | null) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (id) move(id, target);
  };
  const dragProps = (id: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => e.dataTransfer.setData("text/plain", String(id)),
  });

  const chip = (id: number) => (
    <span
      {...dragProps(id)}
      className={`cursor-grab select-none truncate rounded-md px-1.5 py-1 text-xs leading-tight ${
        selected === id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-foreground"
      }`}
    >
      {nameOf.get(id)}
    </span>
  );

  function clickSeat(pos: SeatPos) {
    const occupant = at.get(key(pos));
    if (selected != null) {
      if (selected !== occupant) move(selected, pos);
      else setSelected(null);
    } else if (occupant != null) {
      setSelected(occupant);
    }
  }

  function resize() {
    const r = Number(rows);
    const c = Number(cols);
    startTransition(async () => {
      await resizeSeats(sectionId, r, c);
      router.refresh();
    });
  }

  async function arrange(mode: "alpha" | "clear") {
    const ok = await confirm({
      title: mode === "alpha" ? "Αυτόματη τοποθέτηση;" : "Άδειασμα θέσεων;",
      description:
        mode === "alpha"
          ? "Όλοι οι μαθητές μπαίνουν αλφαβητικά, από μπροστά προς τα πίσω. Οι τωρινές θέσεις χάνονται."
          : "Όλοι οι μαθητές μένουν χωρίς θέση.",
      confirmLabel: mode === "alpha" ? "Τοποθέτηση" : "Άδειασμα",
      destructive: mode === "clear",
    });
    if (!ok) return;
    startTransition(async () => {
      await arrangeSeats(sectionId, mode);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3 print:hidden">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Γραμμές</span>
          <input className={input} inputMode="numeric" value={rows} onChange={(e) => setRows(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Στήλες</span>
          <input className={input} inputMode="numeric" value={cols} onChange={(e) => setCols(e.target.value)} />
        </label>
        <button type="button" className={btn} onClick={resize} disabled={pending}>
          Εφαρμογή
        </button>
        <span className="mx-1 h-6 w-px bg-border" />
        <button type="button" className={btn} onClick={() => arrange("alpha")} disabled={pending}>
          Αυτόματα (αλφαβητικά)
        </button>
        <button type="button" className={btn} onClick={() => arrange("clear")} disabled={pending}>
          Άδειασμα
        </button>
        <button type="button" className={`${btn} ml-auto`} onClick={() => window.print()}>
          <PrinterIcon className="size-4" />
          Εκτύπωση
        </button>
        {pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="overflow-x-auto rounded-xl border bg-card p-3">
          <h3 className="mb-2 hidden font-semibold print:block">Πλάνο · {sectionLabel}</h3>
          <div
            className="grid gap-x-6 gap-y-3"
            style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(9rem, 1fr))` }}
          >
            {Array.from({ length: layout.rows }, (_, i) => layout.rows - 1 - i).flatMap((row) =>
              Array.from({ length: layout.cols }).map((_, col) => (
                <div key={`${row}_${col}`} className="grid grid-cols-2 gap-1 rounded-lg border-2 border-amber-700/30 bg-amber-500/5 p-1">
                  {[0, 1].map((slot) => {
                    const pos = { row, col, slot };
                    const occupant = at.get(key(pos));
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => clickSeat(pos)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDrop(pos)}
                        className={`flex h-12 min-w-0 items-center justify-center rounded-md border border-dashed p-0.5 ${
                          occupant != null ? "border-transparent" : "hover:border-primary hover:bg-primary/5"
                        } ${selected != null && occupant == null ? "border-primary/50" : ""}`}
                        aria-label={occupant != null ? `${nameOf.get(occupant)} — θρανίο ${row + 1}.${col + 1}` : `Κενή θέση ${row + 1}.${col + 1}`}
                      >
                        {occupant != null && chip(occupant)}
                      </button>
                    );
                  })}
                </div>
              )),
            )}
          </div>
          <div className="mt-4 ml-auto w-40 rounded-md border-2 border-dashed py-1.5 text-center text-xs text-muted-foreground">
            Έδρα / Πίνακας
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop(null)}
          onClick={(e) => {
            if (e.target === e.currentTarget && selected != null && seated.has(selected)) move(selected, null);
          }}
          className="flex flex-col gap-2 rounded-xl border bg-card p-3 print:hidden"
        >
          <h3 className="text-sm font-medium">
            Χωρίς θέση <span className="text-muted-foreground">({unseated.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Σύρε σε θέση — ή κλικ στον μαθητή και μετά στη θέση. Σύρε εδώ για να σηκωθεί.
          </p>
          <div className="flex flex-col gap-1">
            {unseated.map((s) => (
              <button
                key={s.id}
                type="button"
                {...dragProps(s.id)}
                onClick={() => setSelected(selected === s.id ? null : s.id)}
                className={`cursor-grab rounded-md px-2 py-1 text-left text-sm ${
                  selected === s.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
