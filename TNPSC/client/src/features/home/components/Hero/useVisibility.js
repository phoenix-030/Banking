import { useEffect, useRef, useState } from "react";

const useVisibility = (options = {}) => {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: options.root || null,
        rootMargin: options.rootMargin || "0px",
        threshold: options.threshold ?? 0.5,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options.root, options.rootMargin, options.threshold]);

  return {
    elementRef,
    isVisible,
  };
};

export default useVisibility;