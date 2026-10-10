"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { Question } from "@/components/quiz/hooks/useQuestions";
import DynamicMath from "../DynamicMath";
import { Grip } from "lucide-react";
const frameBg = "/quiz/images/bg.webp";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";

import type { DragEndEvent, DropAnimation, DragStartEvent } from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

interface SortingProps {
  question: Question;
  selectedAnswer: string;
  showExplanation: boolean;
  correctAnswer: string;
  onAnswer: (answer: string) => void;
  isSubmitted: boolean;
}

interface Item {
  uid: string;
  id: string;
  text: string;
  originalNumber: string;
}

interface SortableItemProps {
  uid: string;
  item: Item;
  isCorrect: boolean | null;
  isSubmitted: boolean;
  showNumbers: boolean;
  isOverlay?: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function SortableItem({
  uid,
  item,
  isCorrect,
  isSubmitted,
  showNumbers,
  isOverlay,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: uid,
    disabled: isSubmitted,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : (transition ?? undefined),
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging && !isOverlay ? 0.4 : 1,
  };

  const cleanedText = item.text.replace(/^\s*\d+\.?\s*/, "");

  // Base classes με dark mode υποστήριξη
  const baseClasses =
    "p-3 sm:p-4 rounded-lg border-2 transition-colors duration-300 flex items-center justify-between gap-3 bg-white dark:bg-gray-800 shadow-sm min-h-[64px] sm:min-h-[76px]";

  const getStatusClasses = () => {
    if (isOverlay) return "border-blue-500 shadow-xl ring-2 ring-blue-200 dark:ring-blue-900/50";
    if (!isSubmitted) return "border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200";
    return isCorrect
      ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-300"
      : "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-300";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${baseClasses} ${getStatusClasses()}`}
    >
      <div className="flex items-center gap-3 w-full">
        {/* Fixed Width Container for the Number Badge */}
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          {showNumbers && (
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 text-white animate-in zoom-in duration-300
              ${
                isSubmitted
                  ? isCorrect
                    ? "bg-green-600"
                    : "bg-red-600"
                  : "bg-blue-600"
              }`}
            >
              {item.originalNumber}
            </div>
          )}
        </div>

        {/* Text Container */}
        <div className="grow text-left text-sm sm:text-base pointer-events-none leading-relaxed py-1 text-inherit">
          <DynamicMath html={cleanedText} />
        </div>

        {/* Fixed Width Container for the Grip Icon */}
        <div className="w-9 h-9 flex items-center justify-center shrink-0">
          {!isSubmitted && (
            <div
              {...attributes}
              {...listeners}
              className="p-2 cursor-grab active:cursor-grabbing touch-none hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
              title="Drag to reorder"
            >
              <Grip className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Sorting = ({
  question,
  selectedAnswer,
  correctAnswer,
  onAnswer,
  isSubmitted,
}: SortingProps) => {
  const initialAnswer = useRef(selectedAnswer);
  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  const isVideo = question.questionImage?.match(/\.(mp4|webm|ogg)$/i);

  const extractIdAndNumber = (text: string) => {
    const m = text.match(/^\s*(\d+)(?:[.)\s-]+)?/);
    if (m) return { id: m[1], originalNumber: m[1] };
    const fallback = text.match(/^\s*([0-9]+)/);
    return {
      id: fallback ? fallback[1] : String(Math.random()),
      originalNumber: fallback ? fallback[1] : "?",
    };
  };

  useEffect(() => {
    const rawAnswers = [
      question.answerA,
      question.answerB,
      question.answerC,
      question.answerD,
      question.answerE,
    ].filter(Boolean) as string[];

    const shuffledAnswers = shuffleArray(rawAnswers);
    const initialItems: Item[] = shuffledAnswers.map((txt, idx) => {
      const { id, originalNumber } = extractIdAndNumber(txt);
      return { uid: `item-${idx}`, id, text: txt, originalNumber };
    });

    if (initialAnswer.current) {
      const order = initialAnswer.current.split(";");
      initialItems.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    setItems(initialItems);
    onAnswer(initialItems.map((i) => i.id).join(";"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.idQuestion]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // Η απάντηση στέλνεται έξω από τον updater: το onAnswer αλλάζει state του
      // γονικού QuizScreen, κάτι που δεν επιτρέπεται κατά το render.
      const oldIndex = items.findIndex((p) => p.uid === active.id);
      const newIndex = items.findIndex((p) => p.uid === over.id);
      const next = arrayMove(items, oldIndex, newIndex);
      setItems(next);
      onAnswer(next.map((i) => i.id).join(";"));
    }
  }

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.4" } },
    }),
  };

  return (
    <div className="w-full px-2 sm:px-4 select-none">
      {/* Question Media */}
      {question.questionImage && (
        <div className="mb-4 sm:mb-6 flex justify-center relative">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg z-10 transition-colors duration-300">
              <div className="animate-spin h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full" />
            </div>
          )}

          {isVideo ? (
            <video
              src={question.questionImage}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setImageLoading(false)}
              className={`max-w-full max-h-60 sm:max-h-70 rounded-lg shadow-md object-contain transition-opacity duration-500 ${
                imageLoading ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : (
            <div className="relative w-full flex items-center justify-center p-6">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="animate-spin h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full" />
                </div>
              )}

              <img
                src={question.questionImage}
                alt="Question"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                className={`max-w-full max-h-60 sm:max-h-70 object-contain transition-opacity duration-500 z-0 ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
              />

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
      <div className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 text-start leading-snug bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg shadow-sm min-h-28 flex items-center transition-colors duration-300 border border-transparent dark:border-blue-900/50">
        <div className="text-gray-900 dark:text-gray-100 wrap-break-word w-full">
          <DynamicMath html={question.questionText} />
        </div>
      </div>

      {/* Sortable Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext
          items={items.map((i) => i.uid)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {items.map((item, index) => {
              const correctOrder = correctAnswer?.split(";") || [];
              const isCorrect = isSubmitted
                ? item.id === correctOrder[index]
                : null;

              return (
                <SortableItem
                  key={item.uid}
                  uid={item.uid}
                  item={item}
                  isCorrect={isCorrect}
                  isSubmitted={isSubmitted}
                  showNumbers={isSubmitted}
                />
              );
            })}
          </div>
        </SortableContext>

        {/* Drag Overlay — portal to body to escape backdrop-blur containing block */}
        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeId ? (
              <SortableItem
                uid={activeId}
                item={items.find((i) => i.uid === activeId)!}
                isCorrect={null}
                isSubmitted={isSubmitted}
                showNumbers={isSubmitted}
                isOverlay
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
};

export default Sorting;