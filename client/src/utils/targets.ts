// Sales Targets Configuration (Historical)
// Format: username -> array of { month: 'YYYY-MM', target: number }
// If a specific month is not found, it falls back to the default (first entry or logic below)
export const USER_TARGET_HISTORY: Record<string, { month: string, target: number }[]> = {
  'naseef': [
    { month: '2026-02', target: 10000000 }, // Feb 2026 (1 Crore)
    { month: '2026-03', target: 4000000 }, // Mar 2026 (1.2 Crore) - Example
    { month: '2026-04', target: 1900000 },
    { month: '2026-05', target: 2200000 },
    { month: '2026-06', target: 2300000 },

  ],
  'shibin': [
    { month: '2026-02', target: 5000000 },
    { month: '2026-03', target: 4000000 },
    { month: '2026-04', target: 1600000 },
    { month: '2026-05', target: 1900000 },
    { month: '2026-06', target: 1900000 },


  ],
  'dileep': [
    { month: '2026-02', target: 2600000 },
    { month: '2026-03', target: 1000000 },
    { month: '2026-04', target: 500000 },
    { month: '2026-05', target: 1000000 },
    { month: '2026-06', target: 1000000 },

  ]
};

export const getCurrentTarget = (username: string, dateStr: string | null): number => {
  if (!username || !USER_TARGET_HISTORY[username]) return 0;

  const history = USER_TARGET_HISTORY[username];

  // Determine the month to look for
  let targetMonth = '';
  if (dateStr) {
    // If a filter date is provided, use that month
    targetMonth = dateStr.substring(0, 7); // YYYY-MM
  } else {
    // Default to current month
    targetMonth = new Date().toISOString().substring(0, 7);
  }

  // Find the exact month target
  const exactMatch = history.find(h => h.month === targetMonth);
  if (exactMatch) return exactMatch.target;

  // Fallback: Use the specific Feb 2026 targets as "default" basic targets if current month not found
  // This ensures existing logic holds true until new targets are added
  // In a real scenario, you might want to find the latest valid target
  const defaultTarget = history.find(h => h.month === '2026-02');
  return defaultTarget ? defaultTarget.target : 0;
};
