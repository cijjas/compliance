export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function trimUppercaseString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export function trimLowercaseString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}
