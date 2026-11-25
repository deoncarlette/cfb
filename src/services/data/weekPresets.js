// Week settings set by the commissioner outside the app (for this preview, where Commish saves
// only on the commish's own device): they apply to everyone until a week's own saved setting
// says otherwise. deadlineIso: when the whole slate locks.
export const WEEK_PRESETS = {
  13: { deadlineIso: '2026-11-26T20:00:00-06:00' } // Hate Week: Thanksgiving Thursday, 8 PM Central
};

export const withPreset = (week, cfg) => {
  const p = WEEK_PRESETS[week];
  return p ? { ...cfg, deadlineIso: cfg.deadlineIso ?? p.deadlineIso ?? null } : cfg;
};
