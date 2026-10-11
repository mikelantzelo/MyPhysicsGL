import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * <select> του browser με το ίδιο στυλ με το Input (περίγραμμα, focus ring,
 * σκοτεινό θέμα) και δικό μας βελάκι. Native ώστε να δουλεύει σε φόρμες GET,
 * με πληκτρολόγιο και στο κινητό (εγγενής λίστα επιλογών).
 */
function NativeSelect({
  className,
  wrapperClassName,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  wrapperClassName?: string;
  size?: "default" | "sm";
}) {
  return (
    <div className={cn("relative min-w-0", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-input bg-transparent pl-2.5 pr-8 text-sm transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          "[&_option]:bg-popover [&_option]:text-popover-foreground",
          size === "sm" ? "h-7 text-xs" : "h-8",
          className,
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "sm" ? "right-2 size-3.5" : "right-2.5 size-4",
        )}
      />
    </div>
  );
}

export { NativeSelect };
