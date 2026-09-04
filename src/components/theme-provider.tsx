"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useServerInsertedHTML } from "next/navigation";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const STORAGE_KEY = "mpl-theme";
const MEDIA = "(prefers-color-scheme: dark)";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Resolved;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Τρέχει πριν το paint ώστε να μη «αναβοσβήνει» το θέμα. Μπαίνει στο SSR stream έξω από το δέντρο του React. */
const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('${MEDIA}').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

function useSystemTheme(): Resolved {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(MEDIA);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (window.matchMedia(MEDIA).matches ? "dark" : "light"),
    () => "light",
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Γράφεται μία φορά, στην πρώτη SSR απόδοση.
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    } catch {
      return "system";
    }
  });

  const systemTheme = useSystemTheme();
  const resolvedTheme: Resolved = theme === "system" ? systemTheme : theme;

  // Μόνο συγχρονισμός με το DOM — καμία ενημέρωση React state εδώ.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ιδιωτική περιήγηση κ.λπ. — αγνόησέ το
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme πρέπει να χρησιμοποιείται μέσα σε <ThemeProvider>");
  }
  return ctx;
}
