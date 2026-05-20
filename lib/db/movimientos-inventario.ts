import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeCodpro } from '@/lib/codpro';
import {
  CONFIG_INVENTARIO_ACTIVO,
  CONFIG_INVENTARIO_INICIO,
  type MovimientoInventario,
  type ResumenVentasInventario,
} from '@/lib/inventario-activo';
import { getConfig, setConfig } from '@/lib/db/config';

function nowIso(): string {
  return new Date().toISOString();
}

export async function isInventarioActivo(db: SQLiteDatabase): Promise<boolean> {
  return (await getConfig(db, CONFIG_INVENTARIO_ACTIVO)) === '1';
}

export async function getInventarioInicioAt(db: SQLiteDatabase): Promise<string | null> {
  return getConfig(db, CONFIG_INVENTARIO_INICIO);
}

export async function iniciarInventarioActivo(db: SQLiteDatabase): Promise<void> {
  const ts = nowIso();
  await setConfig(db, CONFIG_INVENTARIO_ACTIVO, '1');
  await setConfig(db, CONFIG_INVENTARIO_INICIO, ts);
}

export async function cerrarInventarioActivo(db: SQLiteDatabase): Promise<void> {
  await setConfig(db, CONFIG_INVENTARIO_ACTIVO, '0');
}

export async function registrarVentaInventario(
  db: SQLiteDatabase,
  codpro: string,
  cantidad: number,
  deviceId: string
): Promise<void> {
  const cod = normalizeCodpro(codpro);
  if (!cod) throw new Error('Código inválido');
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error('Cantidad debe ser mayor a cero');
  }
  const activo = await isInventarioActivo(db);
  if (!activo) {
    await iniciarInventarioActivo(db);
  }
  await db.runAsync(
    `INSERT INTO movimientos_inventario (codpro, cantidad, tipo, device_id, created_at)
     VALUES (?, ?, 'venta', ?, ?)`,
    cod,
    cantidad,
    deviceId,
    nowIso()
  );
}

export async function getVentasProducto(
  db: SQLiteDatabase,
  codpro: string
): Promise<number> {
  const cod = normalizeCodpro(codpro);
  if (!cod) return 0;
  const activo = await isInventarioActivo(db);
  if (!activo) return 0;
  const inicio = await getInventarioInicioAt(db);
  if (!inicio) return 0;
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(cantidad), 0) AS total
     FROM movimientos_inventario
     WHERE codpro = ? AND tipo = 'venta' AND created_at >= ?`,
    cod,
    inicio
  );
  return row?.total ?? 0;
}

export async function getResumenVentasInventario(
  db: SQLiteDatabase
): Promise<ResumenVentasInventario> {
  const activo = await isInventarioActivo(db);
  if (!activo) return { movimientos: 0, unidades: 0, productos: 0 };
  const inicio = await getInventarioInicioAt(db);
  if (!inicio) return { movimientos: 0, unidades: 0, productos: 0 };
  const row = await db.getFirstAsync<{
    movimientos: number;
    unidades: number;
    productos: number;
  }>(
    `SELECT
      COUNT(*) AS movimientos,
      COALESCE(SUM(cantidad), 0) AS unidades,
      COUNT(DISTINCT codpro) AS productos
     FROM movimientos_inventario
     WHERE tipo = 'venta' AND created_at >= ?`,
    inicio
  );
  return {
    movimientos: row?.movimientos ?? 0,
    unidades: row?.unidades ?? 0,
    productos: row?.productos ?? 0,
  };
}

export async function listMovimientosRecientes(
  db: SQLiteDatabase,
  limit = 15
): Promise<MovimientoInventario[]> {
  const activo = await isInventarioActivo(db);
  if (!activo) return [];
  const inicio = await getInventarioInicioAt(db);
  if (!inicio) return [];
  const rows = await db.getAllAsync<{
    id: number;
    codpro: string;
    cantidad: number;
    tipo: 'venta' | 'anulacion';
    created_at: string;
    device_id: string | null;
    despro: string | null;
  }>(
    `SELECT m.id, m.codpro, m.cantidad, m.tipo, m.created_at, m.device_id, p.despro
     FROM movimientos_inventario m
     LEFT JOIN productos p ON p.codpro = m.codpro
     WHERE m.tipo = 'venta' AND m.created_at >= ?
     ORDER BY m.created_at DESC
     LIMIT ?`,
    inicio,
    limit
  );
  return rows.map((r) => ({
    id: r.id,
    codpro: r.codpro,
    despro: r.despro ?? undefined,
    cantidad: r.cantidad,
    tipo: r.tipo,
    created_at: r.created_at,
    device_id: r.device_id,
  }));
}

export async function anularUltimaVentaProducto(
  db: SQLiteDatabase,
  codpro: string
): Promise<boolean> {
  const cod = normalizeCodpro(codpro);
  const inicio = await getInventarioInicioAt(db);
  if (!cod || !inicio) return false;
  const ultimo = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM movimientos_inventario
     WHERE codpro = ? AND tipo = 'venta' AND created_at >= ?
     ORDER BY created_at DESC LIMIT 1`,
    cod,
    inicio
  );
  if (!ultimo) return false;
  await db.runAsync('DELETE FROM movimientos_inventario WHERE id = ?', ultimo.id);
  return true;
}

export type MovimientoSync = {
  id: number;
  codpro: string;
  cantidad: number;
  tipo: string;
  device_id: string | null;
  created_at: string;
};

export async function listMovimientosParaSync(db: SQLiteDatabase): Promise<MovimientoSync[]> {
  const inicio = await getInventarioInicioAt(db);
  if (!inicio) return [];
  return db.getAllAsync<MovimientoSync>(
    `SELECT id, codpro, cantidad, tipo, device_id, created_at
     FROM movimientos_inventario
     WHERE created_at >= ?
     ORDER BY created_at`,
    inicio
  );
}

export async function aplicarMovimientosSync(
  db: SQLiteDatabase,
  movimientos: MovimientoSync[]
): Promise<void> {
  for (const m of movimientos) {
    const cod = normalizeCodpro(m.codpro);
    if (!cod) continue;
    const existe = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM movimientos_inventario
       WHERE codpro = ? AND created_at = ? AND IFNULL(device_id,'') = IFNULL(?, '')
       AND cantidad = ? AND tipo = ?`,
      cod,
      m.created_at,
      m.device_id,
      m.cantidad,
      m.tipo
    );
    if (existe) continue;
    await db.runAsync(
      `INSERT INTO movimientos_inventario (codpro, cantidad, tipo, device_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      cod,
      m.cantidad,
      m.tipo,
      m.device_id,
      m.created_at
    );
  }
}
