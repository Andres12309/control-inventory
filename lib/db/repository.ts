import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeCodpro, normalizeDespro } from '@/lib/codpro';
import { familiaClave, normalizeFamiliaImport } from '@/lib/familia-normalize';
import { setConfig } from '@/lib/db/config';
import { aplicarMovimientosSync, getInventarioInicioAt, isInventarioActivo, listMovimientosParaSync } from '@/lib/db/movimientos-inventario';
import {
  CONFIG_INVENTARIO_ACTIVO,
  CONFIG_INVENTARIO_INICIO,
  sqlVentasDesdeConteoSubquery,
  sqlVentasDuranteSubquery,
} from '@/lib/inventario-activo';
import type { FilaExcelProducto } from '@/lib/excel-import';
import type {
  ConteoInput,
  Familia,
  FiltroEstadoInventario,
  Producto,
  ProductoConConteo,
} from '@/lib/types';

function sqlFiltroEstado(filtro: FiltroEstadoInventario): string {
  if (filtro === 'contados') return ' AND c.stock IS NOT NULL';
  if (filtro === 'pendientes') return ' AND c.stock IS NULL';
  return '';
}

const PRODUCTO_SELECT = `
  SELECT
    p.codpro,
    p.despro,
    p.um,
    p.costo,
    p.pvpa,
    p.marca,
    p.familia_id,
    f.nombre AS familia_nombre,
    p.stock_sistema,
    p.updated_at,
    c.stock AS stock_contado,
    c.updated_at AS conteo_updated_at,
    ${sqlVentasDuranteSubquery()},
    ${sqlVentasDesdeConteoSubquery()}
  FROM productos p
  LEFT JOIN familias f ON f.id = p.familia_id
  LEFT JOIN conteos c ON c.codpro = p.codpro
`;

function nowIso(): string {
  return new Date().toISOString();
}

export { getConfig, setConfig } from '@/lib/db/config';

export async function listFamilias(db: SQLiteDatabase, soloActivas = false): Promise<Familia[]> {
  const rows = await db.getAllAsync<{
    id: number;
    nombre: string;
    orden: number;
    activa: number;
  }>(
    soloActivas
      ? 'SELECT id, nombre, orden, activa FROM familias WHERE activa = 1 ORDER BY orden, nombre'
      : 'SELECT id, nombre, orden, activa FROM familias ORDER BY orden, nombre'
  );
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    orden: r.orden,
    activa: r.activa === 1,
  }));
}

export async function upsertFamilia(
  db: SQLiteDatabase,
  nombre: string,
  id?: number
): Promise<void> {
  const ordenRow = await db.getFirstAsync<{ maxOrden: number }>(
    'SELECT COALESCE(MAX(orden), -1) + 1 AS maxOrden FROM familias'
  );
  const orden = ordenRow?.maxOrden ?? 0;
  if (id) {
    await db.runAsync('UPDATE familias SET nombre = ? WHERE id = ?', nombre.trim(), id);
  } else {
    await db.runAsync(
      'INSERT INTO familias (nombre, orden, activa) VALUES (?, ?, 1)',
      nombre.trim(),
      orden
    );
  }
}

export async function toggleFamiliaActiva(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(
    'UPDATE familias SET activa = CASE WHEN activa = 1 THEN 0 ELSE 1 END WHERE id = ?',
    id
  );
}

export async function getProducto(
  db: SQLiteDatabase,
  codpro: string
): Promise<ProductoConConteo | null> {
  const cod = normalizeCodpro(codpro);
  if (!cod) return null;
  return (
    (await db.getFirstAsync<ProductoConConteo>(
      `${PRODUCTO_SELECT} WHERE p.codpro = ?`,
      cod
    )) ?? null
  );
}

export async function searchProductos(
  db: SQLiteDatabase,
  query: string,
  familiaId?: number | null,
  filtroEstado: FiltroEstadoInventario = 'todos',
  limit = 80
): Promise<ProductoConConteo[]> {
  const raw = query.trim();
  const qCod = `%${normalizeCodpro(raw)}%`;
  const qText = `%${normalizeDespro(raw)}%`;
  let sql = `${PRODUCTO_SELECT} WHERE (p.codpro LIKE ? OR p.despro LIKE ? OR IFNULL(p.marca,'') LIKE ? COLLATE NOCASE)`;
  const params: (string | number)[] = [qCod, qText, qText];
  if (familiaId != null) {
    sql += ' AND p.familia_id = ?';
    params.push(familiaId);
  }
  sql += sqlFiltroEstado(filtroEstado);
  sql += ' ORDER BY p.despro LIMIT ?';
  params.push(limit);
  return db.getAllAsync<ProductoConConteo>(sql, ...params);
}

export async function listProductosPorFamilia(
  db: SQLiteDatabase,
  familiaId: number | null,
  filtroEstado: FiltroEstadoInventario = 'todos'
): Promise<ProductoConConteo[]> {
  let sql = PRODUCTO_SELECT + ' WHERE 1=1';
  const params: (number | string)[] = [];
  if (familiaId != null) {
    sql += ' AND p.familia_id = ?';
    params.push(familiaId);
  }
  sql += sqlFiltroEstado(filtroEstado);
  sql += ' ORDER BY p.despro';
  return db.getAllAsync<ProductoConConteo>(sql, ...params);
}

