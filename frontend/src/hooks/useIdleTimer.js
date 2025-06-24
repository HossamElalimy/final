// src/hooks/useIdleTimer.js
import { useEffect, useRef } from 'react';

const useIdleTimer = (onIdle, idleTime = 5 * 60 * 1000) => {
  const timer = useRef(null);

  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onIdle, idleTime);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];

    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearTimeout(timer.current);
    };
  }, []);
};

export default useIdleTimer;
