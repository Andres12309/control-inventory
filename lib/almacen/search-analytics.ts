import type { SQLiteDatabase } from 'expo-sqlite';

import type { EstadisticasAlmacen, ProductoVistoReciente } from '@/lib/almacen/types';

const IN_CHUNK = 50;

function nowIso(): string {
  return new Date().toISOString();
}

/** Boost de ranking según consultas históricas (aprendizaje local). */
export function popularidadBoost(consultas: number): number {
  if (consultas <= 0) return 0;
  return Math.min(150, Math.floor(Math.log10(consultas + 1) * 55));
}

async function incrementarStat(
  db: SQLiteDatabase,
  tipo: 'marca' | 'familia',
  valor: string | null | undefined
): Promise<void> {
  const v = valor?.trim();
  if (!v) return;
  await db.runAsync(
    `INSERT INTO almacen_stats_dim (tipo, valor, consultas, ultima)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(tipo, valor) DO UPDATE SET
       consultas = consultas + 1,
       ultima = excluded.ultima`,
    tipo,
    v,
    nowIso()
  );
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
  const ts = nowIso();
  await db.runAsync(
    `INSERT INTO almacen_popularidad (codigo, consultas, ultima_consulta)
     VALUES (?, 1, ?)
     ON CONFLICT(codigo) DO UPDATE SET
       consultas = consultas + 1,
       ultima_consulta = excluded.ultima_consulta`,
    producto.codigo,
    ts
  );

  await incrementarStat(db, 'marca', producto.marca);
  await incrementarStat(db, 'familia', producto.familia);

  await db.runAsync(
    `INSERT INTO almacen_vistos (codigo, descripcion, marca, familia, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    producto.codigo,
    producto.descripcion,
    producto.marca,
    producto.familia,
    ts
  );

  await db.runAsync(
    `DELETE FROM almacen_vistos WHERE id NOT IN (
      SELECT id FROM almacen_vistos ORDER BY id DESC LIMIT 25
    )`
  );
}

export async function getPopularidadMap(
  db: SQLiteDatabase,
  codigos: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (codigos.length === 0) return map;

  for (let i = 0; i < codigos.length; i += IN_CHUNK) {
    const chunk = codigos.slice(i, i + IN_CHUNK);
    const ph = chunk.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ codigo: string; consultas: number }>(
      `SELECT codigo, consultas FROM almacen_popularidad WHERE codigo IN (${ph})`,
      ...chunk
    );
    for (const r of rows) map.set(r.codigo, r.consultas);
  }
  return map;
}

export async function listProductosVistosRecientes(
  db: SQLiteDatabase,
  limit = 8
): Promise<ProductoVistoReciente[]> {
  const rows = await db.getAllAsync<{
    codigo: string;
    descripcion: string;
    marca: string | null;
    familia: string | null;
    created_at: string;
  }>(
    `SELECT codigo, descripcion, marca, familia, created_at
     FROM almacen_vistos ORDER BY id DESC LIMIT ${Math.max(1, Math.min(limit, 20))}`
  );

  const seen = new Set<string>();
  const out: ProductoVistoReciente[] = [];
  for (const r of rows) {
    if (seen.has(r.codigo)) continue;
    seen.add(r.codigo);
    out.push({
      codigo: r.codigo,
      descripcion: r.descripcion,
      marca: r.marca,
      familia: r.familia,
      visto_at: r.created_at,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getEstadisticasAlmacen(db: SQLiteDatabase): Promise<EstadisticasAlmacen> {
  const productosTop = await db.getAllAsync<{
    codigo: string;
    descripcion: string;
    consultas: number;
  }>(
    `SELECT p.codigo, p.descripcion, pop.consultas
     FROM almacen_popularidad pop
     INNER JOIN almacen_productos p ON p.codigo = pop.codigo
     ORDER BY pop.consultas DESC, pop.ultima_consulta DESC
     LIMIT 8`
  );

  const marcasTop = await db.getAllAsync<{ marca: string; consultas: number }>(
    `SELECT valor AS marca, consultas FROM almacen_stats_dim
     WHERE tipo = 'marca' ORDER BY consultas DESC LIMIT 8`
  );

  const familiasTop = await db.getAllAsync<{ familia: string; consultas: number }>(
    `SELECT valor AS familia, consultas FROM almacen_stats_dim
     WHERE tipo = 'familia' ORDER BY consultas DESC LIMIT 8`
  );

  return {
    productosTop: productosTop.map((r) => ({
      codigo: r.codigo,
      descripcion: r.descripcion,
      consultas: r.consultas,
    })),
    marcasTop: marcasTop.map((r) => ({ marca: r.marca, consultas: r.consultas })),
    familiasTop: familiasTop.map((r) => ({ familia: r.familia, consultas: r.consultas })),
  };
}
