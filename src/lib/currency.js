const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const parseCurrencyNumber = (value) => {
  if (typeof value === 'number') return value;
  const rawValue = String(value ?? '').trim();
  if (!rawValue) return Number.NaN;
  const normalizedValue = rawValue.includes(',')
    ? rawValue.replace(/\./g, '').replace(',', '.')
    : rawValue;
  return Number(normalizedValue);
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = parseCurrencyNumber(value);
  return Number.isFinite(numericValue) ? brlFormatter.format(numericValue) : '';
};

export const normalizeCurrencyValue = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = parseCurrencyNumber(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : value;
};

export const formatCurrencyInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = parseCurrencyNumber(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2).replace('.', ',') : value;
};

export const sanitizeCurrencyInput = (value) => String(value ?? '')
  .replace(/[^\d,.]/g, '')
  .replace(/(,.*),/g, '$1');
