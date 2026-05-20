import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import type { ProductoConConteo } from '@/lib/types';

type Props = {
  producto: ProductoConConteo;
  onPress: () => void;
  onLongPress?: () => void;
  alterno?: boolean;
};

export function ProductoFilaTabla({ producto, onPress, onLongPress, alterno }: Props) {
  const stock =
    producto.stock_contado != null
      ? String(producto.stock_contado)
      : producto.stock_sistema != null
        ? String(producto.stock_sistema)
        : '—';

  return (
    <Pressable
      style={[styles.row, alterno && styles.rowAlt]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}>
      <Text style={[styles.cell, styles.codpro]} numberOfLines={1}>
        {producto.codpro}
      </Text>
      <Text style={[styles.cell, styles.despro]} numberOfLines={2}>
        {producto.despro}
      </Text>
      <Text style={[styles.cell, styles.stock]}>{stock}</Text>
      <Text style={[styles.cell, styles.familia]} numberOfLines={1}>
        {producto.familia_nombre ?? '—'}
      </Text>
    </Pressable>
  );
}

export function TablaProductosHeader() {
  return (
    <View style={styles.header}>
      <Text style={[styles.th, styles.colCodpro]}>CÓDIGO</Text>
      <Text style={[styles.th, styles.colDespro]}>DESCRIPCIÓN</Text>
      <Text style={[styles.th, styles.colStock]}>STOCK</Text>
      <Text style={[styles.th, styles.colFamilia]}>FAMILIA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#262626',
    borderRadius: 8,
    marginBottom: 4,
    gap: 6,
  },
  th: {
    color: InventarioColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: InventarioColors.border,
    gap: 6,
  },
  rowAlt: { backgroundColor: '#161616' },
  cell: { color: InventarioColors.text, fontSize: 12 },
  colCodpro: { width: 88 },
  colDespro: { flex: 1 },
  colStock: { width: 48, textAlign: 'right' },
  colFamilia: { width: 72 },
  codpro: { width: 88, color: InventarioColors.accent, fontWeight: '700' },
  despro: { flex: 1 },
  stock: { width: 48, textAlign: 'right', fontWeight: '700' },
  familia: { width: 72, color: InventarioColors.textMuted, fontSize: 11 },
});
