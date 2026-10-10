"use client";

import { useRef, memo } from "react";
import { useKatex } from "./hooks/useKatex";

type Props = {
  html: string;
  className?: string;
};

function DynamicMathComponent({ html, className }: Props) {
  const divRef = useRef<HTMLDivElement>(null);

  useKatex(divRef, html);

  return (
    <div
      ref={divRef}
      className={className}
      style={{ display: "inline-block", lineHeight: 1 }}
    />
  );
}

// ✅ React.memo — re-render only if `html` changes
export default memo(DynamicMathComponent);
