import React, { useState, useEffect, useCallback } from 'react';

export interface QuestionProgress {
  questionId: string;
  paperId: string;
  completed: boolean;
  completedAt?: Date;
  timeSpent: number; // in seconds
  reviewCount: number;
  lastStudied?: Date;
  confidenceLevel: number; // 1-5 scale
  studySessions: StudySession[];
}

export interface StudySession {
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  sessionType: 'study' | 'quiz' | 'revision';
}

export interface ProgressStats {
  totalQuestions: number;
  completedQuestions: number;
  totalTimeSpent: number;
  averageConfidence: number;
  weeklyGoal: number;
  weeklyProgress: number;
  streak: number;
  lastStudyDate?: Date;
}

interface UseProgressTrackingResult {
  questionProgress: Map<string, QuestionProgress>;
  stats: ProgressStats;
  startStudySession: (questionId: string, sessionType: 'study' | 'quiz' | 'revision') => void;
  endStudySession: (questionId: string) => void;
  markCompleted: (questionId: string) => void;
  markIncomplete: (questionId: string) => void;
  updateConfidence: (questionId: string, confidence: number) => void;
  getQuestionProgress: (questionId: string) => QuestionProgress;
  getProgressByDifficulty: () => Map<number, { completed: number; total: number }>;
  getProgressByMarks: () => Map<number, { completed: number; total: number }>;
  getWeakAreas: () => string[];
  calculateExamReadiness: () => number;
}

const defaultQuestionProgress: Omit<QuestionProgress, 'questionId' | 'paperId'> = {
  completed: false,
  timeSpent: 0,
  reviewCount: 0,
  confidenceLevel: 0,
  studySessions: []
};

