import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InventarioActivoBanner } from '@/components/inventario/InventarioActivoBanner';
import { FamiliaChips } from '@/components/inventario/FamiliaChips';
import { ProductoCard } from '@/components/inventario/ProductoCard';
import { ResumenContadores } from '@/components/inventario/ResumenContadores';
import { InventarioColors } from '@/constants/inventario-theme';
import { useEliminarProducto } from '@/hooks/use-eliminar-producto';
import { useInventarioActivo } from '@/hooks/use-inventario-activo';
import { normalizeCodpro, normalizeCodproInput } from '@/lib/codpro';
import {
  getProducto,
  getResumenInventario,
  listFamilias,
  listProductosPorFamilia,
  searchProductos,
} from '@/lib/db/repository';
import type { Familia, FiltroEstadoInventario, ProductoConConteo } from '@/lib/types';

export default function InventarioListaScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [familiaId, setFamiliaId] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoInventario>('todos');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProductoConConteo[]>([]);
  const [resumen, setResumen] = useState({ totalProductos: 0, contados: 0, pendientes: 0 });
  const [loading, setLoading] = useState(true);
  const [existeCodigoExacto, setExisteCodigoExacto] = useState<boolean | null>(null);

  const termino = query.trim();
  const codigoExacto = normalizeCodpro(termino);
  const hayBusquedaCodigo = codigoExacto.length >= 1;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [fams, res] = await Promise.all([
        listFamilias(db, true),
        getResumenInventario(db),
      ]);
      setFamilias(fams);
      setResumen(res);

      const q = query.trim();
      if (q.length >= 1) {
        const cod = normalizeCodpro(q);
        const [lista, exacto] = await Promise.all([
          searchProductos(db, q, familiaId, filtroEstado),
          cod ? getProducto(db, cod) : Promise.resolve(null),
        ]);
        setItems(lista);
        setExisteCodigoExacto(cod ? !!exacto : null);
      } else {
        setItems(await listProductosPorFamilia(db, familiaId, filtroEstado));
        setExisteCodigoExacto(null);
      }
    } finally {
      setLoading(false);
    }
  }, [db, query, familiaId, filtroEstado]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  useEffect(() => {
    const t = setTimeout(() => cargar(), query.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [familiaId, filtroEstado, query, cargar]);

  const abrirNuevo = (prefijo?: string) => {
    router.push({
      pathname: '/conteo/[codpro]',
      params: prefijo
        ? { codpro: 'nuevo', prefijo: normalizeCodpro(prefijo) }
        : { codpro: 'nuevo' },
    });
  };

  const abrirConteo = (codpro: string) => {
    router.push({
      pathname: '/conteo/[codpro]',
      params: { codpro: normalizeCodpro(codpro) },
    });
  };

  const irAccionPrincipal = () => {
    if (!codigoExacto) {
      abrirNuevo();
      return;
    }
    if (existeCodigoExacto) abrirConteo(codigoExacto);
    else abrirNuevo(codigoExacto);
  };

  const { confirmarEliminar } = useEliminarProducto(cargar);
  const { activo, resumenVentas } = useInventarioActivo();

  const etiquetaFiltro =
    filtroEstado === 'contados'
      ? 'Mostrando contados'
      : filtroEstado === 'pendientes'
        ? 'Mostrando pendientes'
        : null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ResumenContadores
        contados={resumen.contados}
        pendientes={resumen.pendientes}
        total={resumen.totalProductos}
        filtroActivo={filtroEstado}
        onFiltro={setFiltroEstado}
      />

      <InventarioActivoBanner activo={activo} resumenVentas={resumenVentas} />

      <Pressable style={styles.primaryBtn} onPress={() => abrirNuevo()}>
        <Text style={styles.primaryBtnText}>Ingresar código y contar</Text>
        <Text style={styles.primaryBtnHint}>Código del cartón — crear o abrir ficha</Text>
      </Pressable>

      <TextInput
        style={styles.search}
        placeholder="CÓDIGO O DESCRIPCIÓN..."
        placeholderTextColor={InventarioColors.textMuted}
        value={query}
        onChangeText={(t) => setQuery(normalizeCodproInput(t))}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={irAccionPrincipal}
      />

      {hayBusquedaCodigo ? (
        <Pressable
          style={styles.accionCodigo}
          onPress={irAccionPrincipal}
          disabled={loading}>
          <Text style={styles.accionCodigoText}>
            {loading
              ? 'Comprobando código...'
              : existeCodigoExacto
                ? `Contar ${codigoExacto}`
                : `+ Crear y contar ${codigoExacto}`}
          </Text>
        </Pressable>
      ) : null}

      <FamiliaChips familias={familias} selectedId={familiaId} onSelect={setFamiliaId} />

      {etiquetaFiltro ? (
        <Text style={styles.filtroActivo}>{etiquetaFiltro} · toca el contador otra vez para quitar</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={InventarioColors.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.codpro}
          renderItem={({ item }) => (
            <ProductoCard
              producto={item}
              onPress={() => abrirConteo(item.codpro)}
              onLongPress={() => confirmarEliminar(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim().length >= 1
                ? 'Sin resultados con este filtro.'
                : filtroEstado === 'pendientes'
                  ? 'No hay pendientes en esta familia.'
                  : filtroEstado === 'contados'
                    ? 'No hay contados en esta familia.'
                    : 'No hay productos. Importa Excel o cuenta desde la pestaña Contar.'}
            </Text>
          }
          onRefresh={cargar}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: InventarioColors.bg, paddingHorizontal: 16 },
  primaryBtn: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#111', fontWeight: '800', fontSize: 16 },
  primaryBtnHint: { color: '#3D2000', fontSize: 11, marginTop: 4 },
  accionCodigo: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: InventarioColors.accent,
  },
  accionCodigoText: { color: InventarioColors.accent, fontWeight: '800', fontSize: 14 },
  search: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    marginBottom: 12,
  },
  filtroActivo: {
    color: InventarioColors.accent,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  list: { paddingBottom: 24 },
  empty: { color: InventarioColors.textMuted, textAlign: 'center', marginTop: 32, lineHeight: 22 },
});
