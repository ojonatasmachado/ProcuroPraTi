export const normalizeSearchText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim();

// Matches when every word typed appears somewhere in the target, in any order,
// so "farol neblina" still finds "farol de neblina" and "civic tour" finds
// "Honda Civic Touring" - people rarely type a name exactly as stored.
export const matchesSearch = (target, query) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const normalizedTarget = normalizeSearchText(target);
  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  return words.every(word => normalizedTarget.includes(word));
};
