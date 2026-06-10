import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';

import {
  buildErpRowMap,
  ERP_ALIASES,
  pickErpColumn,
} from '@/lib/almacen/excel-erp-columns';
import type { FilaExcelErp } from '@/lib/almacen/types';
import { normalizeCodpro, normalizeDespro } from '@/lib/codpro';

function parseNumero(val: unknown): number {
  if (val == null || val === '') return 0;
  const n =
    typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

function parseTexto(val: unknown): string | null {
  if (val == null || String(val).trim() === '') return null;
  return String(val).trim();
}

function parseActivo(val: unknown): boolean {
  if (val == null || val === '') return true;
  const s = String(val).trim().toLowerCase();
  return s === 'si' || s === 'sí' || s === '1' || s === 'true' || s === 'activo';
}

export function filaDesdeErpRow(row: Record<string, unknown>): FilaExcelErp | null {
  const map = buildErpRowMap(row);
  const codigoRaw = pickErpColumn(map, ERP_ALIASES.codigo);
  if (codigoRaw == null || String(codigoRaw).trim() === '') return null;

  const codigo = normalizeCodpro(String(codigoRaw));
  const descripcion = normalizeDespro(
    String(pickErpColumn(map, ERP_ALIASES.descripcion) ?? codigo)
  );

  return {
    codigo,
    descripcion,
    um: String(pickErpColumn(map, ERP_ALIASES.um) ?? 'UND').trim() || 'UND',
    grupo_tipo: parseTexto(pickErpColumn(map, ERP_ALIASES.grupoTipo)),
    familia: parseTexto(pickErpColumn(map, ERP_ALIASES.familia)),
    marca: parseTexto(pickErpColumn(map, ERP_ALIASES.marca)),
    linea: parseTexto(pickErpColumn(map, ERP_ALIASES.linea)),
    impuesto: parseTexto(pickErpColumn(map, ERP_ALIASES.impuesto)),
    stock_real: parseNumero(pickErpColumn(map, ERP_ALIASES.stockReal)),
    stock_disp: parseNumero(pickErpColumn(map, ERP_ALIASES.stockDisp)),
    stock_minimo: parseNumero(pickErpColumn(map, ERP_ALIASES.stockMinimo)),
    stock_maximo: parseNumero(pickErpColumn(map, ERP_ALIASES.stockMaximo)),
    cod_barra: parseTexto(pickErpColumn(map, ERP_ALIASES.codBarra)),
    activo: parseActivo(pickErpColumn(map, ERP_ALIASES.activo)),
    ubicacion: parseTexto(pickErpColumn(map, ERP_ALIASES.ubicacion)),
  };
}

export async function leerFilasDesdeErpUri(uri: string): Promise<FilaExcelErp[]> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wb = XLSX.read(base64, { type: 'base64' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const out: FilaExcelErp[] = [];
  for (const row of rows) {
    const fila = filaDesdeErpRow(row);
    if (fila) out.push(fila);
  }
  return out;
}

export async function elegirArchivoErp(): Promise<string | null> {
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
