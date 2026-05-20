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
import { ProductoCard } from '@/components/inventario/ProductoCard';
import { InventarioColors } from '@/constants/inventario-theme';
import { useEliminarProducto } from '@/hooks/use-eliminar-producto';
import { useInventarioActivo } from '@/hooks/use-inventario-activo';
import { normalizeCodpro, normalizeDesproInput } from '@/lib/codpro';
import { getProducto, getResumenInventario, searchProductos } from '@/lib/db/repository';
import type { ProductoConConteo } from '@/lib/types';

const MIN_BUSQUEDA = 1;
const LIMITE_RESULTADOS = 60;

export default function ContarScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [resumen, setResumen] = useState({ totalProductos: 0, contados: 0, pendientes: 0 });
  const [resultados, setResultados] = useState<ProductoConConteo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [existeCodigoExacto, setExisteCodigoExacto] = useState<boolean | null>(null);

  const termino = query.trim();
  const codigoExacto = normalizeCodpro(termino);
  const hayBusqueda = termino.length >= MIN_BUSQUEDA;

  const cargarResumen = useCallback(async () => {
    setResumen(await getResumenInventario(db));
  }, [db]);

  const ejecutarBusqueda = useCallback(async () => {
    const q = termino;
    if (q.length < MIN_BUSQUEDA) {
      setResultados([]);
      setExisteCodigoExacto(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    try {
      const [lista, exacto] = await Promise.all([
        searchProductos(db, q, null, 'todos', LIMITE_RESULTADOS),
        getProducto(db, codigoExacto),
      ]);
      setResultados(lista);
      setExisteCodigoExacto(!!exacto);
    } finally {
      setBuscando(false);
    }
  }, [db, termino, codigoExacto]);

  useFocusEffect(
    useCallback(() => {
      cargarResumen();
    }, [cargarResumen])
  );

  useEffect(() => {
    if (!hayBusqueda) {
      setResultados([]);
      setExisteCodigoExacto(null);
      return;
    }
    const t = setTimeout(() => ejecutarBusqueda(), 300);
    return () => clearTimeout(t);
  }, [hayBusqueda, ejecutarBusqueda]);

  const abrirNuevo = (prefijo?: string) => {
    router.push({
      pathname: '/conteo/[codpro]',
      params: prefijo
        ? { codpro: 'nuevo', prefijo: normalizeCodpro(prefijo) }
        : { codpro: 'nuevo' },
    });
  };

  const abrirConteo = (codpro: string) => {
    router.push({ pathname: '/conteo/[codpro]', params: { codpro: normalizeCodpro(codpro) } });
  };

  const irAccionPrincipal = () => {
    if (!codigoExacto) {
      abrirNuevo();
      return;
    }
    if (existeCodigoExacto) abrirConteo(codigoExacto);
    else abrirNuevo(codigoExacto);
  };

  const refrescarBusqueda = useCallback(async () => {
    await cargarResumen();
    await ejecutarBusqueda();
  }, [cargarResumen, ejecutarBusqueda]);

  const { confirmarEliminar } = useEliminarProducto(refrescarBusqueda);
  const { activo, resumenVentas } = useInventarioActivo();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Cabecera fija: el TextInput no se desmonta al buscar */}
      <View style={styles.top}>
        <View style={styles.resumenMini}>
          <Text style={styles.resumenText}>
            {resumen.contados} contados · {resumen.pendientes} pendientes · {resumen.totalProductos}{' '}
            total
          </Text>
        </View>

        <InventarioActivoBanner activo={activo} resumenVentas={resumenVentas} />

        <Pressable style={styles.primaryBtn} onPress={() => abrirNuevo()}>
          <Text style={styles.primaryBtnText}>Ingresar código y contar</Text>
          <Text style={styles.primaryBtnHint}>Sin buscar — código del cartón directo</Text>
        </Pressable>

        <Text style={styles.searchLabel}>Búsqueda global</Text>
        <TextInput
          style={styles.search}
          placeholder="CÓDIGO O DESCRIPCIÓN..."
          placeholderTextColor={InventarioColors.textMuted}
          value={query}
          onChangeText={(t) => setQuery(normalizeDesproInput(t))}
          autoCapitalize="characters"
          autoCorrect={false}
          blurOnSubmit={false}
          returnKeyType="search"
          onSubmitEditing={irAccionPrincipal}
        />

        {!hayBusqueda ? (
          <Text style={styles.hint}>Escribe para buscar en todo el catálogo por código o descripción</Text>
        ) : null}

        {hayBusqueda && codigoExacto ? (
          <Pressable
            style={styles.accionCodigo}
            onPress={irAccionPrincipal}
            disabled={buscando}>
            <Text style={styles.accionCodigoText}>
              {buscando
                ? 'Comprobando código...'
                : existeCodigoExacto
                  ? `Contar ${codigoExacto}`
                  : `+ Crear y contar ${codigoExacto}`}
            </Text>
            {!buscando && !existeCodigoExacto && resultados.length > 0 ? (
              <Text style={styles.accionCodigoHint}>
                También hay coincidencias por descripción abajo
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        <Text style={styles.hintLongPress}>Mantén pulsado un resultado para eliminarlo</Text>

        {hayBusqueda ? (
          <Text style={styles.resultadosTitulo}>
            {buscando
              ? 'Buscando...'
              : `${resultados.length} coincidencia${resultados.length === 1 ? '' : 's'}`}
          </Text>
        ) : null}
      </View>

      <FlatList
        style={styles.lista}
        data={hayBusqueda ? resultados : []}
        keyExtractor={(item) => item.codpro}
        renderItem={({ item }) => (
          <ProductoCard
            producto={item}
            onPress={() => abrirConteo(item.codpro)}
            onLongPress={() => confirmarEliminar(item)}
          />
        )}
        ListEmptyComponent={
          hayBusqueda ? (
            buscando ? (
              <ActivityIndicator color={InventarioColors.accent} style={styles.loader} />
            ) : (
              <Text style={styles.empty}>No hay coincidencias. Puedes crear el producto nuevo.</Text>
            )
          ) : null
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: InventarioColors.bg },
  top: { paddingHorizontal: 16, paddingTop: 8 },
  lista: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  resumenMini: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  resumenText: { color: InventarioColors.textMuted, textAlign: 'center', fontSize: 13 },
  primaryBtn: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: { color: '#111', fontWeight: '800', fontSize: 17 },
  primaryBtnHint: { color: '#3D2000', fontSize: 11, marginTop: 4 },
  searchLabel: {
    color: InventarioColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  search: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  accionCodigo: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: InventarioColors.accent,
  },
  accionCodigoText: { color: InventarioColors.accent, fontWeight: '800', fontSize: 15 },
  accionCodigoHint: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  resultadosTitulo: {
    color: InventarioColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: { color: InventarioColors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  hintLongPress: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  loader: { marginTop: 16 },
  empty: { color: InventarioColors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 22 },
});
