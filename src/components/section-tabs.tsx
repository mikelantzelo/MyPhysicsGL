"use client";

import {
  BookOpenIcon,
  ClipboardListIcon,
  FileTextIcon,
  MonitorPlayIcon,
  PresentationIcon,
  SparklesIcon,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Κάθε tab έχει δικό του χρώμα όταν είναι ενεργό. Οι κλάσεις είναι γραμμένες
 * ολόκληρες (όχι δυναμικά) ώστε να τις πιάνει το Tailwind στο build.
 */
const TABS = [
  {
    value: "presentation",
    label: "Παρουσίαση",
    icon: PresentationIcon,
    active:
      "data-[state=active]:border-blue-500/40 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400",
    bubble: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    value: "simulation",
    label: "Προσομοίωση",
    icon: MonitorPlayIcon,
    active:
      "data-[state=active]:border-cyan-500/40 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400",
    bubble: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    value: "ai-video",
    label: "AI Βίντεο",
    icon: SparklesIcon,
    active:
      "data-[state=active]:border-violet-500/40 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400",
    bubble: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    value: "theory",
    label: "Φυλλάδιο Θεωρίας",
    icon: BookOpenIcon,
    active:
      "data-[state=active]:border-emerald-500/40 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400",
    bubble: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "exercises",
    label: "Φυλλάδιο Ασκήσεων",
    icon: FileTextIcon,
    active:
      "data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400",
    bubble: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    value: "quiz",
    label: "Quiz",
    icon: ClipboardListIcon,
    active:
      "data-[state=active]:border-rose-500/40 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400",
    bubble: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
] as const;

export function SectionTabs() {
  return (
    <Tabs
      defaultValue="presentation"
      className="flex w-full min-w-0 flex-1 flex-col gap-2 min-h-0"
    >
      <TabsList className="no-scrollbar flex h-auto w-full flex-nowrap justify-start gap-1.5 overflow-x-auto bg-transparent p-0 sm:flex-wrap">
        {TABS.map(({ value, label, icon: Icon, active }) => (
          <TabsTrigger
            key={value}
            value={value}
            className={`shrink-0 gap-1.5 whitespace-nowrap rounded-lg border bg-card text-xs text-muted-foreground transition-colors hover:text-foreground data-[state=active]:shadow-none sm:text-sm ${active}`}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map(({ value, label, icon: Icon, bubble }) => (
        <TabsContent
          key={value}
          value={value}
          className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            <span
              className={`flex size-12 items-center justify-center rounded-full ${bubble}`}
            >
              <Icon className="size-6" />
            </span>
            «{label}» — σύντομα διαθέσιμο
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
