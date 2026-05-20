import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';

import {
  buildExcelRowMap,
  EXCEL_ALIASES_IMPORT,
  fuzzyMatchCosto,
  fuzzyMatchPvp,
  pickExcelColumn,
} from '@/lib/excel-columns';
import { normalizeCodpro, normalizeDespro } from '@/lib/codpro';
import { normalizeFamiliaImport } from '@/lib/familia-normalize';

export type FilaExcelProducto = {
  codpro: string;
  despro: string;
  um: string;
  stock: number | null;
  costo: number | null;
  pvpa: number | null;
  marca: string | null;
  familia: string | null;
};

function parseNumero(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export function filaDesdeExcelRow(row: Record<string, unknown>): FilaExcelProducto | null {
  const map = buildExcelRowMap(row);

  const codproRaw = pickExcelColumn(map, EXCEL_ALIASES_IMPORT.codigo);
  if (codproRaw == null || String(codproRaw).trim() === '') return null;

  const codpro = normalizeCodpro(String(codproRaw));
  const despro = normalizeDespro(
    String(pickExcelColumn(map, EXCEL_ALIASES_IMPORT.descripcion) ?? codpro)
  );
  const um =
    String(pickExcelColumn(map, EXCEL_ALIASES_IMPORT.unidad) ?? 'UND').trim() || 'UND';
  const stock = parseNumero(pickExcelColumn(map, EXCEL_ALIASES_IMPORT.stock));
  const costo = parseNumero(
    pickExcelColumn(map, EXCEL_ALIASES_IMPORT.costo, fuzzyMatchCosto)
  );
  const pvpa = parseNumero(pickExcelColumn(map, EXCEL_ALIASES_IMPORT.pvp, fuzzyMatchPvp));
  const marcaVal = pickExcelColumn(map, EXCEL_ALIASES_IMPORT.marca);
  const marca =
    marcaVal != null && String(marcaVal).trim() ? String(marcaVal).trim() : null;
  const familiaVal = pickExcelColumn(map, EXCEL_ALIASES_IMPORT.familia);
  const familia = normalizeFamiliaImport(
    familiaVal != null ? String(familiaVal) : null
  );

  return { codpro, despro, um, stock, costo, pvpa, marca, familia };
}

export async function leerFilasDesdeExcelUri(uri: string): Promise<FilaExcelProducto[]> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wb = XLSX.read(base64, { type: 'base64' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const out: FilaExcelProducto[] = [];
  for (const row of rows) {
    const fila = filaDesdeExcelRow(row);
    if (fila) out.push(fila);
  }
  return out;
}

export async function elegirArchivoExcel(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}
