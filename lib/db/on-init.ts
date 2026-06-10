import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateAlmacenIfNeeded } from '@/lib/almacen/migrate';
import { migrateDbIfNeeded } from '@/lib/db/migrate';

/** Inicializa inventario y almacén (módulos independientes, misma base SQLite). */
export async function onDbInit(db: SQLiteDatabase): Promise<void> {
  await migrateDbIfNeeded(db);
  await migrateAlmacenIfNeeded(db);
}
