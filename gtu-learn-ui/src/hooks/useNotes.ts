import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gtu-learn-notes-v1';

type NotesMap = Record<string, string>;

export const useNotesManager = () => {
  const [notes, setNotes] = useState<NotesMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loadedNotes = JSON.parse(raw);
        
        // Migration: Convert old format notes (without paper ID) to new format
        const migratedNotes: NotesMap = {};
        Object.entries(loadedNotes).forEach(([key, value]) => {
          if (typeof value === 'string') {
            if (key.includes('::')) {
              // Already in new format
              migratedNotes[key] = value;
            } else {
              // Old format - migrate to default paper
              migratedNotes[`default::${key}`] = value;
            }
          }
        });
        
        setNotes(migratedNotes);
        
        // Save migrated notes back to localStorage if migration occurred
        if (Object.keys(migratedNotes).some(key => !key.includes('::'))) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedNotes));
        }
      }
    } catch (err) {
      console.error('Failed to load notes from localStorage', err);
    }
  }, []);

  const saveNotes = useCallback((next: NotesMap) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Failed to save notes to localStorage', err);
    }
    setNotes(next);
  }, []);

  // Helper function to create a unique note ID combining question ID and paper ID
  const createNoteId = useCallback((questionId: string, paperId: string) => {
    return `${paperId}::${questionId}`;
  }, []);

  const getNote = useCallback((questionId: string, paperId: string = 'default') => {
    const noteId = createNoteId(questionId, paperId);
    return notes[noteId] || '';
  }, [notes, createNoteId]);

  const setNote = useCallback((questionId: string, text: string, paperId: string = 'default') => {
    const noteId = createNoteId(questionId, paperId);
    const next = { ...notes, [noteId]: text };
    saveNotes(next);
  }, [notes, saveNotes, createNoteId]);

  const clearNote = useCallback((questionId: string, paperId: string = 'default') => {
    const noteId = createNoteId(questionId, paperId);
    const next = { ...notes };
    delete next[noteId];
    saveNotes(next);
  }, [notes, saveNotes, createNoteId]);

  return { notes, getNote, setNote, clearNote, createNoteId };
};

export default useNotesManager;
