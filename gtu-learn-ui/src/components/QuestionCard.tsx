import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import { DocumentIcon, SparklesIcon, PalaceIcon, LightBulbIcon, EyeIcon, LocationMarkerIcon, NotesIcon } from './Icons';
import { formatBoldText, shouldShowDiagram } from '../utils/textUtils';
import { useNotesManager } from '../hooks/useNotes';
import { useQuestionRatings } from '../hooks/useQuestionRatings';
import { useRevisionToggle } from '../hooks/useRevisionToggle';
import { useProgressTracking } from '../hooks/useProgressTracking';
import StarRating from './StarRating';
import RevisionToggle from './RevisionToggle';

interface QuestionCardProps {
  question: Question;
  isActive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  currentIndex?: number; // 0-based index passed from parent
  total?: number; // total questions
  paperId?: string; // for storing ratings
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isActive = true,
  style,
  className = '',
  currentIndex,
  total,
  paperId = 'default',
}) => {
  const [activeTab, setActiveTab] = useState<'answer' | 'story' | 'palace' | 'notes'>('answer');
  const { getNote, setNote } = useNotesManager();
  const { getRating, setRating } = useQuestionRatings(paperId);
  const { toggleRevision, isMarkedForRevision } = useRevisionToggle(paperId);
  const { startStudySession, endStudySession, markCompleted, updateConfidence, getQuestionProgress } = useProgressTracking(paperId);
  const [noteText, setNoteText] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  
  const questionId = `${question.question_no}_${question.sub_question_no}`;
  const currentRating = getRating(questionId);

  const handleRatingChange = (rating: number) => {
    setRating(questionId, rating);
    // handleConfidenceUpdate(rating);
  };

  const handleRevisionToggle = () => {
    toggleRevision(questionId);
  };

  useEffect(() => {
    const savedNote = getNote(questionId, paperId);
    setNoteText(savedNote || '');
  }, [questionId, paperId, getNote]);

  // Start study session when component mounts or question changes
  useEffect(() => {
    if (isActive && !sessionStarted) {
      startStudySession(questionId, 'study');
      setSessionStarted(true);
    }

    // Cleanup function to end session when component unmounts or question changes
    return () => {
      if (sessionStarted) {
        endStudySession(questionId);
        setSessionStarted(false);
      }
    };
  }, [questionId, isActive, sessionStarted, startStudySession, endStudySession]);



  // // Update confidence when user rates the question
  // const handleConfidenceUpdate = useCallback((confidence: number) => {
  //   // Convert 1-5 star rating to 1-10 confidence scale
  //   const confidenceScore = Math.round((confidence / 5) * 10);
  //   updateConfidence(questionId, confidenceScore);
  // }, [questionId, updateConfidence]);

  // Handle tab change and mark completion when viewing answer
  const handleTabChange = useCallback((tab: 'answer' | 'story' | 'palace' | 'notes') => {
    setActiveTab(tab);
    // if (tab === 'answer') {
    //   markCompleted(questionId);
    // }
  }, [questionId]);

  const renderAnswer = () => (
    <div className="space-y-4">
      {shouldShowDiagram(question.diagram_representation) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <DocumentIcon className="text-blue-500 mt-1 mr-3 flex-shrink-0" size={20} />
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              {question.diagram_representation}
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
          <DocumentIcon className="text-blue-600 mr-2" size={20} />
          Detailed Answer
        </h3>
        <div 
          className="text-gray-700 dark:text-gray-300 leading-relaxed prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: formatBoldText(question.answer) }}
        />
      </div>
    </div>
  );

  const renderStory = () => {
    if (!question.memory_techniques?.story_method) {
      return (
        <div className="text-center py-12">
          <SparklesIcon className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">No story method available for this question.</p>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-4">
            <SparklesIcon className="text-purple-600 mr-2" size={20} />
            Memory Story
          </h3>
          <div 
            className="text-gray-700 dark:text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatBoldText(question.memory_techniques.story_method.story) }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <LightBulbIcon className="text-yellow-500 mr-2" size={20} />
            Explanation
          </h4>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {question.memory_techniques.story_method.explanation}
          </p>
        </div>
      </div>
    );
  };

  const renderPalace = () => {
    if (!question.memory_techniques?.memory_palace) {
      return (
        <div className="text-center py-12">
          <PalaceIcon className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">No memory palace available for this question.</p>
        </div>
      );
    }

    const palace = question.memory_techniques.memory_palace;

    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 space-y-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-2">
            <PalaceIcon className="text-green-600 mr-2" size={20} />
            Memory Palace Journey
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Total places: {palace.total_places}
          </p>
        </div>

        <div className="space-y-6">
          {palace.places.map((place, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-l-4 border-green-400">
              <div className="flex items-center mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-sm font-semibold mr-3">
                  {place.place_number}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Place {place.place_number}: {place.location}
                </h4>
              </div>
              
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <EyeIcon className="text-blue-500 mr-2" size={16} />
                  Visualization:
                </h5>
                <div 
                  className="text-gray-600 dark:text-gray-400 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatBoldText(place.visualization) }}
                />
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <LocationMarkerIcon className="text-red-500 mr-2" size={16} />
                  How to Place:
                </h5>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {place.how_to_place}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNotes = () => {
    const handleSaveNote = () => {
      setNote(questionId, noteText, paperId);
    };

    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
            <NotesIcon className="text-amber-600 mr-2" size={20} />
            Study Notes
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Write your personal notes, memory aids, or how you remember this question. Notes are saved per question per paper.
          </p>
          
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={handleSaveNote}
            placeholder="Type your study notes for this question in this paper... How do you remember solving it?"
            className="w-full h-48 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
          
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleSaveNote}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Save Notes
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {noteText.length > 0 ? `${noteText.length} characters` : 'No notes yet'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      style={style}
    >
      {/* Question Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                {question.question_no} {question.sub_question_no}
              </span>
              <span className="bg-white/10 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full text-sm">
                {typeof currentIndex === 'number' && typeof total === 'number'
                  ? `Question ${currentIndex + 1} of ${total}`
                  : 'Question'}
              </span>
              <span className="bg-orange-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                {question.marks} marks
              </span>
            </div>
            </div>
            
            {/* Revision Toggle with proper spacing */}
            <div className="ml-6">
              <RevisionToggle
                isMarkedForRevision={isMarkedForRevision(questionId)}
                onToggle={handleRevisionToggle}
                size="sm"
                theme="glass"
              />
            </div>
          </div>

        <h1 
          className="text-xl font-bold mb-4 leading-tight"
          dangerouslySetInnerHTML={{ __html: question.question_text }}
        />

        {/* Star Rating */}
        <div className="mb-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="flex items-center space-x-3">
            <span className="text-white font-medium text-sm">Difficulty:</span>
            <StarRating
              rating={currentRating}
              onRatingChange={handleRatingChange}
              size="md"
              showLabel={true}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {question.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => handleTabChange('answer')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'answer'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center justify-center">
              <DocumentIcon className="mr-2" size={16} />
              Answer
            </span>
          </button>
          <button
            onClick={() => handleTabChange('story')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'story'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center justify-center">
              <SparklesIcon className="mr-2" size={16} />
              Story
            </span>
          </button>
          <button
            onClick={() => handleTabChange('palace')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'palace'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center justify-center">
              <PalaceIcon className="mr-2" size={16} />
              Palace
            </span>
          </button>
          <button
            onClick={() => handleTabChange('notes')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center justify-center">
              <NotesIcon className="mr-2" size={16} />
              Notes
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
        {activeTab === 'answer' && renderAnswer()}
        {activeTab === 'story' && renderStory()}
        {activeTab === 'palace' && renderPalace()}
        {activeTab === 'notes' && renderNotes()}
      </div>
    </div>
  );
};