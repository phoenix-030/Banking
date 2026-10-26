import React, { memo } from "react";

const buttonClass =
  "absolute top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/60 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-40";

const HeroControls = ({ onPrev, onNext, disabled = false }) => {
  return (
    <>
      {/* Previous */}
      <button
        type="button"
        aria-label="Previous Slide"
        title="Previous"
        onClick={onPrev}
        disabled={disabled}
        className={`${buttonClass} left-3 sm:left-5`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Next */}
      <button
        type="button"
        aria-label="Next Slide"
        title="Next"
        onClick={onNext}
        disabled={disabled}
        className={`${buttonClass} right-3 sm:right-5`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </>
  );
};

export default memo(HeroControls);