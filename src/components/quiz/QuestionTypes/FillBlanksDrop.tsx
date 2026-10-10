"use client";

import { blankAnswerMap, blankIdsFor } from "@/components/quiz/lib/questions";
import { useState, useMemo, useEffect, useCallback, type JSX, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  TouchSensor,
  pointerWithin,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import DynamicMath from "../DynamicMath";
import type { Question } from "@/components/quiz/hooks/useQuestions";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
const frameBg = "/quiz/images/bg.webp";

type FillBlanksDropProps = {
  question: Question;
  selectedAnswer?: string;
  showExplanation: boolean;
  onAnswer: (answer: string) => void;
  onAllAnswersFilled?: (allFilled: boolean) => void;
  onAllCorrect?: (allCorrect: boolean) => void;
  isSubmitted: boolean;
};

type Option = {
  value: string;
  label: string;
  isMath: boolean;
};

function normalizeAnswerText(text: string) {
  return text.replace(/^\d+\.\s*/, "");
}

/* ---------------- DRAGGABLE ANSWER ---------------- */

const DraggableAnswer = ({
  option,
  disabled = false,
  isOverlay = false,
  inBlank = false,
  onWidthMeasured,
}: {
  option: Option;
  disabled?: boolean;
  isOverlay?: boolean;
  inBlank?: boolean;
  onWidthMeasured?: (width: number) => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: option.value,
    disabled,
  });

  // No transform on the original — overlay handles all movement
  const style = {
    opacity: isDragging ? 0 : disabled && !isOverlay ? 0.5 : 1,
    visibility: isDragging ? ("hidden" as const) : ("visible" as const),
  };

  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (measureRef.current && onWidthMeasured && !disabled) {
      const width = measureRef.current.getBoundingClientRect().width;
      onWidthMeasured(width);
    }
  }, [onWidthMeasured, disabled]);

  let stateClasses = "";
  if (isOverlay) {
    stateClasses = "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-700 dark:border-indigo-600 shadow-xl scale-105 cursor-grabbing";
  } else if (disabled) {
    stateClasses = "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-indigo-700 dark:text-indigo-400 cursor-not-allowed";
  } else {
    stateClasses = "bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-grab active:cursor-grabbing";
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (node) measureRef.current = node;
      }}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        inline-flex items-center justify-center
        rounded-md border shadow-sm font-medium touch-none select-none
        transition-all duration-300
        ${inBlank ? "px-3 py-1.5 h-8 text-sm" : "px-4 py-2 h-9 text-base"}
        ${stateClasses}
        ${disabled ? "pointer-events-none" : ""}
        ${inBlank ? "" : "my-1"}
        whitespace-nowrap
      `}
    >
      {option.isMath ? <DynamicMath html={option.label} /> : option.label}
    </div>
  );
};

/* ---------------- DROPPABLE BLANK ---------------- */

const DroppableBlank = ({
  blankId,
  children,
  isCorrect,
  isIncorrect,
  showColors,
  width,
}: {
  blankId: string;
  children?: React.ReactNode;
  isCorrect: boolean;
  isIncorrect: boolean;
  showColors: boolean;
  width?: number;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `blank-${blankId}`,
    disabled: showColors,
  });

  let borderColor = "border-indigo-300 dark:border-indigo-500/50";
  let bgColor = "bg-white dark:bg-gray-800/50";

  if (showColors) {
    if (isCorrect) {
      borderColor = "border-green-500 dark:border-green-500/70";
      bgColor = "bg-green-100 dark:bg-green-900/30";
    } else if (isIncorrect) {
      borderColor = "border-red-500 dark:border-red-500/70";
      bgColor = "bg-red-100 dark:bg-red-900/30";
    }
  } else if (isOver) {
    borderColor = "border-violet-500 dark:border-violet-400";
    bgColor = "bg-violet-100 dark:bg-violet-900/40";
  }

  const adjustedWidth = width ? width + 3 : undefined;
  const style = adjustedWidth ? { width: `${adjustedWidth}px` } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative mx-1 inline-flex items-center justify-center
        rounded-md border-2 transition-all duration-300 ease-in-out
        align-middle h-9 my-1 overflow-visible box-border
        ${adjustedWidth ? "px-0" : "min-w-28 px-2"}
        ${borderColor} ${bgColor}
        ${showColors ? "cursor-default" : ""}
      `}
    >
      {children}
    </div>
  );
};

/* ---------------- TOOLTIP ---------------- */

const CorrectOptionContent = ({ option }: { option: Option | null }) => {
  if (!option) return null;
  return (
    <div>
      <div className="text-xs font-bold text-gray-900 dark:text-gray-200 mb-1 underline">Σωστή απάντηση:</div>
      <div className="flex items-start gap-1">
        <span className="text-green-600 dark:text-green-400 text-base">✔</span>
        <span className="text-gray-800 dark:text-gray-300 text-sm">
          {option.isMath ? <DynamicMath html={option.label} /> : option.label}
        </span>
      </div>
    </div>
  );
};

