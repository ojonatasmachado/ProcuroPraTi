import React, { useEffect, useRef, useState } from 'react';

const ScrollShadowList = ({ children, className = 'grid grid-cols-1 gap-2', maxHeightClass = 'max-h-[calc(100dvh-260px)]' }) => {
  const scrollRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const updateAtBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= 4);
  };

  useEffect(() => {
    updateAtBottom();
  });

  return (
    <div className="relative">
      <div ref={scrollRef} onScroll={updateAtBottom} className={`overflow-y-auto ${maxHeightClass} ${className}`}>
        {children}
      </div>
      {!isAtBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
      )}
    </div>
  );
};

export default ScrollShadowList;
