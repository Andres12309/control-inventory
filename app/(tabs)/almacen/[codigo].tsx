import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InventarioColors } from '@/constants/inventario-theme';
import {
  getProductoAlmacen,
  isFavoritoAlmacen,
  registrarVistaProductoAlmacen,
  toggleFavoritoAlmacen,
} from '@/lib/almacen/repository';
import type { ProductoAlmacen } from '@/lib/almacen/types';

export default function AlmacenDetalleScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [producto, setProducto] = useState<ProductoAlmacen | null>(null);
  const [favorito, setFavorito] = useState(false);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    try {
      const p = await getProductoAlmacen(db, codigo);
      setProducto(p);
      if (p) {
        setFavorito(await isFavoritoAlmacen(db, p.codigo));
        await registrarVistaProductoAlmacen(db, {
          codigo: p.codigo,
          descripcion: p.descripcion,
          marca: p.marca,
          familia: p.familia,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [db, codigo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const copiar = async () => {
    if (!producto) return;
    await Clipboard.setStringAsync(producto.codigo);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const toggleFav = async () => {
    if (!producto) return;
    const on = await toggleFavoritoAlmacen(db, producto.codigo);
    setFavorito(on);
  };

  const contenido = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={InventarioColors.primary} />
        </View>
      );
    }

    if (!producto) {
      return (
        <View style={styles.center}>
          <Text style={styles.empty}>Producto no encontrado.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Volver</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.descripcion}>{producto.descripcion}</Text>

        {(producto.marca || producto.familia) ? (
          <View style={styles.metaRow}>
            {producto.marca ? <Text style={styles.metaChip}>{producto.marca}</Text> : null}
            {producto.familia ? <Text style={styles.metaChip}>{producto.familia}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.seccion}>Stock</Text>
        <View style={styles.grid}>
          <Campo label="Real" value={String(producto.stock_real)} destacado />
          <Campo label="Disponible" value={String(producto.stock_disp)} destacado />
          <Campo label="Mínimo" value={String(producto.stock_minimo)} />
          <Campo label="Máximo" value={String(producto.stock_maximo)} />
        </View>

        <Text style={styles.seccion}>Datos</Text>
        <View style={styles.grid}>
          <Campo label="Línea" value={producto.linea} />
          <Campo label="U.M." value={producto.um} />
          <Campo label="Grupo tipo" value={producto.grupo_tipo} />
          <Campo label="Impuesto" value={producto.impuesto} />
          <Campo label="Ubicación" value={producto.ubicacion} />
          <Campo label="Activo" value={producto.activo ? 'Sí' : 'No'} />
          <Campo label="Cód. barras" value={producto.cod_barra} ancho="completo" />
        </View>

        <View style={styles.erpBox}>
          <Text style={styles.erpLabel}>Código para el ERP</Text>
          <Text style={styles.erpCodigo}>{producto.codigo}</Text>
          <Text style={styles.erpHint}>
            Este código es solo para buscar o registrar en el sistema ERP.
          </Text>
        </View>

        <Pressable style={styles.primary} onPress={copiar}>
          <Text style={styles.primaryText}>Copiar código ERP</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={toggleFav}>
          <Text style={styles.secondaryText}>
            {favorito ? '★ Quitar de favoritos' : '☆ Agregar a favoritos'}
          </Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.modalHeader}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detalle
        </Text>
        <View style={styles.backBtn} />
      </View>
      <View style={styles.body}>{contenido()}</View>
    </SafeAreaView>
  );
}

function Campo({
  label,
  value,
  destacado,
  ancho = 'mitad',
}: {
  label: string;
  value: string | null | undefined;
  destacado?: boolean;
  ancho?: 'mitad' | 'completo';
}) {
  if (value == null || value === '') return null;
  return (
    <View style={[styles.campo, ancho === 'completo' && styles.campoCompleto]}>
      <Text style={styles.campoLabel}>{label}</Text>
      <Text
        style={[styles.campoVal, destacado && styles.campoDestacado]}
        numberOfLines={ancho === 'completo' ? 2 : 1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: InventarioColors.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: InventarioColors.primaryDark,
    backgroundColor: InventarioColors.primary,
  },
  backBtn: { minWidth: 88, paddingHorizontal: 8 },
  backText: { color: InventarioColors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: InventarioColors.textOnPrimary,
    fontWeight: '800',
    fontSize: 17,
  },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: InventarioColors.textMuted },
  link: { color: InventarioColors.primary, marginTop: 12, fontWeight: '700' },
  descripcion: {
    color: InventarioColors.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  metaChip: {
    color: InventarioColors.primary,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: InventarioColors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  seccion: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  erpBox: {
    marginTop: 20,
    backgroundColor: InventarioColors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  erpLabel: {
    color: InventarioColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  erpCodigo: {
    color: InventarioColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  erpHint: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  campo: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  campoCompleto: {
    width: '100%',
    minWidth: '100%',
  },
  campoLabel: { color: InventarioColors.textMuted, fontSize: 10, textTransform: 'uppercase' },
  campoVal: { color: InventarioColors.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
  campoDestacado: { color: InventarioColors.primary, fontSize: 18, fontWeight: '800' },
  primary: {
    marginTop: 24,
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  primaryText: { color: InventarioColors.textOnAccent, fontWeight: '800', fontSize: 16 },
  secondary: {
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  secondaryText: { color: InventarioColors.text, fontWeight: '600' },
});