const FeedbackTooltip = ({ correctOption }: { correctOption: Option | null }) => {
  const [open, setOpen] = useState(false);
  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  if (!correctOption) return null;

  if (isTouch) {
    return (
      <div className="relative inline-flex ml-1 align-middle">
<button type="button" aria-label="Σωστή απάντηση" aria-expanded={open} onClick={() => setOpen(!open)}><HelpCircle className="h-4 w-4 text-red-500 dark:text-red-400" /></button>
        {open && (
          <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded shadow-lg bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-gray-700 w-40 transition-colors duration-300">
            <CorrectOptionContent option={correctOption} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="Σωστή απάντηση" className="inline-flex ml-1 align-middle cursor-help">
          <HelpCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="bg-orange-50 dark:bg-gray-800 border-orange-200 dark:border-gray-700 p-2 transition-colors duration-300">
        <CorrectOptionContent option={correctOption} />
      </TooltipContent>
    </Tooltip>
  );
};

/* ---------------- MAIN EXPORT ---------------- */

export const FillBlanksDrop = ({
  question,
  selectedAnswer = "",
  showExplanation,
  onAnswer,
  onAllAnswersFilled,
  onAllCorrect,
  isSubmitted,
}: FillBlanksDropProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(blankIdsFor(question.questionText).map((id, index) => [id, selectedAnswer.split(",")[index] || ""])));
  const [draggableWidths, setDraggableWidths] = useState<Record<string, number>>({});
  const [imageLoading, setImageLoading] = useState(true);

  // Refs to prevent redundant parent notifications
  const lastJoinedRef = useRef<string | null>(null);

  const showColors = isSubmitted || showExplanation;
  const isVideo = question.questionImage?.match(/\.(mp4|webm|ogg)$/i);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: showColors ? 1000 : 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: showColors ? 1000 : 150,
        tolerance: showColors ? 1000 : 8,
      },
    })
  );

  const allOptions = useMemo<Option[]>(() => {
    const raw = [
      question.answerA, question.answerB, question.answerC,
      question.answerD, question.answerE,
    ].filter(Boolean) as string[];
    return raw.map((txt, idx) => {
      const numberMatch = txt.match(/^(\d+)\./);
      const value = numberMatch ? numberMatch[1] : (idx + 1).toString();
      const label = normalizeAnswerText(txt);
      return { value, label, isMath: label.includes("$") };
    });
  }, [question]);

  const blankIds = useMemo(() => {
    return blankIdsFor(question.questionText);
  }, [question.questionText]);


  useEffect(() => {
    if (!isSubmitted && !showExplanation) setActiveId(null);
  }, [question, isSubmitted, showExplanation]);

  // ✅ FIX 2: Only notify parent if the joined answer string has actually changed
  useEffect(() => {
    const joined = blankIds.map((id) => answers[id] || "").join(",");
    
    if (joined !== lastJoinedRef.current) {
      lastJoinedRef.current = joined;
      
      const allFilled = blankIds.length > 0 && blankIds.every((id) => answers[id] && answers[id] !== "");
      onAllAnswersFilled?.(allFilled);
      
      const allCorrect = blankIds.length > 0 && blankIds.every((id) => answers[id] === blankAnswerMap(question)[id]);
      onAllCorrect?.(allCorrect);
      
      onAnswer(joined);
    }
  }, [answers, question, blankIds, onAnswer, onAllAnswersFilled, onAllCorrect]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (showColors) return;
    setActiveId(event.active.id as string);
  }, [showColors]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (showColors) return;
    const draggedValue = active.id as string;
    
    setAnswers((prev) => {
      const next = { ...prev };
      // Remove from previous blank if it was moved
      const prevBlank = Object.keys(next).find((k) => next[k] === draggedValue);
      if (prevBlank) next[prevBlank] = "";
      
      if (over && over.id.toString().startsWith("blank-")) {
        const targetBlank = over.id.toString().replace("blank-", "");
        next[targetBlank] = draggedValue;
      }
      return next;
    });
  }, [showColors]);

  const handleWidthMeasured = useCallback((value: string, width: number) => {
    setDraggableWidths((prev) => {
      // ✅ FIX 3: Prevent state update if width is the same
      if (prev[value] === width) return prev;
      return { ...prev, [value]: width };
    });
  }, []);

  const renderContent = () => {
    const parts = question.questionText.split(/(word\d+)/);
    return parts.map((part, idx) => {
      const match = part.match(/word(\d+)/);
      if (match) {
        const blankId = match[1];
        const currentValue = answers[blankId];
        const currentOption = allOptions.find((o) => o.value === currentValue);
        const expected = blankAnswerMap(question)[blankId];
        const isCorrect = currentValue === expected;
        const isIncorrect = !!currentValue && !isCorrect;
        const correctOption = allOptions.find((o) => o.value === expected) ?? null;
        const draggableWidth = currentOption ? draggableWidths[currentOption.value] : undefined;

        return (
          <span key={`blank-${idx}`} className="inline-flex items-center align-middle">
            <DroppableBlank
              blankId={blankId}
              showColors={showColors}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              width={draggableWidth}
            >
              {currentOption && (
                <DraggableAnswer
                  option={currentOption}
                  disabled={showColors}
                  inBlank
                  onWidthMeasured={(width) => handleWidthMeasured(currentOption.value, width)}
                />
              )}
            </DroppableBlank>
            {!showColors && <label className="inline-flex items-center gap-1 text-sm">
              <span className="sr-only">Επιλογή για το κενό {blankId}</span>
              <select aria-label={`Απάντηση για το κενό ${blankId}`} value={currentValue || ""}
                className="max-w-48 rounded border p-1 bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
                onChange={(event) => {
                  const value = event.target.value;
                  setAnswers((previous) => {
                    const next = { ...previous };
                    for (const id of blankIds) if (value && next[id] === value) next[id] = "";
                    next[blankId] = value;
                    return next;
                  });
                }}>
                <option value="">Επίλεξε…</option>
                {allOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>}
            {showColors && isIncorrect && <FeedbackTooltip correctOption={correctOption} />}
          </span>
        );
      }

      const mathRegex = /\$(.+?)\$/g;
      const segments: JSX.Element[] = [];
      let last = 0;
      let m;
      while ((m = mathRegex.exec(part)) !== null) {
        if (m.index > last) segments.push(<span key={`${idx}-t-${last}`}>{part.slice(last, m.index)}</span>);
        segments.push(<DynamicMath key={`${idx}-m-${m.index}`} html={`$${m[1]}$`} />);
        last = m.index + m[0].length;
      }
      if (last < part.length) segments.push(<span key={`${idx}-t-end`}>{part.slice(last)}</span>);
      return <span key={idx} className="leading-loose align-middle">{segments}</span>;
    });
  };

  const bankOptions = useMemo(
    () => allOptions.filter((opt) => !Object.values(answers).includes(opt.value)),
    [allOptions, answers]
  );

  const activeOption = allOptions.find((o) => o.value === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="relative w-full px-2 sm:px-4 select-none flex flex-col h-full">

        {/* Question Media */}
        {question.questionImage && (
          <div className="mb-4 sm:mb-6 flex justify-center relative">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg z-10 transition-colors duration-300">
                <div className="animate-spin h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-violet-500 dark:border-t-violet-400 rounded-full" />
              </div>
            )}
            {isVideo ? (
              <video
                src={question.questionImage}
                autoPlay loop muted playsInline
                onLoadedData={() => setImageLoading(false)}
                className={`max-w-full max-h-60 sm:max-h-70 rounded-lg shadow-md object-contain transition-opacity duration-500 ${imageLoading ? "opacity-0" : "opacity-100"}`}
              />
            ) : (
              <div className="relative w-full flex items-center justify-center p-6">
              {/* Loading spinner - shown while remote image loads */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="animate-spin h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full" />
                </div>
              )}

              {/* Actual question image */}
              <img
                src={question.questionImage}
                alt="Question"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                className={`max-w-full max-h-60 sm:max-h-70 object-contain transition-opacity duration-500 z-0 ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
              />

              {/* Frame - always visible, local so loads instantly */}
              <img
                src={frameBg}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 dark:opacity-80 transition-opacity duration-300"
              />
            </div>
            )}
          </div>
        )}

        {/* Question Text */}
        <div className="text-lg sm:text-lg text-gray-900 dark:text-gray-100 bg-blue-50 dark:bg-blue-900/20 px-4 py-4 rounded-lg shadow-sm border border-blue-100 dark:border-blue-900/50 mb-6 leading-[2.5] wrap-break-word transition-colors duration-300">
          {renderContent()}
        </div>

        {/* Answer Bank */}
        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-3 text-center transition-colors duration-300">
            Σύρε τις απαντήσεις στα κενά ώστε να συμπληρωθεί σωστά η πρόταση!
          </p>
          <div className="flex flex-wrap gap-2 justify-center items-center p-4 rounded-xl border-2 border-dashed min-h-20 bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 transition-colors duration-300">
            {bankOptions.length === 0 ? (
              <span className="text-gray-400 dark:text-gray-500 text-sm italic">Όλες οι απαντήσεις τοποθετήθηκαν</span>
            ) : (
              bankOptions.map((opt) => (
                <DraggableAnswer
                  key={opt.value}
                  option={opt}
                  disabled={showColors}
                  onWidthMeasured={(width) => handleWidthMeasured(opt.value, width)}
                />
              ))
            )}
          </div>
        </div>

        {/* Drag Overlay — portal to body to escape backdrop-blur containing block */}
        {createPortal(
          <DragOverlay
            modifiers={[restrictToWindowEdges]}
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0" } },
              }),
            }}
          >
            {activeId && activeOption ? (
              <DraggableAnswer option={activeOption} isOverlay />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </div>
    </DndContext>
  );
};