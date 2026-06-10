export type ProductoAlmacen = {
  codigo: string;
  descripcion: string;
  um: string;
  grupo_tipo: string | null;
  familia: string | null;
  marca: string | null;
  linea: string | null;
  impuesto: string | null;
  stock_real: number;
  stock_disp: number;
  stock_minimo: number;
  stock_maximo: number;
  cod_barra: string | null;
  activo: boolean;
  ubicacion: string | null;
  texto_busqueda: string;
};

export type FilaExcelErp = Omit<ProductoAlmacen, 'texto_busqueda'>;

export type AlmacenMeta = {
  totalProductos: number;
  ultimaImportacion: string | null;
};

export type FiltroAlmacenRapido =
  | 'todos'
  | 'sin_stock'
  | 'stock_bajo'
  | 'favoritos';

export type BusquedaAlmacenOptions = {
  query: string;
  familia?: string | null;
  marca?: string | null;
  filtro?: FiltroAlmacenRapido;
  limit?: number;
};

export type ProductoVistoReciente = {
  codigo: string;
  descripcion: string;
  marca: string | null;
  familia: string | null;
  visto_at: string;
};

export type EstadisticasAlmacen = {
  productosTop: { codigo: string; descripcion: string; consultas: number }[];
  marcasTop: { marca: string; consultas: number }[];
  familiasTop: { familia: string; consultas: number }[];
};
