export const formatCnpj = (value = '') => {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  return characters
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')
    .replace(/([A-Z0-9]{4})(\d{1,2})$/, '$1-$2');
};

export const isValidCnpj = (value = '') => {
  const cnpj = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;

  const characterValue = (character) => character.charCodeAt(0) - 48;
  const calculateDigit = (base, weights) => {
    const sum = base.split('').reduce((total, character, index) => total + characterValue(character) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(`${cnpj.slice(0, 12)}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${firstDigit}${secondDigit}` === cnpj.slice(-2);
};
