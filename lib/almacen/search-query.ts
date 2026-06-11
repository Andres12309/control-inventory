import { normalizeSearchText } from '@/lib/almacen/tokenize';

/** Palabras que el usuario o el micrófono suelen decir de más. */
const FILLER_WORDS = new Set([
  'a',
  'al',
  'busca',
  'buscar',
  'busco',
  'con',
  'dame',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'me',
  'necesito',
  'o',
  'para',
  'por',
  'producto',
  'quiero',
  'un',
  'una',
  'unos',
  'unas',
  'y',
]);

/** Frases habladas → consulta compacta. */
const PHRASE_REPLACEMENTS: readonly (readonly [RegExp, string])[] = [
  [/filtro\s+de\s+/gi, 'filtro '],
  [/pastilla[s]?\s+de\s+freno[s]?/gi, 'pastilla freno'],
  [/bujia[s]?\s+de\s+/gi, 'bujia '],
  [/aceite\s+de\s+motor/gi, 'aceite motor'],
  [/amortiguador(?:es)?\s+de/gi, 'amortiguador'],
  [/para\s+(chevrolet|toyota|nissan|kia|hyundai|mazda|ford|suzuki|renault|aveo|spark)/gi, '$1'],
];

/** Errores típicos de reconocimiento de voz en español (repuestos). */
const VOICE_CORRECTIONS: Readonly<Record<string, string>> = {
  vujia: 'bujia',
  vujía: 'bujia',
  bujías: 'bujia',
  bujias: 'bujia',
  bugias: 'bujia',
  chevy: 'chevrolet',
  chevi: 'chevrolet',
  toyoya: 'toyota',
  filtro: 'filtro',
  filtos: 'filtro',
  filtros: 'filtro',
  aceites: 'aceite',
  frenos: 'freno',
  pastillas: 'pastilla',
  amortiguadores: 'amortiguador',
  limpiaparabrisa: 'limpiaparabrisas',
  correa: 'correa',
  correas: 'correa',
  radiador: 'radiador',
  termostato: 'termostato',
  empaque: 'empaque',
  reten: 'reten',
  rodamiento: 'rodamiento',
  polea: 'polea',
  tensor: 'tensor',
  aveo: 'aveo',
  spark: 'spark',
  corsa: 'corsa',
};

const SPANISH_NUMBERS: Readonly<Record<string, string>> = {
  cero: '0',
  uno: '1',
  un: '1',
  una: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  diez: '10',
  once: '11',
  doce: '12',
  trece: '13',
  catorce: '14',
  quince: '15',
  dieciseis: '16',
  dieciséis: '16',
  diecisiete: '17',
  dieciocho: '18',
  diecinueve: '19',
  veinte: '20',
};

export type PreprocessOptions = {
  fromVoice?: boolean;
};

/**
 * Limpia y normaliza la consulta antes del motor de búsqueda.
 * Con `fromVoice: true` aplica correcciones de STT.
 */
export function preprocessSearchQuery(
  raw: string,
  options: PreprocessOptions = {},
): string {
  let text = raw.trim().toLowerCase();
  if (!text) return '';

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  if (options.fromVoice) {
    for (const [wrong, right] of Object.entries(VOICE_CORRECTIONS)) {
      text = text.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
    }
  }

  const words = text.split(/\s+/).filter(Boolean);
  const converted = words.map((w) => {
    const bare = w.replace(/[.,;:!?]/g, '');
    return SPANISH_NUMBERS[bare] ?? bare;
  });

  const norm = normalizeSearchText(converted.join(' '));
  const tokens = norm.split(' ').filter((t) => t.length > 0 && !FILLER_WORDS.has(t));

  return tokens.join(' ');
}

/** Sugerencias rápidas en el mostrador. */
export const QUICK_SEARCH_SUGGESTIONS = [
  'bujia',
  'filtro aceite',
  'pastilla freno',
  'amortiguador',
  'correa',
  'filtro chevrolet',
  'aceite 20w50',
  'limpiaparabrisas',
] as const;
