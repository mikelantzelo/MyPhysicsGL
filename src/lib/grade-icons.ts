import {
  AngryIcon,
  CheckIcon,
  CircleMinusIcon,
  FrownIcon,
  LaughIcon,
  type LucideIcon,
  MehIcon,
  PlusIcon,
  SmileIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";

/**
 * Εικονίδια κελιού βαθμολογίας — ίδιοι κωδικοί με το MyClass
 * (getQuizResultImage: 0 = κανένα, 1–12), αποθηκεύονται στο `studentScore.icon`.
 * Χωρίς `server-only`: τα χρησιμοποιούν και client components.
 */
export const GRADE_ICONS: { id: number; label: string; Icon: LucideIcon; className: string }[] = [
  { id: 1, label: "Εντάξει", Icon: CheckIcon, className: "text-emerald-600 dark:text-emerald-400" },
  { id: 2, label: "Συν", Icon: PlusIcon, className: "text-emerald-600 dark:text-emerald-400" },
  { id: 3, label: "Διαγραφή", Icon: Trash2Icon, className: "text-rose-600 dark:text-rose-400" },
  { id: 4, label: "Προσοχή", Icon: TriangleAlertIcon, className: "text-amber-600 dark:text-amber-400" },
  { id: 5, label: "Μπράβο", Icon: ThumbsUpIcon, className: "text-emerald-600 dark:text-emerald-400" },
  { id: 6, label: "Όχι καλά", Icon: ThumbsDownIcon, className: "text-rose-600 dark:text-rose-400" },
  { id: 7, label: "Πολύ δυσαρεστημένος", Icon: AngryIcon, className: "text-rose-600 dark:text-rose-400" },
  { id: 8, label: "Δυσαρεστημένος", Icon: FrownIcon, className: "text-orange-600 dark:text-orange-400" },
  { id: 9, label: "Ουδέτερος", Icon: MehIcon, className: "text-amber-600 dark:text-amber-400" },
  { id: 10, label: "Ικανοποιημένος", Icon: SmileIcon, className: "text-lime-600 dark:text-lime-400" },
  { id: 11, label: "Πολύ ικανοποιημένος", Icon: LaughIcon, className: "text-emerald-600 dark:text-emerald-400" },
  { id: 12, label: "Μείον", Icon: CircleMinusIcon, className: "text-rose-600 dark:text-rose-400" },
];

export const gradeIcon = (id: number | null | undefined) =>
  id ? GRADE_ICONS.find((i) => i.id === id) : undefined;
