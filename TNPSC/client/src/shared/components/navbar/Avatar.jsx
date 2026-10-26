import React, { memo, useState } from "react";

const Avatar = ({
  name = "",
  image = "",
  size = "md",
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-16 w-16 text-xl",
  };

  const initials = name
    ? name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div
      className={`
        ${sizes[size]}
        ${className}
        overflow-hidden
        rounded-full
        bg-indigo-600
        text-white
        flex
        items-center
        justify-center
        font-semibold
        select-none
        shrink-0
      `}
      aria-label={name || "User Avatar"}
    >
      {image && !imageError ? (
        <img
          src={image}
          alt={name}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
};

export default memo(Avatar);