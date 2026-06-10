import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EstadisticasAlmacenPanel } from "@/components/almacen/EstadisticasAlmacen";
import { FiltrosAlmacen } from "@/components/almacen/FiltrosAlmacen";
import { ProductoAlmacenCard } from "@/components/almacen/ProductoAlmacenCard";
import { InventarioColors } from "@/constants/inventario-theme";
import { runAlmacenDb } from "@/lib/almacen/db-queue";
import {
  elegirArchivoErp,
  leerFilasDesdeErpUri,
} from "@/lib/almacen/excel-erp-import";
import {
  buscarProductosAlmacen,
  getAlmacenMeta,
  getEstadisticasAlmacen,
  importarAlmacenDesdeErp,
  listFamiliasAlmacen,
  listFavoritosAlmacen,
  listHistorialBusqueda,
  listMarcasAlmacen,
  listProductosVistosRecientes,
  registrarBusquedaAlmacen,
  toggleFavoritoAlmacen,
} from "@/lib/almacen/repository";
import type {
  EstadisticasAlmacen,
  FiltroAlmacenRapido,
  ProductoAlmacen,
  ProductoVistoReciente,
} from "@/lib/almacen/types";

function etiquetaBotonImportar(ancho: number): string | null {
  if (ancho < 300) return null;
  if (ancho < 380) return "Importar";
  return "Importar Excel ERP";
}

