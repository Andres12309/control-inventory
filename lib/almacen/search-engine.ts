import type { SQLiteDatabase } from "expo-sqlite";

import {
  getPopularidadMap,
  popularidadBoost,
} from "@/lib/almacen/search-analytics";
import {
  expandQueryTokens,
  isNumberToken,
  levenshtein,
  matchToken,
  maxEditDistance,
  normalizeSearchText,
  numbersFromTexto,
  tokenizeQuery,
  wordsFromTextoBusqueda,
} from "@/lib/almacen/tokenize";
import type {
  BusquedaAlmacenOptions,
  FiltroAlmacenRapido,
  ProductoAlmacen,
} from "@/lib/almacen/types";

const CANDIDATE_POOL = 400;
const FUZZY_TOKEN_SCAN = 2500;
const IN_CHUNK_SIZE = 50;

type ScoredCodigo = { codigo: string; score: number };

/** LIMIT como literal: en Android, bind en LIMIT puede corromper el statement nativo. */
function sqlLimit(n: number): number {
  return Math.max(1, Math.min(Math.floor(n), 5000));
}

function sqlFiltroRapido(filtro: FiltroAlmacenRapido): string {
  if (filtro === "sin_stock") return " AND p.stock_real <= 0";
  if (filtro === "stock_bajo") {
    return " AND p.stock_real > 0 AND (p.stock_minimo > 0 AND p.stock_real <= p.stock_minimo OR (p.stock_minimo <= 0 AND p.stock_real <= 2))";
  }
  if (filtro === "favoritos") return " AND f.codigo IS NOT NULL";
  return "";
}

async function codigosPorTokenExacto(
  db: SQLiteDatabase,
  forms: string[],
  limit: number,
): Promise<Set<string>> {
  const out = new Set<string>();
  for (const form of forms) {
    const rows = await db.getAllAsync<{ codigo: string }>(
      `SELECT DISTINCT codigo FROM almacen_tokens WHERE token = ? LIMIT ${sqlLimit(limit)}`,
      form,
    );
    for (const r of rows) out.add(r.codigo);
  }
  return out;
}

async function codigosPorPrefijo(
  db: SQLiteDatabase,
  token: string,
  limit: number,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (token.length < 2) return out;

  const prefijo = await db.getAllAsync<{ codigo: string }>(
    `SELECT DISTINCT codigo FROM almacen_tokens WHERE token LIKE ? LIMIT ${sqlLimit(limit)}`,
    `${token}%`,
  );
  for (const r of prefijo) out.add(r.codigo);

  const abreviatura = await db.getAllAsync<{ codigo: string }>(
    `SELECT DISTINCT codigo FROM almacen_tokens
     WHERE length(token) >= 3 AND ? LIKE token || '%' LIMIT ${sqlLimit(limit)}`,
    token,
  );
  for (const r of abreviatura) out.add(r.codigo);

  return out;
}

async function codigosPorFuzzy(
  db: SQLiteDatabase,
  token: string,
  limit: number,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (token.length < 3) return out;

  const prefix2 = token.slice(0, 2);
  const rows = await db.getAllAsync<{ token: string; codigo: string }>(
    `SELECT DISTINCT token, codigo FROM almacen_tokens WHERE token LIKE ? LIMIT ${sqlLimit(FUZZY_TOKEN_SCAN)}`,
    `${prefix2}%`,
  );

  const maxDist = maxEditDistance(token);
  for (const row of rows) {
    if (levenshtein(row.token, token) <= maxDist) {
      out.add(row.codigo);
      if (out.size >= limit) break;
    }
  }
  return out;
}

