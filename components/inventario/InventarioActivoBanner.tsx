import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import type { ResumenVentasInventario } from '@/lib/inventario-activo';

type Props = {
  activo: boolean;
  resumenVentas: ResumenVentasInventario;
};

export function InventarioActivoBanner({ activo, resumenVentas }: Props) {
  const router = useRouter();

  if (!activo) {
    return (
      <Pressable
        style={styles.inactivo}
        onPress={() => router.push('/inventario-en-curso')}>
        <Text style={styles.inactivoTitle}>¿Inventario sin cerrar la tienda?</Text>
        <Text style={styles.inactivoSub}>Toca para activar y registrar ventas durante el conteo</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.activo}>
      <View style={styles.activoTop}>
        <View style={styles.dot} />
        <Text style={styles.activoTitle}>Inventario en curso — tienda abierta</Text>
      </View>
      <Text style={styles.activoSub}>
        {resumenVentas.movimientos} venta{resumenVentas.movimientos === 1 ? '' : 's'} ·{' '}
        {resumenVentas.unidades} unidad{resumenVentas.unidades === 1 ? '' : 'es'} ·{' '}
        {resumenVentas.productos} producto{resumenVentas.productos === 1 ? '' : 's'}
      </Text>
      <Pressable style={styles.ventaBtn} onPress={() => router.push('/venta-rapida')}>
        <Text style={styles.ventaBtnText}>− Registrar venta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inactivo: {
    backgroundColor: InventarioColors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: InventarioColors.primaryMuted,
  },
  inactivoTitle: { color: InventarioColors.primary, fontWeight: '700', fontSize: 14 },
  inactivoSub: { color: InventarioColors.textMuted, fontSize: 12, marginTop: 4 },
  activo: {
    backgroundColor: InventarioColors.jornadaBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: InventarioColors.jornadaBorder,
  },
  activoTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: InventarioColors.jornadaDot,
  },
  activoTitle: { color: InventarioColors.jornadaText, fontWeight: '800', fontSize: 14, flex: 1 },
  activoSub: { color: InventarioColors.textMuted, fontSize: 12, marginTop: 6, marginBottom: 10 },
  ventaBtn: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ventaBtnText: { color: InventarioColors.textOnAccent, fontWeight: '800', fontSize: 15 },
});
