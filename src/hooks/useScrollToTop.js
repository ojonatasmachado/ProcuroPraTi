import { useEffect } from 'react';

const scrollPageToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export const useScrollToTop = (screenKey) => {
  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollPageToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [screenKey]);
};

export default useScrollToTop;
