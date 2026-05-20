import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ModalScaffold } from '@/components/inventario/ModalScaffold';
import { NumPad } from '@/components/inventario/NumPad';
import { InventarioColors } from '@/constants/inventario-theme';
import { useDeviceId } from '@/hooks/use-device-id';
import { useInventarioActivo } from '@/hooks/use-inventario-activo';
import { normalizeCodpro, normalizeDesproInput } from '@/lib/codpro';
import {
  anularUltimaVentaProducto,
  listMovimientosRecientes,
  registrarVentaInventario,
} from '@/lib/db/movimientos-inventario';
import { getProducto, searchProductos } from '@/lib/db/repository';
import type { MovimientoInventario } from '@/lib/inventario-activo';
import type { ProductoConConteo } from '@/lib/types';

const MIN_BUSQUEDA = 1;
const LIMITE_RESULTADOS = 40;

export default function VentaRapidaScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const deviceId = useDeviceId();
  const { activo, resumenVentas, refrescar, iniciar } = useInventarioActivo();
  const searchRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [seleccionado, setSeleccionado] = useState<ProductoConConteo | null>(null);
  const [resultados, setResultados] = useState<ProductoConConteo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [existeCodigoExacto, setExisteCodigoExacto] = useState<boolean | null>(null);

  const [cantidad, setCantidad] = useState('1');
  const [guardando, setGuardando] = useState(false);
  const [recientes, setRecientes] = useState<MovimientoInventario[]>([]);

  const termino = query.trim();
  const codigoExacto = normalizeCodpro(termino);
  const hayBusqueda = termino.length >= MIN_BUSQUEDA;
  const codVenta = seleccionado?.codpro ?? '';

  const cargarRecientes = useCallback(async () => {
    setRecientes(await listMovimientosRecientes(db, 12));
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
        codigoExacto ? getProducto(db, codigoExacto) : Promise.resolve(null),
      ]);
      setResultados(lista);
      setExisteCodigoExacto(codigoExacto ? !!exacto : null);
    } finally {
      setBuscando(false);
    }
  }, [db, termino, codigoExacto]);

  useEffect(() => {
    cargarRecientes();
  }, [cargarRecientes, resumenVentas.movimientos]);

  useEffect(() => {
    if (!hayBusqueda) {
      setResultados([]);
      setExisteCodigoExacto(null);
      return;
    }
    const t = setTimeout(() => ejecutarBusqueda(), 300);
    return () => clearTimeout(t);
  }, [hayBusqueda, ejecutarBusqueda]);

  const elegirProducto = (p: ProductoConConteo) => {
    setSeleccionado(p);
    setQuery('');
    setResultados([]);
    setExisteCodigoExacto(null);
  };

  const elegirCodigoExacto = async () => {
    if (!codigoExacto) return;
    const p = await getProducto(db, codigoExacto);
    if (p) {
      elegirProducto(p);
      return;
    }
    elegirProducto({
      codpro: codigoExacto,
      despro: codigoExacto,
      um: 'UND',
      costo: null,
      pvpa: null,
      marca: null,
      familia_id: null,
      stock_sistema: null,
      updated_at: '',
      stock_contado: null,
      conteo_updated_at: null,
    });
  };

  const limpiarSeleccion = () => {
    setSeleccionado(null);
    setTimeout(() => searchRef.current?.focus(), 80);
  };

  const guardarVenta = async () => {
    if (!deviceId) return;
    const cod = normalizeCodpro(codVenta);
    if (!cod) {
      Alert.alert('Producto', 'Busca y selecciona el producto vendido.');
      return;
    }
    const qty = parseFloat(cantidad.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Cantidad', 'Ingresa una cantidad válida.');
      return;
    }
    if (!activo) await iniciar();

    setGuardando(true);
    try {
      await registrarVentaInventario(db, cod, qty, deviceId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refrescar();
      await cargarRecientes();
      setSeleccionado(null);
      setQuery('');
      setCantidad('1');
      setTimeout(() => searchRef.current?.focus(), 80);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setGuardando(false);
    }
  };

  const deshacerUltima = async (item: MovimientoInventario) => {
    Alert.alert(
      'Deshacer venta',
      `¿Quitar la última venta de ${item.codpro} (−${item.cantidad})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deshacer',
          onPress: async () => {
            const ok = await anularUltimaVentaProducto(db, item.codpro);
            if (!ok) {
              Alert.alert('No se pudo', 'No hay venta reciente de ese producto.');
              return;
            }
            await refrescar();
            await cargarRecientes();
          },
        },
      ]
    );
  };

  const listaModoBusqueda = hayBusqueda;

  return (
    <ModalScaffold title="Registrar venta">
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Text style={styles.hint}>
            Busca por código o descripción, elige el producto y registra la cantidad vendida.
          </Text>

          {!seleccionado ? (
            <>
              <Text style={styles.label}>Buscar producto</Text>
              <TextInput
                ref={searchRef}
                style={styles.input}
                value={query}
                onChangeText={(t) => setQuery(normalizeDesproInput(t))}
                placeholder="CÓDIGO O DESCRIPCIÓN..."
                placeholderTextColor={InventarioColors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                blurOnSubmit={false}
                returnKeyType="search"
                onSubmitEditing={elegirCodigoExacto}
              />

              {hayBusqueda && codigoExacto ? (
                <Pressable style={styles.accionExacta} onPress={elegirCodigoExacto}>
                  <Text style={styles.accionExactaText}>
                    {existeCodigoExacto
                      ? `Vender código exacto ${codigoExacto}`
                      : `Vender ${codigoExacto} (sin ficha)`}
                  </Text>
                </Pressable>
              ) : null}

              {hayBusqueda ? (
                <Text style={styles.resultadosTitulo}>
                  {buscando
                    ? 'Buscando...'
                    : `${resultados.length} coincidencia${resultados.length === 1 ? '' : 's'}`}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.seleccionado}>
              <View style={styles.seleccionadoRow}>
                <View style={styles.seleccionadoInfo}>
                  <Text style={styles.seleccionadoCod}>{seleccionado.codpro}</Text>
                  <Text style={styles.seleccionadoDes} numberOfLines={2}>
                    {seleccionado.despro}
                  </Text>
                </View>
                <Pressable onPress={limpiarSeleccion} hitSlop={8}>
                  <Text style={styles.cambiar}>Cambiar</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Cantidad vendida</Text>
              <Text style={styles.qtyDisplay}>{cantidad || '0'}</Text>
              <NumPad value={cantidad} onChange={setCantidad} />

              <View style={styles.quickRow}>
                {[1, 2, 3, 5].map((n) => (
                  <Pressable key={n} style={styles.quickBtn} onPress={() => setCantidad(String(n))}>
                    <Text style={styles.quickText}>{n}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.primary, guardando && styles.disabled]}
                disabled={guardando}
                onPress={guardarVenta}>
                {guardando ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.primaryText}>Registrar venta</Text>
                )}
              </Pressable>
            </View>
          )}

          <Pressable style={styles.link} onPress={() => router.push('/inventario-en-curso')}>
            <Text style={styles.linkText}>Estado del inventario en curso</Text>
          </Pressable>
        </View>

        <FlatList
          style={styles.lista}
          data={listaModoBusqueda ? resultados : []}
          keyExtractor={(item) => item.codpro}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <Pressable style={styles.resultado} onPress={() => elegirProducto(item)}>
              <Text style={styles.resultadoCod}>{item.codpro}</Text>
              <Text style={styles.resultadoDes} numberOfLines={2}>
                {item.despro}
              </Text>
              {item.familia_nombre ? (
                <Text style={styles.resultadoFam}>{item.familia_nombre}</Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            listaModoBusqueda ? (
              buscando ? (
                <ActivityIndicator color={InventarioColors.accent} style={{ marginTop: 16 }} />
              ) : (
                <Text style={styles.empty}>Sin coincidencias. Prueba otro texto o el código exacto.</Text>
              )
            ) : !seleccionado ? (
              <View>
                <Text style={styles.recientesTitulo}>Ventas recientes</Text>
                {recientes.length === 0 ? (
                  <Text style={styles.empty}>Aún no hay ventas en esta jornada.</Text>
                ) : (
                  recientes.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.fila}
                      onLongPress={() => deshacerUltima(item)}>
                      <View style={styles.filaMain}>
                        <Text style={styles.filaCod}>{item.codpro}</Text>
                        <Text style={styles.filaQty}>−{item.cantidad}</Text>
                      </View>
                      {item.despro ? (
                        <Text style={styles.filaDes} numberOfLines={1}>
                          {item.despro}
                        </Text>
                      ) : null}
                      <Text style={styles.filaHint}>
                        Mantén pulsado para deshacer la última de ese código
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    </ModalScaffold>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  top: { paddingHorizontal: 16, paddingTop: 8 },
  lista: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  hint: { color: InventarioColors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  label: {
    color: InventarioColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 14,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  accionExacta: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: InventarioColors.accent,
  },
  accionExactaText: { color: InventarioColors.accent, fontWeight: '800', fontSize: 14 },
  resultadosTitulo: {
    color: InventarioColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  resultado: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  resultadoCod: { color: InventarioColors.accent, fontWeight: '800', fontSize: 15 },
  resultadoDes: { color: InventarioColors.text, marginTop: 4, fontSize: 14 },
  resultadoFam: { color: InventarioColors.textMuted, fontSize: 11, marginTop: 6 },
  seleccionado: {
    backgroundColor: '#1B2E1B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#40916C',
  },
  seleccionadoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  seleccionadoInfo: { flex: 1 },
  seleccionadoCod: { color: InventarioColors.accent, fontWeight: '800', fontSize: 18 },
  seleccionadoDes: { color: InventarioColors.text, marginTop: 4, fontSize: 14 },
  cambiar: { color: '#95D5B2', fontWeight: '700', fontSize: 14 },
  qtyDisplay: {
    color: InventarioColors.text,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 8,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  quickBtn: {
    flex: 1,
    backgroundColor: InventarioColors.surface,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  quickText: { color: InventarioColors.text, fontWeight: '700' },
  primary: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#111', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 },
  link: { alignItems: 'center', paddingVertical: 10 },
  linkText: { color: InventarioColors.accent, fontWeight: '600', fontSize: 13 },
  recientesTitulo: {
    color: InventarioColors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  fila: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  filaMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filaCod: { color: InventarioColors.accent, fontWeight: '800', fontSize: 15 },
  filaQty: { color: '#F87171', fontWeight: '800', fontSize: 18 },
  filaDes: { color: InventarioColors.text, marginTop: 4, fontSize: 13 },
  filaHint: { color: InventarioColors.textMuted, fontSize: 10, marginTop: 6 },
  empty: { color: InventarioColors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 20 },
});
