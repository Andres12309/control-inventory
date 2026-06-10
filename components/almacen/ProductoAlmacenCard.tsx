import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import type { ProductoAlmacen } from '@/lib/almacen/types';

type Props = {
  producto: ProductoAlmacen;
  esFavorito?: boolean;
  onPress: () => void;
  onToggleFavorito: () => void;
};

export function ProductoAlmacenCard({
  producto,
  esFavorito,
  onPress,
  onToggleFavorito,
}: Props) {
  const copiarCodigo = async () => {
    await Clipboard.setStringAsync(producto.codigo);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const sinStock = producto.stock_real <= 0;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.fila1}>
        <Text style={styles.descripcion} numberOfLines={2}>
          {producto.descripcion}
        </Text>
        <Text style={[styles.stock, sinStock && styles.stockCero]}>
          {formatNum(producto.stock_real)}
        </Text>
      </View>

      <View style={styles.fila2}>
        <Text style={styles.codigo}>{producto.codigo}</Text>
        <View style={styles.metaArea}>
          {producto.marca ? (
            <Text style={styles.marca}>
              {producto.marca}
              {producto.familia ? ' · ' : ''}
            </Text>
          ) : null}
          {producto.familia ? (
            <Text style={styles.familia} numberOfLines={1} ellipsizeMode="tail">
              {producto.familia}
            </Text>
          ) : null}
        </View>
        <Pressable style={styles.iconBtn} onPress={copiarCodigo} hitSlop={8}>
          <MaterialIcons
            name="content-copy"
            size={17}
            color={InventarioColors.primary}
          />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onToggleFavorito} hitSlop={8}>
          <Text style={[styles.favBtn, esFavorito && styles.favOn]}>
            {esFavorito ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  fila1: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  descripcion: {
    flex: 1,
    color: InventarioColors.text,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  stock: {
    color: InventarioColors.primary,
    fontWeight: '800',
    fontSize: 17,
    minWidth: 28,
    textAlign: 'right',
  },
  stockCero: { color: InventarioColors.accent },
  fila2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  codigo: {
    flexShrink: 0,
    color: InventarioColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  metaArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  marca: {
    flexShrink: 0,
    color: InventarioColors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  familia: {
    flex: 1,
    minWidth: 0,
    color: InventarioColors.primary,
    fontSize: 11,
    fontWeight: '500',
  },
  iconBtn: { paddingHorizontal: 2 },
  favBtn: { color: InventarioColors.textMuted, fontWeight: '700', fontSize: 15 },
  favOn: { color: InventarioColors.accent },
});
