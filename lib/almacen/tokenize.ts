import { aliasTokensForWord, expandQueryToken } from '@/lib/almacen/search-synonyms';

/** Normaliza texto: minúsculas, sin acentos, solo letras/números, espacios simples. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokens normalizados en MAYÚSCULAS (para depuración / logs). */
export function normalizeSearchTextUpper(text: string): string {
  return normalizeSearchText(text).toUpperCase();
}

/** Extrae tokens de búsqueda (palabras y números). */
export function tokenizeQuery(query: string): string[] {
  const norm = normalizeSearchText(query);
  if (!norm) return [];
  return norm.split(' ').filter((t) => t.length >= 1);
}

/** Expande cada token de la consulta con sinónimos configurados. */
export function expandQueryTokens(tokens: string[]): string[][] {
  return tokens.map((t) => expandQueryToken(t));
}

/** Tokens indexables de un producto (código, descripción, marca, familia, línea). */
export function tokensFromProducto(fields: {
  codigo: string;
  descripcion: string;
  marca: string | null;
  familia: string | null;
  linea: string | null;
}): string[] {
  const raw = [
    fields.codigo,
    fields.descripcion,
    fields.marca ?? '',
    fields.familia ?? '',
    fields.linea ?? '',
  ].join(' ');
  const norm = normalizeSearchText(raw);
  const set = new Set<string>();

  for (const part of norm.split(' ')) {
    if (!part) continue;
    set.add(part);
    for (const alias of aliasTokensForWord(part)) {
      set.add(alias);
    }
    for (const prefix of fragmentPrefixesForWord(part)) {
      set.add(prefix);
    }
  }

  return [...set];
}

export function buildTextoBusqueda(fields: {
  codigo: string;
  descripcion: string;
  marca: string | null;
  familia: string | null;
  linea: string | null;
}): string {
  return normalizeSearchText(
    [fields.codigo, fields.descripcion, fields.marca, fields.familia, fields.linea]
      .filter(Boolean)
      .join(' ')
  );
}

export function maxEditDistance(token: string): number {
  if (token.length <= 2) return 0;
  if (token.length <= 4) return 1;
  if (token.length <= 6) return 1;
  return 2;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j]
          : Math.min(row[j] + 1, row[j - 1] + 1, prev + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

export type TokenMatchKind = 'exact' | 'prefix' | 'contains' | 'fuzzy';

/** Compara un token de producto con un token de consulta (o sinónimo). */
export function matchToken(
  productToken: string,
  queryToken: string
): { kind: TokenMatchKind; distance: number } | null {
  if (productToken === queryToken) return { kind: 'exact', distance: 0 };
  if (productToken.startsWith(queryToken) && queryToken.length >= 2) {
    return { kind: 'prefix', distance: 0 };
  }
  if (queryToken.startsWith(productToken) && productToken.length >= 3) {
    return { kind: 'prefix', distance: 0 };
  }
  if (queryToken.length >= 3 && productToken.includes(queryToken)) {
    return { kind: 'contains', distance: 0 };
  }
  const dist = levenshtein(productToken, queryToken);
  if (dist <= maxEditDistance(queryToken)) {
    return { kind: 'fuzzy', distance: dist };
  }
  return null;
}

/** Palabras del texto indexado del producto. */
export function wordsFromTextoBusqueda(texto: string): string[] {
  return texto.split(' ').filter(Boolean);
}

/** Prefijos indexados para búsqueda por fragmento (filt → filtro, limpi → limpiaparabrisas). */
export function fragmentPrefixesForWord(word: string): string[] {
  if (word.length < 4) return [];
  const out = new Set<string>();
  const maxLen = Math.min(7, word.length - 1);
  for (let len = 4; len <= maxLen; len++) {
    out.add(word.slice(0, len));
  }
  return [...out];
}

/** Números presentes como tokens en el texto indexado. */
export function numbersFromTexto(texto: string): string[] {
  return wordsFromTextoBusqueda(texto).filter((w) => /^\d+$/.test(w));
}

export function isNumberToken(token: string): boolean {
  return /^\d+$/.test(token);
}
