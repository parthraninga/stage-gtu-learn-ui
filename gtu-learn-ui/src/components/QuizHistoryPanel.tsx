import React, { useState } from 'react';
import { useQuizHistory, QuizAttempt } from '../hooks/useQuizHistory';
import { TargetIcon, AttemptedQuestionsIcon, StarIcon, ChevronRightIcon, ChevronLeftIcon, PinIcon, BookIcon } from './Icons';

interface QuizHistoryPanelProps {
  quizHistory: ReturnType<typeof useQuizHistory>;
}

const QuizHistoryPanel: React.FC<QuizHistoryPanelProps> = ({ quizHistory }) => {
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'high' | 'low'>('all');
  const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set());

  const { attempts, visibleAttempts, hideAttempt, showAttempt, deleteAttempt } = quizHistory;

  const toggleExpanded = (attemptId: string) => {
    setExpandedAttempts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attemptId)) {
        newSet.delete(attemptId);
      } else {
        newSet.add(attemptId);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatExamination = (examination?: string): string => {
    if (!examination) return '';
    // Format examination text (e.g., "WINTER 2024" -> "Winter 2024")
    return examination
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const filteredAttempts = (showHidden ? attempts : visibleAttempts).filter(attempt => {
    switch (filterBy) {
      case 'recent':
        return Date.now() - attempt.startTime.getTime() < 7 * 24 * 60 * 60 * 1000;
      case 'high':
        return attempt.score >= 80;
      case 'low':
        return attempt.score < 60;
      default:
        return true;
    }
  }).sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'duration':
        return b.duration - a.duration;
      default:
        return b.startTime.getTime() - a.startTime.getTime();
    }
  });

  // Calculate average rating across all attempts
  const calculateAverageRating = () => {
    const allRatings = filteredAttempts
      .flatMap(attempt => attempt.questions)
      .map(q => q.difficulty)
      .filter(rating => rating > 0);
    
    if (allRatings.length === 0) return 0;
    return Math.round((allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length) * 10) / 10;
  };

  // Calculate total questions attempted with ratings
  const totalQuestionsWithRatings = filteredAttempts
    .flatMap(attempt => attempt.questions)
    .filter(q => q.difficulty > 0).length;

  const AttemptCard: React.FC<{ attempt: QuizAttempt }> = ({ attempt }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${
      attempt.isHidden ? 'opacity-50' : ''
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(attempt.score)}`}>
            {attempt.score}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {attempt.startTime.toLocaleDateString()} at {attempt.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {attempt.isHidden && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded">
              Hidden
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => attempt.isHidden ? showAttempt(attempt.id) : hideAttempt(attempt.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
          >
            {attempt.isHidden ? '👁️ Show' : '🫣 Hide'}
          </button>
          <button
            onClick={() => deleteAttempt(attempt.id)}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Questions</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {attempt.correctAnswers}/{attempt.totalQuestions}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Duration</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatTime(attempt.duration)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Avg Time</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatTime(Math.round(attempt.duration / attempt.totalQuestions))}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Mode</div>
          <div className="font-medium text-gray-900 dark:text-white flex items-center">
            {attempt.filters?.revisionOnly ? (
              <>
                <PinIcon size={14} className="mr-1" />
                Revision
              </>
            ) : (
              <>
                <BookIcon size={14} className="mr-1" />
                Study
              </>
            )}
          </div>
        </div>
      </div>

      {attempt.filters && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Filters: {attempt.filters.minMarks}-{attempt.filters.maxMarks} marks
            {attempt.filters.selectedTags.length > 0 && (
              <span>, Tags: {attempt.filters.selectedTags.join(', ')}</span>
            )}
          </div>
        </div>
      )}

      {/* Question results preview with expand button */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Questions Attempted</h4>
          <button
            onClick={() => toggleExpanded(attempt.id)}
            className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          >
            {expandedAttempts.has(attempt.id) ? (
              <>
                <ChevronLeftIcon size={14} className="mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronRightIcon size={14} className="mr-1" />
                Show Details
              </>
            )}
          </button>
        </div>

        {!expandedAttempts.has(attempt.id) ? (
          // Compact view - show only first 10 questions
          <div className="flex flex-wrap gap-1">
            {attempt.questions.slice(0, 10).map((q, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded text-xs flex items-center justify-center font-medium ${
                  q.isCorrect 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
                title={`Q${q.questionNo}${q.subQuestionNo}${q.paperInfo ? ` (${formatExamination(q.paperInfo.examination)})` : ''} - ${q.isCorrect ? 'Correct' : 'Incorrect'} - ${formatTime(q.timeSpent)} - Rating: ${q.difficulty}/10`}
              >
                {q.isCorrect ? '✓' : '✗'}
              </div>
            ))}
            {attempt.questions.length > 10 && (
              <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs flex items-center justify-center">
                +{attempt.questions.length - 10}
              </div>
            )}
          </div>
        ) : (
          // Detailed view - show all questions with ratings
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {attempt.questions.map((q, i) => (
              <div
                key={i}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start space-x-3 flex-1">
                    <div
                      className={`w-8 h-8 rounded text-xs flex items-center justify-center font-medium flex-shrink-0 ${
                        q.isCorrect 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {q.isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Q{q.questionNo}{q.subQuestionNo}
                        </div>
                        {q.paperInfo && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                            {formatExamination(q.paperInfo.examination)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {q.marks} marks • {formatTime(q.timeSpent)}
                      </div>
                      {q.questionText && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 p-2 rounded border-l-2 border-blue-400 mt-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Question:</div>
                          <div 
                            className="text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: q.questionText.length > 200 ? q.questionText.substring(0, 200) + '...' : q.questionText }} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Rating Stars */}
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Rating:</span>
                      <div className="flex">
                        {[...Array(5)].map((_, starI) => (
                          <StarIcon
                            key={starI}
                            size={12}
                            className={`${
                              starI < Math.round(q.difficulty / 2)
                                ? 'text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({q.difficulty}/10)
                      </span>
                    </div>
                    
                    {/* Confidence Level */}
                    {q.confidence > 0 && (
                      <div className="text-xs">
                        <span className={`px-2 py-1 rounded-full text-white ${
                          q.confidence >= 4 ? 'bg-green-500' :
                          q.confidence >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {q.confidence >= 4 ? 'High' : q.confidence >= 3 ? 'Med' : 'Low'} Confidence
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <TargetIcon size={20} className="mr-2" />
          Quiz History
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{quizHistory.stats.totalAttempts}</div>
            <div className="text-sm opacity-90">Total Attempts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{quizHistory.stats.averageScore}%</div>
            <div className="text-sm opacity-90">Average Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{quizHistory.stats.bestScore}%</div>
            <div className="text-sm opacity-90">Best Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {calculateAverageRating()}/10
            </div>
            <div className="text-sm opacity-90">Avg Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {quizHistory.stats.improvementTrend >= 0 ? '+' : ''}{quizHistory.stats.improvementTrend}%
            </div>
            <div className="text-sm opacity-90">Improvement</div>
          </div>
        </div>
        
        {/* Additional stats row for question details */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold">{totalQuestionsWithRatings}</div>
              <div className="text-sm opacity-90">Questions Rated</div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {filteredAttempts.reduce((sum, attempt) => sum + attempt.questions.length, 0)}
              </div>
              <div className="text-sm opacity-90">Total Questions Attempted</div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {quizHistory.stats.totalTimeSpent > 0 ? formatTime(quizHistory.stats.totalTimeSpent) : '0m'}
              </div>
              <div className="text-sm opacity-90">Total Study Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="date">Date</option>
                <option value="score">Score</option>
                <option value="duration">Duration</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter:
              </label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Attempts</option>
                <option value="recent">Last 7 Days</option>
                <option value="high">High Scores (80%+)</option>
                <option value="low">Low Scores (&lt;60%)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Hidden</span>
            </label>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredAttempts.length} attempts
            </div>
          </div>
        </div>
      </div>

      {/* Attempts List */}
      <div className="space-y-4">
        {filteredAttempts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="flex justify-center mb-4">
              <TargetIcon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Quiz Attempts Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Start taking quizzes to see your performance history here.
            </p>
          </div>
        ) : (
          filteredAttempts.map((attempt) => (
            <AttemptCard key={attempt.id} attempt={attempt} />
          ))
        )}
      </div>
    </div>
  );
};

export default QuizHistoryPanel;