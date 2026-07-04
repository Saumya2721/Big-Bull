import { useState, useEffect, useRef } from 'react';

export const usePriceFlash = (price) => {
  const [flashClass, setFlashClass] = useState('');
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price === null || price === undefined) return;
    
    if (prevPriceRef.current !== undefined && prevPriceRef.current !== null && price !== prevPriceRef.current) {
      if (price > prevPriceRef.current) {
        setFlashClass('bg-emerald-100 text-emerald-700 transition-none px-1 rounded'); // Flash green
      } else if (price < prevPriceRef.current) {
        setFlashClass('bg-rose-100 text-rose-700 transition-none px-1 rounded'); // Flash red
      }
      
      const timer = setTimeout(() => {
        setFlashClass('transition-colors duration-700 px-1 rounded bg-transparent'); // Fade out
      }, 50); 
      
      const resetTimer = setTimeout(() => {
        setFlashClass(''); // Reset completely
      }, 650);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    }
    prevPriceRef.current = price;
  }, [price]);

  return flashClass;
};
