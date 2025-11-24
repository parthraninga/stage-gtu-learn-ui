import React from 'react';
import { AppTheme } from '../types';
import { HomeIcon, BookIcon, StudyIcon, QuizIcon, ProgressIcon, SunIcon, MoonIcon, GraduationCapIcon } from './Icons';

interface HeaderProps {
  theme: AppTheme;
  onThemeToggle: () => void;
  subjectName?: string;
  subjectCode?: string;
  onQuizModeToggle?: () => void;
  onSubjectsClick?: () => void;
  onStudyClick?: () => void;
  onHomeClick?: () => void;
  onProgressClick?: () => void;
  activeRoute?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  theme, 
  onThemeToggle, 
  subjectName, 
  subjectCode,
  onQuizModeToggle,
  onSubjectsClick,
  onStudyClick,
  onHomeClick,
  onProgressClick,
  activeRoute = 'study'
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <GraduationCapIcon size={28} className="text-blue-600 mr-3" />
              <span className="text-2xl font-bold text-blue-600">
                GTU Learn
              </span>
            </div>
            {subjectName && (
              <div className="ml-8 flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Code: {subjectCode}
                </span>
                <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {subjectName}
                </span>
                <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total: 70 marks
                </span>
              </div>
            )}
          </div>

          {/* Navigation and Theme Toggle */}
          <div className="flex items-center space-x-6">
            <nav className="flex space-x-6">
              <button
                onClick={onHomeClick}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  activeRoute === 'home' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <HomeIcon size={16} className="mr-2" />
                Home
              </button>
              <button
                onClick={onSubjectsClick}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <BookIcon size={16} className="mr-2" />
                Subjects
              </button>
              <button
                onClick={onStudyClick}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  activeRoute === 'study' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <StudyIcon size={16} className="mr-2" />
                Study
              </button>
              <button
                onClick={onQuizModeToggle}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  activeRoute === 'quiz' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <QuizIcon size={16} className="mr-2" />
                Quiz
              </button>
              <button
                onClick={onProgressClick}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  activeRoute === 'progress' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <ProgressIcon size={16} className="mr-2" />
                Progress
              </button>
            </nav>

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
  );
};