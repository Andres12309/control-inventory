import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateAlmacenIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS almacen_productos (
      codigo TEXT PRIMARY KEY,
      descripcion TEXT NOT NULL,
      um TEXT NOT NULL DEFAULT 'UND',
      grupo_tipo TEXT,
      familia TEXT,
      marca TEXT,
      linea TEXT,
      impuesto TEXT,
      stock_real REAL NOT NULL DEFAULT 0,
      stock_disp REAL NOT NULL DEFAULT 0,
      stock_minimo REAL NOT NULL DEFAULT 0,
      stock_maximo REAL NOT NULL DEFAULT 0,
      cod_barra TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      ubicacion TEXT,
      texto_busqueda TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS almacen_tokens (
      token TEXT NOT NULL,
      codigo TEXT NOT NULL,
      PRIMARY KEY (token, codigo)
    );

    CREATE TABLE IF NOT EXISTS almacen_favoritos (
      codigo TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS almacen_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS almacen_meta (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS almacen_popularidad (
      codigo TEXT PRIMARY KEY,
      consultas INTEGER NOT NULL DEFAULT 0,
      ultima_consulta TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS almacen_stats_dim (
      tipo TEXT NOT NULL,
      valor TEXT NOT NULL,
      consultas INTEGER NOT NULL DEFAULT 0,
      ultima TEXT NOT NULL,
      PRIMARY KEY (tipo, valor)
    );

    CREATE TABLE IF NOT EXISTS almacen_vistos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      marca TEXT,
      familia TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_almacen_tokens_token ON almacen_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_almacen_pop_consultas ON almacen_popularidad(consultas DESC);
    CREATE INDEX IF NOT EXISTS idx_almacen_stats_tipo ON almacen_stats_dim(tipo, consultas DESC);
    CREATE INDEX IF NOT EXISTS idx_almacen_vistos_id ON almacen_vistos(id DESC);
    CREATE INDEX IF NOT EXISTS idx_almacen_prod_familia ON almacen_productos(familia);
    CREATE INDEX IF NOT EXISTS idx_almacen_prod_marca ON almacen_productos(marca);
    CREATE INDEX IF NOT EXISTS idx_almacen_prod_stock ON almacen_productos(stock_real);
    CREATE INDEX IF NOT EXISTS idx_almacen_prod_texto ON almacen_productos(texto_busqueda);
  `);
}
