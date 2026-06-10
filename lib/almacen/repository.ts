import type { SQLiteDatabase } from 'expo-sqlite';

import { runAlmacenDb } from '@/lib/almacen/db-queue';
import {
  getEstadisticasAlmacen as getEstadisticasAlmacenRaw,
  listProductosVistosRecientes as listProductosVistosRecientesRaw,
  registrarVistaProductoAlmacen as registrarVistaProductoAlmacenRaw,
} from '@/lib/almacen/search-analytics';
import { buscarProductosInteligente } from '@/lib/almacen/search-engine';
import { buildTextoBusqueda, tokensFromProducto } from '@/lib/almacen/tokenize';
import type { FilaExcelErp } from '@/lib/almacen/types';
import type {
  AlmacenMeta,
  BusquedaAlmacenOptions,
  EstadisticasAlmacen,
  ProductoAlmacen,
  ProductoVistoReciente,
} from '@/lib/almacen/types';

const META_ULTIMA_IMPORT = 'ultima_importacion';

function nowIso(): string {
  return new Date().toISOString();
}

function mapProducto(row: Record<string, unknown>): ProductoAlmacen {
  return {
    codigo: String(row.codigo),
    descripcion: String(row.descripcion),
    um: String(row.um ?? 'UND'),
    grupo_tipo: row.grupo_tipo != null ? String(row.grupo_tipo) : null,
    familia: row.familia != null ? String(row.familia) : null,
    marca: row.marca != null ? String(row.marca) : null,
    linea: row.linea != null ? String(row.linea) : null,
    impuesto: row.impuesto != null ? String(row.impuesto) : null,
    stock_real: Number(row.stock_real ?? 0),
    stock_disp: Number(row.stock_disp ?? 0),
    stock_minimo: Number(row.stock_minimo ?? 0),
    stock_maximo: Number(row.stock_maximo ?? 0),
    cod_barra: row.cod_barra != null ? String(row.cod_barra) : null,
    activo: row.activo === 1 || row.activo === true,
    ubicacion: row.ubicacion != null ? String(row.ubicacion) : null,
    texto_busqueda: String(row.texto_busqueda ?? ''),
  };
}

const SELECT_PRODUCTO = `
  SELECT codigo, descripcion, um, grupo_tipo, familia, marca, linea, impuesto,
         stock_real, stock_disp, stock_minimo, stock_maximo, cod_barra, activo, ubicacion, texto_busqueda
  FROM almacen_productos
`;

const SELECT_PRODUCTO_P = `
  SELECT
    p.codigo, p.descripcion, p.um, p.grupo_tipo, p.familia, p.marca, p.linea, p.impuesto,
    p.stock_real, p.stock_disp, p.stock_minimo, p.stock_maximo, p.cod_barra, p.activo, p.ubicacion, p.texto_busqueda
  FROM almacen_productos p
`;

async function insertarTokensBatch(
  db: SQLiteDatabase,
  tokenBatch: [string, string][]
): Promise<void> {
  for (const [token, codigo] of tokenBatch) {
    await db.runAsync(
      'INSERT OR IGNORE INTO almacen_tokens (token, codigo) VALUES (?, ?)',
      token,
      codigo
    );
  }
}

export async function getAlmacenMeta(db: SQLiteDatabase): Promise<AlmacenMeta> {
  const totalRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM almacen_productos'
  );
  const metaRow = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM almacen_meta WHERE clave = ?',
    META_ULTIMA_IMPORT
  );
  return {
    totalProductos: totalRow?.total ?? 0,
    ultimaImportacion: metaRow?.valor ?? null,
  };
}

