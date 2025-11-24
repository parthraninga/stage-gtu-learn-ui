import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeConfig {
  minDistance?: number;
  threshold?: number;
}

export const useSwipe = (
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) => {
  const { minDistance = 50, threshold = 10 } = config;
  
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent | React.TouchEvent) => {
    touchEnd.current = null;
    const touch = 'touches' in e ? e.touches[0] : e;
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }, []);

  const onTouchMove = useCallback((e: TouchEvent | React.TouchEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e;
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;
    
    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    const isLeftSwipe = distanceX > minDistance;
    const isRightSwipe = distanceX < -minDistance;
    const isUpSwipe = distanceY > minDistance;
    const isDownSwipe = distanceY < -minDistance;

    // Check if the swipe is more horizontal than vertical
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      }
      if (isRightSwipe && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      }
    } else {
      if (isUpSwipe && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      }
      if (isDownSwipe && handlers.onSwipeDown) {
        handlers.onSwipeDown();
      }
    }
  }, [handlers, minDistance]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};