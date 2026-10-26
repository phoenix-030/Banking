import React, { useEffect } from "react";
import HeroImage from "./HeroImage";
import HeroContent from "./HeroContent";
import HeroControls from "./HeroControls";
import HeroDots from "./HeroDots";
import useCarousel from "./useCarousel";
import useSwipe from "./useSwipe";
import useVisibility from "./useVisibility";
import { heroSlides } from "./heroSlides";

const Hero = () => {
  const {
    currentSlide,
    nextSlide,
    prevSlide,
    goToSlide,
    hoverProps,
    pause,
    resume,
  } = useCarousel({
    totalSlides: heroSlides.length,
    autoPlay: true,
    autoPlayInterval: 5000,
    pauseOnHover: true,
  });

  const { elementRef, isVisible } = useVisibility({
    threshold: 0.4,
  });

  const swipeHandlers = useSwipe({
    onSwipeLeft: nextSlide,
    onSwipeRight: prevSlide,
  });

  // Pause autoplay when the hero is outside the viewport
  useEffect(() => {
    if (isVisible) {
      resume();
    } else {
      pause();
    }
  }, [isVisible, pause, resume]);

  // Preload the next image
  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const nextIndex = (currentSlide + 1) % heroSlides.length;
    const img = new Image();
    img.src = heroSlides[nextIndex].image;
  }, [currentSlide]);

  if (!heroSlides.length) return null;

  const current = heroSlides[currentSlide];

  return (
    <section
      ref={elementRef}
      {...hoverProps}
      {...swipeHandlers}
      className="relative overflow-hidden rounded-xl select-none"
      aria-label="Hero Carousel"
    >
      <HeroImage
        slide={current}
        index={currentSlide}
        priority={currentSlide === 0}
      />

      <HeroContent slide={current} />

      <HeroControls
        onPrev={prevSlide}
        onNext={nextSlide}
      />

      <HeroDots
        totalSlides={heroSlides.length}
        currentSlide={currentSlide}
        onDotClick={goToSlide}
      />
    </section>
  );
};

export default Hero;