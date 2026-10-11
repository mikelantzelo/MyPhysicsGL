"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertDialog } from "radix-ui";

import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Κόκκινο κουμπί επιβεβαίωσης (διαγραφή, αντικατάσταση κ.λπ.). */
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Παράθυρο επιβεβαίωσης στο κέντρο της οθόνης, αντί για window.confirm.
 * `const confirm = useConfirm(); if (await confirm({ title: "…" })) …`
 */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext) ?? fallbackConfirm;
}

/**
 * Μόνο αν λείπει το <ConfirmProvider> (π.χ. σελίδα ανοιχτή από πριν αλλάξει το
 * root layout στο dev): να μη σπάει η σελίδα — πέφτουμε στο confirm του browser.
 */
const fallbackConfirm: ConfirmFn = async ({ title, description }) => {
  console.warn("useConfirm χωρίς <ConfirmProvider> — ανανέωσε τη σελίδα.");
  const text = typeof description === "string" ? `${title}\n\n${description}` : title;
  return window.confirm(text);
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    resolveRef.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={!!options} onOpenChange={(open) => !open && close(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border bg-popover p-6 text-popover-foreground shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            <AlertDialog.Title className="text-lg font-semibold">
              {options?.title}
            </AlertDialog.Title>
            {options?.description ? (
              <AlertDialog.Description className="whitespace-pre-line text-sm text-muted-foreground">
                {options.description}
              </AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">{options?.title}</AlertDialog.Description>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel
                onClick={() => close(false)}
                className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                {options?.cancelLabel ?? "Άκυρο"}
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => close(true)}
                className={cn(
                  "h-9 rounded-lg px-4 text-sm font-medium",
                  options?.destructive
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {options?.confirmLabel ?? "OK"}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
