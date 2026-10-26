import React, { memo } from "react";

const HeroDots = ({
  totalSlides,
  currentSlide,
  onDotClick,
}) => {
  if (totalSlides <= 1) return null;

  return (
    <div
      className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2"
      role="tablist"
      aria-label="Hero Slider Navigation"
    >
      {Array.from({ length: totalSlides }).map((_, index) => {
        const isActive = index === currentSlide;

        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-label={`Go to slide ${index + 1}`}
            aria-selected={isActive}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onDotClick(index)}
            className={`
              h-3 w-3 rounded-full
              transition-all duration-300
              focus:outline-none
              focus:ring-2
              focus:ring-white
              ${
                isActive
                  ? "bg-white scale-125 shadow-lg"
                  : "bg-white/50 hover:bg-white/80 hover:scale-110"
              }
            `}
          />
        );
      })}
    </div>
  );
};

export default memo(HeroDots);