async function resolverCodigosPorToken(
  db: SQLiteDatabase,
  token: string,
  forms: string[],
  limit: number,
): Promise<Set<string>> {
  const merged = new Set<string>();

  const exact = await codigosPorTokenExacto(db, forms, limit);
  for (const c of exact) merged.add(c);

  const prefix = await codigosPorPrefijo(db, token, limit);
  for (const c of prefix) merged.add(c);

  for (const form of forms) {
    if (form !== token) {
      const p = await codigosPorPrefijo(db, form, limit);
      for (const c of p) merged.add(c);
    }
  }

  if (merged.size < 80) {
    const fuzzy = await codigosPorFuzzy(db, token, limit);
    for (const c of fuzzy) merged.add(c);
    for (const form of forms) {
      if (form !== token) {
        const fz = await codigosPorFuzzy(db, form, limit);
        for (const c of fz) merged.add(c);
      }
    }
  }

  return merged;
}

function intersectSets(sets: Set<string>[]): Set<string> {
  if (sets.length === 0) return new Set();
  let result = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const next = new Set<string>();
    for (const codigo of result) {
      if (sets[i].has(codigo)) next.add(codigo);
    }
    result = next;
    if (result.size === 0) break;
  }
  return result;
}

function scoreProducto(
  producto: ProductoAlmacen,
  queryNorm: string,
  tokens: string[],
  expanded: string[][],
): number {
  const words = wordsFromTextoBusqueda(producto.texto_busqueda);
  const wordSet = new Set(words);
  let score = 0;

  const codigoUpper = producto.codigo.toUpperCase();
  const queryUpper = queryNorm.toUpperCase();
  const descNorm = normalizeSearchText(producto.descripcion);
  const buscaPorCodigo = queryPareceCodigoErp(queryNorm);

  if (buscaPorCodigo) {
    if (codigoUpper === queryUpper) score += 2000;
    else if (codigoUpper.startsWith(queryUpper) && queryUpper.length >= 3)
      score += 1200;
    else if (codigoUpper.includes(queryUpper) && queryUpper.length >= 4)
      score += 600;
    if (
      producto.cod_barra &&
      producto.cod_barra.toUpperCase().includes(queryUpper)
    ) {
      score += 500;
    }
  }

  if (tokens.every((t) => descNorm.includes(t))) score += 100;
  if (descNorm.includes(queryNorm) && queryNorm.length >= 4) score += 60;

  let matchedGroups = 0;
  for (let i = 0; i < tokens.length; i++) {
    const queryToken = tokens[i];
    const forms = expanded[i];
    let bestGroup = 0;

    for (const form of forms) {
      for (const word of words) {
        const m = matchToken(word, form);
        if (!m) continue;
        let pts = 0;
        if (m.kind === "exact") pts = 120;
        else if (m.kind === "prefix") pts = 80;
        else if (m.kind === "contains") pts = 60;
        else pts = 40 - m.distance * 12;
        if (word === form) pts += 30;
        if (pts > bestGroup) bestGroup = pts;
      }
      if (wordSet.has(form)) bestGroup = Math.max(bestGroup, 150);
    }

    if (bestGroup > 0) {
      matchedGroups++;
      score += bestGroup;
    }
  }

  score += scoreNumberTokens(tokens, words, producto.texto_busqueda);

  if (matchedGroups < tokens.length) {
    return 0;
  }

  if (
    tokens.length > 1 &&
    tokensAppearInOrder(producto.texto_busqueda, tokens)
  ) {
    score += 90;
  }

  if (queryNorm.length >= 4 && producto.texto_busqueda.includes(queryNorm)) {
    score += 70;
  }

  const descLen = producto.descripcion.length;
  if (descLen < 40 && matchedGroups === tokens.length) score += 35;
  if (descLen < 25 && matchedGroups === tokens.length) score += 25;

  if (
    producto.marca &&
    tokens.some((t) => matchToken(normalizeSearchText(producto.marca!), t))
  ) {
    score += 25;
  }

  return score;
}

/** Consulta orientada a código ERP (sin espacios, alfanumérica). */
function queryPareceCodigoErp(queryNorm: string): boolean {
  const t = queryNorm.trim();
  return t.length >= 3 && !t.includes(" ") && /^[a-z0-9.-]+$/i.test(t);
}

