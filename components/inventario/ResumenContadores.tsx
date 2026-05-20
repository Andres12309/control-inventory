import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import type { FiltroEstadoInventario } from '@/lib/types';

type Props = {
  contados: number;
  pendientes: number;
  total: number;
  filtroActivo: FiltroEstadoInventario;
  onFiltro: (filtro: FiltroEstadoInventario) => void;
};

export function ResumenContadores({
  contados,
  pendientes,
  total,
  filtroActivo,
  onFiltro,
}: Props) {
  return (
    <View style={styles.row}>
      <StatCard
        label="Contados"
        value={contados}
        activo={filtroActivo === 'contados'}
        color={InventarioColors.accent}
        onPress={() => onFiltro(filtroActivo === 'contados' ? 'todos' : 'contados')}
      />
      <StatCard
        label="Pendientes"
        value={pendientes}
        activo={filtroActivo === 'pendientes'}
        color={InventarioColors.warning}
        onPress={() => onFiltro(filtroActivo === 'pendientes' ? 'todos' : 'pendientes')}
      />
      <StatCard
        label="Total"
        value={total}
        activo={filtroActivo === 'todos'}
        color={InventarioColors.text}
        onPress={() => onFiltro('todos')}
      />
    </View>
  );
}

function StatCard({
  label,
  value,
  activo,
  color,
  onPress,
}: {
  label: string;
  value: number;
  activo: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.stat, activo && styles.statActivo]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, activo && styles.statLabelActivo]}>{label}</Text>
      {activo ? <Text style={styles.filtroHint}>Filtro activo</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat: {
    flex: 1,
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: InventarioColors.border,
  },
  statActivo: {
    borderColor: InventarioColors.accent,
    backgroundColor: '#2B1A10',
  },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: InventarioColors.textMuted, fontSize: 11, marginTop: 2, fontWeight: '600' },
  statLabelActivo: { color: InventarioColors.accent },
  filtroHint: { color: InventarioColors.accent, fontSize: 9, marginTop: 4, fontWeight: '700' },
});
