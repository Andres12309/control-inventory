import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import {
  cerrarInventarioActivo,
  getInventarioInicioAt,
  getResumenVentasInventario,
  iniciarInventarioActivo,
  isInventarioActivo,
} from '@/lib/db/movimientos-inventario';
import type { ResumenVentasInventario } from '@/lib/inventario-activo';

export function useInventarioActivo() {
  const db = useSQLiteContext();
  const [activo, setActivo] = useState(false);
  const [inicioAt, setInicioAt] = useState<string | null>(null);
  const [resumenVentas, setResumenVentas] = useState<ResumenVentasInventario>({
    movimientos: 0,
    unidades: 0,
    productos: 0,
  });
  const [loading, setLoading] = useState(true);

  const refrescar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, inicio, resumen] = await Promise.all([
        isInventarioActivo(db),
        getInventarioInicioAt(db),
        getResumenVentasInventario(db),
      ]);
      setActivo(a);
      setInicioAt(inicio);
      setResumenVentas(resumen);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refrescar();
    }, [refrescar])
  );

  const iniciar = useCallback(async () => {
    await iniciarInventarioActivo(db);
    await refrescar();
  }, [db, refrescar]);

  const cerrar = useCallback(async () => {
    await cerrarInventarioActivo(db);
    await refrescar();
  }, [db, refrescar]);

  return {
    activo,
    inicioAt,
    resumenVentas,
    loading,
    refrescar,
    iniciar,
    cerrar,
  };
}