export const useProgressTracking = (paperId: string, allQuestions: any[] = []): UseProgressTrackingResult => {
  const [questionProgress, setQuestionProgress] = useState<Map<string, QuestionProgress>>(new Map());
  const [activeSession, setActiveSession] = useState<{ questionId: string; paperId: string; startTime: Date; sessionType: string } | null>(null);
  
  const storageKey = 'progress-tracking-global'; // Global storage key, not paper-specific
  const activeSessionKey = 'active-study-session'; // Track active sessions

  // Load progress from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const progressData = JSON.parse(stored);
        const progressMap = new Map<string, QuestionProgress>();
        
        Object.entries(progressData).forEach(([key, progress]: [string, any]) => {
          // Handle both old format (questionId) and new format (paperId::questionId)
          let globalKey = key;
          let progressData = progress as any;
          
          if (!key.includes('::')) {
            // Old format - migrate to new format with default paper
            globalKey = `default::${key}`;
            progressData = { 
              ...progress, 
              paperId: 'default',
              questionId: key
            };
          } else {
            // New format - ensure paperId is set
            const [extractedPaperId, questionId] = key.split('::');
            progressData = { 
              ...progress, 
              paperId: extractedPaperId,
              questionId: questionId
            };
          }
          
          progressMap.set(globalKey, {
            ...progressData,
            completedAt: progressData.completedAt ? new Date(progressData.completedAt) : undefined,
            lastStudied: progressData.lastStudied ? new Date(progressData.lastStudied) : undefined,
            studySessions: (progressData.studySessions || []).map((session: any) => ({
              ...session,
              startTime: new Date(session.startTime),
              endTime: session.endTime ? new Date(session.endTime) : undefined
            }))
          });
        });
        
        setQuestionProgress(progressMap);
        
        // Handle session cleanup if needed
        const cleanupSession = localStorage.getItem('session-cleanup-needed');
        if (cleanupSession) {
          try {
            const session = JSON.parse(cleanupSession);
            const endTime = new Date();
            const duration = Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);
            
            // Add the interrupted session to progress
            const globalKey = createGlobalKey(session.questionId, session.paperId);
            const current = progressMap.get(globalKey) || {
              questionId: session.questionId,
              paperId: session.paperId,
              ...defaultQuestionProgress
            };
            
            const newSession: StudySession = {
              startTime: new Date(session.startTime),
              endTime,
              duration,
              sessionType: session.sessionType as 'study' | 'quiz' | 'revision'
            };
            
            const updated = {
              ...current,
              timeSpent: current.timeSpent + duration,
              studySessions: [...current.studySessions, newSession],
            };
            
            progressMap.set(globalKey, updated);
            localStorage.removeItem('session-cleanup-needed');
            
            // Save the updated progress
            const progressObj: { [key: string]: any } = {};
            progressMap.forEach((progress, key) => {
              progressObj[key] = progress;
            });
            localStorage.setItem(storageKey, JSON.stringify(progressObj));
          } catch (error) {
            console.warn('Failed to cleanup interrupted session:', error);
            localStorage.removeItem('session-cleanup-needed');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load progress tracking data:', error);
    }
  }, [storageKey]);

  // Load active session on mount and handle cleanup
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem(activeSessionKey);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        setActiveSession({
          ...session,
          startTime: new Date(session.startTime)
        });
      }
    } catch (error) {
      console.warn('Failed to load active session:', error);
    }

    // Cleanup function for page unload
    const handleBeforeUnload = () => {
      const currentSession = localStorage.getItem(activeSessionKey);
      if (currentSession) {
        // Mark session for cleanup on next load
        localStorage.setItem('session-cleanup-needed', currentSession);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSessionKey]);

  // Save active session to localStorage whenever it changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem(activeSessionKey, JSON.stringify(activeSession));
    } else {
      localStorage.removeItem(activeSessionKey);
    }
  }, [activeSession, activeSessionKey]);

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: Map<string, QuestionProgress>) => {
    try {
      const progressObj: { [key: string]: any } = {};
      newProgress.forEach((progress, questionId) => {
        progressObj[questionId] = progress;
      });
      localStorage.setItem(storageKey, JSON.stringify(progressObj));
    } catch (error) {
      console.warn('Failed to save progress tracking data:', error);
    }
  }, [storageKey]);

  // Create a global unique key combining paperId and questionId
  const createGlobalKey = (questionId: string, currentPaperId?: string) => {
    return `${currentPaperId || paperId}::${questionId}`;
  };

  const getQuestionProgress = (questionId: string): QuestionProgress => {
    const globalKey = createGlobalKey(questionId);
    return questionProgress.get(globalKey) || {
      questionId,
      paperId,
      ...defaultQuestionProgress
    };
  };

  const updateQuestionProgress = useCallback((questionId: string, updates: Partial<QuestionProgress>) => {
    setQuestionProgress(prev => {
      const newProgress = new Map(prev);
      const globalKey = createGlobalKey(questionId);
      const current = prev.get(globalKey) || {
        questionId,
        paperId,
        ...defaultQuestionProgress
      };
      const updated = { ...current, ...updates, questionId, paperId };
      newProgress.set(globalKey, updated);
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress, paperId]);

  const startStudySession = useCallback((questionId: string, sessionType: 'study' | 'quiz' | 'revision') => {
    const startTime = new Date();
    setActiveSession({ questionId, paperId, startTime, sessionType });
    
    // Update review count
    setQuestionProgress(prev => {
      const newProgress = new Map(prev);
      const globalKey = createGlobalKey(questionId);
      const current = prev.get(globalKey) || {
        questionId,
        paperId,
        ...defaultQuestionProgress
      };
      const updated = {
        ...current,
        reviewCount: current.reviewCount + 1,
        lastStudied: startTime,
        questionId,
        paperId
      };
      newProgress.set(globalKey, updated);
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress, paperId]);

  const endStudySession = useCallback((questionId: string) => {
    if (activeSession && activeSession.questionId === questionId && activeSession.paperId === paperId) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - activeSession.startTime.getTime()) / 1000);
      
      const newSession: StudySession = {
        startTime: activeSession.startTime,
        endTime,
        duration,
        sessionType: activeSession.sessionType as 'study' | 'quiz' | 'revision'
      };

      setQuestionProgress(prev => {
        const newProgress = new Map(prev);
        const globalKey = createGlobalKey(questionId);
        const current = prev.get(globalKey) || {
          questionId,
          paperId,
          ...defaultQuestionProgress
        };
        const updated = {
          ...current,
          timeSpent: current.timeSpent + duration,
          studySessions: [...current.studySessions, newSession],
          questionId,
          paperId
        };
        newProgress.set(globalKey, updated);
        saveProgress(newProgress);
        return newProgress;
      });

      setActiveSession(null);
    }
  }, [activeSession, saveProgress, paperId]);

  const markCompleted = useCallback((questionId: string) => {
    updateQuestionProgress(questionId, {
      completed: true,
      completedAt: new Date()
    });
  }, [updateQuestionProgress]);

  const markIncomplete = useCallback((questionId: string) => {
    updateQuestionProgress(questionId, {
      completed: false,
      completedAt: undefined
    });
  }, [updateQuestionProgress]);

  const updateConfidence = useCallback((questionId: string, confidence: number) => {
    updateQuestionProgress(questionId, {
      confidenceLevel: confidence
    });
  }, [updateQuestionProgress]);

  const getProgressByDifficulty = (): Map<number, { completed: number; total: number }> => {
    const progressByDifficulty = new Map<number, { completed: number; total: number }>();
    
    allQuestions.forEach(question => {
      const questionId = `${question.question_no}_${question.sub_question_no}`;
      const rating = question.rating || 0; // Assuming rating is difficulty
      const progress = getQuestionProgress(questionId);
      
      const current = progressByDifficulty.get(rating) || { completed: 0, total: 0 };
      current.total++;
      if (progress.completed) current.completed++;
      progressByDifficulty.set(rating, current);
    });

    return progressByDifficulty;
  };

  const getProgressByMarks = (): Map<number, { completed: number; total: number }> => {
    const progressByMarks = new Map<number, { completed: number; total: number }>();
    
    allQuestions.forEach(question => {
      const questionId = `${question.question_no}_${question.sub_question_no}`;
      const marks = question.marks;
      const progress = getQuestionProgress(questionId);
      
      const current = progressByMarks.get(marks) || { completed: 0, total: 0 };
      current.total++;
      if (progress.completed) current.completed++;
      progressByMarks.set(marks, current);
    });

    return progressByMarks;
  };

  const getWeakAreas = (): string[] => {
    const tagPerformance = new Map<string, { total: number; lowConfidence: number }>();
    
    allQuestions.forEach(question => {
      const questionId = `${question.question_no}_${question.sub_question_no}`;
      const progress = getQuestionProgress(questionId);
      
      question.tags.forEach((tag: string) => {
        const current = tagPerformance.get(tag) || { total: 0, lowConfidence: 0 };
        current.total++;
        if (progress.confidenceLevel > 0 && progress.confidenceLevel <= 2) {
          current.lowConfidence++;
        }
        tagPerformance.set(tag, current);
      });
    });

    // Return tags with >50% low confidence
    return Array.from(tagPerformance.entries())
      .filter(([_, stats]) => stats.total > 0 && (stats.lowConfidence / stats.total) > 0.5)
      .map(([tag, _]) => tag);
  };

  const calculateExamReadiness = (): number => {
    if (allQuestions.length === 0) return 0;
    
    let totalScore = 0;
    let maxScore = 0;

    allQuestions.forEach(question => {
      const questionId = `${question.question_no}_${question.sub_question_no}`;
      const progress = getQuestionProgress(questionId);
      const marks = question.marks;
      
      maxScore += marks * 3; // Max: completed + high confidence + recent study
      
      // Scoring factors
      let score = 0;
      if (progress.completed) score += marks;
      if (progress.confidenceLevel >= 4) score += marks;
      if (progress.lastStudied && Date.now() - progress.lastStudied.getTime() < 7 * 24 * 60 * 60 * 1000) {
        score += marks;
      }
      
      totalScore += score;
    });

    return Math.round((totalScore / maxScore) * 100);
  };

  // Calculate global stats across all papers
  const allProgressValues = Array.from(questionProgress.values());
  const currentPaperProgress = allProgressValues.filter(p => p.paperId === paperId);
  
  // Calculate study streak (consecutive days with study activity)
  const calculateStreak = (): number => {
    const studyDates = allProgressValues
      .map(p => p.lastStudied)
      .filter(Boolean)
      .map(date => {
        const d = new Date(date!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .filter((date, index, self) => self.indexOf(date) === index) // Unique dates
      .sort((a, b) => b - a); // Most recent first

    if (studyDates.length === 0) return 0;

    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    for (let i = 1; i < studyDates.length; i++) {
      if (studyDates[i-1] - studyDates[i] === oneDayMs) {
        streak++;
      } else {
        break;
      }
    }
    
    // Check if the most recent study date is today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - oneDayMs);
    
    if (studyDates[0] !== today.getTime() && studyDates[0] !== yesterday.getTime()) {
      return 0; // Streak broken
    }
    
    return streak;
  };
  
  const stats: ProgressStats = {
    totalQuestions: allQuestions.length, // Current paper questions
    completedQuestions: currentPaperProgress.filter(p => p.completed).length, // Current paper completed
    totalTimeSpent: allProgressValues.reduce((sum, p) => sum + p.timeSpent, 0), // Global time spent
    averageConfidence: allProgressValues.length > 0 ? 
      allProgressValues.reduce((sum, p) => sum + p.confidenceLevel, 0) / allProgressValues.length : 0, // Global average
    weeklyGoal: 50, // This could be configurable
    weeklyProgress: allProgressValues.filter(p => 
      p.lastStudied && Date.now() - p.lastStudied.getTime() < 7 * 24 * 60 * 60 * 1000
    ).length, // Global weekly progress
    streak: calculateStreak(), // Calculate consecutive study days globally
    lastStudyDate: allProgressValues
      .map(p => p.lastStudied)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0] // Global last study date
  };

  return {
    questionProgress,
    stats,
    startStudySession,
    endStudySession,
    markCompleted,
    markIncomplete,
    updateConfidence,
    getQuestionProgress,
    getProgressByDifficulty,
    getProgressByMarks,
    getWeakAreas,
    calculateExamReadiness
  };
};