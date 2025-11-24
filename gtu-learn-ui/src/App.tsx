import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import SwipeableQuestionDisplay from './components/SwipeableQuestionDisplay';
import QuizMode from './components/QuizMode';
import PaperSelector from './components/PaperSelector';
import ProgressDashboard from './components/ProgressDashboard';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useQuestionPaper } from './hooks/useQuestionPaper';
import './App.css';

type AppMode = 'study' | 'quiz';
type AppRoute = 'home' | 'progress';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [selectedPaperFile, setSelectedPaperFile] = useState('summer-2025_3154201.json');
  const { questionPaper, loading, error } = useQuestionPaper(selectedPaperFile);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [appMode, setAppMode] = useState<AppMode>('study');
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('home');
  const [showPaperSelector, setShowPaperSelector] = useState(false);

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      switch (hash) {
        case 'progress':
          setCurrentRoute('progress');
          break;
        case 'study':
        case '':
        default:
          setCurrentRoute('home');
          // Set default hash to study if no hash is present
          if (!hash || hash === 'home') {
            window.location.hash = '#study';
          }
      }
    };

    // Set initial route
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNext = () => {
    if (questionPaper && currentQuestionIndex < questionPaper.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handlePaperSelect = (filename: string) => {
    setSelectedPaperFile(filename);
    setCurrentQuestionIndex(0);
    setShowPaperSelector(false);
    setAppMode('study');
  };

  // Handle progress dashboard route
  if (currentRoute === 'progress') {
    return (
      <ProgressDashboard 
        selectedPaperFile={selectedPaperFile}
        onSubjectsClick={() => setShowPaperSelector(true)}
        onQuizModeToggle={() => {
          setAppMode('quiz');
          setCurrentRoute('home');
        }}
        onStudyClick={() => {
          setCurrentRoute('home');
          setAppMode('study');
        }}
        onHomeClick={() => {
          setCurrentRoute('home');
          setAppMode('study');
        }}
        onProgressClick={() => {
          // Already on progress, no need to do anything
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading question paper...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md mx-4">
          <span className="text-4xl mb-4 block">❌</span>
          <p className="text-gray-600 dark:text-gray-400 mb-2">Error loading question paper</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!questionPaper || !questionPaper.questions.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md mx-4">
          <span className="text-4xl mb-4 block">📚</span>
          <p className="text-gray-600 dark:text-gray-400 mb-2">No questions available</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {questionPaper ? `Loaded ${questionPaper.questions?.length || 0} questions` : 'No data loaded'}
          </p>
        </div>
      </div>
    );
  }

  if (appMode === 'quiz') {
    return (
      <QuizMode
        questions={questionPaper.questions}
        questionPaper={questionPaper}
        onExit={() => setAppMode('study')}
        theme={theme}
        onThemeToggle={toggleTheme}
        paperId={selectedPaperFile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        subjectName={questionPaper.metadata.subject_name}
        subjectCode={questionPaper.metadata.subject_code}
        onQuizModeToggle={() => setAppMode('quiz')}
        onSubjectsClick={() => setShowPaperSelector(true)}
        onStudyClick={() => {
          setAppMode('study');
          setCurrentRoute('home');
        }}
        onHomeClick={() => {
          setAppMode('study');
          setCurrentRoute('home');
        }}
        onProgressClick={() => {
          setCurrentRoute('progress');
        }}
        activeRoute={currentRoute === 'home' ? 'study' : currentRoute}
      />
      
      <main className="relative">
        <SwipeableQuestionDisplay
          questions={questionPaper.questions}
          currentIndex={currentQuestionIndex}
          onNext={handleNext}
          onPrevious={handlePrevious}
          paperId={selectedPaperFile}
        />
      </main>

      {/* Paper Selector Overlay */}
      {showPaperSelector && (
        <div className="fixed inset-0 z-[100]">
          <PaperSelector
            onPaperSelect={handlePaperSelect}
            currentPaper={questionPaper}
            onClose={() => setShowPaperSelector(false)}
          />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
