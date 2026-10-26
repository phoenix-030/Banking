import React, { memo } from "react";
import { Link } from "react-router-dom";

const HeroContent = ({ slide }) => {
  if (!slide) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center">
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent rounded-xl" />

      {/* Content */}
      <div className="relative z-20 max-w-xl px-6 sm:px-8 md:px-10 text-white">
        {slide.title && (
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight animate-fade-in">
            {slide.title}
          </h1>
        )}

        {slide.description && (
          <p className="mt-3 text-sm sm:text-base md:text-lg text-gray-200 leading-relaxed animate-fade-in delay-100">
            {slide.description}
          </p>
        )}

        <div className="mt-6">
          <Link
            to={slide.link}
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-700 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Learn More

            <svg
              className="ml-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default memo(HeroContent);