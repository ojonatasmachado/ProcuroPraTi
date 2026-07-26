import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const SHOW_AFTER_PX = 600;

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.45, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/70 text-background backdrop-blur-sm transition-colors focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTopButton;
