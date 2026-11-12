import { useState } from 'react';

export function useWeekSelector(initial = 1) {
  const [week, setWeek] = useState(initial);
  const weeks = Array.from({ length: 16 }, (_, i) => i); // 0..15
  return { week, setWeek, weeks };
}