export async function upsertProducto(
  db: SQLiteDatabase,
  producto: Omit<Producto, 'updated_at' | 'familia_nombre'>
): Promise<void> {
  const ts = nowIso();
  await db.runAsync(
    `INSERT INTO productos (codpro, despro, um, costo, pvpa, marca, familia_id, stock_sistema, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(codpro) DO UPDATE SET
       despro = excluded.despro,
       um = excluded.um,
       costo = excluded.costo,
       pvpa = excluded.pvpa,
       marca = excluded.marca,
       familia_id = excluded.familia_id,
       stock_sistema = excluded.stock_sistema,
       updated_at = excluded.updated_at`,
    normalizeCodpro(producto.codpro),
    normalizeDespro(producto.despro),
    producto.um.trim() || 'UND',
    producto.costo,
    producto.pvpa,
    producto.marca?.trim() || null,
    producto.familia_id,
    producto.stock_sistema,
    ts
  );
}

export async function eliminarProducto(db: SQLiteDatabase, codpro: string): Promise<void> {
  const cod = normalizeCodpro(codpro);
  if (!cod) throw new Error('Código inválido');
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM movimientos_inventario WHERE codpro = ?', cod);
    await db.runAsync('DELETE FROM conteos WHERE codpro = ?', cod);
    const result = await db.runAsync('DELETE FROM productos WHERE codpro = ?', cod);
    if (result.changes === 0) throw new Error('Producto no encontrado');
  });
}

export async function guardarConteo(
  db: SQLiteDatabase,
  input: ConteoInput,
  deviceId: string
): Promise<void> {
  const codpro = normalizeCodpro(input.codpro);
  const existe = await getProducto(db, codpro);
  if (!existe) {
    await upsertProducto(db, {
      codpro,
      despro: normalizeDespro(`Producto ${codpro}`),
      um: 'UND',
      costo: null,
      pvpa: null,
      marca: null,
      familia_id: null,
      stock_sistema: null,
    });
  }
  await db.runAsync(
    `INSERT INTO conteos (codpro, stock, notas, device_id, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(codpro) DO UPDATE SET
       stock = excluded.stock,
       notas = excluded.notas,
       device_id = excluded.device_id,
       updated_at = excluded.updated_at`,
    codpro,
    input.stock,
    input.notas?.trim() || null,
    deviceId,
    nowIso()
  );
}

