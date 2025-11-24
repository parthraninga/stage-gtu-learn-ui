import React, { useState, useRef } from 'react';
import { Question } from '../types';
import { QuestionCard } from './QuestionCard';
import { useSwipe } from '../hooks/useSwipe';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface SwipeableQuestionDisplayProps {
  questions: Question[];
  currentIndex: number; // 0-based
  onNext: () => void;
  onPrevious: () => void;
  paperId?: string;
}

const SwipeableQuestionDisplay: React.FC<SwipeableQuestionDisplayProps> = ({
  questions,
  currentIndex,
  onNext,
  onPrevious,
  paperId = 'default',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasNext = currentIndex < questions.length - 1;
  const hasPrevious = currentIndex > 0;

  const swipeHandlers = useSwipe(
    {
      onSwipeLeft: () => {
        if (hasNext && !isAnimating) handleNext();
      },
      onSwipeRight: () => {
        if (hasPrevious && !isAnimating) handlePrevious();
      },
    },
    { minDistance: 80 }
  );

  const handleNext = () => {
    if (!hasNext || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      onNext();
      setIsAnimating(false);
    }, 250);
  };

  const handlePrevious = () => {
    if (!hasPrevious || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      onPrevious();
      setIsAnimating(false);
    }, 250);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeHandlers.onTouchStart(e as any);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating) return;
    swipeHandlers.onTouchMove(e as any);

    // compute a visual drag offset for the active card
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const offset = touch.clientX - centerX;
    const clamped = Math.max(-120, Math.min(120, offset));
    setDragOffset(clamped);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    swipeHandlers.onTouchEnd();
    setDragOffset(0);
  };

  const getCardStyle = (index: number): React.CSSProperties => {
    const position = index - currentIndex;
    const isActive = position === 0;
    const scale = isActive ? 1 : 0.96;
    const translateBase = position * 40;
    const translateX = isActive ? translateBase + dragOffset : translateBase;
    const opacity = Math.abs(position) <= 2 ? 1 - Math.abs(position) * 0.15 : 0;

    return {
      position: 'absolute',
      top: Math.abs(position) * 8,
      left: '50%',
      width: '100%',
      maxWidth: 900,
      transform: `translateX(calc(-50% + ${translateX}px)) scale(${scale})`,
      opacity,
      zIndex: 100 - Math.abs(position),
      transition: isAnimating || dragOffset === 0 ? 'all 0.28s ease-out' : 'none',
      pointerEvents: isActive ? 'auto' : 'none',
    };
  };

  const visibleQuestions = questions.filter((_, idx) => Math.abs(idx - currentIndex) <= 2);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      {/* subtle background */}
      <div className="absolute inset-0 opacity-6 pointer-events-none" />

      <div
        ref={containerRef}
        className="relative w-full h-screen flex items-start justify-center px-4 pt-08"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full max-w-4xl">
          {/* Progress indicator */}
          <div className="flex justify-center mb-6">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {currentIndex + 1} of {questions.length}
              </span>
            </div>
          </div>

          {/* small debug / info */}
          <div className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded text-xs z-30">
            {questions.length} Q | {currentIndex + 1}
          </div>

          {visibleQuestions.length > 0 ? (
            visibleQuestions.map((q) => {
              const idx = questions.indexOf(q);
              return (
                <QuestionCard
                  key={`${q.question_no}-${q.sub_question_no}`}
                  question={q}
                  isActive={idx === currentIndex}
                  style={getCardStyle(idx)}
                  className="w-full"
                  currentIndex={currentIndex}
                  total={questions.length}
                  paperId={paperId}
                />
              );
            })
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
                <h3 className="text-lg font-semibold">No Questions Found</h3>
                <p className="text-sm text-gray-600">Total: {questions.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prev / Next buttons (middle of page) */}
      <button
        onClick={handlePrevious}
        disabled={!hasPrevious || isAnimating}
        aria-label="Previous question"
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all ${
          hasPrevious && !isAnimating
            ? 'bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 hover:scale-110'
            : 'bg-gray-200/50 text-gray-400 cursor-not-allowed'
        }`}
      >
        <ChevronLeftIcon size={22} />
      </button>

      <button
        onClick={handleNext}
        disabled={!hasNext || isAnimating}
        aria-label="Next question"
        className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full shadow-lg backdrop-blur-sm transition-all ${
          hasNext && !isAnimating
            ? 'bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 hover:scale-110'
            : 'bg-gray-200/50 text-gray-400 cursor-not-allowed'
        }`}
      >
        <ChevronRightIcon size={22} />
      </button>

      {/* Progress pills */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? 'bg-blue-600 scale-125'
                      : i < currentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Small swipe hint on first question */}
      {currentIndex === 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-pulse">
          <div className="bg-blue-600/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm">
            Swipe left/right or use arrow buttons
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableQuestionDisplay;
