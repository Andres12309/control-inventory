import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ProductoCard } from '@/components/inventario/ProductoCard';
import { ProductoFilaTabla, TablaProductosHeader } from '@/components/inventario/ProductoFilaTabla';
import { InventarioColors } from '@/constants/inventario-theme';
import { useEliminarProducto } from '@/hooks/use-eliminar-producto';
import { normalizeCodproInput } from '@/lib/codpro';
import { searchProductos } from '@/lib/db/repository';
import type { ProductoConConteo } from '@/lib/types';

type VistaCatalogo = 'tarjetas' | 'tabla';

export default function CatalogoScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProductoConConteo[]>([]);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState<VistaCatalogo>('tarjetas');

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const q = query.trim();
      setItems(await searchProductos(db, q || '', null, 'todos', 200));
    } finally {
      setLoading(false);
    }
  }, [db, query]);

  const { confirmarEliminar } = useEliminarProducto(buscar);

  useFocusEffect(
    useCallback(() => {
      buscar();
    }, [buscar])
  );

  const abrirEditar = (codpro: string) => {
    router.push({ pathname: '/producto/editar', params: { codpro } });
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={() => router.push('/producto/nuevo')}>
        <Text style={styles.addBtnText}>+ Nuevo producto</Text>
      </Pressable>

      <View style={styles.vistaToggle}>
        <Pressable
          style={[styles.vistaBtn, vista === 'tarjetas' && styles.vistaBtnOn]}
          onPress={() => setVista('tarjetas')}>
          <Text style={[styles.vistaBtnText, vista === 'tarjetas' && styles.vistaBtnTextOn]}>
            Tarjetas
          </Text>
        </Pressable>
        <Pressable
          style={[styles.vistaBtn, vista === 'tabla' && styles.vistaBtnOn]}
          onPress={() => setVista('tabla')}>
          <Text style={[styles.vistaBtnText, vista === 'tabla' && styles.vistaBtnTextOn]}>
            Tabla
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Buscar en catálogo..."
        placeholderTextColor={InventarioColors.textMuted}
        value={query}
        onChangeText={(t) => setQuery(normalizeCodproInput(t))}
        autoCapitalize="characters"
        onSubmitEditing={buscar}
        returnKeyType="search"
      />

      <Text style={styles.hintLongPress}>Mantén pulsado un producto para eliminarlo</Text>

      {loading ? (
        <ActivityIndicator color={InventarioColors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.codpro}
          ListHeaderComponent={vista === 'tabla' ? TablaProductosHeader : undefined}
          renderItem={({ item, index }) =>
            vista === 'tarjetas' ? (
              <ProductoCard
                producto={item}
                onPress={() => abrirEditar(item.codpro)}
                onLongPress={() => confirmarEliminar(item)}
              />
            ) : (
              <ProductoFilaTabla
                producto={item}
                alterno={index % 2 === 1}
                onPress={() => abrirEditar(item.codpro)}
                onLongPress={() => confirmarEliminar(item)}
              />
            )
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>No hay productos aún.</Text>}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: InventarioColors.bg, padding: 16 },
  addBtn: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: InventarioColors.accent,
    marginBottom: 10,
  },
  addBtnText: { color: InventarioColors.accent, fontWeight: '700' },
  vistaToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  vistaBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  vistaBtnOn: {
    backgroundColor: InventarioColors.accent,
    borderColor: InventarioColors.accent,
  },
  vistaBtnText: { color: InventarioColors.textMuted, fontWeight: '700', fontSize: 13 },
  vistaBtnTextOn: { color: '#111' },
  search: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    marginBottom: 6,
  },
  hintLongPress: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  empty: { color: InventarioColors.textMuted, textAlign: 'center', marginTop: 32 },
});
