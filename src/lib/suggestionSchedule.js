export const FIRST_SUGGESTION_DELAY_DAYS = 7;
export const RECURRING_SUGGESTION_DELAY_DAYS = 45;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const getNextSuggestionDate = ({ firstAccessAt, lastShownAt }) => {
  const baseDate = lastShownAt ? new Date(lastShownAt) : new Date(firstAccessAt);
  if (Number.isNaN(baseDate.getTime())) return null;
  const delayDays = lastShownAt ? RECURRING_SUGGESTION_DELAY_DAYS : FIRST_SUGGESTION_DELAY_DAYS;
  return new Date(baseDate.getTime() + delayDays * DAY_IN_MS);
};

export const isSuggestionDue = (schedule, now = new Date()) => {
  const nextDate = getNextSuggestionDate(schedule);
  return Boolean(nextDate && nextDate.getTime() <= now.getTime());
};
