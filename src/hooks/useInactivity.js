import { useEffect, useState } from 'react';

export default function useInactivity(timeout = 45000) {
  const [isLocked, setIsLocked] = useState(false);
  let timer;

  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => setIsLocked(true), timeout);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, []);

  return [isLocked, () => setIsLocked(false)];
}
