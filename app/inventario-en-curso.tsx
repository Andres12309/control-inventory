import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ModalScaffold } from '@/components/inventario/ModalScaffold';
import { InventarioColors } from '@/constants/inventario-theme';
import { useInventarioActivo } from '@/hooks/use-inventario-activo';
import { listMovimientosRecientes } from '@/lib/db/movimientos-inventario';
import type { MovimientoInventario } from '@/lib/inventario-activo';

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function InventarioEnCursoScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activo, inicioAt, resumenVentas, loading, iniciar, cerrar, refrescar } =
    useInventarioActivo();
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);

  const cargar = useCallback(async () => {
    setMovimientos(await listMovimientosRecientes(db, 50));
    await refrescar();
  }, [db, refrescar]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const onIniciar = async () => {
    await iniciar();
    await cargar();
    Alert.alert(
      'Inventario activado',
      'Puedes seguir vendiendo. Cada venta regístrala con «Registrar venta». Los conteos tendrán en cuenta las salidas.'
    );
  };

  const onCerrar = () => {
    Alert.alert(
      'Cerrar jornada de inventario',
      'Las ventas registradas se conservan en el historial. ¿Finalizar la jornada en curso?',
      [
        { text: 'Seguir inventariando', style: 'cancel' },
        {
          text: 'Cerrar jornada',
          style: 'destructive',
          onPress: async () => {
            await cerrar();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ModalScaffold title="Inventario en curso">
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={InventarioColors.accent} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={[styles.estado, activo ? styles.estadoOn : styles.estadoOff]}>
              <Text style={styles.estadoTitle}>
                {activo ? 'Activo — tienda puede vender' : 'No activo'}
              </Text>
              {activo && inicioAt ? (
                <Text style={styles.estadoSub}>Desde {formatFecha(inicioAt)}</Text>
              ) : (
                <Text style={styles.estadoSub}>
                  Actívalo al empezar el conteo para registrar ventas sin cerrar.
                </Text>
              )}
            </View>

            {activo ? (
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{resumenVentas.movimientos}</Text>
                  <Text style={styles.statLbl}>ventas</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{resumenVentas.unidades}</Text>
                  <Text style={styles.statLbl}>unidades</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{resumenVentas.productos}</Text>
                  <Text style={styles.statLbl}>productos</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.comoTitle}>Cómo funciona</Text>
            <Text style={styles.comoItem}>1. Activa el inventario en curso al empezar el día.</Text>
            <Text style={styles.comoItem}>
              2. Quien atiende registra cada venta con código y cantidad.
            </Text>
            <Text style={styles.comoItem}>
              3. Quien cuenta ve «vendidos» y el stock ajustado (conteo − ventas).
            </Text>
            <Text style={styles.comoItem}>
              4. Sincroniza entre teléfonos para que todos vean las mismas ventas.
            </Text>

            {activo ? (
              <>
                <Pressable style={styles.primary} onPress={() => router.push('/venta-rapida')}>
                  <Text style={styles.primaryText}>− Registrar venta</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={onCerrar}>
                  <Text style={styles.secondaryText}>Cerrar jornada de inventario</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.primary} onPress={onIniciar}>
                <Text style={styles.primaryText}>Activar inventario en curso</Text>
              </Pressable>
            )}

            {activo ? (
              <>
                <Text style={styles.listTitle}>Movimientos de esta jornada</Text>
                <FlatList
                  data={movimientos}
                  keyExtractor={(m) => String(m.id)}
                  onRefresh={cargar}
                  refreshing={loading}
                  renderItem={({ item }) => (
                    <View style={styles.fila}>
                      <View style={styles.filaRow}>
                        <Text style={styles.filaCod}>{item.codpro}</Text>
                        <Text style={styles.filaQty}>−{item.cantidad}</Text>
                      </View>
                      {item.despro ? (
                        <Text style={styles.filaDes} numberOfLines={1}>
                          {item.despro}
                        </Text>
                      ) : null}
                      <Text style={styles.filaFecha}>{formatFecha(item.created_at)}</Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.empty}>Sin ventas registradas aún.</Text>
                  }
                />
              </>
            ) : null}
          </>
        )}
      </View>
    </ModalScaffold>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 16 },
  estado: { borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1 },
  estadoOn: { backgroundColor: '#1B2E1B', borderColor: '#40916C' },
  estadoOff: { backgroundColor: InventarioColors.surface, borderColor: InventarioColors.border },
  estadoTitle: { color: InventarioColors.text, fontWeight: '800', fontSize: 16 },
  estadoSub: { color: InventarioColors.textMuted, marginTop: 6, fontSize: 13 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  statNum: { color: InventarioColors.accent, fontWeight: '800', fontSize: 22 },
  statLbl: { color: InventarioColors.textMuted, fontSize: 11, marginTop: 2 },
  comoTitle: { color: InventarioColors.text, fontWeight: '700', marginBottom: 8 },
  comoItem: { color: InventarioColors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  primary: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: { color: '#111', fontWeight: '800', fontSize: 16 },
  secondary: {
    marginTop: 10,
    padding: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  secondaryText: { color: InventarioColors.textMuted, fontWeight: '600' },
  listTitle: {
    color: InventarioColors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  fila: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  filaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  filaCod: { color: InventarioColors.accent, fontWeight: '800' },
  filaQty: { color: '#F87171', fontWeight: '800', fontSize: 16 },
  filaDes: { color: InventarioColors.text, marginTop: 4, fontSize: 13 },
  filaFecha: { color: InventarioColors.textMuted, fontSize: 11, marginTop: 6 },
  empty: { color: InventarioColors.textMuted, textAlign: 'center', marginTop: 16 },
});
