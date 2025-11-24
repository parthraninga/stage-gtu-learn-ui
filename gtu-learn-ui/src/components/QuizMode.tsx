import React, { useState, useEffect } from 'react';
import { Question, QuestionPaper, AppTheme } from '../types';
import { useNotesManager } from '../hooks/useNotes';
import { useQuestionRatings } from '../hooks/useQuestionRatings';
import { useRevisionToggle } from '../hooks/useRevisionToggle';
import { useSubjectRevision } from '../hooks/useSubjectRevision';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { useQuizHistory, QuizQuestionResult } from '../hooks/useQuizHistory';
import { DocumentIcon, XMarkIcon, HomeIcon, BookIcon, StudyIcon, QuizIcon, ProgressIcon, SunIcon, MoonIcon, GraduationCapIcon, AttemptedQuestionsIcon } from './Icons';
import { formatBoldText, shouldShowDiagram } from '../utils/textUtils';
import StarRating from './StarRating';
import RevisionToggle from './RevisionToggle';

interface QuizModeProps {
  questions: Question[];
  questionPaper: QuestionPaper;
  onExit: () => void;
  theme: AppTheme;
  onThemeToggle: () => void;
  paperId?: string;
}

interface QuizFilters {
  subjects: string[];
  minMarks: number;
  maxMarks: number;
  selectedTags: string[];
  revisionOnly: boolean;
}

interface QuizState {
  currentQuestionIndex: number;
  userAnswers: { [questionId: string]: string };
  ratings: { [questionId: string]: number };
  showAnswer: boolean;
  quizCompleted: boolean;
}

