import { useRef } from "react";

const MIN_SWIPE_DISTANCE = 50;

const useSwipe = ({ onSwipeLeft, onSwipeRight }) => {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchMove = (event) => {
    touchEndX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (
      touchStartX.current === null ||
      touchEndX.current === null
    ) {
      return;
    }

    const distance = touchStartX.current - touchEndX.current;

    if (distance > MIN_SWIPE_DISTANCE) {
      onSwipeLeft?.();
    } else if (distance < -MIN_SWIPE_DISTANCE) {
      onSwipeRight?.();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

export default useSwipe;