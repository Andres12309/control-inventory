export type Familia = {
  id: number;
  nombre: string;
  orden: number;
  activa: boolean;
};

export type Producto = {
  codpro: string;
  despro: string;
  um: string;
  costo: number | null;
  pvpa: number | null;
  marca: string | null;
  familia_id: number | null;
  familia_nombre?: string | null;
  stock_sistema: number | null;
  updated_at: string;
};

export type ProductoConConteo = Producto & {
  stock_contado: number | null;
  conteo_updated_at: string | null;
  /** Unidades vendidas desde que inició el inventario en curso. */
  ventas_durante?: number;
  /** Ventas después del último conteo guardado (para stock real). */
  ventas_desde_conteo?: number;
};

export type ConteoInput = {
  codpro: string;
  stock: number;
  notas?: string;
};

export type SyncConfig = {
  servidorUrl: string;
  deviceId: string;
};

/** Filtro de lista en pestaña Inventario (contadores). */
export type FiltroEstadoInventario = 'todos' | 'contados' | 'pendientes';
