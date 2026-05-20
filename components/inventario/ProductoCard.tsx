import { Pressable, StyleSheet, Text, View } from 'react-native';

import { stockRealEnTienda } from '@/lib/inventario-activo';
import type { ProductoConConteo } from '@/lib/types';

type Props = {
  producto: ProductoConConteo;
  onPress: () => void;
  onLongPress?: () => void;
};

export function ProductoCard({ producto, onPress, onLongPress }: Props) {
  const contado = producto.stock_contado != null;
  const ventas =
    producto.stock_contado != null
      ? (producto.ventas_desde_conteo ?? 0)
      : (producto.ventas_durante ?? 0);
  const ajustado = stockRealEnTienda(producto);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}>
      <View style={styles.row}>
        <Text style={styles.codpro}>{producto.codpro}</Text>
        <View style={styles.badges}>
          {ventas > 0 ? (
            <View style={styles.badgeVenta}>
              <Text style={styles.badgeVentaText}>−{ventas}</Text>
            </View>
          ) : null}
          <View style={[styles.badge, contado ? styles.badgeOk : styles.badgePending]}>
            <Text style={styles.badgeText}>
              {ajustado != null ? String(ajustado) : contado ? String(producto.stock_contado) : '—'}
            </Text>
          </View>
        </View>
      </View>
      {ventas > 0 && ajustado != null ? (
        <Text style={styles.ajusteHint}>
          {contado
            ? `Contado ${producto.stock_contado} − vendidos ${ventas} = stock real ${ajustado}`
            : `Sistema ${producto.stock_sistema} − vendidos ${ventas} = stock real ${ajustado}`}
        </Text>
      ) : null}
      <Text style={styles.despro} numberOfLines={2}>
        {producto.despro}
      </Text>
      <View style={styles.meta}>
        {producto.familia_nombre ? (
          <Text style={styles.chip}>{producto.familia_nombre}</Text>
        ) : null}
        {producto.marca ? <Text style={styles.marca}>{producto.marca}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeVenta: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#4A1515',
  },
  badgeVentaText: { color: '#F87171', fontWeight: '800', fontSize: 14 },
  ajusteHint: { color: '#F87171', fontSize: 11, marginTop: 6 },
  codpro: { color: '#E85D04', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  badge: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeOk: { backgroundColor: '#1B4332' },
  badgePending: { backgroundColor: '#3D2C00' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  despro: { color: '#F0F0F0', fontSize: 15, marginTop: 6 },
  meta: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    color: '#ADB5BD',
    fontSize: 12,
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  marca: { color: '#868E96', fontSize: 12 },
});
