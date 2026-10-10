"use client";

import { useEffect, useState, useRef } from "react";

interface FloatingAlertProps {
  isVisible: boolean;
  correct: boolean;
  explanation: string;
  onClose?: () => void;
}

export const TrueFalseFloatingAlert = ({
  isVisible,
  correct,
  explanation,
  onClose,
}: FloatingAlertProps) => {
  const [animateIn, setAnimateIn] = useState(false);
  const alertRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setAnimateIn(true), 30);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isVisible]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={alertRef}
      className={`relative w-[90%] sm:w-[480px] transition-all duration-500 ease-in-out transform pointer-events-auto
    ${
      animateIn
        ? "opacity-100 translate-y-0 scale-100"
        : "opacity-0 translate-y-4 scale-95"
    }
  `}
    >
      <div
        className={`rounded-lg shadow-lg overflow-hidden border pointer-events-auto
        ${
          correct ? "border-green-600 bg-green-50" : "border-red-500 bg-red-50"
        }`}
      >
        <div
          className={`p-3 font-semibold text-white flex justify-between items-center ${
            correct ? "bg-green-600" : "bg-red-500"
          }`}
        >
          <span>{correct ? "Σωστό" : "Λάθος"}</span>

          <button
            onClick={onClose}
            className="text-white text-lg font-bold hover:text-gray-200 ml-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 text-gray-800 text-start">
          <p>{explanation}</p>
        </div>
      </div>
    </div>
  );
};
