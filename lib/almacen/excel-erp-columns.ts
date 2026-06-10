/** Columnas del Excel exportado desde el ERP (independiente del Excel de inventario). */
export const ERP_ALIASES = {
  codigo: ['codigo', 'código', 'cod', 'cod.', 'codpro', 'sku', 'referencia'],
  descripcion: ['descripcion', 'descripción', 'despro', 'nombre', 'producto', 'detalle'],
  um: ['u.m.', 'um', 'unidad', 'unidad de medida', 'und'],
  grupoTipo: ['grupo tipo', 'grupo', 'tipo grupo', 'grupo_tipo'],
  familia: ['familia', 'categoria', 'categoría', 'rubro'],
  marca: ['marca', 'brand', 'fabricante'],
  linea: ['linea', 'línea', 'line'],
  impuesto: ['impuesto', 'iva', 'tax'],
  stockReal: ['stock real', 'stock_real', 'existencia', 'stock'],
  stockDisp: ['stock disp', 'stock disp.', 'stock disponible', 'disponible', 'stock_disp'],
  stockMinimo: ['stock mínimo', 'stock minimo', 'stock min', 'minimo', 'mínimo'],
  stockMaximo: ['stock máximo', 'stock maximo', 'stock max', 'maximo', 'máximo'],
  codBarra: ['cod.barra', 'cod barra', 'codigo barra', 'código barra', 'barcode', 'ean'],
  activo: ['activo', 'estado', 'habilitado'],
  ubicacion: ['ubicacion', 'ubicación', 'localizacion', 'localización', 'pasillo', 'estante'],
} as const;

export function normalizeErpHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildErpRowMap(row: Record<string, unknown>): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    map.set(normalizeErpHeader(key), value);
  }
  return map;
}

export function pickErpColumn(
  map: Map<string, unknown>,
  aliases: readonly string[]
): unknown {
  for (const alias of aliases) {
    const v = map.get(normalizeErpHeader(alias));
    if (v != null && v !== '') return v;
  }
  for (const [key, value] of map) {
    if (value == null || value === '') continue;
    for (const alias of aliases) {
      const norm = normalizeErpHeader(alias);
      if (key === norm || key.includes(norm) || norm.includes(key)) return value;
    }
  }
  return undefined;
}
