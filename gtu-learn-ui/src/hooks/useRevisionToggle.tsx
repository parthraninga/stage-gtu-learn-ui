import { useState, useEffect } from 'react';

interface UseRevisionToggleResult {
  revisionQuestions: Set<string>;
  toggleRevision: (questionId: string) => void;
  isMarkedForRevision: (questionId: string) => boolean;
  getRevisionCount: () => number;
}

export const useRevisionToggle = (paperId: string): UseRevisionToggleResult => {
  const [revisionQuestions, setRevisionQuestions] = useState<Set<string>>(new Set());

  const storageKey = `revision-questions-${paperId}`;

  useEffect(() => {
    // Load revision questions from localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const revisionArray = JSON.parse(stored);
        setRevisionQuestions(new Set(revisionArray));
      }
    } catch (error) {
      console.warn('Failed to load revision questions from localStorage:', error);
    }
  }, [storageKey]);

  const toggleRevision = (questionId: string) => {
    setRevisionQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      
      // Save to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.warn('Failed to save revision questions to localStorage:', error);
      }
      
      return newSet;
    });
  };

  const isMarkedForRevision = (questionId: string): boolean => {
    return revisionQuestions.has(questionId);
  };

  const getRevisionCount = (): number => {
    return revisionQuestions.size;
  };

  return {
    revisionQuestions,
    toggleRevision,
    isMarkedForRevision,
    getRevisionCount
  };
};

export default useRevisionToggle;