export const QuizMode: React.FC<QuizModeProps> = ({
  questions: allQuestions,
  questionPaper,
  onExit,
  theme,
  onThemeToggle,
  paperId = 'default',
}) => {
  const { getNote } = useNotesManager();
  const { getRating: getCurrentPaperRating, setRating: setCurrentPaperRating } = useQuestionRatings(paperId);
  
  // Helper function to get rating for any paper
  const getRatingForQuestion = (questionId: string, questionPaperId: string) => {
    // We'll need to access ratings dynamically
    try {
      const key = `question-ratings-${questionPaperId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const ratings = JSON.parse(stored);
        return ratings[questionId] || 0;
      }
    } catch (error) {
      console.warn('Failed to get rating:', error);
    }
    return 0;
  };
  
  // Helper function to set rating for any paper
  const setRatingForQuestion = (questionId: string, rating: number, questionPaperId: string) => {
    try {
      const key = `question-ratings-${questionPaperId}`;
      const stored = localStorage.getItem(key);
      const ratings = stored ? JSON.parse(stored) : {};
      ratings[questionId] = rating;
      localStorage.setItem(key, JSON.stringify(ratings));
    } catch (error) {
      console.warn('Failed to set rating:', error);
    }
  };
  const { isMarkedForRevision, toggleRevision, getRevisionCount } = useRevisionToggle(paperId);
  const { getAllRevisionQuestions, getSubjectRevisionCount, isQuestionMarkedForRevision, toggleQuestionRevision } = useSubjectRevision();
  const { startStudySession, endStudySession, markCompleted, updateConfidence } = useProgressTracking(paperId);
  const { startQuizAttempt, endQuizAttempt, visibleAttempts } = useQuizHistory();
  const [filters, setFilters] = useState<QuizFilters>({
    subjects: [questionPaper.metadata.subject_name],
    minMarks: 1,
    maxMarks: 20,
    selectedTags: [],
    revisionOnly: false,
  });
  const [questions, setQuestions] = useState<Question[]>(allQuestions);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    userAnswers: {},
    ratings: {},
    showAnswer: false,
    quizCompleted: false,
  });
  const [userAnswer, setUserAnswer] = useState('');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [showAttemptedDropdown, setShowAttemptedDropdown] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [questionTimes, setQuestionTimes] = useState<{ [questionId: string]: number }>({});
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<Date | null>(null);

  // Get unique values for filters
  const uniqueSubjects = Array.from(new Set([questionPaper.metadata.subject_name]));
  const allTags = Array.from(new Set(allQuestions.flatMap(q => q.tags)));
  const markRange = { min: 1, max: Math.max(...allQuestions.map(q => q.marks)) };

  // Get attempted questions from quiz history and ratings
  const getAttemptedQuestions = () => {
    const attemptedQuestions: Array<{
      questionId: string;
      questionNo: string;
      subQuestionNo: string;
      rating: number;
      paperId: string;
      attempts: number;
      lastAttempted: Date;
    }> = [];

    // Get all ratings from localStorage for all paper IDs
    const ratingsData: { [paperId: string]: { [questionId: string]: number } } = {};
    
    // Check localStorage for all rating keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('question-ratings-')) {
        const paperId = key.replace('question-ratings-', '');
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            ratingsData[paperId] = JSON.parse(stored);
          }
        } catch (error) {
          console.warn(`Failed to parse ratings for ${paperId}:`, error);
        }
      }
    }

    // Also get attempts from quiz history
    const questionAttempts: { [questionId: string]: { count: number; lastDate: Date; paperId: string } } = {};
    
    visibleAttempts.forEach(attempt => {
      attempt.questions.forEach(q => {
        const key = q.questionId;
        if (!questionAttempts[key] || questionAttempts[key].lastDate < attempt.endTime) {
          questionAttempts[key] = {
            count: (questionAttempts[key]?.count || 0) + 1,
            lastDate: attempt.endTime,
            paperId: attempt.paperId
          };
        }
      });
    });

    // Combine ratings and attempt data
    Object.entries(ratingsData).forEach(([paperId, ratings]) => {
      Object.entries(ratings).forEach(([questionId, rating]) => {
        if (rating > 0) { // Only show rated questions
          const [questionNo, subQuestionNo] = questionId.split('_');
          const attempts = questionAttempts[questionId];
          
          attemptedQuestions.push({
            questionId,
            questionNo,
            subQuestionNo,
            rating,
            paperId,
            attempts: attempts?.count || 1,
            lastAttempted: attempts?.lastDate || new Date()
          });
        }
      });
    });

    // Sort by most recently attempted
    return attemptedQuestions.sort((a, b) => b.lastAttempted.getTime() - a.lastAttempted.getTime());
  };

  const attemptedQuestions = getAttemptedQuestions();

  // Apply filters
  // Track current quiz attempt ID
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);

  // Start quiz attempt when component mounts  
  useEffect(() => {
    const attemptId = startQuizAttempt(paperId, questions, filters);
    setCurrentAttemptId(attemptId);
    const startTime = new Date();
    setQuizStartTime(startTime);
    setCurrentQuestionStartTime(startTime);
    
    // Store attemptId in state for later use
    const cleanup = () => {
      if (!quizState.quizCompleted) {
        endQuizAttempt(attemptId, []);
      }
    };
    
    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []); // Empty dependency array - only run on mount



  useEffect(() => {
    const applyFilters = async () => {
      let filtered: Question[] = [];

      // Handle revision mode specially - load from all subject papers
      if (filters.revisionOnly) {
        try {
          console.log('Loading revision questions for subject:', questionPaper.metadata.subject_name);
          const allSubjectRevisionQuestions = await getAllRevisionQuestions(questionPaper.metadata.subject_name);
          console.log('Found revision questions from all papers:', allSubjectRevisionQuestions.length);
          console.log('Revision questions details:', allSubjectRevisionQuestions.map(q => `${q.question_no}_${q.sub_question_no}`));
          filtered = allSubjectRevisionQuestions;
          
          if (filtered.length === 0) {
            console.warn('No revision questions found across all papers, checking current paper only');
            // Only if no cross-paper questions found, fallback to current paper
            filtered = allQuestions.filter(q => {
              const questionId = `${q.question_no}_${q.sub_question_no}`;
              return isMarkedForRevision(questionId);
            });
          }
        } catch (error) {
          console.error('Failed to load subject revision questions:', error);
          // Fallback to current paper only
          filtered = allQuestions.filter(q => {
            const questionId = `${q.question_no}_${q.sub_question_no}`;
            return isMarkedForRevision(questionId);
          });
        }
      } else {
        // Normal filtering for current paper only
        filtered = allQuestions;

        if (filters.subjects.length > 0) {
          filtered = filtered.filter(() => filters.subjects.includes(questionPaper.metadata.subject_name));
        }
      }

      // Apply common filters (marks, tags) to both revision and normal modes
      filtered = filtered.filter(q => q.marks >= filters.minMarks && q.marks <= filters.maxMarks);

      if (filters.selectedTags.length > 0) {
        filtered = filtered.filter(q => 
          filters.selectedTags.some(tag => q.tags.includes(tag))
        );
      }

      setQuestions(filtered);
      setQuizState(prev => ({ ...prev, currentQuestionIndex: 0 }));
    };

    applyFilters();
  }, [filters, allQuestions, questionPaper.metadata.subject_name]);

  const currentQuestion = questions[quizState.currentQuestionIndex];
  const questionId = currentQuestion ? `${currentQuestion.question_no}_${currentQuestion.sub_question_no}` : '';
  
  // Determine which paperId to use for notes and ratings
  const currentQuestionPaperId = filters.revisionOnly && currentQuestion && (currentQuestion as any)._paperInfo
    ? (currentQuestion as any)._paperInfo.paperId
    : paperId;
    
  const savedNote = currentQuestion ? getNote(questionId, currentQuestionPaperId) : '';

  // Track question timing when changing questions
  useEffect(() => {
    if (currentQuestion && currentQuestionStartTime) {
      setCurrentQuestionStartTime(new Date());
    }
  }, [quizState.currentQuestionIndex, currentQuestion]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showFiltersDropdown && !target.closest('.filters-dropdown')) {
        setShowFiltersDropdown(false);
      }
      if (showAttemptedDropdown && !target.closest('.attempted-dropdown')) {
        setShowAttemptedDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFiltersDropdown, showAttemptedDropdown]);

  // Calculate quiz statistics
  const calculateQuizStats = () => {
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(quizState.userAnswers).length;
    
    const totalDuration = quizStartTime ? Math.floor((currentTime - quizStartTime.getTime()) / 1000) : 0;
    
    const totalQuestionTime = Object.values(questionTimes).reduce((sum, time) => sum + time, 0);
    // Add current question time if in progress
    const currentQuestionTime = currentQuestionStartTime 
      ? Math.floor((currentTime - currentQuestionStartTime.getTime()) / 1000)
      : 0;
    
    const totalTimeIncludingCurrent = totalQuestionTime + currentQuestionTime;
    const questionsForAverage = answeredQuestions + (currentQuestionStartTime ? 1 : 0);
    const avgTimePerQuestion = questionsForAverage > 0 ? totalTimeIncludingCurrent / questionsForAverage : 0;
    
    return {
      totalQuestions,
      answeredQuestions,
      totalDuration,
      avgTimePerQuestion,
    };
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Live timer update
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmitAnswer = () => {
    if (!currentQuestion) return;

    setQuizState(prev => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [questionId]: userAnswer,
      },
      showAnswer: true,
    }));
  };

  const handleRating = (rating: number) => {
    setQuizState(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [questionId]: rating,
      },
    }));
    
    // Update confidence in progress tracking (convert 1-10 quiz rating to 1-5 confidence scale)
    const confidenceScore = Math.round((rating / 10) * 5);
    updateConfidence(questionId, confidenceScore);
  };

  const handleNextQuestion = () => {
    const currentQuestion = questions[quizState.currentQuestionIndex];
    const questionId = `${currentQuestion.question_no}_${currentQuestion.sub_question_no}`;
    
    // Record timing for current question
    if (currentQuestionStartTime) {
      const timeSpent = Math.floor((Date.now() - currentQuestionStartTime.getTime()) / 1000);
      setQuestionTimes(prev => ({
        ...prev,
        [questionId]: timeSpent
      }));
    }
    
    // Record progress for current question before moving to next
    if (quizState.showAnswer) {
      markCompleted(questionId);
      // Start quiz session for this question
      startStudySession(questionId, 'quiz');
      setTimeout(() => endStudySession(questionId), 100); // Short session for quiz
    }

    const nextIndex = quizState.currentQuestionIndex + 1;
    
    if (nextIndex >= questions.length) {
      // Quiz completed - save the attempt data
      completeQuizAttempt();
      setQuizState(prev => ({ ...prev, quizCompleted: true }));
    } else {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: nextIndex,
        showAnswer: false,
      }));
      setUserAnswer('');
    }
  };

  // Function to complete quiz attempt and save data
  const completeQuizAttempt = () => {
    if (!currentAttemptId || !quizStartTime) return;

    // Create quiz results only for questions that were actually attempted (have answers or ratings)
    const quizResults: QuizQuestionResult[] = questions
      .map((question, index) => {
        const questionId = `${question.question_no}_${question.sub_question_no}`;
        const userAnswer = quizState.userAnswers[questionId] || '';
        const timeSpent = questionTimes[questionId] || 0;
        const userRating = quizState.ratings[questionId] || 0;
        
        // Only include questions that were actually attempted (have answers, time spent, or ratings)
        if (userAnswer.trim().length === 0 && timeSpent === 0 && userRating === 0) {
          return null;
        }
        
        // Determine if answer is correct (simplified - you might want more sophisticated logic)
        const isCorrect = userAnswer.trim().length > 0; // Placeholder logic - you can enhance this
        
        return {
          questionId,
          questionNo: question.question_no,
          subQuestionNo: question.sub_question_no,
          marks: question.marks,
          timeSpent,
          userAnswer,
          isCorrect,
          confidence: Math.round((userRating / 10) * 5), // Convert 1-10 rating to 1-5 confidence
          difficulty: userRating,
          // Include paper information for tracking source
          paperInfo: (question as any)._paperInfo || {
            filename: paperId + '.json',
            examination: questionPaper.metadata.examination,
            subject_code: questionPaper.metadata.subject_code,
            subject_name: questionPaper.metadata.subject_name,
            paperId: paperId
          },
          // Store question text for display in history
          questionText: question.question_text
        };
      })
      .filter(Boolean) as QuizQuestionResult[]; // Remove null entries

    // End the quiz attempt with results
    endQuizAttempt(currentAttemptId, quizResults);
  };

  const handlePreviousQuestion = () => {
    const prevIndex = quizState.currentQuestionIndex - 1;
    
    if (prevIndex >= 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prevIndex,
        showAnswer: false,
      }));
      setUserAnswer('');
    }
  };

  const handleShowAnswer = () => {
    // Record timing for question when showing answer
    if (currentQuestionStartTime && currentQuestion) {
      const questionId = `${currentQuestion.question_no}_${currentQuestion.sub_question_no}`;
      const timeSpent = Math.floor((Date.now() - currentQuestionStartTime.getTime()) / 1000);
      setQuestionTimes(prev => ({
        ...prev,
        [questionId]: timeSpent
      }));
    }
    
    setQuizState(prev => ({
      ...prev,
      showAnswer: true,
    }));
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const toggleSubject = (subject: string) => {
    setFilters(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };



  if (quizState.quizCompleted) {
    const finalStats = calculateQuizStats();
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(quizState.userAnswers).length;
    const ratedQuestions = Object.keys(quizState.ratings).length;
    const averageRating = ratedQuestions > 0 
      ? Object.values(quizState.ratings).reduce((a, b) => a + b, 0) / ratedQuestions 
      : 0;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-lg w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quiz Completed!</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {answeredQuestions}/{totalQuestions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatTime(finalStats.totalDuration)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatTime(Math.floor(finalStats.avgTimePerQuestion))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Time</div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {averageRating.toFixed(1)}/10
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                // Start a new quiz attempt
                const newAttemptId = startQuizAttempt(paperId, questions, filters);
                setCurrentAttemptId(newAttemptId);
                
                setQuizState({
                  currentQuestionIndex: 0,
                  userAnswers: {},
                  ratings: {},
                  showAnswer: false,
                  quizCompleted: false,
                });
                setUserAnswer('');
                // Reset timing
                const startTime = new Date();
                setQuizStartTime(startTime);
                setCurrentQuestionStartTime(startTime);
                setQuestionTimes({});
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Retry Quiz
            </button>
            <button
              onClick={onExit}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">No questions available</h2>
          <button
            onClick={onExit}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Quiz Header with Filters */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Revision Mode Info Banner */}
          {filters.revisionOnly && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-center text-sm">
                <span className="text-amber-700 dark:text-amber-300">
                  📌 <strong>Subject Revision Mode:</strong> Showing questions marked for revision across all {questionPaper.metadata.subject_name} papers
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center h-16">
            {/* Logo and Quiz Info */}
            <div className="flex items-center">
              <button
                onClick={onExit}
                className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon size={20} />
              </button>
              <div className="flex-shrink-0 flex items-center">
                <GraduationCapIcon size={28} className="text-blue-600 mr-3" />
                <span className="text-2xl font-bold text-blue-600">
                  GTU Quiz
                </span>
              </div>
              <div className="ml-8 flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Question {quizState.currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {questionPaper.metadata.subject_name}
                  {filters.revisionOnly && (
                    <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                      (All Papers)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Filters and Theme Toggle */}
            <div className="flex items-center space-x-4">
              {/* Revision Mode Toggle */}
              <button
                onClick={() => setFilters(prev => ({ ...prev, revisionOnly: !prev.revisionOnly }))}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  filters.revisionOnly
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={filters.revisionOnly ? 
                  `Showing revision questions from all ${questionPaper.metadata.subject_name} papers` :
                  `Switch to revision mode (${getSubjectRevisionCount(questionPaper.metadata.subject_name)} questions across all ${questionPaper.metadata.subject_name} papers)`
                }
              >
                📌 Subject Revision
                <span className="ml-2 text-xs bg-amber-600 text-white px-2 py-1 rounded-full">
                  {getSubjectRevisionCount(questionPaper.metadata.subject_name)}
                </span>
              </button>
              
              {/* Attempted Questions Dropdown */}
              <div className="relative attempted-dropdown">
                <button
                  onClick={() => setShowAttemptedDropdown(!showAttemptedDropdown)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
                >
                  <AttemptedQuestionsIcon size={16} className="mr-1" />
                  Attempted
                  <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                    {attemptedQuestions.length}
                  </span>
                </button>

                {showAttemptedDropdown && (
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Attempted Questions with Ratings
                      </h3>
                      {attemptedQuestions.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No questions attempted yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {attemptedQuestions.slice(0, 20).map((q) => (
                            <div
                              key={`${q.paperId}-${q.questionId}`}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {q.questionNo} {q.subQuestionNo}
                                </span>
                                <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                  {q.paperId.includes('winter') ? 'Winter' : 
                                   q.paperId.includes('summer') ? 'Summer' : 
                                   q.paperId.includes('ip-') ? 'IP Paper' :
                                   q.paperId.slice(-8)}
                                </span>
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                                  {q.attempts} attempts
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <span
                                      key={i}
                                      className={`text-sm ${
                                        i < q.rating
                                          ? 'text-yellow-400'
                                          : 'text-gray-300 dark:text-gray-600'
                                      }`}
                                    >
                                      ⭐
                                    </span>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                  {q.rating}/10
                                </span>
                              </div>
                            </div>
                          ))}
                          {attemptedQuestions.length > 20 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                              Showing top 20 questions. Total: {attemptedQuestions.length}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Filters Dropdown */}
              <div className="relative filters-dropdown">
                <button
                  onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
                >
                  Filters
                  <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    {questions.length}
                  </span>
                </button>

                {showFiltersDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-4">
                      {/* Marks Range */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Marks Range: {filters.minMarks}-{filters.maxMarks}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min={markRange.min}
                            max={markRange.max}
                            value={filters.minMarks}
                            onChange={(e) => setFilters(prev => ({ ...prev, minMarks: Number(e.target.value) }))}
                            className="flex-1"
                          />
                          <input
                            type="range"
                            min={markRange.min}
                            max={markRange.max}
                            value={filters.maxMarks}
                            onChange={(e) => setFilters(prev => ({ ...prev, maxMarks: Number(e.target.value) }))}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {allTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-2 py-1 text-xs rounded-full transition-all ${
                                filters.selectedTags.includes(tag)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={onThemeToggle}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle theme"
              >
                {theme.mode === 'light' ? (
                  <MoonIcon size={20} />
                ) : (
                  <SunIcon size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quiz Statistics Panel */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(() => {
              const stats = calculateQuizStats();
              return (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.answeredQuestions}/{stats.totalQuestions}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Questions</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatTime(stats.totalDuration)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Duration</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatTime(Math.floor(stats.avgTimePerQuestion))}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Avg Time</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      📚 Quiz
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Mode</div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quiz Progress</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round((calculateQuizStats().answeredQuestions / calculateQuizStats().totalQuestions) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${Math.max(0, (calculateQuizStats().answeredQuestions / calculateQuizStats().totalQuestions) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="max-w-4xl mx-auto px-6">
        {/* Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                {currentQuestion.question_no} {currentQuestion.sub_question_no}
              </span>
              <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                {currentQuestion.marks} marks
              </span>
              
              {/* Show paper source if in revision mode and question is from different paper */}
              {filters.revisionOnly && (currentQuestion as any)._paperInfo && (
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium">
                  📄 {(currentQuestion as any)._paperInfo.examination}
                </span>
              )}
            </div>
            
            {/* Revision Toggle for this question */}
            <RevisionToggle
              isMarkedForRevision={
                filters.revisionOnly 
                  ? ((currentQuestion as any)._paperInfo
                      ? isQuestionMarkedForRevision(
                          questionId, 
                          (currentQuestion as any)._paperInfo.paperId, 
                          (currentQuestion as any)._paperInfo.filename
                        )
                      : isQuestionMarkedForRevision(questionId, paperId))
                  : isMarkedForRevision(questionId)
              }
              onToggle={() => {
                if (filters.revisionOnly) {
                  // In subject revision mode - always use cross-paper revision system with filename
                  const paperInfo = (currentQuestion as any)._paperInfo;
                  const targetPaperId = paperInfo?.paperId || paperId;
                  const targetFilename = paperInfo?.filename;
                  toggleQuestionRevision(questionId, targetPaperId, targetFilename);
                } else {
                  // In regular mode - use paper-specific revision
                  toggleRevision(questionId);
                }
              }}
              size="sm" 
              theme="light"
            />
          </div>

          <h2 
            className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
            dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
          />

          {/* Star Rating in Quiz Mode */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">Previous Rating:</span>
              <StarRating
                rating={getRatingForQuestion(questionId, currentQuestionPaperId)}
                onRatingChange={(rating) => {
                  setRatingForQuestion(questionId, rating, currentQuestionPaperId);
                  // Update confidence in progress tracking (star rating is already 1-5 scale)
                  updateConfidence(questionId, rating);
                }}
                size="sm"
                showLabel={true}
              />
            </div>
          </div>

          {shouldShowDiagram(currentQuestion.diagram_representation) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {currentQuestion.diagram_representation}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            {currentQuestion.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* User Answer Input */}
          {!quizState.showAnswer && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Answer:
              </label>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Write your answer here..."
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleShowAnswer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Show Answer
                </button>
                <button
                  onClick={() => {
                    if (userAnswer.trim()) {
                      handleSubmitAnswer();
                    }
                    handleShowAnswer();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Submit & Show Answer
                </button>
              </div>
            </div>
          )}

          {/* Show Answer & Notes */}
          {quizState.showAnswer && (
            <div className="space-y-6">
              {/* Your Answer */}
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Your Answer:</h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {quizState.userAnswers[questionId] || 'No answer provided'}
                </p>
              </div>

              {/* Correct Answer */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                  <DocumentIcon className="text-green-600 mr-2" size={18} />
                  Correct Answer:
                </h4>
                <div 
                  className="text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatBoldText(currentQuestion.answer) }}
                />
              </div>

              {/* Saved Notes */}
              {savedNote && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Your Study Notes:</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{savedNote}</p>
                </div>
              )}

              {/* Rating */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Rate your confidence (1-10):</h4>
                <div className="flex space-x-2">
                  {[...Array(10)].map((_, i) => {
                    const rating = i + 1;
                    const isSelected = quizState.ratings[questionId] === rating;
                    return (
                      <button
                        key={rating}
                        onClick={() => handleRating(rating)}
                        className={`w-10 h-10 rounded-full font-medium transition-all ${
                          isSelected
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex gap-3">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={quizState.currentQuestionIndex === 0}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                >
                  ← Previous Question
                </button>
                <button
                  onClick={handleNextQuestion}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {quizState.currentQuestionIndex + 1 >= questions.length ? 'Complete Quiz' : 'Next Question →'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation Controls (always visible at bottom) */}
          {!quizState.showAnswer && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handlePreviousQuestion}
                disabled={quizState.currentQuestionIndex === 0}
                className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                ← Previous Question
              </button>
              <button
                onClick={handleNextQuestion}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {quizState.currentQuestionIndex + 1 >= questions.length ? 'Complete Quiz' : 'Next Question →'}
              </button>
            </div>
          )}
         </div>
      </div>
    </div>
  );
};

export default QuizMode;