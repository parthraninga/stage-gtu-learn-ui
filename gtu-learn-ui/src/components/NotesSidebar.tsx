import React, { useState, useEffect } from 'react';
import { useNotesManager } from '../hooks/useNotes';

interface NotesSidebarProps {
  questionId: string;
  paperId?: string;
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({ questionId, paperId = 'default' }) => {
  const { getNote, setNote } = useNotesManager();
  const [text, setText] = useState('');

  useEffect(() => {
    try {
      const existing = getNote(questionId, paperId);
      setText(existing || '');
    } catch (err) {
      setText('');
    }
  }, [questionId, paperId, getNote]);

  const handleSave = () => {
    setNote(questionId, text, paperId);
  };

  return (
    <aside className="w-full sm:w-80 lg:w-96 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 h-full flex flex-col">
        <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Notes</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Write how you remembered this question for this specific paper. Each question paper has separate notes.</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your study notes..."
          className="flex-1 resize-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 text-sm text-gray-800 dark:text-gray-200 focus:outline-none"
        />

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Save
          </button>
          <div className="text-xs text-gray-500">Autosaved locally</div>
        </div>
      </div>
    </aside>
  );
};

export default NotesSidebar;
