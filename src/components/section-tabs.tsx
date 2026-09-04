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

const TABS = [
  { value: "presentation", label: "Παρουσίαση", icon: PresentationIcon },
  { value: "simulation", label: "Προσομοίωση", icon: MonitorPlayIcon },
  { value: "ai-video", label: "AI Βίντεο", icon: SparklesIcon },
  { value: "theory", label: "Φυλλάδιο Θεωρίας", icon: BookOpenIcon },
  { value: "exercises", label: "Φυλλάδιο Ασκήσεων", icon: FileTextIcon },
  { value: "quiz", label: "Quiz", icon: ClipboardListIcon },
] as const;

export function SectionTabs() {
  return (
    <Tabs
      defaultValue="presentation"
      className="flex w-full min-w-0 flex-1 flex-col gap-2 min-h-0"
    >
      <TabsList className="no-scrollbar flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto bg-transparent p-0 sm:flex-wrap">
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="shrink-0 gap-1.5 whitespace-nowrap rounded-md border text-xs data-[state=active]:border-primary sm:text-sm"
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map(({ value, label }) => (
        <TabsContent
          key={value}
          value={value}
          className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            «{label}» — σύντομα διαθέσιμο
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
