import React from 'react';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { QuestionPaper, Question } from '../types';

interface PriorityQuestionsPanelProps {
  progressTracking: ReturnType<typeof useProgressTracking>;
  questionPaper: QuestionPaper;
}

const PriorityQuestionsPanel: React.FC<PriorityQuestionsPanelProps> = ({
  progressTracking,
  questionPaper
}) => {
  // Calculate priority scores for questions
  const priorityQuestions = questionPaper.questions.map(question => {
    const questionId = `${question.question_no}_${question.sub_question_no}`;
    const progress = progressTracking.getQuestionProgress(questionId);
    
    // Priority calculation factors
    let priorityScore = 0;
    
    // Higher marks = higher priority
    priorityScore += (question.marks / 7) * 20; // Max 20 points
    
    // Low confidence = higher priority
    if (progress.confidenceLevel > 0) {
      priorityScore += (5 - progress.confidenceLevel) * 10; // Max 40 points
    } else {
      priorityScore += 25; // Unrated questions get medium priority
    }
    
    // Not completed = higher priority
    if (!progress.completed) {
      priorityScore += 15;
    }
    
    // Recent study = lower priority
    if (progress.lastStudied) {
      const daysSinceStudy = (Date.now() - progress.lastStudied.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceStudy > 7) priorityScore += 10;
      if (daysSinceStudy > 3) priorityScore += 5;
    } else {
      priorityScore += 20; // Never studied = high priority
    }
    
    // Low review count = higher priority
    if (progress.reviewCount === 0) {
      priorityScore += 15;
    } else if (progress.reviewCount < 3) {
      priorityScore += 5;
    }
    
    // Time spent consideration
    const avgTimePerQuestion = progressTracking.stats.totalTimeSpent / Math.max(1, progressTracking.stats.completedQuestions);
    if (progress.timeSpent > avgTimePerQuestion * 1.5) {
      priorityScore += 10; // Questions that took longer need more attention
    }

    return {
      question,
      progress,
      priorityScore: Math.round(priorityScore),
      reasons: [] as string[]
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // Add reasons for priority
  priorityQuestions.forEach(item => {
    if (!item.progress.completed) item.reasons.push('Not completed');
    if (item.progress.confidenceLevel <= 2 && item.progress.confidenceLevel > 0) item.reasons.push('Low confidence');
    if (item.progress.confidenceLevel === 0) item.reasons.push('Not rated');
    if (item.progress.reviewCount === 0) item.reasons.push('Never reviewed');
    if (item.progress.reviewCount < 3) item.reasons.push('Few reviews');
    if (item.question.marks >= 7) item.reasons.push('High marks');
    
    const daysSinceStudy = item.progress.lastStudied ? 
      (Date.now() - item.progress.lastStudied.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
    
    if (daysSinceStudy > 7) item.reasons.push('Long time since study');
    if (!item.progress.lastStudied) item.reasons.push('Never studied');
  });

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return '< 1m';
    return `${minutes}m`;
  };

  const getPriorityLevel = (score: number): { color: string; label: string; emoji: string } => {
    if (score >= 80) return { color: 'red', label: 'Critical', emoji: '🚨' };
    if (score >= 60) return { color: 'orange', label: 'High', emoji: '⚠️' };
    if (score >= 40) return { color: 'yellow', label: 'Medium', emoji: '📌' };
    return { color: 'green', label: 'Low', emoji: '✅' };
  };

  const topPriorityQuestions = priorityQuestions.slice(0, 10);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          ⚡ Priority Questions
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Top {topPriorityQuestions.length} critical questions
        </div>
      </div>

      {topPriorityQuestions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Great Job!
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No high-priority questions found. Keep up the good work!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topPriorityQuestions.map((item, index) => {
            const priority = getPriorityLevel(item.priorityScore);
            
            return (
              <div
                key={`${item.question.question_no}_${item.question.sub_question_no}`}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="text-xl">{priority.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Q{item.question.question_no} {item.question.sub_question_no}
                        </h3>
                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium">
                          {item.question.marks} marks
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {item.question.question_text.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      priority.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      priority.color === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                      priority.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {priority.label} ({item.priorityScore})
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Status</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.progress.completed ? '✅ Done' : '⏳ Pending'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Confidence</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.progress.confidenceLevel === 0 ? 'Not rated' : `${item.progress.confidenceLevel}/5`}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Reviews</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.progress.reviewCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Time Spent</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatTime(item.progress.timeSpent)}
                    </div>
                  </div>
                </div>

                {/* Reasons for priority */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.reasons.slice(0, 4).map((reason, reasonIndex) => (
                    <span
                      key={reasonIndex}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                    >
                      {reason}
                    </span>
                  ))}
                  {item.reasons.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                      +{item.reasons.length - 4} more
                    </span>
                  )}
                </div>

                {/* Tags */}
                {item.question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.question.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.question.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                        +{item.question.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action suggestions */}
          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">
              🎯 Study Strategy
            </h4>
            <ul className="text-sm text-purple-800 dark:text-purple-400 space-y-1">
              <li>• Start with critical priority questions (red)</li>
              <li>• Focus on high-marks questions for maximum impact</li>
              <li>• Complete unfinished questions first</li>
              <li>• Review low-confidence areas more frequently</li>
              <li>• Use revision mode for priority questions</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityQuestionsPanel;