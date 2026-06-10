import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import type { FiltroAlmacenRapido } from '@/lib/almacen/types';

type Props = {
  filtro: FiltroAlmacenRapido;
  onFiltro: (f: FiltroAlmacenRapido) => void;
  familias: string[];
  marcas: string[];
  familiaSel: string | null;
  marcaSel: string | null;
  onFamilia: (f: string | null) => void;
  onMarca: (m: string | null) => void;
  /** Solo chips rápidos (todos, stock, favoritos). */
  soloRapidos?: boolean;
  /** Muestra familia y marca (panel expandible). */
  mostrarAvanzados?: boolean;
};

const FILTROS: { id: FiltroAlmacenRapido; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'sin_stock', label: 'Sin stock' },
  { id: 'stock_bajo', label: 'Stock bajo' },
  { id: 'favoritos', label: 'Favoritos' },
];

export function FiltrosAlmacen({
  filtro,
  onFiltro,
  familias,
  marcas,
  familiaSel,
  marcaSel,
  onFamilia,
  onMarca,
  soloRapidos = false,
  mostrarAvanzados = true,
}: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {FILTROS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            selected={filtro === f.id}
            onPress={() => onFiltro(f.id)}
            compact
          />
        ))}
      </ScrollView>

      {soloRapidos || !mostrarAvanzados ? null : familias.length > 0 ? (
        <>
          <Text style={styles.label}>Familia</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label="Todas" selected={!familiaSel} onPress={() => onFamilia(null)} />
            {familias.map((f) => (
              <Chip key={f} label={f} selected={familiaSel === f} onPress={() => onFamilia(f)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      {soloRapidos || !mostrarAvanzados ? null : marcas.length > 0 ? (
        <>
          <Text style={styles.label}>Marca</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label="Todas" selected={!marcaSel} onPress={() => onMarca(null)} />
            {marcas.slice(0, 40).map((m) => (
              <Chip key={m} label={m} selected={marcaSel === m} onPress={() => onMarca(m)} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  compact,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={[styles.chip, compact && styles.chipCompact, selected && styles.chipOn]}
      onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 0 },
  label: {
    color: InventarioColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  chipCompact: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  chipOn: { backgroundColor: InventarioColors.primary, borderColor: InventarioColors.primary },
  chipText: { color: InventarioColors.text, fontWeight: '600', fontSize: 12 },
  chipTextOn: { color: InventarioColors.textOnPrimary, fontWeight: '800' },
});
