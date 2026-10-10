"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundEnabled } from "@/components/quiz/lib/sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(soundEnabled);
  return <button type="button" aria-label="Ήχος" aria-pressed={enabled}
    className="absolute top-3 right-3 z-20 p-2.5 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
    onClick={() => {
      const next = !enabled;
      try { localStorage.setItem("quiz-sound", next ? "on" : "off"); } catch { /* Optional preference. */ }
      setEnabled(next);
      window.dispatchEvent(new Event("quiz-sound-change"));
    }}>
    {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
  </button>;
}
