import type { SQLiteDatabase } from 'expo-sqlite';

import { FAMILIAS_CANONICAS } from '@/lib/familia-normalize';

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS familias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      orden INTEGER NOT NULL DEFAULT 0,
      activa INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS productos (
      codpro TEXT PRIMARY KEY,
      despro TEXT NOT NULL,
      um TEXT NOT NULL DEFAULT 'UND',
      costo REAL,
      pvpa REAL,
      marca TEXT,
      familia_id INTEGER,
      stock_sistema REAL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conteos (
      codpro TEXT PRIMARY KEY,
      stock REAL NOT NULL,
      notas TEXT,
      device_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codpro TEXT NOT NULL,
      cantidad REAL NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'venta',
      device_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mov_inv_codpro ON movimientos_inventario(codpro);
    CREATE INDEX IF NOT EXISTS idx_mov_inv_created ON movimientos_inventario(created_at);
  `);

  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM familias",
  );
  if ((row?.count ?? 0) > 0) return;

  for (let i = 0; i < FAMILIAS_CANONICAS.length; i++) {
    await db.runAsync(
      'INSERT INTO familias (nombre, orden, activa) VALUES (?, ?, 1)',
      FAMILIAS_CANONICAS[i],
      i
    );
  }
}
