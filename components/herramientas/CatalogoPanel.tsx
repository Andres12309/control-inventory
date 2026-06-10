import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ProductoCard } from '@/components/inventario/ProductoCard';
import { ProductoFilaTabla, TablaProductosHeader } from '@/components/inventario/ProductoFilaTabla';
import { InventarioColors } from '@/constants/inventario-theme';
import { useEliminarProducto } from '@/hooks/use-eliminar-producto';
import { useInventarioActivo } from '@/hooks/use-inventario-activo';
import { normalizeCodpro, normalizeCodproInput } from '@/lib/codpro';
import {
  countProductosPorFamilia,
  getProducto,
  getResumenInventario,
  listFamilias,
  listProductosPorFamilia,
  searchProductos,
} from '@/lib/db/repository';
import type { Familia, FiltroEstadoInventario, ProductoConConteo } from '@/lib/types';

type VistaCatalogo = 'tarjetas' | 'tabla';

type Props = { activo: boolean };

export function CatalogoPanel({ activo }: Props) {
  const db = useSQLiteContext();
  const router = useRouter();

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [familiaId, setFamiliaId] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoInventario>('todos');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProductoConConteo[]>([]);
  const [resumen, setResumen] = useState({ totalProductos: 0, contados: 0, pendientes: 0 });
  const [conteosFamilia, setConteosFamilia] = useState<Record<number, number>>({});
  const [totalTodasFamilias, setTotalTodasFamilias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [existeCodigoExacto, setExisteCodigoExacto] = useState<boolean | null>(null);
  const [vista, setVista] = useState<VistaCatalogo>('tarjetas');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const codigoExacto = normalizeCodpro(query.trim());
  const hayBusquedaCodigo = codigoExacto.length >= 1;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [fams, res, conteos] = await Promise.all([
        listFamilias(db, true),
        getResumenInventario(db),
        countProductosPorFamilia(db, filtroEstado),
      ]);
      setFamilias(fams);
      setResumen(res);
      setConteosFamilia(conteos.porId);
      setTotalTodasFamilias(conteos.todas);

      const q = query.trim();
      if (q.length >= 1) {
        const cod = normalizeCodpro(q);
        const [lista, exacto] = await Promise.all([
          searchProductos(db, q, familiaId, filtroEstado, 200),
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

  useEffect(() => {
    if (!activo) return;
    cargar();
  }, [activo, cargar]);

  useEffect(() => {
    if (!activo) return;
    const t = setTimeout(() => cargar(), query.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [activo, familiaId, filtroEstado, query, cargar]);

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

  const abrirEditar = (codpro: string) => {
    router.push({ pathname: '/producto/editar', params: { codpro } });
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
  const { activo: inventarioActivo, resumenVentas } = useInventarioActivo();

  const familiaNombre = useMemo(
    () => familias.find((f) => f.id === familiaId)?.nombre ?? null,
    [familias, familiaId]
  );

  const resumenLinea = useMemo(() => {
    const partes = [`${items.length} mostrados`];
    if (filtroEstado === 'contados') partes.push('contados');
    else if (filtroEstado === 'pendientes') partes.push('pendientes');
    if (familiaNombre) partes.push(familiaNombre);
    return partes.join(' · ');
  }, [items.length, filtroEstado, familiaNombre]);

  const chipsFamiliaFilas = useMemo(() => {
    const todos = [
      { id: null as number | null, label: `Todas (${totalTodasFamilias})` },
      ...familias.map((f) => ({
        id: f.id,
        label: `${f.nombre} (${conteosFamilia[f.id] ?? 0})`,
      })),
    ];
    return {
      fila1: todos.filter((_, i) => i % 2 === 0),
      fila2: todos.filter((_, i) => i % 2 === 1),
    };
  }, [familias, totalTodasFamilias, conteosFamilia]);

  const toggleFiltro = (f: FiltroEstadoInventario) => {
    if (f === 'contados') setFiltroEstado((v) => (v === 'contados' ? 'todos' : 'contados'));
    else if (f === 'pendientes') setFiltroEstado((v) => (v === 'pendientes' ? 'todos' : 'pendientes'));
    else setFiltroEstado('todos');
  };

  const headerLista = (
    <View style={styles.headerLista}>
      <Text style={styles.resumenLinea}>{resumenLinea}</Text>
      {vista === 'tabla' ? <TablaProductosHeader /> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Código o descripción..."
          placeholderTextColor={InventarioColors.textMuted}
          value={query}
          onChangeText={(t) => setQuery(normalizeCodproInput(t))}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={irAccionPrincipal}
        />

        <View style={styles.toolbar}>
          <ToolBtn label="Contar" accent onPress={() => abrirNuevo()} />
          <ToolBtn label="+" onPress={() => router.push('/producto/nuevo')} />
          <ToolBtn
            label={vista === 'tarjetas' ? '▦' : '≡'}
            active={vista === 'tabla'}
            onPress={() => setVista((v) => (v === 'tarjetas' ? 'tabla' : 'tarjetas'))}
          />
          <ToolBtn
            label="Filtros"
            active={filtrosAbiertos || filtroEstado !== 'todos' || familiaId != null}
            onPress={() => setFiltrosAbiertos((v) => !v)}
          />
          {inventarioActivo ? (
            <ToolBtn
              label="Venta"
              accent
              onPress={() => router.push('/venta-rapida')}
            />
          ) : null}
        </View>

        {hayBusquedaCodigo ? (
          <Pressable style={styles.accionCodigo} onPress={irAccionPrincipal} disabled={loading}>
            <Text style={styles.accionCodigoText} numberOfLines={1}>
              {loading
                ? 'Comprobando...'
                : existeCodigoExacto
                  ? `Contar ${codigoExacto}`
                  : `+ Crear ${codigoExacto}`}
            </Text>
          </Pressable>
        ) : null}

        {filtrosAbiertos ? (
          <View style={styles.filtrosPanel}>
            <View style={styles.statsRow}>
              <StatPill
                label="Contados"
                value={resumen.contados}
                active={filtroEstado === 'contados'}
                color={InventarioColors.primary}
                onPress={() => toggleFiltro('contados')}
              />
              <StatPill
                label="Pend."
                value={resumen.pendientes}
                active={filtroEstado === 'pendientes'}
                color={InventarioColors.warning}
                onPress={() => toggleFiltro('pendientes')}
              />
              <StatPill
                label="Total"
                value={resumen.totalProductos}
                active={filtroEstado === 'todos' && familiaId == null}
                color={InventarioColors.text}
                onPress={() => {
                  setFiltroEstado('todos');
                  setFamiliaId(null);
                }}
              />
            </View>

            {inventarioActivo ? (
              <Pressable
                style={styles.jornadaStrip}
                onPress={() => router.push('/inventario-en-curso')}>
                <View style={styles.jornadaDot} />
                <Text style={styles.jornadaText} numberOfLines={1}>
                  Jornada activa · {resumenVentas.movimientos} ventas · {resumenVentas.unidades} uds
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.familiasGrid}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.familiasScrollRow}
                keyboardShouldPersistTaps="handled">
                {chipsFamiliaFilas.fila1.map((chip) => (
                  <FamiliaChip
                    key={chip.id ?? 'todas'}
                    label={chip.label}
                    selected={familiaId === chip.id}
                    onPress={() => setFamiliaId(chip.id)}
                  />
                ))}
              </ScrollView>
              {chipsFamiliaFilas.fila2.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.familiasScrollRow}
                  keyboardShouldPersistTaps="handled">
                  {chipsFamiliaFilas.fila2.map((chip) => (
                    <FamiliaChip
                      key={chip.id ?? 'todas-2'}
                      label={chip.label}
                      selected={familiaId === chip.id}
                      onPress={() => setFamiliaId(chip.id)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={styles.resumenCompacto} numberOfLines={1}>
            {resumen.contados} cont · {resumen.pendientes} pend · {resumen.totalProductos} total
            {familiaNombre ? ` · ${familiaNombre}` : ''}
            {filtroEstado !== 'todos' ? ` · filtro ${filtroEstado}` : ''}
          </Text>
        )}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={InventarioColors.accent} style={styles.loader} />
      ) : (
        <FlatList
          style={styles.lista}
          data={items}
          keyExtractor={(item) => item.codpro}
          ListHeaderComponent={headerLista}
          renderItem={({ item, index }) =>
            vista === 'tarjetas' ? (
              <ProductoCard
                producto={item}
                compact
                onPress={() => abrirConteo(item.codpro)}
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
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim().length >= 1
                ? 'Sin resultados.'
                : 'No hay productos. Importa Excel desde Ajustes.'}
            </Text>
          }
          onRefresh={cargar}
          refreshing={loading}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={8}
        />
      )}
    </View>
  );
}

function ToolBtn({
  label,
  onPress,
  active,
  accent,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.toolBtn,
        active && styles.toolBtnActive,
        accent && styles.toolBtnAccent,
      ]}
      onPress={onPress}>
      <Text
        style={[
          styles.toolBtnText,
          active && styles.toolBtnTextActive,
          accent && styles.toolBtnTextAccent,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatPill({
  label,
  value,
  active,
  color,
  onPress,
}: {
  label: string;
  value: number;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.statPill, active && styles.statPillActive]} onPress={onPress}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={[styles.statLbl, active && styles.statLblActive]}>{label}</Text>
    </Pressable>
  );
}

function FamiliaChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.famChip, selected && styles.famChipOn]} onPress={onPress}>
      <Text style={[styles.famChipText, selected && styles.famChipTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: InventarioColors.bg },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: InventarioColors.border,
    backgroundColor: InventarioColors.bg,
  },
  search: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    fontSize: 14,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  toolBtnActive: {
    borderColor: InventarioColors.primary,
    backgroundColor: InventarioColors.activeBg,
  },
  toolBtnAccent: {
    backgroundColor: InventarioColors.accent,
    borderColor: InventarioColors.accent,
  },
  toolBtnText: { color: InventarioColors.textMuted, fontWeight: '700', fontSize: 12 },
  toolBtnTextActive: { color: InventarioColors.primary },
  toolBtnTextAccent: { color: InventarioColors.textOnAccent },
  accionCodigo: {
    marginTop: 6,
    backgroundColor: InventarioColors.accentMuted,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: InventarioColors.accent,
  },
  accionCodigoText: { color: InventarioColors.accent, fontWeight: '800', fontSize: 12 },
  filtrosPanel: { marginTop: 8, gap: 8 },
  statsRow: { flexDirection: 'row', gap: 6 },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: InventarioColors.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  statPillActive: { borderColor: InventarioColors.primary, backgroundColor: InventarioColors.activeBg },
  statVal: { fontSize: 15, fontWeight: '800' },
  statLbl: { color: InventarioColors.textMuted, fontSize: 11, fontWeight: '600' },
  statLblActive: { color: InventarioColors.primary },
  jornadaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: InventarioColors.jornadaBg,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: InventarioColors.jornadaBorder,
  },
  jornadaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: InventarioColors.jornadaDot },
  jornadaText: { flex: 1, color: InventarioColors.jornadaText, fontSize: 11, fontWeight: '600' },
  familiasGrid: { gap: 6 },
  familiasScrollRow: { flexDirection: 'row', gap: 6, paddingRight: 12 },
  famChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  famChipOn: { backgroundColor: InventarioColors.primary, borderColor: InventarioColors.primary },
  famChipText: { color: InventarioColors.text, fontSize: 11, fontWeight: '600' },
  famChipTextOn: { color: InventarioColors.textOnPrimary, fontWeight: '800' },
  resumenCompacto: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  lista: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  headerLista: { paddingTop: 6, paddingBottom: 4 },
  resumenLinea: { color: InventarioColors.textMuted, fontSize: 11, marginBottom: 4 },
  loader: { marginTop: 32 },
  empty: { color: InventarioColors.textMuted, textAlign: 'center', marginTop: 40, lineHeight: 20 },
});
