import { useState, useEffect } from 'react';

export interface QuizAttempt {
  id: string;
  paperId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  totalQuestions: number;
  correctAnswers: number;
  score: number; // percentage
  questions: QuizQuestionResult[];
  filters?: {
    subjects: string[];
    minMarks: number;
    maxMarks: number;
    selectedTags: string[];
    revisionOnly: boolean;
  };
  isHidden: boolean;
}

export interface QuizQuestionResult {
  questionId: string;
  questionNo: string;
  subQuestionNo: string;
  marks: number;
  timeSpent: number;
  userAnswer: string;
  isCorrect: boolean;
  confidence: number;
  difficulty: number; // user's rating
  paperInfo?: {
    filename: string;
    examination: string;
    subject_code: string;
    subject_name: string;
    paperId: string;
  };
  questionText?: string;
}

export interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  totalTimeSpent: number;
  improvementTrend: number; // positive/negative percentage
  weakestTopics: string[];
  strongestTopics: string[];
  averageTimePerQuestion: number;
}

interface UseQuizHistoryResult {
  attempts: QuizAttempt[];
  visibleAttempts: QuizAttempt[];
  stats: QuizStats;
  startQuizAttempt: (paperId: string, questions: any[], filters?: any) => string;
  endQuizAttempt: (attemptId: string, results: QuizQuestionResult[]) => void;
  hideAttempt: (attemptId: string) => void;
  showAttempt: (attemptId: string) => void;
  deleteAttempt: (attemptId: string) => void;
  cleanupInvalidAttempts: () => void;
  getAttemptsByTimeRange: (days: number) => QuizAttempt[];
  getPerformanceTrend: (days: number) => { date: string; score: number }[];
  getTopicPerformance: () => Map<string, { attempts: number; averageScore: number }>;
}

