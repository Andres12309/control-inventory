/** Encabezados oficiales al exportar (sin abreviaturas). */
export const EXCEL_COLUMNAS_EXPORT = {
  codigo: 'Código de producto',
  descripcion: 'Descripción de producto',
  unidad: 'Unidad de medida',
  stock: 'Stock',
  costo: 'Precio proveedor / Costo',
  pvp: 'Precio de venta al público',
  marca: 'Marca',
  familia: 'Familia',
} as const;

export const EXCEL_HEADERS_EXPORT = Object.values(EXCEL_COLUMNAS_EXPORT);

/** Variantes aceptadas al importar (se comparan normalizadas). */
export const EXCEL_ALIASES_IMPORT = {
  codigo: [
    'codpro',
    'codigo',
    'código',
    'codigo producto',
    'código producto',
    'cod producto',
    'cod. producto',
    'code',
    'referencia',
    'ref',
    'ref.',
    'sku',
    'parte',
    'nº parte',
    'no parte',
    'numero parte',
    'código de producto',
    'codigo de producto',
  ],
  descripcion: [
    'despro',
    'descripcion',
    'descripción',
    'descripcion producto',
    'descripción producto',
    'nombre',
    'nombre producto',
    'producto',
    'detalle',
    'descrip',
    'descripción de producto',
    'descripcion de producto',
  ],
  unidad: [
    'u.m.',
    'um',
    'unidad',
    'und',
    'unidad medida',
    'unidad de medida',
    'u medida',
    'medida',
  ],
  stock: [
    'stock',
    'cantidad',
    'existencia',
    'existencias',
    'inventario',
    'stock contado',
    'cant',
    'cant.',
    'qty',
    'cantidad contada',
  ],
  costo: [
    'precio proveedor /costo',
    'precio proveedor / costo',
    'precio proveedor costo',
    'precio proveedor',
    'costo proveedor',
    'costo',
    'precio costo',
    'precio de costo',
    'precio compra',
    'costo compra',
    'p. proveedor',
    'p proveedor',
    'precio prov',
    'precio prov.',
    'costo prov',
    'costo prov.',
    'valor costo',
    'costo unitario',
    'precio unitario compra',
    'compra',
    'costo u',
    'costoneto',
    'costo neto',
    'precio lista compra',
  ],
  pvp: [
    'pvpa',
    'pvp a',
    'pvp',
    'pvp1',
    'precio venta',
    'precio de venta',
    'precio venta publico',
    'precio venta público',
    'precio publico',
    'precio público',
    'precio venta al publico',
    'precio de venta al público',
    'precio de venta al publico',
    'precio cliente',
    'precio final',
    'venta',
    'precio tienda',
  ],
  marca: ['marca', 'brand', 'fabricante', 'marca producto', 'marca del producto'],
  familia: [
    'familia',
    'categoria',
    'categoría',
    'categoria producto',
    'rubro',
    'linea',
    'línea',
    'grupo',
    'tipo',
    'familia producto',
    'seccion',
    'sección',
  ],
} as const;

/** Normaliza encabezado de celda Excel para comparar alias. */
export function normalizeExcelHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildExcelRowMap(row: Record<string, unknown>): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    map.set(normalizeExcelHeader(key), value);
  }
  return map;
}

export function pickExcelColumn(
  map: Map<string, unknown>,
  aliases: readonly string[],
  fuzzy?: (normalizedKey: string) => boolean
): unknown {
  for (const alias of aliases) {
    const v = map.get(normalizeExcelHeader(alias));
    if (v != null && v !== '') return v;
  }
  if (fuzzy) {
    for (const [key, value] of map) {
      if (value != null && value !== '' && fuzzy(key)) return value;
    }
  }
  return undefined;
}

/** Detecta columna de costo aunque el encabezado sea distinto (ej. "PRECIO PROV"). */
export function fuzzyMatchCosto(key: string): boolean {
  const hasProveedor = key.includes('proveedor') || key.includes('prov');
  const hasCosto = key.includes('costo') || key.includes('compra');
  const hasPrecio = key.includes('precio') || key.includes('p.');
  if (hasProveedor && (hasCosto || hasPrecio)) return true;
  if (key === 'costo' || key.startsWith('costo ')) return true;
  return false;
}

export function fuzzyMatchPvp(key: string): boolean {
  if (key.includes('pvp') || key.includes('venta al publico') || key.includes('venta publico')) return true;
  if (key.includes('precio') && key.includes('venta') && !key.includes('proveedor') && !key.includes('costo'))
    return true;
  return false;
}
