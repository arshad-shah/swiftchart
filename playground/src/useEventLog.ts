import { useCallback, useState } from 'react';

export function useEventLog(max = 20) {
  const [lines, setLines] = useState<string[]>([]);
  const log = useCallback((msg: string) => {
    setLines(prev => {
      const stamped = `${new Date().toLocaleTimeString()}  ${msg}`;
      return [stamped, ...prev].slice(0, max);
    });
  }, [max]);
  const clear = useCallback(() => setLines([]), []);
  return { lines, log, clear };
}
