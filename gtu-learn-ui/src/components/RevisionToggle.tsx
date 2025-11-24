import React from 'react';

interface RevisionToggleProps {
  isMarkedForRevision: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  theme?: 'light' | 'dark' | 'glass';
}

export const RevisionToggle: React.FC<RevisionToggleProps> = ({
  isMarkedForRevision,
  onToggle,
  size = 'md',
  showLabel = true,
  theme = 'glass'
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const getThemeClasses = () => {
    if (theme === 'glass') {
      return isMarkedForRevision
        ? 'bg-amber-500/20 backdrop-blur-sm border-amber-400/30 text-amber-100'
        : 'bg-white/10 backdrop-blur-sm border-white/20 text-white/70 hover:bg-white/20';
    }
    
    // Default theme for quiz mode
    return isMarkedForRevision
      ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200'
      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600';
  };

  const getIcon = () => {
    return isMarkedForRevision ? '📌' : '📎';
  };

  const getLabel = () => {
    return isMarkedForRevision ? 'For Revision' : 'Add to Revision';
  };

  return (
    <button
      onClick={onToggle}
      className={`
        inline-flex items-center space-x-1.5 rounded-full border transition-all duration-200
        ${sizeClasses[size]}
        ${getThemeClasses()}
        hover:scale-105 active:scale-95
      `}
      title={isMarkedForRevision ? 'Remove from revision list' : 'Add to revision list'}
    >
      <span className="text-sm">{getIcon()}</span>
      {showLabel && (
        <span className="font-medium whitespace-nowrap">
          {getLabel()}
        </span>
      )}
    </button>
  );
};

export default RevisionToggle;