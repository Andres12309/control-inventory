import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { eliminarProducto } from '@/lib/db/repository';
import type { ProductoConConteo } from '@/lib/types';

export function useEliminarProducto(onEliminado?: () => void) {
  const db = useSQLiteContext();

  const confirmarEliminar = useCallback(
    (producto: ProductoConConteo) => {
      Alert.alert(
        'Eliminar producto',
        `¿Eliminar «${producto.codpro}»?\n${producto.despro}\n\nTambién se borra su conteo de inventario.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await eliminarProducto(db, producto.codpro);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onEliminado?.();
              } catch (e) {
                Alert.alert(
                  'Error',
                  e instanceof Error ? e.message : 'No se pudo eliminar el producto'
                );
              }
            },
          },
        ]
      );
    },
    [db, onEliminado]
  );

  return { confirmarEliminar };
}