export async function importarAlmacenDesdeErp(
  db: SQLiteDatabase,
  filas: FilaExcelErp[]
): Promise<{ importados: number }> {
  return runAlmacenDb(async () => {
  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.execAsync('DELETE FROM almacen_tokens');
    await db.execAsync('DELETE FROM almacen_productos');

    const tokenBatch: [string, string][] = [];
    const PRODUCT_CHUNK = 50;

    for (let i = 0; i < filas.length; i += PRODUCT_CHUNK) {
      const chunk = filas.slice(i, i + PRODUCT_CHUNK);
      for (const fila of chunk) {
        const texto_busqueda = buildTextoBusqueda(fila);
        await db.runAsync(
          `INSERT INTO almacen_productos (
            codigo, descripcion, um, grupo_tipo, familia, marca, linea, impuesto,
            stock_real, stock_disp, stock_minimo, stock_maximo, cod_barra, activo, ubicacion, texto_busqueda
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          fila.codigo,
          fila.descripcion,
          fila.um,
          fila.grupo_tipo,
          fila.familia,
          fila.marca,
          fila.linea,
          fila.impuesto,
          fila.stock_real,
          fila.stock_disp,
          fila.stock_minimo,
          fila.stock_maximo,
          fila.cod_barra,
          fila.activo ? 1 : 0,
          fila.ubicacion,
          texto_busqueda
        );
        for (const token of tokensFromProducto(fila)) {
          tokenBatch.push([token, fila.codigo]);
        }
      }

      if (tokenBatch.length >= 5000) {
        await insertarTokensBatch(db, tokenBatch);
        tokenBatch.length = 0;
      }
    }

    if (tokenBatch.length > 0) {
      await insertarTokensBatch(db, tokenBatch);
    }

    await db.runAsync(
      'INSERT OR REPLACE INTO almacen_meta (clave, valor) VALUES (?, ?)',
      META_ULTIMA_IMPORT,
      nowIso()
    );
    await db.execAsync('COMMIT');
    return { importados: filas.length };
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
  });
}

export async function getProductoAlmacen(
  db: SQLiteDatabase,
  codigo: string
): Promise<ProductoAlmacen | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `${SELECT_PRODUCTO} WHERE codigo = ?`,
    codigo.trim().toUpperCase()
  );
  return row ? mapProducto(row) : null;
}

export async function listFamiliasAlmacen(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ familia: string }>(
    `SELECT DISTINCT familia FROM almacen_productos
     WHERE familia IS NOT NULL AND TRIM(familia) != ''
     ORDER BY familia`
  );
  return rows.map((r) => r.familia);
}

export async function listMarcasAlmacen(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ marca: string }>(
    `SELECT DISTINCT marca FROM almacen_productos
     WHERE marca IS NOT NULL AND TRIM(marca) != ''
     ORDER BY marca`
  );
  return rows.map((r) => r.marca);
}

/** Búsqueda inteligente: multi-palabra, sinónimos, fuzzy y ranking de relevancia. */
export async function buscarProductosAlmacen(
  db: SQLiteDatabase,
  options: BusquedaAlmacenOptions
): Promise<ProductoAlmacen[]> {
  return runAlmacenDb(() => buscarProductosInteligente(db, options));
}

export async function toggleFavoritoAlmacen(
  db: SQLiteDatabase,
  codigo: string
): Promise<boolean> {
  const existe = await db.getFirstAsync<{ codigo: string }>(
    'SELECT codigo FROM almacen_favoritos WHERE codigo = ?',
    codigo
  );
  if (existe) {
    await db.runAsync('DELETE FROM almacen_favoritos WHERE codigo = ?', codigo);
    return false;
  }
  await db.runAsync(
    'INSERT INTO almacen_favoritos (codigo, created_at) VALUES (?, ?)',
    codigo,
    nowIso()
  );
  return true;
}

export async function isFavoritoAlmacen(db: SQLiteDatabase, codigo: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ codigo: string }>(
    'SELECT codigo FROM almacen_favoritos WHERE codigo = ?',
    codigo
  );
  return !!row;
}

export async function listFavoritosAlmacen(db: SQLiteDatabase): Promise<ProductoAlmacen[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `${SELECT_PRODUCTO_P}
     INNER JOIN almacen_favoritos f ON f.codigo = p.codigo
     ORDER BY f.created_at DESC`
  );
  return rows.map(mapProducto);
}

export async function registrarBusquedaAlmacen(
  db: SQLiteDatabase,
  query: string
): Promise<void> {
  const q = query.trim();
  if (q.length < 2) return;
  await db.runAsync(
    'INSERT INTO almacen_historial (query, created_at) VALUES (?, ?)',
    q,
    nowIso()
  );
  await db.runAsync(
    `DELETE FROM almacen_historial WHERE id NOT IN (
      SELECT id FROM almacen_historial ORDER BY id DESC LIMIT 30
    )`
  );
}

export async function listHistorialBusqueda(db: SQLiteDatabase, limit = 10): Promise<string[]> {
  const cap = Math.max(1, Math.min(Math.floor(limit), 30));
  const rows = await db.getAllAsync<{ query: string }>(
    `SELECT DISTINCT query FROM almacen_historial ORDER BY id DESC LIMIT ${cap}`
  );
  return rows.map((r) => r.query);
}

export async function registrarVistaProductoAlmacen(
  db: SQLiteDatabase,
  producto: {
    codigo: string;
    descripcion: string;
    marca: string | null;
    familia: string | null;
  }
): Promise<void> {
  return runAlmacenDb(() => registrarVistaProductoAlmacenRaw(db, producto));
}

export async function listProductosVistosRecientes(
  db: SQLiteDatabase,
  limit = 8
): Promise<ProductoVistoReciente[]> {
  return runAlmacenDb(() => listProductosVistosRecientesRaw(db, limit));
}

export async function getEstadisticasAlmacen(db: SQLiteDatabase): Promise<EstadisticasAlmacen> {
  return runAlmacenDb(() => getEstadisticasAlmacenRaw(db));
}
