import { useState, useEffect } from 'react';

interface QuestionRating {
  questionId: string;
  rating: number;
  paperId: string;
}

interface UseQuestionRatingsResult {
  ratings: Record<string, number>;
  setRating: (questionId: string, rating: number) => void;
  getRating: (questionId: string) => number;
}

export const useQuestionRatings = (paperId: string): UseQuestionRatingsResult => {
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const storageKey = `question-ratings-${paperId}`;

  useEffect(() => {
    // Load ratings from localStorage
    try {
      const storedRatings = localStorage.getItem(storageKey);
      if (storedRatings) {
        const parsed = JSON.parse(storedRatings);
        setRatings(parsed);
      }
    } catch (error) {
      console.warn('Failed to load question ratings from localStorage:', error);
    }
  }, [storageKey]);

  const setRating = (questionId: string, rating: number) => {
    const newRatings = {
      ...ratings,
      [questionId]: rating
    };
    
    setRatings(newRatings);
    
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(newRatings));
    } catch (error) {
      console.warn('Failed to save question ratings to localStorage:', error);
    }
  };

  const getRating = (questionId: string): number => {
    return ratings[questionId] || 0;
  };

  return {
    ratings,
    setRating,
    getRating
  };
};

export default useQuestionRatings;