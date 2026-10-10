"use client";

import { useLayoutEffect } from "react";
import katex from "katex";
import DOMPurify from "dompurify";

export function useKatex(
  ref: React.RefObject<HTMLElement | null>,
  html: string
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Render KaTeX to string
    let replaced = html;
    try {
      replaced = html
        .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) =>
          katex.renderToString(expr, { displayMode: true, throwOnError: false })
        )
        .replace(/\$(.+?)\$/g, (_, expr) =>
          katex.renderToString(expr, { displayMode: false, throwOnError: false })
        );
    } catch {
      // fallback: keep text if KaTeX fails
    }

    // Sanitize after math rendering so surrounding API HTML is also checked.
    replaced = DOMPurify.sanitize(replaced, { FORBID_TAGS: ["style"] });

    // Only update DOM if content changed
    if (el.innerHTML !== replaced) {
      el.innerHTML = replaced;
    }
  }, [ref, html]); // runs only when html actually changes
}