export default function AlmacenScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { width: anchoPantalla } = useWindowDimensions();

  const [meta, setMeta] = useState({
    totalProductos: 0,
    ultimaImportacion: null as string | null,
  });
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<FiltroAlmacenRapido>("todos");
  const [familiaSel, setFamiliaSel] = useState<string | null>(null);
  const [marcaSel, setMarcaSel] = useState<string | null>(null);
  const [familias, setFamilias] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [items, setItems] = useState<ProductoAlmacen[]>([]);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [historial, setHistorial] = useState<string[]>([]);
  const [vistos, setVistos] = useState<ProductoVistoReciente[]>([]);
  const [stats, setStats] = useState<EstadisticasAlmacen>({
    productosTop: [],
    marcasTop: [],
    familiasTop: [],
  });
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [modalImportVisible, setModalImportVisible] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [extrasAbiertos, setExtrasAbiertos] = useState(true);
  const buscarSeq = useRef(0);

  const hayFiltroAvanzado =
    filtro !== "todos" || familiaSel != null || marcaSel != null;
  const hayExtras = historial.length > 0 || vistos.length > 0;

  const cargarMeta = useCallback(async () => {
    const [m, f, mar, h, recientes, estadisticas] = await Promise.all([
      getAlmacenMeta(db),
      listFamiliasAlmacen(db),
      listMarcasAlmacen(db),
      listHistorialBusqueda(db, 6),
      listProductosVistosRecientes(db, 6),
      getEstadisticasAlmacen(db),
    ]);
    setMeta(m);
    setFamilias(f);
    setMarcas(mar);
    setHistorial(h);
    setVistos(recientes);
    setStats(estadisticas);
  }, [db]);

  const buscar = useCallback(async () => {
    const seq = ++buscarSeq.current;
    setLoading(true);
    try {
      const lista = await buscarProductosAlmacen(db, {
        query,
        familia: familiaSel,
        marca: marcaSel,
        filtro,
        limit: 80,
      });
      if (seq !== buscarSeq.current) return;
      const favs = await runAlmacenDb(() => listFavoritosAlmacen(db));
      if (seq !== buscarSeq.current) return;
      setItems(lista);
      setFavoritos(new Set(favs.map((p) => p.codigo)));
    } finally {
      if (seq === buscarSeq.current) setLoading(false);
    }
  }, [db, query, familiaSel, marcaSel, filtro]);

  useFocusEffect(
    useCallback(() => {
      cargarMeta();
    }, [cargarMeta]),
  );

  useEffect(() => {
    const delay = query.trim() ? 280 : 0;
    const t = setTimeout(buscar, delay);
    return () => clearTimeout(t);
  }, [query, familiaSel, marcaSel, filtro, buscar]);

  const ejecutarImportacionErp = async () => {
    setModalImportVisible(false);
    setImportando(true);
    try {
      const uri = await elegirArchivoErp();
      if (!uri) return;
      const filas = await leerFilasDesdeErpUri(uri);
      if (filas.length === 0) {
        Alert.alert(
          "Archivo vacío",
          "No se encontraron productos con columna Código.",
        );
        return;
      }
      const { importados } = await importarAlmacenDesdeErp(db, filas);
      await cargarMeta();
      await buscar();
      Alert.alert(
        "Importación lista",
        `${importados} productos cargados desde el Excel del ERP.`,
      );
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo importar",
      );
    } finally {
      setImportando(false);
    }
  };

  const onSubmitBusqueda = async () => {
    if (query.trim().length >= 2) {
      await registrarBusquedaAlmacen(db, query);
      setHistorial(await listHistorialBusqueda(db, 6));
    }
    buscar();
  };

  const toggleFav = async (codigo: string) => {
    const on = await toggleFavoritoAlmacen(db, codigo);
    setFavoritos((prev) => {
      const next = new Set(prev);
      if (on) next.add(codigo);
      else next.delete(codigo);
      return next;
    });
    if (filtro === "favoritos") buscar();
  };

  const irProducto = (codigo: string) => {
    router.push(`/almacen/${encodeURIComponent(codigo)}` as Href);
  };

  const fechaImport = meta.ultimaImportacion
    ? new Date(meta.ultimaImportacion).toLocaleString("es-EC", {
        dateStyle: "short",
        timeStyle: anchoPantalla < 380 ? undefined : "short",
      })
    : "Sin importar";

  const etiquetaImport = etiquetaBotonImportar(anchoPantalla);
  const headerEstrecho = anchoPantalla < 380;

  const resumenLinea = query.trim()
    ? `${items.length} resultado${items.length === 1 ? "" : "s"}`
    : `${items.length} de ${meta.totalProductos} productos`;

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.resumenLinea}>{resumenLinea}</Text>
      {loading && items.length > 0 ? (
        <ActivityIndicator color={InventarioColors.primary} size="small" />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.screenHeader}>
        <View style={styles.headerTopRow}>
          <Text style={styles.titulo}>Almacén</Text>
          <Pressable
            style={[
              styles.importBtn,
              !etiquetaImport && styles.importBtnIcono,
              importando && styles.disabled,
            ]}
            disabled={importando}
            onPress={() => setModalImportVisible(true)}
            accessibilityLabel="Importar Excel del ERP"
          >
            {importando ? (
              <ActivityIndicator
                color={InventarioColors.textOnAccent}
                size="small"
              />
            ) : etiquetaImport ? (
              <Text style={styles.importBtnText} numberOfLines={1}>
                {etiquetaImport}
              </Text>
            ) : (
              <MaterialIcons
                name="upload-file"
                size={20}
                color={InventarioColors.textOnAccent}
              />
            )}
          </Pressable>
        </View>
        {headerEstrecho ? (
          <View style={styles.headerMetaBlock}>
            <Text style={styles.headerSub}>
              {meta.totalProductos.toLocaleString("es-EC")} productos
            </Text>
            <Text style={styles.headerSub}>Actualizado: {fechaImport}</Text>
          </View>
        ) : (
          <Text
            style={[styles.headerSub, styles.headerSubSpaced]}
            numberOfLines={1}
          >
            {meta.totalProductos.toLocaleString("es-EC")} productos ·
            Actualizado: {fechaImport}
          </Text>
        )}
      </View>

      <Modal
        visible={modalImportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalImportVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalImportVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Importar catálogo del ERP</Text>
            <Text style={styles.modalBody}>
              Selecciona el archivo Excel exportado desde el ERP. Se
              reemplazarán todos los productos del almacén en este dispositivo.
            </Text>
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoLine}>
                Productos actuales:{" "}
                <Text style={styles.modalInfoVal}>
                  {meta.totalProductos.toLocaleString("es-EC")}
                </Text>
              </Text>
              <Text style={styles.modalInfoLine}>
                Última actualización:{" "}
                <Text style={styles.modalInfoVal}>{fechaImport}</Text>
              </Text>
            </View>
            <Pressable
              style={[styles.modalPrimary, importando && styles.disabled]}
              disabled={importando}
              onPress={ejecutarImportacionErp}
            >
              {importando ? (
                <ActivityIndicator color={InventarioColors.textOnAccent} />
              ) : (
                <Text style={styles.modalPrimaryText}>
                  Elegir Excel e importar
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setModalImportVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Nombre, marca, familia… (ej: bujia 8, filtro aveo)"
          placeholderTextColor={InventarioColors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSubmitBusqueda}
        />

        <View style={styles.toolbar}>
          <ToolBtn
            label="Filtros"
            active={filtrosAbiertos || hayFiltroAvanzado}
            onPress={() => setFiltrosAbiertos((v) => !v)}
          />
          {hayExtras || stats.productosTop.length > 0 ? (
            <ToolBtn
              label="Recientes"
              active={extrasAbiertos}
              onPress={() => setExtrasAbiertos((v) => !v)}
            />
          ) : null}
        </View>

        <FiltrosAlmacen
          filtro={filtro}
          onFiltro={setFiltro}
          familias={familias}
          marcas={marcas}
          familiaSel={familiaSel}
          marcaSel={marcaSel}
          onFamilia={setFamiliaSel}
          onMarca={setMarcaSel}
          soloRapidos={!filtrosAbiertos}
          mostrarAvanzados={filtrosAbiertos}
        />

        {extrasAbiertos ? (
          <View style={styles.extrasPanel}>
            {historial.length > 0 && !query ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                <Text style={styles.chipsLabel}>Búsquedas:</Text>
                {historial.map((h) => (
                  <Pressable
                    key={h}
                    style={styles.histChip}
                    onPress={() => setQuery(h)}
                  >
                    <Text style={styles.histChipText}>{h}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {vistos.length > 0 && !query ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                <Text style={styles.chipsLabel}>Vistos:</Text>
                {vistos.map((v) => (
                  <Pressable
                    key={v.codigo}
                    style={styles.vistoChip}
                    onPress={() => irProducto(v.codigo)}
                  >
                    <Text style={styles.vistoChipText} numberOfLines={2}>
                      {v.descripcion}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {!query ? (
              <EstadisticasAlmacenPanel stats={stats} onProducto={irProducto} />
            ) : null}
          </View>
        ) : null}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator
          color={InventarioColors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          style={styles.lista}
          data={items}
          keyExtractor={(item) => item.codigo}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <ProductoAlmacenCard
              producto={item}
              esFavorito={favoritos.has(item.codigo)}
              onPress={() => irProducto(item.codigo)}
              onToggleFavorito={() => toggleFav(item.codigo)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {meta.totalProductos === 0
                ? "Importa el Excel del ERP con el botón «Importar Excel»."
                : "Sin resultados. Prueba otras palabras o quita filtros."}
            </Text>
          }
          keyboardShouldPersistTaps="handled"
          onRefresh={buscar}
          refreshing={loading && items.length > 0}
        />
      )}
    </SafeAreaView>
  );
}

function ToolBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.toolBtn, active && styles.toolBtnOn]}
      onPress={onPress}
    >
      <Text style={[styles.toolBtnText, active && styles.toolBtnTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: InventarioColors.bg },
  screenHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: InventarioColors.primaryDark,
    backgroundColor: InventarioColors.primary,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  titulo: {
    flex: 1,
    color: InventarioColors.textOnPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  headerMetaBlock: { marginTop: 4, gap: 1 },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "500",
  },
  headerSubSpaced: { marginTop: 4 },
  importBtn: {
    backgroundColor: InventarioColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    maxWidth: "46%",
  },
  importBtnIcono: {
    paddingHorizontal: 10,
    minWidth: 40,
  },
  importBtnText: {
    color: InventarioColors.textOnAccent,
    fontWeight: "800",
    fontSize: 11,
  },
  disabled: { opacity: 0.6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 37, 69, 0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  modalTitle: {
    color: InventarioColors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  modalBody: {
    color: InventarioColors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  modalInfo: {
    marginTop: 14,
    backgroundColor: InventarioColors.primarySoft,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  modalInfoLine: { color: InventarioColors.textMuted, fontSize: 13 },
  modalInfoVal: { color: InventarioColors.text, fontWeight: "700" },
  modalPrimary: {
    marginTop: 18,
    backgroundColor: InventarioColors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: InventarioColors.textOnAccent,
    fontWeight: "800",
    fontSize: 15,
  },
  modalCancel: { marginTop: 10, paddingVertical: 10, alignItems: "center" },
  modalCancelText: {
    color: InventarioColors.textMuted,
    fontWeight: "600",
    fontSize: 14,
  },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: InventarioColors.bg,
    borderBottomWidth: 1,
    borderBottomColor: InventarioColors.borderLight,
  },
  search: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    fontSize: 15,
  },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  toolBtnOn: {
    backgroundColor: InventarioColors.primarySoft,
    borderColor: InventarioColors.primary,
  },
  toolBtnText: {
    color: InventarioColors.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },
  toolBtnTextOn: { color: InventarioColors.primary },
  extrasPanel: { marginTop: 4, gap: 6 },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
  },
  chipsLabel: {
    color: InventarioColors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  histChip: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    maxWidth: 120,
  },
  histChipText: { color: InventarioColors.text, fontSize: 11 },
  vistoChip: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    maxWidth: 160,
  },
  vistoChipText: {
    color: InventarioColors.text,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  lista: { flex: 1 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    gap: 8,
  },
  resumenLinea: {
    color: InventarioColors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  loader: { marginTop: 32 },
  empty: {
    color: InventarioColors.textMuted,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 20,
    fontSize: 13,
  },
});
