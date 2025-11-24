import React from 'react';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { useQuestionRatings } from '../hooks/useQuestionRatings';
import { useQuizHistory } from '../hooks/useQuizHistory';
import { QuestionPaper } from '../types';

interface WeakAreasPanelProps {
  progressTracking: ReturnType<typeof useProgressTracking>;
  questionPaper: QuestionPaper;
  paperId: string;
}

const WeakAreasPanel: React.FC<WeakAreasPanelProps> = ({
  progressTracking,
  questionPaper,
  paperId
}) => {
  const weakAreas = progressTracking.getWeakAreas();
  const { getRating } = useQuestionRatings(paperId);
  const quizHistory = useQuizHistory();
  
  // Calculate comprehensive topic performance including both study and quiz ratings
  const topicPerformance = new Map<string, {
    totalQuestions: number;
    completedQuestions: number;
    averageConfidence: number;
    averageTimeSpent: number;
    lowConfidenceCount: number;
    ratings: number[];
    averageRating: number;
  }>();

  questionPaper.questions.forEach(question => {
    const questionId = `${question.question_no}_${question.sub_question_no}`;
    const progress = progressTracking.getQuestionProgress(questionId);
    
    question.tags.forEach(tag => {
      const current = topicPerformance.get(tag) || {
        totalQuestions: 0,
        completedQuestions: 0,
        averageConfidence: 0,
        averageTimeSpent: 0,
        lowConfidenceCount: 0,
        ratings: [],
        averageRating: 0
      };
      
      current.totalQuestions++;
      if (progress.completed) current.completedQuestions++;
      current.averageConfidence += progress.confidenceLevel;
      current.averageTimeSpent += progress.timeSpent;
      if (progress.confidenceLevel > 0 && progress.confidenceLevel <= 2) {
        current.lowConfidenceCount++;
      }

      // Get study mode rating (star rating 1-5)
      const studyRating = getRating(questionId);
      if (studyRating > 0) {
        current.ratings.push(studyRating);
      }

      // Get quiz mode ratings by checking quiz attempts
      // Since there's no direct method, we'll use the confidence level as a proxy for quiz ratings
      // Convert confidence level (1-5) to rating (1-5) - they're the same scale
      if (progress.confidenceLevel > 0) {
        current.ratings.push(progress.confidenceLevel);
      }
      
      topicPerformance.set(tag, current);
    });
  });

  // Calculate averages and identify weak areas
  const topicStats = Array.from(topicPerformance.entries()).map(([topic, stats]) => {
    // Calculate average rating
    const averageRating = stats.ratings.length > 0 
      ? stats.ratings.reduce((sum, rating) => sum + rating, 0) / stats.ratings.length 
      : 0;
    
    return {
      topic,
      completionRate: (stats.completedQuestions / stats.totalQuestions) * 100,
      averageConfidence: stats.averageConfidence / stats.totalQuestions,
      averageTimeSpent: stats.averageTimeSpent / stats.totalQuestions,
      averageRating: averageRating,
      weaknessScore: (stats.lowConfidenceCount / stats.totalQuestions) * 100,
      totalQuestions: stats.totalQuestions,
      totalRatings: stats.ratings.length
    };
  }).sort((a, b) => b.weaknessScore - a.weaknessScore);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getWeaknessLevel = (score: number): { color: string; label: string } => {
    if (score >= 60) return { color: 'red', label: 'Critical' };
    if (score >= 40) return { color: 'orange', label: 'Needs Work' };
    if (score >= 20) return { color: 'yellow', label: 'Watch' };
    return { color: 'green', label: 'Good' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          🚨 Weak Areas Analysis
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {weakAreas.length} critical areas
        </div>
      </div>

      {topicStats.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start studying questions to see weak area analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topicStats.slice(0, 8).map((stat, index) => {
            const weakness = getWeaknessLevel(stat.weaknessScore);
            
            return (
              <div
                key={stat.topic}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">
                      {index === 0 && stat.weaknessScore > 50 ? '🚨' : 
                       index < 3 && stat.weaknessScore > 30 ? '⚠️' : '📌'}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {stat.topic}
                      </h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {stat.totalQuestions} questions
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      weakness.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      weakness.color === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                      weakness.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {weakness.label}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Completion</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {Math.round(stat.completionRate)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Rating</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {stat.averageRating > 0 ? `${stat.averageRating.toFixed(1)}/5.0` : 'No ratings'}
                      {stat.totalRatings > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {stat.totalRatings} rating{stat.totalRatings !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Confidence</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {stat.averageConfidence.toFixed(1)}/5.0
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Avg Time</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatTime(stat.averageTimeSpent)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Weakness</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {Math.round(stat.weaknessScore)}%
                    </div>
                  </div>
                </div>

                {/* Progress bar for weakness score */}
                <div className="mt-3">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        weakness.color === 'red' ? 'bg-red-500' :
                        weakness.color === 'orange' ? 'bg-orange-500' :
                        weakness.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stat.weaknessScore, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Action suggestions */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Improvement Suggestions
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Focus on topics with low confidence scores (&lt; 3.0)</li>
              <li>• Practice questions from critical areas more frequently</li>
              <li>• Use revision mode to target weak topics specifically</li>
              <li>• Set up study sessions for high-weakness areas</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeakAreasPanel;