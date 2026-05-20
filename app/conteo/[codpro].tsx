import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ModalScaffold } from '@/components/inventario/ModalScaffold';
import { CampoRapido } from '@/components/inventario/CampoRapido';
import { NumPad } from '@/components/inventario/NumPad';
import { InventarioColors } from '@/constants/inventario-theme';
import { useDeviceId } from '@/hooks/use-device-id';
import {
  normalizeCodpro,
  normalizeCodproInput,
  normalizeDespro,
  normalizeDesproInput,
} from '@/lib/codpro';
import { stockAjustado, stockRealEnTienda } from '@/lib/inventario-activo';
import { getProducto, guardarFichaRapida, listFamilias } from '@/lib/db/repository';
import type { Familia } from '@/lib/types';

function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

export default function ConteoScreen() {
  const { codpro: codproParam, prefijo } = useLocalSearchParams<{
    codpro: string;
    prefijo?: string;
  }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const deviceId = useDeviceId();
  const codproInputRef = useRef<TextInput>(null);

  const esNuevo = codproParam === 'nuevo';
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [codproInput, setCodproInput] = useState(
    esNuevo ? normalizeCodpro(prefijo ?? '') : normalizeCodpro(codproParam ?? '')
  );
  const [despro, setDespro] = useState('');
  const [um, setUm] = useState('UND');
  const [costo, setCosto] = useState('');
  const [pvpa, setPvpa] = useState('');
  const [marca, setMarca] = useState('');
  const [familiaId, setFamiliaId] = useState<number | null>(null);
  const [stockStr, setStockStr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(!esNuevo);
  const [ventasDesdeConteo, setVentasDesdeConteo] = useState(0);
  const [stockContadoPrev, setStockContadoPrev] = useState<number | null>(null);

  const codpro = esNuevo ? normalizeCodpro(codproInput) : normalizeCodpro(codproParam ?? '');

  const cargarProducto = useCallback(async () => {
    if (!codpro || esNuevo) {
      setCargando(false);
      return;
    }
    setCargando(true);
    const p = await getProducto(db, codpro);
    if (p) {
      setDespro(p.despro);
      setUm(p.um || 'UND');
      setCosto(p.costo != null ? String(p.costo) : '');
      setPvpa(p.pvpa != null ? String(p.pvpa) : '');
      setMarca(p.marca ?? '');
      setFamiliaId(p.familia_id);
      setVentasDesdeConteo(p.ventas_desde_conteo ?? 0);
      setStockContadoPrev(p.stock_contado);
      if (p.stock_contado != null) {
        const real = stockRealEnTienda(p);
        setStockStr(real != null ? String(real) : String(p.stock_contado));
      }
    }
    setCargando(false);
  }, [codpro, db, esNuevo]);

  useEffect(() => {
    listFamilias(db, true).then(setFamilias);
  }, [db]);

  useEffect(() => {
    cargarProducto();
  }, [cargarProducto]);

  const limpiarParaSiguiente = () => {
    setCodproInput('');
    setDespro('');
    setUm('UND');
    setCosto('');
    setPvpa('');
    setMarca('');
    setFamiliaId(null);
    setStockStr('');
    setTimeout(() => codproInputRef.current?.focus(), 80);
  };

  const guardar = async (yContinuar: boolean) => {
    const cod = esNuevo ? normalizeCodpro(codproInput) : codpro;
    if (!cod) {
      Alert.alert('Código requerido', 'Escribe el código del cartón.');
      return;
    }
    const stock = parseNum(stockStr);
    if (stockStr.trim() !== '' && (stock == null || stock < 0)) {
      Alert.alert('Stock inválido', 'Ingresa una cantidad válida.');
      return;
    }
    setGuardando(true);
    try {
      await guardarFichaRapida(
        db,
        {
          codpro: cod,
          despro: normalizeDespro(despro) || cod,
          um: um.trim() || 'UND',
          costo: parseNum(costo),
          pvpa: parseNum(pvpa),
          marca: marca.trim() || null,
          familia_id: familiaId,
          stock,
        },
        deviceId
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (yContinuar) {
        if (esNuevo) limpiarParaSiguiente();
        else router.replace({ pathname: '/conteo/[codpro]', params: { codpro: 'nuevo' } });
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const titulo = esNuevo ? 'Nuevo conteo' : 'Conteo';

  if (cargando) {
    return (
      <ModalScaffold title={titulo}>
        <View style={styles.center}>
          <ActivityIndicator color={InventarioColors.accent} size="large" />
        </View>
      </ModalScaffold>
    );
  }

  return (
    <ModalScaffold title={titulo}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {esNuevo ? (
        <CampoRapido
          ref={codproInputRef}
          label="CÓDIGO (cartón)"
          value={codproInput}
          onChangeText={(t) => setCodproInput(normalizeCodproInput(t))}
          autoCapitalize="characters"
          placeholder="04465-0E010"
          autoFocus
        />
      ) : (
        <Text style={styles.codpro}>{codpro}</Text>
      )}

      <CampoRapido
        label="Descripción"
        value={despro}
        onChangeText={(t) => setDespro(normalizeDesproInput(t))}
        placeholder="Nombre del repuesto"
        autoCapitalize="characters"
      />

      <View style={styles.row}>
        <CampoRapido label="U.M." value={um} onChangeText={setUm} flex={0.35} />
        <CampoRapido label="Marca" value={marca} onChangeText={setMarca} flex={0.65} />
      </View>

      <View style={styles.row}>
        <CampoRapido
          label="Costo prov."
          value={costo}
          onChangeText={setCosto}
          keyboardType="decimal-pad"
        />
        <CampoRapido label="PVP A" value={pvpa} onChangeText={setPvpa} keyboardType="decimal-pad" />
      </View>

      <Text style={styles.section}>Familia</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, familiaId === null && styles.chipOn]}
            onPress={() => setFamiliaId(null)}>
            <Text style={familiaId === null ? styles.chipOnText : styles.chipText}>—</Text>
          </Pressable>
          {familias.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.chip, familiaId === f.id && styles.chipOn]}
              onPress={() => setFamiliaId(f.id)}>
              <Text style={familiaId === f.id ? styles.chipOnText : styles.chipText}>{f.nombre}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {ventasDesdeConteo > 0 ? (
        <View style={styles.ventasBox}>
          <Text style={styles.ventasTitle}>
            Vendidos desde tu último conteo: {ventasDesdeConteo}
          </Text>
          {stockContadoPrev != null ? (
            <Text style={styles.ventasSub}>
              Conteo guardado {stockContadoPrev} − ventas = stock real{' '}
              {stockAjustado(stockContadoPrev, ventasDesdeConteo)}. Cuenta lo que hay en estante ahora.
            </Text>
          ) : (
            <Text style={styles.ventasSub}>
              Registra el físico actual en estante (ya descontando lo vendido).
            </Text>
          )}
        </View>
      ) : null}

      <Text style={styles.section}>Stock contado (físico en estante)</Text>
      <Text style={styles.stockDisplay}>{stockStr || '0'}</Text>
      <NumPad value={stockStr} onChange={setStockStr} />

      <View style={styles.quickRow}>
        {[0, 1, 5, 10].map((n) => (
          <Pressable key={n} style={styles.quickBtn} onPress={() => setStockStr(String(n))}>
            <Text style={styles.quickText}>{n}</Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.quickBtn}
          onPress={() => setStockStr((s) => String((parseFloat(s) || 0) + 1))}>
          <Text style={styles.quickText}>+1</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.primary, guardando && styles.disabled]}
        disabled={guardando}
        onPress={() => guardar(true)}>
        <Text style={styles.primaryText}>{guardando ? 'Guardando...' : 'Guardar y otro código'}</Text>
      </Pressable>

      <Pressable style={styles.secondary} disabled={guardando} onPress={() => guardar(false)}>
        <Text style={styles.secondaryText}>Guardar y volver</Text>
      </Pressable>
    </ScrollView>
    </ModalScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  center: { flex: 1, justifyContent: 'center' },
  codpro: {
    color: InventarioColors.accent,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 10 },
  section: {
    color: InventarioColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  ventasBox: {
    backgroundColor: '#2B1515',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  ventasTitle: { color: '#FCA5A5', fontWeight: '800', fontSize: 14 },
  ventasSub: { color: InventarioColors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  chipsScroll: { maxHeight: 44 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  chipOn: { backgroundColor: InventarioColors.accent, borderColor: InventarioColors.accent },
  chipText: { color: InventarioColors.text, fontSize: 13 },
  chipOnText: { color: '#111', fontWeight: '700', fontSize: 13 },
  stockDisplay: {
    color: InventarioColors.text,
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickRow: { flexDirection: 'row', gap: 8, marginVertical: 4 },
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
    marginTop: 8,
  },
  primaryText: { color: '#111', fontWeight: '800', fontSize: 16 },
  secondary: {
    padding: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  secondaryText: { color: InventarioColors.text, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
