
import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const resolveInitial = () => (typeof initialValue === 'function' ? initialValue() : initialValue);

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : resolveInitial();
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return resolveInitial();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
