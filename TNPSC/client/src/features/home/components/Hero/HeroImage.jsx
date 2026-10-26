import React, { memo, useState } from "react";
import { Link } from "react-router-dom";

const HeroImage = ({ slide, index, priority = false }) => {
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      to={slide.link}
      aria-label={slide.title || `Hero Banner ${index + 1}`}
      className="block relative w-full overflow-hidden rounded-xl"
    >
      {/* Loading Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 rounded-xl" />
      )}

      {/* Image */}
      <img
        src={
          imageError
            ? "https://placehold.co/1600x600?text=Image+Unavailable"
            : slide.image
        }
        alt={slide.title || `Banner ${index + 1}`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setImageError(true);
          setLoaded(true);
        }}
        className={`
          w-full
          h-[170px]
          sm:h-[220px]
          md:h-[280px]
          lg:h-[320px]
          xl:h-[360px]
          object-cover
          rounded-xl
          select-none
          transition-all
          duration-700
          ease-in-out
          ${
            loaded
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105"
          }
        `}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/20 rounded-xl" />
    </Link>
  );
};

export default memo(HeroImage);