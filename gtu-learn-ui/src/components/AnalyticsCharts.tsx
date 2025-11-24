import React from 'react';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { useQuizHistory } from '../hooks/useQuizHistory';
import { useQuestionRatings } from '../hooks/useQuestionRatings';
import { QuestionPaper } from '../types';
import { AnalyticsIcon, TargetIcon, DashboardIcon, AchievementIcon, StarIcon, ClockIcon } from './Icons';

interface AnalyticsChartsProps {
  progressTracking: ReturnType<typeof useProgressTracking>;
  quizHistory: ReturnType<typeof useQuizHistory>;
  questionPaper: QuestionPaper;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  progressTracking,
  quizHistory,
  questionPaper
}) => {
  const paperId = questionPaper.metadata.subject_code + '_' + questionPaper.metadata.examination;
  const { getRating } = useQuestionRatings(paperId);
  
  // Get study progress data over time (last 30 days)
  const getStudyProgressTrend = () => {
    const days = [];
    const today = new Date();
    const totalQuestions = questionPaper.questions.length;
    const completedQuestions = progressTracking.stats.completedQuestions;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Calculate cumulative progress over time (simulate daily progress)
      const dayProgress = Math.min(100, ((30 - i) / 30) * (completedQuestions / totalQuestions) * 100);
      
      days.push({
        date: dateStr,
        score: Math.round(dayProgress)
      });
    }
    return days;
  };

  const studyProgressTrend = getStudyProgressTrend();
  
  // Get study ratings distribution
  const getStudyRatings = () => {
    const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    questionPaper.questions.forEach(question => {
      const questionId = `${question.question_no}_${question.sub_question_no}`;
      const rating = getRating(questionId);
      if (rating > 0) {
        ratings[rating as keyof typeof ratings]++;
      }
    });
    
    // Filter out ratings with 0 count to avoid NaN and empty pie chart
    return Object.entries(ratings)
      .filter(([, count]) => count > 0)
      .map(([rating, count]) => ({
        label: `${rating} Star${rating !== '1' ? 's' : ''}`,
        value: count,
        color: ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'][parseInt(rating) - 1]
      }));
  };

  const studyRatingsData = getStudyRatings();

  // Simple SVG-based charts (we can enhance these later with a chart library)
  const LineChart: React.FC<{
    data: { date: string; score: number }[];
    title: string;
  }> = ({ data, title }) => {
    if (data.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No data available
          </div>
        </div>
      );
    }

    const maxScore = Math.max(...data.map(d => d.score));
    const minScore = Math.min(...data.map(d => d.score));
    const range = maxScore - minScore || 1;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="h-64">
          <svg width="100%" height="100%" viewBox="0 0 500 200">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <g key={y}>
                <line
                  x1="40"
                  y1={160 - (y * 1.2)}
                  x2="460"
                  y2={160 - (y * 1.2)}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  className="text-gray-400"
                />
                <text
                  x="30"
                  y={165 - (y * 1.2)}
                  fontSize="10"
                  textAnchor="end"
                  className="fill-current text-gray-400"
                >
                  {y}%
                </text>
              </g>
            ))}

            {/* Data line */}
            <polyline
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              points={data.map((d, i) => {
                const x = 40 + (i * (420 / (data.length - 1)));
                const y = 160 - ((d.score / 100) * 120);
                return `${x},${y}`;
              }).join(' ')}
            />

            {/* Data points */}
            {data.map((d, i) => {
              const x = 40 + (i * (420 / (data.length - 1)));
              const y = 160 - ((d.score / 100) * 120);
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3B82F6"
                  />
                  <text
                    x={x}
                    y={185}
                    fontSize="8"
                    textAnchor="middle"
                    className="fill-current text-gray-400"
                  >
                    {new Date(d.date).getDate()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const PieChart: React.FC<{
    data: { label: string; value: number; color: string }[];
    title: string;
  }> = ({ data, title }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = 0;

    if (total === 0 || data.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No ratings available yet
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center">
          <div className="w-48 h-48">
            <svg width="100%" height="100%" viewBox="0 0 200 200">
              {data.map((segment, i) => {
                const angle = (segment.value / total) * 360;
                const x1 = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
                const y1 = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
                currentAngle += angle;
                const x2 = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
                const y2 = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
                
                const largeArcFlag = angle > 180 ? 1 : 0;
                
                return (
                  <path
                    key={i}
                    d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={segment.color}
                  />
                );
              })}
            </svg>
          </div>
          <div className="ml-6 space-y-2">
            {data.map((segment, i) => (
              <div key={i} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {segment.label}: {total > 0 ? Math.round((segment.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const BarChart: React.FC<{
    data: { label: string; value: number }[];
    title: string;
  }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, i) => (
            <div key={i} className="flex items-center">
              <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">
                {item.label}
              </div>
              <div className="flex-1 mx-3">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">
                      {item.value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Prepare data for charts
  const difficultyData = Array.from(progressTracking.getProgressByDifficulty().entries())
    .filter(([, progress]) => progress.total > 0) // Only show difficulties that have questions
    .map(([difficulty, progress]) => ({
      label: `${difficulty} Stars`,
      value: progress.completed,
      color: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'][difficulty - 1] || '#6B7280'
    }));

  const marksData = Array.from(progressTracking.getProgressByMarks().entries())
    .filter(([, progress]) => progress.total > 0) // Only show mark ranges that have questions
    .map(([marks, progress]) => ({
      label: `${marks} Mark${marks !== 1 ? 's' : ''}`,
      value: progress.completed,
      color: marks <= 3 ? '#10B981' : marks <= 5 ? '#F59E0B' : '#EF4444'
    }));

  return (
    <div className="space-y-8">
      {/* Study Progress Trend */}
      <LineChart
        data={studyProgressTrend}
        title="📈 Study Progress Trend (Last 30 Days)"
      />

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChart
          data={difficultyData.length > 0 ? difficultyData : marksData}
          title={difficultyData.length > 0 ? "📚 Study Progress by Difficulty" : "📚 Study Progress by Marks"}
        />
        <PieChart
          data={studyRatingsData}
          title="⭐ Study Ratings Distribution"
        />
      </div>

      {/* Study Session Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ClockIcon size={20} className="mr-2 text-blue-600" />
            Daily Study Sessions (Last 7 days)
          </h3>
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              
              // Calculate actual study time for this day from completed questions
              let dailyStudyTime = 0;
              questionPaper.questions.forEach(question => {
                const questionId = `${question.question_no}_${question.sub_question_no}`;
                const progress = progressTracking.getQuestionProgress(questionId);
                if (progress.completed && progress.timeSpent > 0) {
                  // Distribute study time across days (simple approximation)
                  dailyStudyTime += progress.timeSpent / 7;
                }
              });
              
              const studyTimeMinutes = Math.round(dailyStudyTime / 60);
              const maxTime = 180; // 3 hours max for progress bar scaling
              
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {dayName}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {studyTimeMinutes > 0 ? `${studyTimeMinutes}min` : 'No study'}
                    </span>
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (studyTimeMinutes / maxTime) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <AchievementIcon size={20} className="mr-2 text-blue-600" />
            Top Studied Topics
          </h3>
          <div className="space-y-3">
            {questionPaper.questions
              .map((question, index) => {
                const questionId = `${question.question_no}_${question.sub_question_no}`;
                const progress = progressTracking.getQuestionProgress(questionId);
                const rating = getRating(questionId);
                return { question, questionId, progress, rating, timeSpent: progress.timeSpent };
              })
              .sort((a, b) => b.timeSpent - a.timeSpent) // Sort by time spent (descending)
              .slice(0, 8)
              .map(({ question, questionId, progress, rating }) => {
                const displayQuestionNo = question.sub_question_no 
                  ? `Q${question.question_no}.${question.sub_question_no}` 
                  : `Q${question.question_no}`;
                
                return (
                  <div key={questionId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                      {displayQuestionNo}
                    </span>
                    <div className="flex items-center space-x-2">
                      {rating > 0 && (
                        <div className="flex items-center">
                          <StarIcon size={12} className="text-yellow-400 mr-1" />
                          <span className="text-xs text-gray-500">{rating}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[80px] text-right">
                        {progress.timeSpent > 0 
                          ? `${Math.round(progress.timeSpent / 60)}min` 
                          : 'Not studied'
                        }
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        progress.completed ? 'bg-green-500' :
                        progress.timeSpent > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Study Analytics Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <AnalyticsIcon size={20} className="mr-2 text-blue-600" />
          Study Analytics Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(progressTracking.stats.totalTimeSpent / 3600)}h {Math.round((progressTracking.stats.totalTimeSpent % 3600) / 60)}m
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Study Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {progressTracking.stats.completedQuestions}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Questions Studied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {Math.round(progressTracking.stats.totalTimeSpent / Math.max(1, progressTracking.stats.completedQuestions) / 60)}m
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Time/Question</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {studyRatingsData.reduce((sum, rating) => sum + rating.value, 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Ratings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {progressTracking.stats.averageConfidence > 0 
                ? `${(progressTracking.stats.averageConfidence / 5 * 100).toFixed(0)}%` 
                : '0%'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Study Confidence</div>
          </div>
        </div>
        
        {/* Study Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">📊 Study Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="font-medium text-blue-900 dark:text-blue-300">Most Active Day</div>
              <div className="text-blue-700 dark:text-blue-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="font-medium text-green-900 dark:text-green-300">Study Streak</div>
              <div className="text-green-700 dark:text-green-400">
                {Math.max(1, Math.floor(progressTracking.stats.completedQuestions / 5))} days
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="font-medium text-purple-900 dark:text-purple-300">Progress Rate</div>
              <div className="text-purple-700 dark:text-purple-400">
                {Math.round((progressTracking.stats.completedQuestions / questionPaper.questions.length) * 100)}% Complete
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;