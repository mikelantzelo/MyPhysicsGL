"use client";

import { useOptimistic, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { setSectionActive } from "@/app/admin-actions";
import { NativeSelect } from "@/components/ui/native-select";

import { indented, type NodeOption } from "./node-options";

/** Επιλογή ενεργής παραγράφου για ένα τμήμα· αποθηκεύεται αμέσως. */
export function ActiveSelect({
  sectionId,
  sectionLabel,
  current,
  options,
}: {
  sectionId: number;
  sectionLabel: string;
  current: string | null;
  options: NodeOption[];
}) {
  const [pending, startTransition] = useTransition();
  // Η νέα επιλογή φαίνεται αμέσως, πριν επιστρέψει ο server.
  const [shown, setShown] = useOptimistic(current);

  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label={`Ενεργή παράγραφος ${sectionLabel}`}
        value={shown ?? ""}
        disabled={pending}
        onChange={(e) => {
          const nodeId = e.target.value || null;
          startTransition(async () => {
            setShown(nodeId);
            try {
              await setSectionActive(sectionId, nodeId);
              toast.success(
                nodeId
                  ? `${sectionLabel}: ενεργή η «${options.find((o) => o.id === nodeId)?.label}»`
                  : `${sectionLabel}: χωρίς ενεργή παράγραφο`,
              );
            } catch {
              toast.error("Η αλλαγή δεν αποθηκεύτηκε.");
            }
          });
        }}
        wrapperClassName="w-full sm:w-96"
      >
        <option value="">— Καμία —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id} className={o.depth === 0 ? "font-semibold" : ""}>
            {indented(o)}
          </option>
        ))}
      </NativeSelect>
      {pending && <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />}
    </div>
  );
}
