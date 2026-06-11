/**
 * Diccionario de sinónimos y abreviaciones para búsqueda en almacén.
 * Ampliar aquí sin tocar el motor de búsqueda.
 */
export const QUERY_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  // Marcas
  chev: ['chevrolet'],
  chv: ['chevrolet'],
  'chev.': ['chevrolet'],
  chevy: ['chevrolet'],
  toyo: ['toyota'],
  toy: ['toyota'],
  hyun: ['hyundai'],
  mitsu: ['mitsubishi'],
  niss: ['nissan'],
  vw: ['volkswagen'],
  volks: ['volkswagen'],
  maz: ['mazda'],
  suzu: ['suzuki'],
  ren: ['renault'],
  ford: ['ford'],
  kia: ['kia'],
  honda: ['honda'],
  aveo: ['aveo'],
  spark: ['spark'],
  corsa: ['corsa'],

  // Repuestos frecuentes (fragmentos → palabra completa)
  filt: ['filtro'],
  filtr: ['filtro'],
  aceit: ['aceite'],
  lub: ['lubricante'],
  lubric: ['lubricante'],
  amort: ['amortiguador'],
  limpia: ['limpiaparabrisas'],
  limpi: ['limpiaparabrisas'],
  limpiap: ['limpiaparabrisas'],
  parabrisas: ['limpiaparabrisas'],
  past: ['pastilla'],
  pasti: ['pastilla'],
  fren: ['freno'],
  disco: ['disco'],
  bomb: ['bomba'],
  corr: ['correa'],
  tens: ['tensor'],
  rad: ['radiador'],
  term: ['termostato'],
  emp: ['empaque'],
  junt: ['junta'],
  ret: ['reten'],
  rod: ['rodamiento'],
  pol: ['polea'],
  buj: ['bujia'],

  // Ortografía / variantes
  bugia: ['bujia'],
  bujiaa: ['bujia'],
  vujia: ['bujia'],
  conv: ['convertible'],
  sint: ['sintetico'],
  min: ['mineral'],
};

/**
 * Alias que se indexan al importar cuando el producto contiene la palabra completa.
 */
export const BRAND_ABBREVIATIONS: Readonly<Record<string, readonly string[]>> = {
  chevrolet: ['chev', 'chv'],
  toyota: ['toyo', 'toy'],
  hyundai: ['hyun'],
  mitsubishi: ['mitsu'],
  nissan: ['niss'],
  kia: ['kia'],
};

/** Palabras compuestas → alias indexados automáticamente. */
export const WORD_ALIASES: Readonly<Record<string, readonly string[]>> = {
  filtro: ['filt', 'filtr'],
  lubricante: ['lub', 'lubric'],
  aceite: ['aceit'],
  amortiguador: ['amort'],
  limpiaparabrisas: ['limpia', 'limpi', 'limpiap', 'parabrisas'],
  pastilla: ['past', 'pasti'],
  freno: ['fren'],
  bujia: ['buj', 'bugia'],
  bomba: ['bomb'],
  correa: ['corr'],
  tensor: ['tens'],
  radiador: ['rad'],
  termostato: ['term'],
  empaque: ['emp'],
  junta: ['junt'],
  reten: ['ret'],
  rodamiento: ['rod'],
  polea: ['pol'],
  disco: ['disco'],
  ...BRAND_ABBREVIATIONS,
};

const synonymIndex = buildSynonymIndex();

function buildSynonymIndex(): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  const link = (from: string, to: string) => {
    const key = from.toLowerCase();
    const target = to.toLowerCase();
    if (!index.has(key)) index.set(key, new Set());
    index.get(key)!.add(target);
    if (!index.has(target)) index.set(target, new Set());
    index.get(target)!.add(key);
  };

  for (const [abbrev, targets] of Object.entries(QUERY_SYNONYMS)) {
    for (const target of targets) {
      link(abbrev, target);
    }
  }

  for (const [word, abbrevs] of Object.entries(WORD_ALIASES)) {
    for (const abbrev of abbrevs) {
      link(abbrev, word);
    }
  }

  return index;
}

/** Devuelve el token original + sinónimos/abreviaciones relacionados. */
export function expandQueryToken(token: string): string[] {
  const norm = token.toLowerCase();
  const out = new Set<string>([norm]);
  const related = synonymIndex.get(norm);
  if (related) {
    for (const r of related) out.add(r);
  }
  return [...out];
}

/** Tokens extra a indexar cuando un producto contiene `word`. */
export function aliasTokensForWord(word: string): string[] {
  const aliases = WORD_ALIASES[word.toLowerCase()];
  return aliases ? [...aliases] : [];
}

/** @deprecated Usar aliasTokensForWord */
export function abbreviationTokensForWord(word: string): string[] {
  return aliasTokensForWord(word);
}
