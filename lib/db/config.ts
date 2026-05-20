import type { SQLiteDatabase } from 'expo-sqlite';

export async function getConfig(db: SQLiteDatabase, clave: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM config WHERE clave = ?',
    clave
  );
  return row?.valor ?? null;
}

export async function setConfig(
  db: SQLiteDatabase,
  clave: string,
  valor: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
    clave,
    valor
  );
}