export async function getResumenInventario(db: SQLiteDatabase): Promise<{
  totalProductos: number;
  contados: number;
  pendientes: number;
}> {
  const row = await db.getFirstAsync<{
    totalProductos: number;
    contados: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM productos) AS totalProductos,
      (SELECT COUNT(*) FROM conteos) AS contados
  `);
  const total = row?.totalProductos ?? 0;
  const contados = row?.contados ?? 0;
  return {
    totalProductos: total,
    contados,
    pendientes: Math.max(0, total - contados),
  };
}

export type FichaRapidaInput = {
  codpro: string;
  despro: string;
  um: string;
  costo: number | null;
  pvpa: number | null;
  marca: string | null;
  familia_id: number | null;
  stock: number | null;
};

export async function guardarFichaRapida(
  db: SQLiteDatabase,
  data: FichaRapidaInput,
  deviceId: string
): Promise<void> {
  const codpro = normalizeCodpro(data.codpro);
  if (!codpro) throw new Error('Código de producto requerido');

  await upsertProducto(db, {
    codpro,
    despro: normalizeDespro(data.despro) || codpro,
    um: data.um.trim() || 'UND',
    costo: data.costo,
    pvpa: data.pvpa,
    marca: data.marca?.trim() || null,
    familia_id: data.familia_id,
    stock_sistema: null,
  });

  if (data.stock != null && !Number.isNaN(data.stock)) {
    await guardarConteo(db, { codpro, stock: data.stock }, deviceId);
  }
}

async function getFamiliaIdPorNombre(
  db: SQLiteDatabase,
  nombre: string | null
): Promise<number | null> {
  const canon = normalizeFamiliaImport(nombre);
  if (!canon) return null;
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM familias WHERE nombre = ? COLLATE NOCASE',
    canon
  );
  if (row) return row.id;
  const todas = await db.getAllAsync<{ id: number; nombre: string }>(
    'SELECT id, nombre FROM familias'
  );
  const clave = familiaClave(canon);
  const hit = todas.find((f) => familiaClave(f.nombre) === clave);
  return hit?.id ?? null;
}

export async function importarDesdeExcel(
  db: SQLiteDatabase,
  filas: FilaExcelProducto[],
  deviceId: string
): Promise<{ importados: number; omitidos: number }> {
  let importados = 0;
  let omitidos = 0;

  await db.withTransactionAsync(async () => {
    for (const fila of filas) {
      const codpro = normalizeCodpro(fila.codpro);
      if (!codpro) {
        omitidos++;
        continue;
      }
      const familia_id = await getFamiliaIdPorNombre(db, fila.familia);
      await upsertProducto(db, {
        codpro,
        despro: normalizeDespro(fila.despro),
        um: fila.um,
        costo: fila.costo,
        pvpa: fila.pvpa,
        marca: fila.marca,
        familia_id,
        stock_sistema: null,
      });
      if (fila.stock != null) {
        await db.runAsync(
          `INSERT INTO conteos (codpro, stock, notas, device_id, updated_at)
           VALUES (?, ?, NULL, ?, ?)
           ON CONFLICT(codpro) DO UPDATE SET
             stock = excluded.stock,
             device_id = excluded.device_id,
             updated_at = excluded.updated_at`,
          codpro,
          fila.stock,
          deviceId,
          nowIso()
        );
      }
      importados++;
    }
  });

  return { importados, omitidos };
}

export async function listParaExportar(db: SQLiteDatabase): Promise<ProductoConConteo[]> {
  return db.getAllAsync<ProductoConConteo>(
    `${PRODUCTO_SELECT} ORDER BY f.nombre, p.despro`
  );
}

export async function aplicarSyncPull(
  db: SQLiteDatabase,
  payload: {
    familias: Familia[];
    productos: Producto[];
    conteos: { codpro: string; stock: number; notas: string | null; device_id: string | null; updated_at: string }[];
    movimientos?: {
      codpro: string;
      cantidad: number;
      tipo: string;
      device_id: string | null;
      created_at: string;
    }[];
    inventario_activo?: string;
    inventario_inicio_at?: string | null;
  }
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const f of payload.familias) {
      await db.runAsync(
        `INSERT INTO familias (id, nombre, orden, activa) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET nombre = excluded.nombre, orden = excluded.orden, activa = excluded.activa`,
        f.id,
        f.nombre,
        f.orden,
        f.activa ? 1 : 0
      );
    }
    for (const p of payload.productos) {
      await db.runAsync(
        `INSERT INTO productos (codpro, despro, um, costo, pvpa, marca, familia_id, stock_sistema, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(codpro) DO UPDATE SET
           despro = excluded.despro,
           um = excluded.um,
           costo = excluded.costo,
           pvpa = excluded.pvpa,
           marca = excluded.marca,
           familia_id = excluded.familia_id,
           stock_sistema = excluded.stock_sistema,
           updated_at = CASE WHEN excluded.updated_at > productos.updated_at THEN excluded.updated_at ELSE productos.updated_at END`,
        normalizeCodpro(p.codpro),
        normalizeDespro(p.despro),
        p.um,
        p.costo,
        p.pvpa,
        p.marca,
        p.familia_id,
        p.stock_sistema,
        p.updated_at
      );
    }
    for (const c of payload.conteos) {
      const cod = normalizeCodpro(c.codpro);
      const local = await db.getFirstAsync<{ updated_at: string }>(
        'SELECT updated_at FROM conteos WHERE codpro = ?',
        cod
      );
      if (!local || c.updated_at >= local.updated_at) {
        await db.runAsync(
          `INSERT INTO conteos (codpro, stock, notas, device_id, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(codpro) DO UPDATE SET
             stock = excluded.stock,
             notas = excluded.notas,
             device_id = excluded.device_id,
             updated_at = excluded.updated_at`,
          cod,
          c.stock,
          c.notas,
          c.device_id,
          c.updated_at
        );
      }
    }
    if (payload.inventario_activo != null) {
      await setConfig(db, CONFIG_INVENTARIO_ACTIVO, payload.inventario_activo);
    }
    if (payload.inventario_inicio_at != null) {
      await setConfig(db, CONFIG_INVENTARIO_INICIO, payload.inventario_inicio_at);
    }
    if (payload.movimientos?.length) {
      await aplicarMovimientosSync(
        db,
        payload.movimientos.map((m, i) => ({
          id: i,
          codpro: m.codpro,
          cantidad: m.cantidad,
          tipo: m.tipo,
          device_id: m.device_id,
          created_at: m.created_at,
        }))
      );
    }
  });
}

export async function buildSyncPushPayload(db: SQLiteDatabase) {
  const familias = await listFamilias(db);
  const productos = await db.getAllAsync<Producto>('SELECT * FROM productos');
  const conteos = await db.getAllAsync<{
    codpro: string;
    stock: number;
    notas: string | null;
    device_id: string | null;
    updated_at: string;
  }>('SELECT codpro, stock, notas, device_id, updated_at FROM conteos');
  const movimientos = await listMovimientosParaSync(db);
  const activo = await isInventarioActivo(db);
  const inventario_inicio_at = await getInventarioInicioAt(db);
  return {
    familias,
    productos,
    conteos,
    movimientos: movimientos.map(({ id: _id, ...m }) => m),
    inventario_activo: activo ? '1' : '0',
    inventario_inicio_at,
  };
}
