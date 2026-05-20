/** Nombres canónicos en BD (plural o forma estándar del negocio). */
export const FAMILIAS_CANONICAS = [
  'FRENOS',
  'MOTOR',
  'SUSPENSION',
  'DIRECCION',
  'ELECTRICO',
  'ENFRIAMIENTO',
  'TRANSMISION',
  'LUBRICANTES',
  'ADITIVO',
  'QUIMICO',
  'SELLADORES',
  'ACCESORIOS',
  'FILTROS',
  'CARROCERIA',
  'OTROS',
] as const;

export type FamiliaCanonica = (typeof FAMILIAS_CANONICAS)[number];

export function familiaClave(texto: string): string {
  return texto
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Variantes singulares / alternativas → canónico. */
const ALIAS_EXPLICITOS: Record<string, FamiliaCanonica> = {
  FRENO: 'FRENOS',
  FRENOS: 'FRENOS',
  MOTOR: 'MOTOR',
  MOTORES: 'MOTOR',
  SUSPENSION: 'SUSPENSION',
  SUSPENSIONES: 'SUSPENSION',
  DIRECCION: 'DIRECCION',
  DIRECCIONES: 'DIRECCION',
  ELECTRICO: 'ELECTRICO',
  ELECTRICOS: 'ELECTRICO',
  ELECTRIC: 'ELECTRICO',
  ENFRIAMIENTO: 'ENFRIAMIENTO',
  REFRIGERACION: 'ENFRIAMIENTO',
  TRANSMISION: 'TRANSMISION',
  TRANSMISIONES: 'TRANSMISION',
  CAJA: 'TRANSMISION',
  LUBRICANTE: 'LUBRICANTES',
  LUBRICANTES: 'LUBRICANTES',
  LUBRICACION: 'LUBRICANTES',
  ACEITE: 'LUBRICANTES',
  ADITIVO: 'ADITIVO',
  ADITIVOS: 'ADITIVO',
  QUIMICO: 'QUIMICO',
  QUIMICOS: 'QUIMICO',
  SELLADOR: 'SELLADORES',
  SELLADORES: 'SELLADORES',
  ACCESORIO: 'ACCESORIOS',
  ACCESORIOS: 'ACCESORIOS',
  FILTRO: 'FILTROS',
  FILTROS: 'FILTROS',
  CARROCERIA: 'CARROCERIA',
  CARROCERIAS: 'CARROCERIA',
  OTRO: 'OTROS',
  OTROS: 'OTROS',
  VARIOS: 'OTROS',
};

function buildAliasMap(): Record<string, FamiliaCanonica> {
  const map: Record<string, FamiliaCanonica> = { ...ALIAS_EXPLICITOS };
  for (const canon of FAMILIAS_CANONICAS) {
    map[familiaClave(canon)] = canon;
    if (canon.endsWith('S') && canon.length > 4) {
      map[familiaClave(canon.slice(0, -1))] = canon;
    }
  }
  return map;
}

const ALIAS_MAP = buildAliasMap();

/**
 * Unifica familia del Excel: "freno", "FRENOS", "lubricante" → nombre canónico.
 */
export function normalizeFamiliaImport(nombre: string | null | undefined): string | null {
  if (!nombre?.trim()) return null;
  const clave = familiaClave(nombre);
  if (ALIAS_MAP[clave]) return ALIAS_MAP[clave];
  if (!clave.endsWith('S') && ALIAS_MAP[`${clave}S`]) return ALIAS_MAP[`${clave}S`];
  if (clave.endsWith('S') && clave.length > 2) {
    const sinS = clave.slice(0, -1);
    if (ALIAS_MAP[sinS]) return ALIAS_MAP[sinS];
  }
  if (clave.endsWith('ES') && clave.length > 3) {
    const sinEs = clave.slice(0, -2);
    if (ALIAS_MAP[sinEs]) return ALIAS_MAP[sinEs];
    if (ALIAS_MAP[`${sinEs}S`]) return ALIAS_MAP[`${sinEs}S`];
  }
  return clave;
}
