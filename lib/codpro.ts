/** Código de producto del cartón: siempre mayúsculas, sin espacios extra. */
export function normalizeCodpro(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeCodproInput(value: string): string {
  return value.toUpperCase();
}

/** Descripción del producto: siempre mayúsculas. */
export function normalizeDespro(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeDesproInput(value: string): string {
  return value.toUpperCase();
}