export const useQuizHistory = (): UseQuizHistoryResult => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const storageKey = 'quiz-history';

  // Load quiz history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const attemptsData = JSON.parse(stored);
        const parsedAttempts = attemptsData.map((attempt: any) => ({
          ...attempt,
          startTime: new Date(attempt.startTime),
          endTime: new Date(attempt.endTime)
        }));
        
        // Filter out invalid attempts on load and clean up localStorage
        const validAttempts = parsedAttempts.filter((attempt: QuizAttempt) => !isInvalidAttempt(attempt));
        
        // If we filtered out any invalid attempts, update localStorage
        if (validAttempts.length !== parsedAttempts.length) {
          console.log(`Cleaned up ${parsedAttempts.length - validAttempts.length} invalid quiz attempts`);
          localStorage.setItem(storageKey, JSON.stringify(validAttempts));
        }
        
        setAttempts(validAttempts);
      }
    } catch (error) {
      console.warn('Failed to load quiz history:', error);
    }
  }, []);

  // Check if an attempt is invalid (empty/meaningless)
  const isInvalidAttempt = (attempt: QuizAttempt): boolean => {
    return (
      attempt.duration === 0 &&
      attempt.questions.length === 0 &&
      attempt.correctAnswers === 0 &&
      attempt.score === 0
    );
  };

  // Save attempts to localStorage, filtering out invalid ones
  const saveAttempts = (newAttempts: QuizAttempt[]) => {
    try {
      // Filter out invalid attempts before saving
      const validAttempts = newAttempts.filter(attempt => !isInvalidAttempt(attempt));
      localStorage.setItem(storageKey, JSON.stringify(validAttempts));
    } catch (error) {
      console.warn('Failed to save quiz history:', error);
    }
  };

  const startQuizAttempt = (paperId: string, questions: any[], filters?: any): string => {
    const attemptId = `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    
    const newAttempt: QuizAttempt = {
      id: attemptId,
      paperId,
      startTime,
      endTime: startTime, // Will be updated when quiz ends
      duration: 0,
      totalQuestions: questions.length,
      correctAnswers: 0,
      score: 0,
      questions: [],
      filters,
      isHidden: false
    };

    setAttempts(prev => {
      const updated = [...prev, newAttempt];
      saveAttempts(updated);
      return updated;
    });

    return attemptId;
  };

  const endQuizAttempt = (attemptId: string, results: QuizQuestionResult[]) => {
    setAttempts(prev => {
      const updated = prev.map(attempt => {
        if (attempt.id === attemptId) {
          const endTime = new Date();
          const duration = Math.round((endTime.getTime() - attempt.startTime.getTime()) / 1000);
          const correctAnswers = results.filter(r => r.isCorrect).length;
          const totalMarks = results.reduce((sum, r) => sum + r.marks, 0);
          const earnedMarks = results.filter(r => r.isCorrect).reduce((sum, r) => sum + r.marks, 0);
          const score = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

          const updatedAttempt = {
            ...attempt,
            endTime,
            duration,
            correctAnswers,
            score,
            questions: results
          };

          // If this attempt becomes invalid after completion, we'll filter it out in saveAttempts
          return updatedAttempt;
        }
        return attempt;
      });
      
      // Save with automatic filtering of invalid attempts
      saveAttempts(updated);
      
      // Return the filtered attempts to keep state consistent
      return updated.filter(attempt => !isInvalidAttempt(attempt));
    });
  };

  const hideAttempt = (attemptId: string) => {
    setAttempts(prev => {
      const updated = prev.map(attempt => 
        attempt.id === attemptId ? { ...attempt, isHidden: true } : attempt
      );
      saveAttempts(updated);
      return updated;
    });
  };

  const showAttempt = (attemptId: string) => {
    setAttempts(prev => {
      const updated = prev.map(attempt => 
        attempt.id === attemptId ? { ...attempt, isHidden: false } : attempt
      );
      saveAttempts(updated);
      return updated;
    });
  };

  const deleteAttempt = (attemptId: string) => {
    setAttempts(prev => {
      const updated = prev.filter(attempt => attempt.id !== attemptId);
      saveAttempts(updated);
      return updated;
    });
  };

  // Clean up all invalid attempts manually
  const cleanupInvalidAttempts = () => {
    setAttempts(prev => {
      const validAttempts = prev.filter(attempt => !isInvalidAttempt(attempt));
      const removedCount = prev.length - validAttempts.length;
      
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} invalid quiz attempts`);
        saveAttempts(validAttempts);
        return validAttempts;
      }
      
      return prev;
    });
  };

  const getAttemptsByTimeRange = (days: number): QuizAttempt[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return attempts.filter(attempt => 
      attempt.startTime >= cutoffDate && !attempt.isHidden
    );
  };

  const getPerformanceTrend = (days: number): { date: string; score: number }[] => {
    const recentAttempts = getAttemptsByTimeRange(days);
    const dailyScores = new Map<string, number[]>();

    recentAttempts.forEach(attempt => {
      const dateKey = attempt.startTime.toISOString().split('T')[0];
      if (!dailyScores.has(dateKey)) {
        dailyScores.set(dateKey, []);
      }
      dailyScores.get(dateKey)!.push(attempt.score);
    });

    return Array.from(dailyScores.entries()).map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getTopicPerformance = (): Map<string, { attempts: number; averageScore: number }> => {
    const topicPerformance = new Map<string, { totalScore: number; attempts: number }>();

    attempts.filter(a => !a.isHidden).forEach(attempt => {
      attempt.questions.forEach(question => {
        // This would need access to question tags - for now using questionId as topic
        const topic = question.questionNo; // Simplified - would need actual tags
        const score = question.isCorrect ? 100 : 0;
        
        const current = topicPerformance.get(topic) || { totalScore: 0, attempts: 0 };
        current.totalScore += score;
        current.attempts += 1;
        topicPerformance.set(topic, current);
      });
    });

    return new Map(
      Array.from(topicPerformance.entries()).map(([topic, stats]) => [
        topic,
        {
          attempts: stats.attempts,
          averageScore: Math.round(stats.totalScore / stats.attempts)
        }
      ])
    );
  };

  // Calculate stats
  const visibleAttempts = attempts.filter(a => !a.isHidden);
  
  const stats: QuizStats = {
    totalAttempts: visibleAttempts.length,
    averageScore: visibleAttempts.length > 0 ? 
      Math.round(visibleAttempts.reduce((sum, a) => sum + a.score, 0) / visibleAttempts.length) : 0,
    bestScore: visibleAttempts.length > 0 ? 
      Math.max(...visibleAttempts.map(a => a.score)) : 0,
    totalTimeSpent: visibleAttempts.reduce((sum, a) => sum + a.duration, 0),
    improvementTrend: 0, // Calculate based on recent vs older attempts
    weakestTopics: [],
    strongestTopics: [],
    averageTimePerQuestion: visibleAttempts.length > 0 ?
      Math.round(visibleAttempts.reduce((sum, a) => sum + a.duration, 0) / 
                 visibleAttempts.reduce((sum, a) => sum + a.totalQuestions, 0)) : 0
  };

  // Calculate improvement trend
  if (visibleAttempts.length >= 4) {
    const sortedAttempts = [...visibleAttempts].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const half = Math.floor(sortedAttempts.length / 2);
    const firstHalf = sortedAttempts.slice(0, half);
    const secondHalf = sortedAttempts.slice(-half);
    
    const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.score, 0) / secondHalf.length;
    
    stats.improvementTrend = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
  }

  return {
    attempts,
    visibleAttempts,
    stats,
    startQuizAttempt,
    endQuizAttempt,
    hideAttempt,
    showAttempt,
    deleteAttempt,
    cleanupInvalidAttempts,
    getAttemptsByTimeRange,
    getPerformanceTrend,
    getTopicPerformance
  };
};