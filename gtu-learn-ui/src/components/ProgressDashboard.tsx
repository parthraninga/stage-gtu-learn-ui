import React, { useState } from 'react';
import { Header } from './Header';
import { DashboardIcon, ClipboardIcon, AnalyticsIcon, TargetIcon, LightningIcon } from './Icons';
import { useProgressTracking } from '../hooks/useProgressTracking';
import { useQuizHistory } from '../hooks/useQuizHistory';
import { useQuestionPaper } from '../hooks/useQuestionPaper';
import { useTheme } from '../hooks/useTheme';

// Import chart components
import ProgressOverview from './ProgressOverview';
import AnalyticsCharts from './AnalyticsCharts';
import QuizHistoryPanel from './QuizHistoryPanel';
import WeakAreasPanel from './WeakAreasPanel';
import PriorityQuestionsPanel from './PriorityQuestionsPanel';

interface ProgressDashboardProps {
  selectedPaperFile: string;
  onSubjectsClick?: () => void;
  onQuizModeToggle?: () => void;
  onStudyClick?: () => void;
  onHomeClick?: () => void;
  onProgressClick?: () => void;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ 
  selectedPaperFile, 
  onSubjectsClick, 
  onQuizModeToggle, 
  onStudyClick,
  onHomeClick,
  onProgressClick 
}) => {
  const { theme, toggleTheme } = useTheme();
  const { questionPaper } = useQuestionPaper(selectedPaperFile);
  const progressTracking = useProgressTracking(selectedPaperFile, questionPaper?.questions || []);
  const quizHistory = useQuizHistory();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'history' | 'priority'>('overview');

  if (!questionPaper) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading progress data...</p>
        </div>
      </div>
    );
  }

  const examReadiness = progressTracking.calculateExamReadiness();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        subjectName={questionPaper.metadata.subject_name}
        subjectCode={questionPaper.metadata.subject_code}
        onQuizModeToggle={onQuizModeToggle}
        onSubjectsClick={onSubjectsClick}
        onStudyClick={onStudyClick}
        onHomeClick={onHomeClick}
        onProgressClick={onProgressClick}
        activeRoute="progress"
      />
      
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Dashboard Title & Exam Readiness */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                <DashboardIcon size={32} className="mr-3 text-blue-600" />
                Progress Dashboard
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Track your learning progress for {questionPaper.metadata.subject_name}
              </p>
            </div>
            
            {/* Exam Readiness Score */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">Exam Readiness</div>
                <div className={`text-2xl font-bold ${
                  examReadiness >= 80 ? 'text-green-600' :
                  examReadiness >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {examReadiness}%
                </div>
              </div>
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200 dark:text-gray-700"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={examReadiness >= 80 ? 'text-green-600' :
                              examReadiness >= 60 ? 'text-yellow-600' : 'text-red-600'}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${examReadiness}, 100`}
                    strokeLinecap="round"
                    fill="transparent"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { id: 'overview', label: 'Overview', icon: ClipboardIcon },
              { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
              { id: 'history', label: 'Quiz History', icon: TargetIcon },
              { id: 'priority', label: 'Priority Areas', icon: LightningIcon }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all flex items-center justify-center ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <IconComponent size={16} className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div>
        {activeTab === 'overview' && (
          <ProgressOverview
            progressTracking={progressTracking}
            quizHistory={quizHistory}
            questionPaper={questionPaper}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsCharts
            progressTracking={progressTracking}
            quizHistory={quizHistory}
            questionPaper={questionPaper}
          />
        )}
        
        {activeTab === 'history' && (
          <QuizHistoryPanel quizHistory={quizHistory} />
        )}
        
        {activeTab === 'priority' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WeakAreasPanel
              progressTracking={progressTracking}
              questionPaper={questionPaper}
              paperId={selectedPaperFile}
            />
            <PriorityQuestionsPanel
              progressTracking={progressTracking}
              questionPaper={questionPaper}
            />
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;