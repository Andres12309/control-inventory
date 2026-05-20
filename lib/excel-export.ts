import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { EXCEL_COLUMNAS_EXPORT, EXCEL_HEADERS_EXPORT } from '@/lib/excel-columns';
import { normalizeCodpro, normalizeDespro } from '@/lib/codpro';
import { stockParaExportExcel } from '@/lib/inventario-activo';
import type { ProductoConConteo } from '@/lib/types';

function formatFecha(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function productosToSheetRows(
  items: ProductoConConteo[]
): Record<string, string | number | null>[] {
  const C = EXCEL_COLUMNAS_EXPORT;
  return items.map((p) => ({
    [C.codigo]: normalizeCodpro(p.codpro),
    [C.descripcion]: normalizeDespro(p.despro),
    [C.unidad]: p.um,
    [C.stock]: stockParaExportExcel(p),
    [C.costo]: p.costo ?? '',
    [C.pvp]: p.pvpa ?? '',
    [C.marca]: p.marca ?? '',
    [C.familia]: p.familia_nombre ?? '',
  }));
}

export async function exportarInventarioExcel(
  items: ProductoConConteo[],
  nombreArchivo?: string
): Promise<string> {
  const rows = productosToSheetRows(items);
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...EXCEL_HEADERS_EXPORT] });

  ws['!cols'] = [
    { wch: 18 },
    { wch: 42 },
    { wch: 16 },
    { wch: 10 },
    { wch: 24 },
    { wch: 26 },
    { wch: 16 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = nombreArchivo ?? `inventario_${formatFecha()}.xlsx`;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar inventario',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }

  return uri;
}
