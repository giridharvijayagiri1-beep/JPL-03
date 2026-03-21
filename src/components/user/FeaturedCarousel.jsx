import React, { useState, useEffect, useRef } from 'react';

/**
 * FeaturedCarousel
 * A premium, infinite-scrolling carousel with smooth animations and user interruption support.
 * 
 * @param {Object[]} items - Array of carousel items { id, title, desc, bg, img }
 */
function FeaturedCarousel({ items }) {
  if (!items || items.length === 0) return null;

  // Clone items for infinite effect: [Last, 1, 2, 3, First]
  const extendedItems = [
    { ...items[items.length - 1], id: `clone-last` },
    ...items,
    { ...items[0], id: `clone-first` }
  ];

  const [currentIndex, setCurrentIndex] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const dragStartX = useRef(0);

  // Constants for sizing (matching the user's design)
  const CARD_WIDTH = 340;
  const GAP = 16;
  const STEP = CARD_WIDTH + GAP;

  // Handle auto-scroll
  useEffect(() => {
    if (isPaused || isDragging) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isDragging, currentIndex]);

  const handleNext = () => {
    if (isTransitioning && currentIndex === items.length + 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (isTransitioning && currentIndex === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  // Seamless jump logic on transition end
  const handleTransitionEnd = () => {
    if (currentIndex === 0) {
      setIsTransitioning(false);
      setCurrentIndex(items.length);
    } else if (currentIndex === items.length + 1) {
      setIsTransitioning(false);
      setCurrentIndex(1);
    }
  };

  // Drag Handlers
  const onDragStart = (e) => {
    if (isTransitioning && (currentIndex === 0 || currentIndex === items.length + 1)) return;
    setIsPaused(true);
    setIsDragging(true);
    setIsTransitioning(false);
    dragStartX.current = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  };

  const onDragMove = (e) => {
    if (!isDragging) return;
    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const diff = currentX - dragStartX.current;
    
    // Resistance at ends
    let finalDiff = diff;
    if (currentIndex === 1 && diff > 0) finalDiff = diff * 0.3;
    if (currentIndex === items.length && diff < 0) finalDiff = diff * 0.3;
    
    setDragOffset(finalDiff);
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = CARD_WIDTH / 3;
    if (dragOffset < -threshold) {
      handleNext();
    } else if (dragOffset > threshold) {
      handlePrevious();
    } else {
      setIsTransitioning(true);
    }
    
    setDragOffset(0);
    // Resume auto-scroll after a short delay
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <div className="relative w-full overflow-hidden px-2 pt-2 select-none touch-none">
      <div 
        className="flex"
        ref={containerRef}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateX(calc(50% - ${CARD_WIDTH / 2}px - ${currentIndex * STEP}px - ${GAP / 2}px + ${dragOffset}px))`,
          transition: isTransitioning ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          paddingLeft: `${GAP / 2}px`,
          paddingRight: `${GAP / 2}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {extendedItems.map((item, idx) => {
          // Determine if this specific card should be "active" visually
          // During the jump, both the clone and real item should look active to avoid "punching"
          const isActive = currentIndex === idx || 
            (currentIndex === 0 && idx === items.length) || 
            (currentIndex === items.length + 1 && idx === 1);

          return (
            <div 
              key={item.id + idx}
              className={`shrink-0 w-[340px] h-[320px] ${item.bg} rounded-[32px] border p-7 flex flex-col justify-end relative shadow-lg overflow-hidden`}
              style={{ 
                marginRight: `${GAP}px`,
                opacity: isActive ? 1 : 0.6,
                transform: isActive ? 'scale(1)' : 'scale(0.92)',
                filter: isActive ? 'none' : 'blur(1px)',
                transition: isTransitioning ? 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }}
            >
              {item.img && <img src={item.img} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent rounded-[32px]"></div>
              <h4 className="text-white font-black text-2xl tracking-tight leading-tight relative z-10">{item.title}</h4>
              <p className="text-xs text-white/80 font-medium tracking-wide mt-2 relative z-10 leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-1.5 mt-5">
        {items.map((_, idx) => {
          let isActive = currentIndex === idx + 1;
          if (currentIndex === 0 && idx === items.length - 1) isActive = true;
          if (currentIndex === items.length + 1 && idx === 0) isActive = true;
          
          return (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isActive ? 'w-6 bg-white' : 'w-1.5 bg-white/20'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default FeaturedCarousel;
