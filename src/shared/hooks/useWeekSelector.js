import { useState } from 'react';

const WEEKS = Array.from({ length: 16 }, (_, i) => i); // 0..15

export function useWeekSelector(initial = 1) {
  const [week, setWeek] = useState(initial);
  return { week, setWeek, weeks: WEEKS };
}
