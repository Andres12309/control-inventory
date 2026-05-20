import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { InventarioColors } from "@/constants/inventario-theme";
import type { Familia } from "@/lib/types";

type Props = {
  familias: Familia[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  conteosPorFamilia?: Record<number, number>;
  totalTodas?: number;
};

function etiquetaChip(nombre: string, total?: number) {
  if (total == null) return nombre;
  return `${nombre} (${total})`;
}

export function FamiliaChips({
  familias,
  selectedId,
  onSelect,
  conteosPorFamilia,
  totalTodas,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Familia</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label={etiquetaChip("Todas", totalTodas)}
          selected={selectedId === null}
          onPress={() => onSelect(null)}
        />
        {familias.map((f) => (
          <Chip
            key={f.id}
            label={etiquetaChip(f.nombre, conteosPorFamilia?.[f.id] ?? 0)}
            selected={selectedId === f.id}
            onPress={() => onSelect(f.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.chipText, selected && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  titulo: {
    color: InventarioColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: InventarioColors.accent,
    borderColor: InventarioColors.accent,
  },
  chipText: {
    color: InventarioColors.text,
    fontWeight: "600",
    fontSize: 13,
  },
  chipTextActive: { color: "#111", fontWeight: "800" },
});
