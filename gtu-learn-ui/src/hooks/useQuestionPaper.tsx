import { useState, useEffect } from 'react';
import { QuestionPaper } from '../types';
import { formatMathContent } from '../utils/textUtils';

interface UseQuestionPaperResult {
  questionPaper: QuestionPaper | null;
  loading: boolean;
  error: string | null;
}

// Clean up answer text to remove unwanted content and improve formatting
const cleanAnswerText = (text: string): string => {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove table formatting artifacts
  cleaned = cleaned.replace(/\|\s*:\s*---\s*\|\s*:\s*---\s*\|[\s\S]*?\n\n/g, '');
  cleaned = cleaned.replace(/\|\s*Type\s*\|\s*[^|]*\|\s*[^|]*\|/g, '');
  
  // Remove memory technique sections that might be incomplete
  cleaned = cleaned.replace(/### \*\*Memory Techniques\*\*[\s\S]*$/, '');
  cleaned = cleaned.replace(/\*\*Memory Techniques:\*\*[\s\S]*$/, '');
  
  // Clean up excessive spacing and formatting
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\s+$/gm, ''); // Remove trailing whitespace
  cleaned = cleaned.replace(/^\s+/gm, ''); // Remove leading whitespace
  
  // Fix common LaTeX/math formatting issues
  cleaned = cleaned.replace(/\\\$/g, '$'); // Fix escaped dollar signs
  cleaned = cleaned.replace(/\\\[/g, '['); // Fix escaped brackets
  cleaned = cleaned.replace(/\\\]/g, ']');
  
  // Remove incomplete sentences or fragments at the end
  cleaned = cleaned.replace(/\[Image of[\s\S]*?$/, ''); // Remove image placeholders
  cleaned = cleaned.replace(/\(Note:[\s\S]*?$/, ''); // Remove incomplete notes
  
  return cleaned.trim();
};

// Format question text to improve mathematical content display
const formatQuestionText = (text: string): string => {
  if (!text) return '';
  
  // Apply mathematical formatting
  return formatMathContent(text);
};

export const useQuestionPaper = (filename: string): UseQuestionPaperResult => {
  const [questionPaper, setQuestionPaper] = useState<QuestionPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestionPaper = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📁 Loading question paper: ${filename}`);
        
        const response = await fetch(`/${filename}`);
        console.log(`📡 Fetch response status: ${response.status} ${response.statusText}`);
        console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Question paper file "${filename}" not found. Please check if the file exists in the public folder.`);
          }
          throw new Error(`Failed to load question paper: ${response.status} ${response.statusText}`);
        }

        // Get the raw text first to debug
        const text = await response.text();
        console.log(`📝 Raw file size: ${text.length} characters`);
        console.log(`📝 First 200 characters:`, text.substring(0, 200));
        console.log(`📝 Last 200 characters:`, text.substring(Math.max(0, text.length - 200)));
        
        // Check if we received HTML instead of JSON (common with 404 errors)
        if (text.trim().startsWith('<')) {
          throw new Error(`Received HTML content instead of JSON. This usually means the file "${filename}" was not found or the server returned an error page.`);
        }
        
        // Check for common JSON issues
        const issues = [];
        if (text.includes('/*')) issues.push('Contains block comments');
        if (text.includes('//')) issues.push('Contains line comments');
        if (text.includes(',}')) issues.push('Has trailing commas before }');
        if (text.includes(',]')) issues.push('Has trailing commas before ]');
        if (!/^\s*{/.test(text)) issues.push('Does not start with {');
        if (!/}\s*$/.test(text)) issues.push('Does not end with }');
        
        if (issues.length > 0) {
          console.warn(`⚠️ JSON Issues detected:`, issues);
        }

        // Try to parse JSON
        let data: any;
        try {
          data = JSON.parse(text);
          console.log(`✅ JSON parsed successfully`);
          console.log(`📊 Data structure:`, {
            hasMetadata: !!data.metadata,
            hasQuestions: !!data.questions,
            questionCount: data.questions?.length || 0,
            metadataKeys: data.metadata ? Object.keys(data.metadata) : []
          });
        } catch (parseError) {
          console.error(`❌ JSON Parse Error:`, parseError);
          console.error(`❌ Error message:`, (parseError as Error).message);
          
          // Try to identify the problematic area
          try {
            const errorMatch = (parseError as Error).message.match(/position (\d+)/);
            if (errorMatch) {
              const pos = parseInt(errorMatch[1]);
              const start = Math.max(0, pos - 50);
              const end = Math.min(text.length, pos + 50);
              console.error(`❌ Problem area around position ${pos}:`, text.substring(start, end));
            }
          } catch (e) {
            console.error(`❌ Could not identify problem area`);
          }
          
          throw new Error(`JSON Parse Error: ${(parseError as Error).message}. Check console for detailed debugging info.`);
        }

        // Clean up the data for better display
        if (data && data.questions) {
          console.log(`🧹 Cleaning ${data.questions.length} question answers and formatting question text...`);
          data.questions = data.questions.map((question: any, index: number) => {
            try {
              return {
                ...question,
                answer: cleanAnswerText(question.answer),
                question_text: formatQuestionText(question.question_text)
              };
            } catch (cleanError) {
              console.warn(`⚠️ Error cleaning question ${index + 1}:`, cleanError);
              return question; // Return uncleaned if cleaning fails
            }
          });
          console.log(`✅ Answer cleaning and question formatting completed`);
        }

        setQuestionPaper(data);
        console.log(`✅ Question paper loaded successfully`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        console.error('❌ Error loading question paper:', err);
        console.error('❌ Full error object:', {
          message: errorMessage,
          stack: err instanceof Error ? err.stack : 'No stack trace',
          filename,
          timestamp: new Date().toISOString()
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (filename) {
      loadQuestionPaper();
    }
  }, [filename]);

  return { questionPaper, loading, error };
};