import { useState, useEffect, useCallback } from 'react';
import { Question, QuestionPaper } from '../types';

interface UseSubjectRevisionResult {
  getAllRevisionQuestions: (currentSubject: string) => Promise<Question[]>;
  getSubjectRevisionCount: (subject: string) => number;
  getAllSubjectRevisionCounts: () => { [subject: string]: number };
  isQuestionMarkedForRevision: (questionId: string, questionPaperId?: string, filename?: string) => boolean;
  toggleQuestionRevision: (questionId: string, questionPaperId?: string, filename?: string) => void;
}

export const useSubjectRevision = (): UseSubjectRevisionResult => {
  const [subjectRevisionCounts, setSubjectRevisionCounts] = useState<{ [subject: string]: number }>({});

  // Helper function to get papers by subject code from localStorage revision keys
  const getPapersBySubjectFromLocalStorage = useCallback((targetSubject: string): { paperId: string, filename: string }[] => {
    const papers: { paperId: string, filename: string }[] = [];
    
    // Scan localStorage for revision keys to find papers
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('revision-questions-')) {
        const paperId = key.replace('revision-questions-', '');
        
        // We need to find the filename for this paperId by checking common patterns
        const potentialFilenames = [
          // Common patterns based on paperId structure
          ...(paperId.includes('_') ? [
            // If paperId is like "3155204_SUMMER 2025", try variations
            paperId.toLowerCase().replace('_', '-').replace(' ', '-') + '.json',
            paperId.toLowerCase().replace('_', '_').replace(' ', '_') + '.json',
          ] : []),
          // Subject-based patterns (ip-1.json, ip-2.json, etc.)
          'ip-1.json', 'ip-2.json', 'ip-3.json',
          // More generic patterns
          `${paperId}.json`,
        ];
        
        papers.push({ paperId, filename: potentialFilenames[0] || `${paperId}.json` });
      }
    }
    
    return papers;
  }, []);

  // Optimized discovery that uses existing localStorage data as a guide
  const discoverPaperFiles = useCallback(async (): Promise<string[]> => {
    const validPaperFiles: string[] = [];
    
    // Start with a focused set of common patterns
    const commonPatterns = [
      // Current known papers
      'summer-2025_3155204.json',
      'ip-1.json', 'ip-2.json', 'ip-3.json',
      // Common semester patterns  
      'summer-2023-1.json', 'summer-2024-1.json', 'summer-2025-1.json',
      'winter-2022-1.json', 'winter-2023-1.json', 'winter-2024-2.json', 'winter-2024-2-clean.json',
      // Other subject codes
      'summer-2025_3154201.json'
    ];
    
    // Test each file quickly
    for (const filename of commonPatterns) {
      try {
        const response = await fetch(`/${filename}`, { method: 'HEAD' });
        if (response.ok) {
          // File exists, validate it's a proper question paper
          const dataResponse = await fetch(`/${filename}`);
          const paperData = await dataResponse.json();
          
          // Validate this is a proper question paper
          if (paperData.metadata && 
              paperData.metadata.subject_name && 
              paperData.metadata.subject_code && 
              paperData.metadata.examination &&
              paperData.questions && 
              Array.isArray(paperData.questions)) {
            validPaperFiles.push(filename);
          }
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    }
    
    console.log('Discovered paper files:', validPaperFiles);
    return validPaperFiles;
  }, []);

  // Calculate revision counts by scanning localStorage and matching with discovered papers  
  const calculateRevisionCounts = useCallback(async () => {
    console.log('🔄 calculateRevisionCounts() called');
    try {
      const counts: { [subject: string]: number } = {};
      
      // Get all available paper files
      console.log('📁 Discovering paper files...');
      const availableFiles = await discoverPaperFiles();
      console.log('📁 Available files found:', availableFiles);
      
      // Create a map of paperId to subject for efficient lookup
      const paperSubjectMap: { [paperId: string]: string } = {};
      
      // Load metadata for all available papers
      for (const filename of availableFiles) {
        try {
          const response = await fetch(`/${filename}`);
          if (response.ok) {
            const paperData = await response.json();
            
            if (paperData.metadata && paperData.metadata.subject_name && paperData.metadata.subject_code && paperData.metadata.examination) {
              const subject = paperData.metadata.subject_name;
              const paperId = paperData.metadata.subject_code + '_' + paperData.metadata.examination;
              paperSubjectMap[paperId] = subject;
              
              // Initialize count for this subject
              if (!(subject in counts)) {
                counts[subject] = 0;
              }
            }
          }
        } catch (error) {
          console.debug(`Error loading paper ${filename}:`, error);
        }
      }
      
      // Now scan localStorage for revision questions and map them to subjects
      console.log('=== SUBJECT REVISION CALCULATION ===');
      console.log('Available papers and their subjects:');
      Object.entries(paperSubjectMap).forEach(([id, subj]) => {
        console.log(`  ${id} -> ${subj}`);
      });
      console.log('Total localStorage keys:', localStorage.length);
      
      // Create filename to subject mapping as well
      const filenameSubjectMap: { [filename: string]: string } = {};
      for (const filename of availableFiles) {
        try {
          const response = await fetch(`/${filename}`);
          if (response.ok) {
            const paperData = await response.json();
            if (paperData.metadata && paperData.metadata.subject_name) {
              filenameSubjectMap[filename] = paperData.metadata.subject_name;
            }
          }
        } catch (error) {
          // Skip if can't load
        }
      }
      console.log('Filename to subject mapping:');
      Object.entries(filenameSubjectMap).forEach(([file, subj]) => {
        console.log(`  ${file} -> ${subj}`);
      });
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('revision-questions-')) {
          const identifier = key.replace('revision-questions-', '');
          
          console.log(`Checking localStorage key: ${key}`);
          console.log(`  - Identifier: ${identifier}`);
          
          // Try to find subject by paperId first, then by filename
          let subject = paperSubjectMap[identifier];
          if (!subject && identifier.endsWith('.json')) {
            // It's a filename format like "summer-2023-1.json"
            subject = filenameSubjectMap[identifier];
          }
          
          console.log(`  - Found subject: ${subject}`);
          
          if (subject) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const revisionArray = JSON.parse(stored);
                const count = revisionArray.length;
                const previousCount = counts[subject] || 0;
                counts[subject] = previousCount + count;
                console.log(`  - Questions in this paper: ${count} ${JSON.stringify(revisionArray)}`);
                console.log(`  - Previous count for ${subject}: ${previousCount}`);
                console.log(`  - New total for ${subject}: ${counts[subject]}`);
              } else {
                console.log(`  - No revision data stored`);
              }
            } catch (error) {
              console.warn(`Error parsing revision data for ${identifier}:`, error);
            }
          } else {
            console.log(`  - No subject mapping found for identifier: ${identifier}`);
            console.log(`  - Available paperIds:`, Object.keys(paperSubjectMap));
            console.log(`  - Available filenames:`, Object.keys(filenameSubjectMap));
          }
        }
      }
      
      console.log('=== FINAL SUBJECT REVISION COUNTS ===');
      console.log('Final counts by subject:', counts);
      console.log('📊 Setting subjectRevisionCounts state to:', counts);
      console.log('=====================================');

      setSubjectRevisionCounts(counts);
      console.log('✅ State update completed');
    } catch (error) {
      console.warn('❌ Failed to calculate revision counts:', error);
    }
  }, [discoverPaperFiles]); // Depend on the file discovery function

  // Load all papers and their revision questions to calculate counts
  useEffect(() => {
    calculateRevisionCounts();
  }, []);

  const getAllRevisionQuestions = useCallback(async (currentSubject: string): Promise<Question[]> => {
    try {
      const allRevisionQuestions: Question[] = [];
      
      // Get all available paper files
      const availableFiles = await discoverPaperFiles();
      
      // Process each paper file
      for (const filename of availableFiles) {
        try {
          const response = await fetch(`/${filename}`);
          if (response.ok) {
            const paperData: QuestionPaper = await response.json();
            
            // Check if this paper matches the target subject
            if (paperData.metadata && 
                paperData.metadata.subject_name === currentSubject &&
                paperData.metadata.subject_code && 
                paperData.metadata.examination) {
              
              const paperId = paperData.metadata.subject_code + '_' + paperData.metadata.examination;
              
              // Try filename format first (where actual data exists), then paperId format
              let revisionKey = `revision-questions-${filename}`;
              let stored = localStorage.getItem(revisionKey);
              
              if (!stored) {
                // Try paperId format as fallback
                revisionKey = `revision-questions-${paperId}`;
                stored = localStorage.getItem(revisionKey);
              }
              
              console.log(`Checking revision questions for ${filename}:`);
              console.log(`  - PaperId format key: revision-questions-${paperId}`);
              console.log(`  - Filename format key: revision-questions-${filename}`);
              console.log(`  - Using key: ${revisionKey}`);
              console.log(`  - Found data: ${stored ? 'YES' : 'NO'}`);
              
              if (stored) {
                try {
                  const revisionQuestionIds = JSON.parse(stored) as string[];
                  console.log(`Loading ${revisionQuestionIds.length} revision questions from ${filename} (${paperId})`);
                  
                  // Filter questions that are marked for revision
                  const paperRevisionQuestions = paperData.questions.filter(question => {
                    const questionId = `${question.question_no}_${question.sub_question_no}`;
                    return revisionQuestionIds.includes(questionId);
                  });
                  
                  // Add paper context metadata (this is what QuizMode expects)
                  const questionsWithContext = paperRevisionQuestions.map(question => ({
                    ...question,
                    _paperInfo: {
                      filename,
                      examination: paperData.metadata.examination,
                      subject_code: paperData.metadata.subject_code,
                      subject_name: paperData.metadata.subject_name,
                      paperId
                    }
                  }));
                  
                  allRevisionQuestions.push(...questionsWithContext);
                } catch (parseError) {
                  console.warn(`Error parsing revision data for ${paperId}:`, parseError);
                }
              }
            }
          }
        } catch (error) {
          console.debug(`Error loading paper ${filename}:`, error);
        }
      }

      return allRevisionQuestions;
    } catch (error) {
      console.error('Failed to get all revision questions:', error);
      return [];
    }
  }, [discoverPaperFiles]); // Depend on the file discovery function

  const getSubjectRevisionCount = useCallback((subject: string): number => {
    return subjectRevisionCounts[subject] || 0;
  }, [subjectRevisionCounts]);

  const getAllSubjectRevisionCounts = useCallback((): { [subject: string]: number } => {
    return subjectRevisionCounts;
  }, [subjectRevisionCounts]);

  const isQuestionMarkedForRevision = useCallback((questionId: string, questionPaperId?: string, filename?: string): boolean => {
    if (!questionPaperId) return false;
    
    // Prefer filename format for localStorage keys
    let revisionKey: string;
    
    if (filename) {
      revisionKey = `revision-questions-${filename}`;
    } else if (questionPaperId.endsWith('.json')) {
      revisionKey = `revision-questions-${questionPaperId}`;
    } else {
      // Try paperId format as fallback
      revisionKey = `revision-questions-${questionPaperId}`;
    }
    
    try {
      const stored = localStorage.getItem(revisionKey);
      
      if (stored) {
        const revisionArray = JSON.parse(stored) as string[];
        return revisionArray.includes(questionId);
      }
    } catch (error) {
      console.warn('Failed to check revision status:', error);
    }
    return false;
  }, []);

  const toggleQuestionRevision = useCallback((questionId: string, questionPaperId?: string, filename?: string): void => {
    if (!questionPaperId) return;

    // Prefer filename format for localStorage keys to maintain consistency
    let revisionKey: string;
    
    if (filename) {
      // Use filename if provided (from _paperInfo)
      revisionKey = `revision-questions-${filename}`;
    } else if (questionPaperId.endsWith('.json')) {
      // questionPaperId is already a filename
      revisionKey = `revision-questions-${questionPaperId}`;
    } else {
      // Check if there's existing data in filename format by scanning localStorage
      let existingFilenameKey: string | null = null;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('revision-questions-') && key.endsWith('.json')) {
          // Check if this file corresponds to our paperId by loading it
          const filename = key.replace('revision-questions-', '');
          try {
            // Quick check - we could load the file and verify, but for now assume match if similar
            if (filename.includes('ip-') && questionPaperId.includes('3155204')) {
              existingFilenameKey = key;
              break;
            }
          } catch (error) {
            // Continue searching
          }
        }
      }
      
      if (existingFilenameKey) {
        revisionKey = existingFilenameKey;
      } else {
        // Fallback to paperId format
        revisionKey = `revision-questions-${questionPaperId}`;
      }
    }
    
    console.log(`toggleQuestionRevision: ${questionId}, paperId: ${questionPaperId}, filename: ${filename}`);
    console.log(`Using revision key: ${revisionKey}`);
    
    try {
      const stored = localStorage.getItem(revisionKey);
      let revisionArray: string[] = stored ? JSON.parse(stored) : [];
      
      if (revisionArray.includes(questionId)) {
        revisionArray = revisionArray.filter(id => id !== questionId);
        console.log(`Removed ${questionId} from revision list`);
      } else {
        revisionArray.push(questionId);
        console.log(`Added ${questionId} to revision list`);
      }
      
      localStorage.setItem(revisionKey, JSON.stringify(revisionArray));
      console.log(`Updated ${revisionKey} with:`, revisionArray);
      
      // Trigger recalculation of counts
      calculateRevisionCounts();
    } catch (error) {
      console.warn('Failed to toggle revision status:', error);
    }
  }, [calculateRevisionCounts]);

  return {
    getAllRevisionQuestions,
    getSubjectRevisionCount, 
    getAllSubjectRevisionCounts,
    isQuestionMarkedForRevision,
    toggleQuestionRevision
  };
};

export default useSubjectRevision;