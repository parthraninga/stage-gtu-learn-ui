import React, { useState, useEffect } from 'react';
import { QuestionPaper } from '../types';
import { BookIcon, DocumentIcon, ChevronRightIcon } from './Icons';

interface PaperSelectorProps {
  onPaperSelect: (filename: string) => void;
  currentPaper?: QuestionPaper;
  onClose: () => void;
}

interface PaperInfo {
  filename: string;
  title: string;
  subject: string;
  subjectCode: string;
  totalQuestions: number;
  totalMarks: number;
  year?: string;
  term?: string;
}

export const PaperSelector: React.FC<PaperSelectorProps> = ({
  onPaperSelect,
  currentPaper,
  onClose,
}) => {
  const [availablePapers, setAvailablePapers] = useState<PaperInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    const discoverPapers = async () => {
      try {
        const extractYear = (examination: string): string => {
          const match = examination.match(/\b(20\d{2})\b/);
          return match ? match[1] : '';
        };

        const extractTerm = (examination: string): string => {
          const examLower = examination.toLowerCase();
          if (examLower.includes('summer')) return 'Summer';
          if (examLower.includes('winter')) return 'Winter';
          return '';
        };

        // Try to get a list of available JSON files
        // Based on actual files in the public directory
        const knownFiles = [
          'summer-2025_3154201.json',
          'winter-2023-1.json',
          'summer-2024-1.json',
          'summer-2025-1.json',
          'winter-2022-1.json',
          'summer-2023-1.json',
          'ip-1.json',
          'ip-2.json',
          'ip-3.json'
        ];

        const papers: PaperInfo[] = [];
        
        // Check each known file
        const checkPromises = knownFiles.map(async (filename) => {
          try {
            const response = await fetch(`/${filename}`, { 
              method: 'HEAD' // Just check if file exists
            });
            
            if (response.ok) {
              // File exists, now fetch its content
              const dataResponse = await fetch(`/${filename}`);
              const data = await dataResponse.json();
              
              // Extract metadata from the JSON file
              const metadata = data.metadata;
              if (metadata && metadata.subject_name) {
                const paper: PaperInfo = {
                  filename,
                  title: `${metadata.examination} - ${metadata.subject_name}`,
                  subject: metadata.subject_name,
                  subjectCode: metadata.subject_code || 'Unknown',
                  totalQuestions: data.questions ? data.questions.length : 0,
                  totalMarks: metadata.total_marks || 70,
                  year: extractYear(metadata.examination || ''),
                  term: extractTerm(metadata.examination || ''),
                };
                return paper;
              }
            }
          } catch (error) {
            // File doesn't exist or failed to load, ignore
          }
          return null;
        });

        const results = await Promise.all(checkPromises);
        const validPapers = results.filter((paper): paper is PaperInfo => paper !== null);
        
        // Sort papers by year and term
        validPapers.sort((a, b) => {
          const yearCompare = (b.year || '').localeCompare(a.year || '');
          if (yearCompare !== 0) return yearCompare;
          
          const termOrder = { 'Summer': 1, 'Winter': 2 };
          return (termOrder[a.term as keyof typeof termOrder] || 0) - (termOrder[b.term as keyof typeof termOrder] || 0);
        });

        setAvailablePapers(validPapers);
      } catch (error) {
        console.error('Error discovering papers:', error);
        setAvailablePapers([]);
      } finally {
        setLoading(false);
      }
    };

    discoverPapers();
  }, []);

  const uniqueSubjects = Array.from(new Set(availablePapers.map(p => p.subject)));

  const filteredPapers = availablePapers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         paper.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         paper.subjectCode.includes(searchTerm);
    const matchesSubject = selectedSubject === '' || paper.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Each paper is treated individually - no grouping needed

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-800 mx-auto"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mx-auto absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading Paper Library</h3>
            <p className="text-gray-600 dark:text-gray-400">Discovering available question papers...</p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[85vh] w-full max-w-4xl overflow-hidden z-[120] animate-in fade-in duration-300">
        {/* Enhanced Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <BookIcon className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Question Paper Library</h2>
                <p className="text-blue-100">Choose from {availablePapers.length} available GTU papers across {uniqueSubjects.length} subjects</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search papers by subject, code, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          
          {/* Subject Filter Pills */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Subject:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubject('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedSubject === ''
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                All Subjects ({availablePapers.length})
              </button>
              {uniqueSubjects.map(subject => {
                const subjectCount = availablePapers.filter(p => p.subject === subject).length;
                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedSubject === subject
                        ? 'bg-blue-600 text-white shadow-md transform scale-105'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {subject} ({subjectCount})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Papers List - Segregated by Subject */}
        <div className="overflow-y-auto max-h-[50vh]">
          {filteredPapers.length === 0 ? (
            <div className="text-center py-12">
              <BookIcon className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">No question papers found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div>
              {/* Group papers by subject when no specific subject is selected */}
              {selectedSubject === '' ? (
                // Show all subjects grouped
                uniqueSubjects.map(subject => {
                  const subjectPapers = filteredPapers.filter(p => p.subject === subject);
                  if (subjectPapers.length === 0) return null;
                  
                  return (
                    <div key={subject} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      {/* Subject Header */}
                      <div className="sticky top-0 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-300 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <BookIcon className="text-blue-600 dark:text-blue-400" size={20} />
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                {subject}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {subjectPapers[0]?.subjectCode} • {subjectPapers.length} paper{subjectPapers.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {subjectPapers.reduce((total, paper) => total + paper.totalQuestions, 0)} total questions
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Subject Papers */}
                      <div className="p-4 space-y-2">
                        {subjectPapers.map((paper) => {
                          const currentPaperYear = currentPaper?.metadata.examination ? 
                            currentPaper.metadata.examination.match(/\b(20\d{2})\b/)?.[1] : '';
                          const currentPaperTerm = currentPaper?.metadata.examination ? 
                            (currentPaper.metadata.examination.toLowerCase().includes('summer') ? 'Summer' : 
                             currentPaper.metadata.examination.toLowerCase().includes('winter') ? 'Winter' : '') : '';
                          
                          const isCurrentPaper = currentPaper?.metadata.subject_code === paper.subjectCode && 
                                                paper.year === currentPaperYear &&
                                                paper.term === currentPaperTerm;
                          
                          return (
                            <button
                              key={paper.filename}
                              onClick={() => onPaperSelect(paper.filename)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md transform hover:-translate-y-1 ${
                                isCurrentPaper
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-300 dark:border-blue-600 shadow-lg'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className={`p-2 rounded-lg ${
                                      isCurrentPaper 
                                        ? 'bg-blue-100 dark:bg-blue-800' 
                                        : 'bg-gray-100 dark:bg-gray-700'
                                    }`}>
                                      <DocumentIcon 
                                        className={isCurrentPaper ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} 
                                        size={18} 
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className={`font-semibold ${
                                          isCurrentPaper ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                                        }`}>
                                          {paper.term} {paper.year} Examination
                                        </span>
                                        {isCurrentPaper && (
                                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                            Current
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          isCurrentPaper 
                                            ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200' 
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                        }`}>
                                          {paper.totalQuestions} Questions
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          isCurrentPaper 
                                            ? 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200' 
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                        }`}>
                                          {paper.totalMarks} Marks
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <ChevronRightIcon 
                                  className={`${isCurrentPaper ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} transform transition-transform group-hover:translate-x-1`}
                                  size={24} 
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show only selected subject papers
                <div className="p-4 space-y-3">
                  {filteredPapers.map((paper) => {
                    const currentPaperYear = currentPaper?.metadata.examination ? 
                      currentPaper.metadata.examination.match(/\b(20\d{2})\b/)?.[1] : '';
                    const currentPaperTerm = currentPaper?.metadata.examination ? 
                      (currentPaper.metadata.examination.toLowerCase().includes('summer') ? 'Summer' : 
                       currentPaper.metadata.examination.toLowerCase().includes('winter') ? 'Winter' : '') : '';
                    
                    const isCurrentPaper = currentPaper?.metadata.subject_code === paper.subjectCode && 
                                          paper.year === currentPaperYear &&
                                          paper.term === currentPaperTerm;
                    
                    return (
                      <button
                        key={paper.filename}
                        onClick={() => onPaperSelect(paper.filename)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md transform hover:-translate-y-1 ${
                          isCurrentPaper
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-300 dark:border-blue-600 shadow-lg'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className={`p-2 rounded-lg ${
                                isCurrentPaper 
                                  ? 'bg-blue-100 dark:bg-blue-800' 
                                  : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                <DocumentIcon 
                                  className={isCurrentPaper ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} 
                                  size={18} 
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`font-semibold ${
                                    isCurrentPaper ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {paper.term} {paper.year} - {paper.subject}
                                  </span>
                                  {isCurrentPaper && (
                                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isCurrentPaper 
                                      ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200' 
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    Code: {paper.subjectCode}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isCurrentPaper 
                                      ? 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-200' 
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {paper.totalQuestions} Questions
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isCurrentPaper 
                                      ? 'bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200' 
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {paper.totalMarks} Marks
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <ChevronRightIcon 
                            className={`${isCurrentPaper ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} transform transition-transform group-hover:translate-x-1`}
                            size={24} 
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>
                  {filteredPapers.length} of {availablePapers.length} papers
                </span>
              </div>
              {selectedSubject === '' && uniqueSubjects.length > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>
                    {uniqueSubjects.length} subject{uniqueSubjects.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              💡 Click any paper to start studying
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperSelector;