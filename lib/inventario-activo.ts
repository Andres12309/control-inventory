import type { ProductoConConteo } from '@/lib/types';

export const CONFIG_INVENTARIO_ACTIVO = 'inventario_activo';
export const CONFIG_INVENTARIO_INICIO = 'inventario_inicio_at';

export function sqlVentasDuranteSubquery(): string {
  return `(SELECT COALESCE(SUM(m.cantidad), 0)
    FROM movimientos_inventario m
    WHERE m.codpro = p.codpro
      AND m.tipo = 'venta'
      AND EXISTS (SELECT 1 FROM config WHERE clave = '${CONFIG_INVENTARIO_ACTIVO}' AND valor = '1')
      AND m.created_at >= COALESCE((SELECT valor FROM config WHERE clave = '${CONFIG_INVENTARIO_INICIO}'), '9999')
  ) AS ventas_durante`;
}

/** Ventas registradas después del último conteo guardado de ese producto. */
export function sqlVentasDesdeConteoSubquery(): string {
  return `(SELECT COALESCE(SUM(m.cantidad), 0)
    FROM movimientos_inventario m
    WHERE m.codpro = p.codpro
      AND m.tipo = 'venta'
      AND c.updated_at IS NOT NULL
      AND m.created_at > c.updated_at
  ) AS ventas_desde_conteo`;
}

export type MovimientoInventario = {
  id: number;
  codpro: string;
  despro?: string;
  cantidad: number;
  tipo: 'venta' | 'anulacion';
  created_at: string;
  device_id: string | null;
};

export type ResumenVentasInventario = {
  movimientos: number;
  unidades: number;
  productos: number;
};

export function stockAjustado(
  stockContado: number | null | undefined,
  ventasDurante: number | null | undefined
): number | null {
  if (stockContado == null) return null;
  return Math.max(0, stockContado - (ventasDurante ?? 0));
}

/** Stock físico estimado a hoy (para listas y exportación Excel). */
export function stockRealEnTienda(p: ProductoConConteo): number | null {
  if (p.stock_contado != null) {
    return stockAjustado(p.stock_contado, p.ventas_desde_conteo ?? 0);
  }
  if (p.stock_sistema != null) {
    return stockAjustado(p.stock_sistema, p.ventas_durante ?? 0);
  }
  return null;
}

/** Valor de columna Stock en Excel: solo cantidad real, sin movimientos. */
export function stockParaExportExcel(p: ProductoConConteo): number | '' {
  const real = stockRealEnTienda(p);
  return real != null ? real : '';
}
