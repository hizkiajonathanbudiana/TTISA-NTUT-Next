export const coerceDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    const converted = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(converted.valueOf()) ? null : converted;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  return null;
};

export const coerceIsoString = (value: unknown): string | null => {
  const date = coerceDate(value);
  return date ? date.toISOString() : null;
};