/** Prioridad fuerte para números en consultas de repuestos (bujia 4 / 8 / 12). */
function scoreNumberTokens(
  queryTokens: string[],
  productWords: string[],
  textoBusqueda: string,
): number {
  const numberQueries = queryTokens.filter(isNumberToken);
  if (numberQueries.length === 0) return 0;

  const productNumbers = numbersFromTexto(textoBusqueda);
  let delta = 0;

  for (const num of numberQueries) {
    if (productNumbers.includes(num)) {
      delta += 280;
      if (productWords.includes(num)) delta += 40;
    } else if (productNumbers.length === 0) {
      delta -= 120;
    } else {
      delta -= 200;
    }
  }

  return delta;
}

function tokensAppearInOrder(texto: string, tokens: string[]): boolean {
  let pos = 0;
  for (const token of tokens) {
    const idx = texto.indexOf(token, pos);
    if (idx < 0) return false;
    pos = idx + token.length;
  }
  return true;
}

async function buscarPorCodigoDirecto(
  db: SQLiteDatabase,
  query: string,
  limit: number,
): Promise<string[]> {
  const codigoDirecto = query.trim().toUpperCase();
  if (codigoDirecto.length < 2) return [];

  const rows = await db.getAllAsync<{ codigo: string }>(
    `SELECT codigo FROM almacen_productos
     WHERE codigo LIKE ? OR cod_barra LIKE ?
     ORDER BY CASE WHEN codigo = ? THEN 0 WHEN codigo LIKE ? THEN 1 ELSE 2 END
     LIMIT ${sqlLimit(limit)}`,
    `%${codigoDirecto}%`,
    `%${codigoDirecto}%`,
    codigoDirecto,
    `${codigoDirecto}%`,
  );
  return rows.map((r) => r.codigo);
}

