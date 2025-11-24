import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showLabel?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  size = 'md',
  readonly = false,
  showLabel = true
}) => {
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (starRating: number) => {
    if (!readonly) {
      setHoveredRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoveredRating(0);
    }
  };

  const displayRating = hoveredRating || rating;

  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 1: return 'Very Easy';
      case 2: return 'Easy';
      case 3: return 'Medium';
      case 4: return 'Hard';
      case 5: return 'Very Hard';
      default: return 'Not Rated';
    }
  };

  const getRatingColor = (rating: number): string => {
    switch (rating) {
      case 1: return 'text-green-500';
      case 2: return 'text-green-400';
      case 3: return 'text-yellow-500';
      case 4: return 'text-orange-500';
      case 5: return 'text-red-500';
      default: return 'text-gray-300 dark:text-gray-600';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div 
        className="flex items-center space-x-1"
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayRating;
          const isHovered = hoveredRating > 0 && star <= hoveredRating;
          
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              disabled={readonly}
              className={`
                ${sizeClasses[size]}
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                transition-all duration-150
                ${isFilled ? getRatingColor(displayRating) : 'text-gray-300 dark:text-gray-600'}
                ${isHovered ? 'drop-shadow-sm' : ''}
              `}
              aria-label={`Rate ${star} stars`}
            >
              <svg
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${getRatingColor(displayRating)}`}>
            {getRatingLabel(displayRating)}
          </span>
          {!readonly && hoveredRating > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Click to rate
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StarRating;