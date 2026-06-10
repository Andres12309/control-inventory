import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { InventarioColors } from "@/constants/inventario-theme";
import type { EstadisticasAlmacen } from "@/lib/almacen/types";

type Props = {
  stats: EstadisticasAlmacen;
  onProducto: (codigo: string) => void;
};

export function EstadisticasAlmacenPanel({ stats, onProducto }: Props) {
  const [abierto, setAbierto] = useState(false);
  const tieneDatos =
    stats.productosTop.length > 0 ||
    stats.marcasTop.length > 0 ||
    stats.familiasTop.length > 0;

  if (!tieneDatos) return null;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.toggle} onPress={() => setAbierto((v) => !v)}>
        <Text style={styles.toggleTitle}>Estadísticas de consulta</Text>
        <Text style={styles.toggleIcon}>{abierto ? "▾" : "▸"}</Text>
      </Pressable>

      {abierto ? (
        <View style={styles.body}>
          {stats.productosTop.length > 0 ? (
            <Seccion titulo="Productos más buscados">
              {stats.productosTop.map((p) => (
                <Pressable
                  key={p.codigo}
                  style={styles.fila}
                  onPress={() => onProducto(p.codigo)}
                >
                  <Text style={styles.filaMain} numberOfLines={2}>
                    {p.descripcion}
                  </Text>
                  <Text style={styles.filaSub}>{p.consultas} consultas</Text>
                </Pressable>
              ))}
            </Seccion>
          ) : null}

          {stats.marcasTop.length > 0 ? (
            <Seccion titulo="Marcas más buscadas">
              {stats.marcasTop.map((m) => (
                <View key={m.marca} style={styles.chipRow}>
                  <Text style={styles.chip}>{m.marca}</Text>
                  <Text style={styles.chipCount}>{m.consultas}</Text>
                </View>
              ))}
            </Seccion>
          ) : null}

          {stats.familiasTop.length > 0 ? (
            <Seccion titulo="Familias más buscadas">
              {stats.familiasTop.map((f) => (
                <View key={f.familia} style={styles.chipRow}>
                  <Text style={styles.chip}>{f.familia}</Text>
                  <Text style={styles.chipCount}>{f.consultas}</Text>
                </View>
              ))}
            </Seccion>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitle}>{titulo}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    overflow: "hidden",
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleTitle: {
    color: InventarioColors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  toggleIcon: {
    color: InventarioColors.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  body: { paddingHorizontal: 14, paddingBottom: 12, gap: 12 },
  seccion: { gap: 6 },
  seccionTitle: {
    color: InventarioColors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  fila: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: InventarioColors.borderLight,
  },
  filaMain: { color: InventarioColors.text, fontWeight: "600", fontSize: 13 },
  filaSub: { color: InventarioColors.textMuted, fontSize: 11, marginTop: 2 },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chip: {
    color: InventarioColors.primary,
    fontWeight: "600",
    fontSize: 12,
    flex: 1,
  },
  chipCount: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
});
