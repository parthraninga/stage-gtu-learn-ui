import React from 'react';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { useQuizHistory } from '../hooks/useQuizHistory';
import { QuestionPaper } from '../types';
import { CheckIcon, ClockIcon, FlexIcon, TargetIcon, StarIcon, DashboardIcon } from './Icons';

interface ProgressOverviewProps {
  progressTracking: ReturnType<typeof useProgressTracking>;
  quizHistory: ReturnType<typeof useQuizHistory>;
  questionPaper: QuestionPaper;
}

const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  progressTracking,
  quizHistory,
  questionPaper
}) => {
  const { stats } = progressTracking;
  const { stats: quizStats } = quizHistory;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    progress?: number;
  }> = ({ title, value, subtitle, icon: IconComponent, color, progress }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
          <IconComponent size={24} className={`text-${color}-600 dark:text-${color}-400`} />
        </div>
        {progress !== undefined && (
          <div className="text-right">
            <div className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
              {progress}%
            </div>
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
      
      {progress !== undefined && (
        <div className="mt-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`bg-${color}-500 h-2 rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const completionPercentage = stats.totalQuestions > 0 ? 
    Math.round((stats.completedQuestions / stats.totalQuestions) * 100) : 0;

  const confidencePercentage = stats.averageConfidence > 0 ? Math.round((stats.averageConfidence / 5) * 100) : 0;

  const weeklyProgressPercentage = stats.weeklyGoal > 0 ?
    Math.round((stats.weeklyProgress / stats.weeklyGoal) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Questions Completed"
          value={`${stats.completedQuestions}/${stats.totalQuestions}`}
          subtitle={`${completionPercentage}% Complete`}
          icon={CheckIcon}
          color="green"
          progress={completionPercentage}
        />
        
        <StatCard
          title="Time Spent"
          value={formatTime(stats.totalTimeSpent)}
          subtitle={`Average: ${formatTime(stats.totalTimeSpent / Math.max(1, stats.completedQuestions))}/question`}
          icon={ClockIcon}
          color="blue"
        />
        
        <StatCard
          title="Confidence Level"
          value={stats.averageConfidence > 0 ? `${confidencePercentage}%` : 'No data'}
          subtitle={stats.averageConfidence > 0 ? `${stats.averageConfidence.toFixed(1)}/5.0 average` : 'Complete quizzes to see confidence'}
          icon={FlexIcon}
          color="purple"
          progress={confidencePercentage}
        />
        
        <StatCard
          title="Quiz Performance"
          value={`${quizStats.averageScore}%`}
          subtitle={`${quizStats.totalAttempts} attempts`}
          icon={TargetIcon}
          color="orange"
          progress={quizStats.averageScore}
        />
      </div>

      {/* Weekly Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            📅 Weekly Progress
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Goal: {stats.weeklyGoal} questions
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>{stats.weeklyProgress} questions studied</span>
            <span>{weeklyProgressPercentage}%</span>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(weeklyProgressPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {stats.lastStudyDate && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last studied: {stats.lastStudyDate.toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Progress by Difficulty & Marks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <DashboardIcon size={20} className="mr-2 text-blue-600" />
            Progress by Difficulty
          </h3>
          
          <div className="space-y-3">
            {Array.from(progressTracking.getProgressByDifficulty().entries()).map(([difficulty, progress]) => {
              const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
              const difficultyLabel = `${difficulty} Star${difficulty !== 1 ? 's' : ''}`;
              
              return (
                <div key={difficulty}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      {Array.from({ length: difficulty }, (_, i) => (
                        <StarIcon key={i} size={14} className="text-yellow-500 mr-0.5" />
                      ))}
                      <span className="ml-2">{difficultyLabel}</span>
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {progress.completed}/{progress.total} ({percentage}%)
                    </span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-red-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mark Range Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <TargetIcon size={20} className="mr-2 text-blue-600" />
            Progress by Mark Range
          </h3>
          
          <div className="space-y-3">
            {Array.from(progressTracking.getProgressByMarks().entries())
              .sort(([a], [b]) => a - b)
              .map(([marks, progress]) => {
                const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                
                return (
                  <div key={marks}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        {marks} Mark{marks !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {progress.completed}/{progress.total} ({percentage}%)
                      </span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">🚀 Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{quizStats.bestScore}%</div>
            <div className="text-sm opacity-90">Best Quiz Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatTime(quizStats.averageTimePerQuestion)}</div>
            <div className="text-sm opacity-90">Avg Time/Question</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{progressTracking.getWeakAreas().length}</div>
            <div className="text-sm opacity-90">Weak Areas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {quizStats.improvementTrend >= 0 ? '+' : ''}{quizStats.improvementTrend}%
            </div>
            <div className="text-sm opacity-90">Improvement</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressOverview;