import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import { stockRealEnTienda } from '@/lib/inventario-activo';
import type { ProductoConConteo } from '@/lib/types';

type Props = {
  producto: ProductoConConteo;
  onPress: () => void;
  onLongPress?: () => void;
  compact?: boolean;
};

export function ProductoCard({ producto, onPress, onLongPress, compact }: Props) {
  const contado = producto.stock_contado != null;
  const ventas =
    producto.stock_contado != null
      ? (producto.ventas_desde_conteo ?? 0)
      : (producto.ventas_durante ?? 0);
  const ajustado = stockRealEnTienda(producto);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}>
      <View style={styles.row}>
        <Text style={[styles.codpro, compact && styles.codproCompact]}>{producto.codpro}</Text>
        <View style={styles.badges}>
          {ventas > 0 ? (
            <View style={[styles.badgeVenta, compact && styles.badgeVentaCompact]}>
              <Text style={[styles.badgeVentaText, compact && styles.badgeTextCompact]}>
                −{ventas}
              </Text>
            </View>
          ) : null}
          <View style={[styles.badge, contado ? styles.badgeOk : styles.badgePending, compact && styles.badgeCompact]}>
            <Text
              style={[
                contado ? styles.badgeText : styles.badgeTextPending,
                compact && styles.badgeTextCompact,
              ]}>
              {ajustado != null ? String(ajustado) : contado ? String(producto.stock_contado) : '—'}
            </Text>
          </View>
        </View>
      </View>
      {!compact && ventas > 0 && ajustado != null ? (
        <Text style={styles.ajusteHint}>
          {contado
            ? `Contado ${producto.stock_contado} − vendidos ${ventas} = stock real ${ajustado}`
            : `Sistema ${producto.stock_sistema} − vendidos ${ventas} = stock real ${ajustado}`}
        </Text>
      ) : null}
      <Text style={[styles.despro, compact && styles.desproCompact]} numberOfLines={compact ? 1 : 2}>
        {producto.despro}
      </Text>
      {(producto.familia_nombre || producto.marca) ? (
        <View style={[styles.meta, compact && styles.metaCompact]}>
          {producto.familia_nombre ? (
            <Text style={[styles.chip, compact && styles.chipCompact]}>{producto.familia_nombre}</Text>
          ) : null}
          {producto.marca ? (
            <Text style={[styles.marca, compact && styles.marcaCompact]} numberOfLines={1}>
              {producto.marca}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    shadowColor: InventarioColors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCompact: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  pressed: { opacity: 0.88 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeVenta: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: InventarioColors.accentMuted,
  },
  badgeVentaText: { color: InventarioColors.accent, fontWeight: '800', fontSize: 14 },
  ajusteHint: { color: InventarioColors.accent, fontSize: 11, marginTop: 6 },
  codpro: { color: InventarioColors.primary, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  codproCompact: { fontSize: 13 },
  badge: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeOk: { backgroundColor: InventarioColors.primaryMuted },
  badgePending: { backgroundColor: InventarioColors.accentMuted },
  badgeCompact: { minWidth: 36, paddingHorizontal: 8, paddingVertical: 2 },
  badgeVentaCompact: { paddingHorizontal: 6, paddingVertical: 2 },
  badgeTextCompact: { fontSize: 13 },
  badgeText: { color: InventarioColors.primaryDark, fontWeight: '700', fontSize: 16 },
  badgeTextPending: { color: InventarioColors.accent, fontWeight: '700', fontSize: 16 },
  despro: { color: InventarioColors.text, fontSize: 15, marginTop: 6 },
  desproCompact: { fontSize: 13, marginTop: 4 },
  meta: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaCompact: { marginTop: 4, gap: 6 },
  chip: {
    color: InventarioColors.primary,
    fontSize: 12,
    backgroundColor: InventarioColors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipCompact: { fontSize: 10, paddingHorizontal: 6 },
  marca: { color: InventarioColors.textMuted, fontSize: 12 },
  marcaCompact: { fontSize: 10 },
});
