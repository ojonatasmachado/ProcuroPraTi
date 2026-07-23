const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const normalizeSearchDuration = (duration) => {
  const parsed = Number(duration);
  if (!Number.isFinite(parsed)) return 15;
  return Math.min(15, Math.max(1, Math.round(parsed)));
};

export const getSearchExpiresAt = (procura) => {
  const createdAt = new Date(procura?.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;
  return new Date(createdAt.getTime() + normalizeSearchDuration(procura.duration) * DAY_IN_MS);
};

export const getSearchRemainingMs = (procura, now = new Date()) => {
  if (procura?.status !== 'active') return 0;
  const expiresAt = getSearchExpiresAt(procura);
  return expiresAt ? Math.max(0, expiresAt.getTime() - now.getTime()) : 0;
};

export const isSearchExpired = (procura, now = new Date()) => (
  procura?.status === 'active' && getSearchRemainingMs(procura, now) === 0
);

export const getSearchDaysRemaining = (procura, now = new Date()) => (
  Math.ceil(getSearchRemainingMs(procura, now) / DAY_IN_MS)
);