export async function resolverCodigosInteligente(
  db: SQLiteDatabase,
  query: string,
  limit: number,
): Promise<ScoredCodigo[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normQuery = normalizeSearchText(trimmed);
  const tokens = tokenizeQuery(trimmed);
  if (tokens.length === 0) return [];

  const codigoHits = await buscarPorCodigoDirecto(db, trimmed, limit);

  if (queryPareceCodigoErp(normQuery)) {
    const exactCodigo = await db.getFirstAsync<{ codigo: string }>(
      "SELECT codigo FROM almacen_productos WHERE codigo = ? OR cod_barra = ?",
      trimmed.toUpperCase(),
      trimmed.toUpperCase(),
    );
    if (exactCodigo) {
      return [{ codigo: exactCodigo.codigo, score: 5000 }];
    }
  }

  const expanded = expandQueryTokens(tokens);
  const sets: Set<string>[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const set = await resolverCodigosPorToken(
      db,
      tokens[i],
      expanded[i],
      CANDIDATE_POOL,
    );
    sets.push(set);
  }

  let codigos = [...intersectSets(sets)];

  if (codigos.length === 0) {
    const fallback = await db.getAllAsync<{
      codigo: string;
      texto_busqueda: string;
    }>(
      `SELECT codigo, texto_busqueda FROM almacen_productos
       WHERE texto_busqueda LIKE ? LIMIT ${sqlLimit(CANDIDATE_POOL)}`,
      `%${normQuery.replace(/ /g, "%")}%`,
    );
    codigos = fallback
      .filter((row) => tokens.every((t) => row.texto_busqueda.includes(t)))
      .map((r) => r.codigo);
  }

  if (codigos.length === 0) return [];

  const rows = await queryProductosInCodigos(
    db,
    codigos,
    (ph) =>
      `SELECT codigo, descripcion, um, grupo_tipo, familia, marca, linea, impuesto,
              stock_real, stock_disp, stock_minimo, stock_maximo, cod_barra, activo, ubicacion, texto_busqueda
       FROM almacen_productos WHERE codigo IN (${ph})`,
    [],
  );

  const productos = rows.map((row) => ({
    codigo: String(row.codigo),
    descripcion: String(row.descripcion),
    um: String(row.um ?? "UND"),
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
    texto_busqueda: String(row.texto_busqueda ?? ""),
  })) satisfies ProductoAlmacen[];

  const popularidad = await getPopularidadMap(
    db,
    productos.map((p) => p.codigo),
  );

  const scored = productos
    .map((p) => {
      let score = scoreProducto(p, normQuery, tokens, expanded);
      const consultas = popularidad.get(p.codigo) ?? 0;
      score += popularidadBoost(consultas);
      return { codigo: p.codigo, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const codigoBonus = new Map(codigoHits.map((c, i) => [c, 2500 - i * 10]));
  for (const s of scored) {
    const bonus = codigoBonus.get(s.codigo);
    if (bonus) s.score += bonus;
  }

  return scored.slice(0, limit);
}

export async function buscarProductosInteligente(
  db: SQLiteDatabase,
  options: BusquedaAlmacenOptions,
): Promise<ProductoAlmacen[]> {
  const limit = options.limit ?? 80;
  const filtro = options.filtro ?? "todos";
  const query = options.query.trim();
  const joinFav =
    filtro === "favoritos"
      ? " INNER JOIN almacen_favoritos f ON f.codigo = p.codigo"
      : " LEFT JOIN almacen_favoritos f ON f.codigo = p.codigo";
  const params: (string | number)[] = [];
  let where = " WHERE 1=1";

  if (options.familia) {
    where += " AND p.familia = ?";
    params.push(options.familia);
  }
  if (options.marca) {
    where += " AND p.marca = ?";
    params.push(options.marca);
  }
  where += sqlFiltroRapido(filtro);

  if (!query) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT p.codigo, p.descripcion, p.um, p.grupo_tipo, p.familia, p.marca, p.linea, p.impuesto,
              p.stock_real, p.stock_disp, p.stock_minimo, p.stock_maximo, p.cod_barra, p.activo, p.ubicacion, p.texto_busqueda
       FROM almacen_productos p${joinFav}${where}
       ORDER BY p.descripcion LIMIT ${sqlLimit(limit)}`,
      ...params,
    );
    return rows.map(mapRow);
  }

  const ranked = await resolverCodigosInteligente(db, query, limit * 4);
  if (ranked.length === 0) return [];

  const codigos = ranked.map((r) => r.codigo);
  const order = new Map(codigos.map((c, i) => [c, i]));

  const rows = await queryProductosInCodigos(
    db,
    codigos,
    (ph) =>
      `SELECT p.codigo, p.descripcion, p.um, p.grupo_tipo, p.familia, p.marca, p.linea, p.impuesto,
              p.stock_real, p.stock_disp, p.stock_minimo, p.stock_maximo, p.cod_barra, p.activo, p.ubicacion, p.texto_busqueda
       FROM almacen_productos p${joinFav}${where} AND p.codigo IN (${ph})`,
    params,
  );

  return rows
    .map(mapRow)
    .sort(
      (a, b) => (order.get(a.codigo) ?? 9999) - (order.get(b.codigo) ?? 9999),
    )
    .slice(0, limit);
}

async function queryProductosInCodigos(
  db: SQLiteDatabase,
  codigos: string[],
  buildSql: (placeholders: string) => string,
  baseParams: (string | number)[],
): Promise<Record<string, unknown>[]> {
  if (codigos.length === 0) return [];

  const allRows: Record<string, unknown>[] = [];
  for (let i = 0; i < codigos.length; i += IN_CHUNK_SIZE) {
    const chunk = codigos.slice(i, i + IN_CHUNK_SIZE);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = await db.getAllAsync<Record<string, unknown>>(
      buildSql(placeholders),
      ...baseParams,
      ...chunk,
    );
    allRows.push(...rows);
  }
  return allRows;
}

function mapRow(row: Record<string, unknown>): ProductoAlmacen {
  return {
    codigo: String(row.codigo),
    descripcion: String(row.descripcion),
    um: String(row.um ?? "UND"),
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
    texto_busqueda: String(row.texto_busqueda ?? ""),
  };
}
