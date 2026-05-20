import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'coordinador.json');

function defaultDb() {
  return {
    familias: [],
    productos: [],
    conteos: [],
    movimientos: [],
    config: {},
  };
}

export function loadDb() {
  if (!existsSync(DB_PATH)) return defaultDb();
  try {
    return { ...defaultDb(), ...JSON.parse(readFileSync(DB_PATH, 'utf8')) };
  } catch {
    return defaultDb();
  }
}

export function saveDb(db) {
  writeFileSync(DB_PATH, JSON.stringify(db), 'utf8');
}

export function normCod(codpro) {
  return String(codpro).trim().toUpperCase();
}

export function pullSnapshot(db) {
  const cfg = db.config ?? {};
  return {
    familias: (db.familias ?? []).map((f) => ({
      ...f,
      activa: f.activa === 1 || f.activa === true,
    })),
    productos: db.productos ?? [],
    conteos: db.conteos ?? [],
    movimientos: (db.movimientos ?? []).map(({ id: _id, ...m }) => m),
    inventario_activo: cfg.inventario_activo ?? '0',
    inventario_inicio_at: cfg.inventario_inicio_at ?? null,
  };
}

export function applyPush(db, payload) {
  const {
    familias = [],
    productos = [],
    conteos = [],
    movimientos = [],
    inventario_activo,
    inventario_inicio_at,
  } = payload;

  const famMap = new Map((db.familias ?? []).map((f) => [f.id, f]));
  for (const f of familias) {
    famMap.set(f.id, {
      id: f.id,
      nombre: f.nombre,
      orden: f.orden ?? 0,
      activa: f.activa ? 1 : 0,
    });
  }
  db.familias = [...famMap.values()];

  const prodMap = new Map((db.productos ?? []).map((p) => [normCod(p.codpro), p]));
  for (const p of productos) {
    const cod = normCod(p.codpro);
    const prev = prodMap.get(cod);
    if (!prev || String(p.updated_at) >= String(prev.updated_at)) {
      prodMap.set(cod, { ...p, codpro: cod });
    }
  }
  db.productos = [...prodMap.values()];

  const contMap = new Map((db.conteos ?? []).map((c) => [normCod(c.codpro), c]));
  for (const c of conteos) {
    const cod = normCod(c.codpro);
    const prev = contMap.get(cod);
    if (!prev || String(c.updated_at) >= String(prev.updated_at)) {
      contMap.set(cod, { ...c, codpro: cod });
    }
  }
  db.conteos = [...contMap.values()];

  if (!db.config) db.config = {};
  if (inventario_activo != null) db.config.inventario_activo = inventario_activo;
  if (inventario_inicio_at != null) db.config.inventario_inicio_at = inventario_inicio_at;

  const movs = db.movimientos ?? [];
  let nextId = movs.reduce((m, x) => Math.max(m, x.id ?? 0), 0) + 1;
  for (const m of movimientos) {
    const cod = normCod(m.codpro);
    const dup = movs.find(
      (x) =>
        normCod(x.codpro) === cod &&
        x.created_at === m.created_at &&
        (x.device_id ?? '') === (m.device_id ?? '') &&
        x.cantidad === m.cantidad &&
        (x.tipo ?? 'venta') === (m.tipo ?? 'venta')
    );
    if (dup) continue;
    movs.push({
      id: nextId++,
      codpro: cod,
      cantidad: m.cantidad,
      tipo: m.tipo ?? 'venta',
      device_id: m.device_id ?? null,
      created_at: m.created_at,
    });
  }
  db.movimientos = movs;

  return db;
}
