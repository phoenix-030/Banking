import { useCallback, useEffect, useState } from "react";

const useCarousel = ({
  totalSlides,
  autoPlay = true,
  autoPlayInterval = 5000,
  pauseOnHover = true,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback(
    (index) => {
      if (index >= 0 && index < totalSlides) {
        setCurrentSlide(index);
      }
    },
    [totalSlides]
  );

  // Auto Play
  useEffect(() => {
    if (!autoPlay || isPaused || totalSlides <= 1) return;

    const timer = setTimeout(() => {
      nextSlide();
    }, autoPlayInterval);

    return () => clearTimeout(timer);
  }, [
    currentSlide,
    autoPlay,
    autoPlayInterval,
    isPaused,
    nextSlide,
    totalSlides,
  ]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case "ArrowLeft":
          prevSlide();
          break;

        case "ArrowRight":
          nextSlide();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [nextSlide, prevSlide]);

  // Pause when browser tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  return {
    currentSlide,
    nextSlide,
    prevSlide,
    goToSlide,

    isPaused,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),

    hoverProps: pauseOnHover
      ? {
          onMouseEnter: () => setIsPaused(true),
          onMouseLeave: () => setIsPaused(false),
        }
      : {},
  };
};

export default useCarousel;