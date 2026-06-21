// src/utils/currency.ts

export const formatCurrency = (amount: number, currencySymbol: string = '$'): string => {
  if (amount < 0) {
    return `-${currencySymbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const parseCurrencyValue = (value: any): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    let cleaned = value.replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return num;
  }
  return 0;
};

export const safeFormatCurrency = (value: any, currencySymbol: string = '$'): string => {
  const num = parseCurrencyValue(value);
  return formatCurrency(num, currencySymbol);
};

export const getCurrencySymbol = (settings: { currencySymbol?: string }): string => {
  return settings.currencySymbol || '$';
};