import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
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
import { InventarioColors } from '@/constants/inventario-theme';
import {
  normalizeCodpro,
  normalizeCodproInput,
  normalizeDespro,
  normalizeDesproInput,
} from '@/lib/codpro';
import { getProducto, listFamilias, upsertProducto } from '@/lib/db/repository';
import type { Familia } from '@/lib/types';

type Props = { codpro?: string };

export default function ProductoForm({ codpro }: Props) {
  const db = useSQLiteContext();
  const router = useRouter();
  const esEdicion = Boolean(codpro);
  const titulo = esEdicion ? 'Editar producto' : 'Nuevo producto';

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(esEdicion);
  const [codproVal, setCodproVal] = useState(codpro ?? '');
  const [despro, setDespro] = useState('');
  const [um, setUm] = useState('UND');
  const [costo, setCosto] = useState('');
  const [pvpa, setPvpa] = useState('');
  const [marca, setMarca] = useState('');
  const [familiaId, setFamiliaId] = useState<number | null>(null);
  const [stockSistema, setStockSistema] = useState('');

  const cargar = useCallback(async () => {
    setFamilias(await listFamilias(db, true));
    if (!codpro) return;
    setLoading(true);
    const p = await getProducto(db, codpro);
    if (p) {
      setCodproVal(p.codpro);
      setDespro(p.despro);
      setUm(p.um);
      setCosto(p.costo != null ? String(p.costo) : '');
      setPvpa(p.pvpa != null ? String(p.pvpa) : '');
      setMarca(p.marca ?? '');
      setFamiliaId(p.familia_id);
      setStockSistema(p.stock_sistema != null ? String(p.stock_sistema) : '');
    }
    setLoading(false);
  }, [codpro, db]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async () => {
    const cod = normalizeCodpro(codproVal);
    if (!cod || !despro.trim()) {
      Alert.alert('Datos incompletos', 'Código y descripción son obligatorios.');
      return;
    }
    if (familiaId == null) {
      Alert.alert('Familia obligatoria', 'Selecciona la familia del producto.');
      return;
    }
    await upsertProducto(db, {
      codpro: cod,
      despro: normalizeDespro(despro),
      um: um.trim() || 'UND',
      costo: costo ? parseFloat(costo.replace(',', '.')) : null,
      pvpa: pvpa ? parseFloat(pvpa.replace(',', '.')) : null,
      marca: marca.trim() || null,
      familia_id: familiaId,
      stock_sistema: stockSistema ? parseFloat(stockSistema.replace(',', '.')) : null,
    });
    router.back();
  };

  if (loading) {
    return (
      <ModalScaffold title={titulo}>
        <View style={styles.center}>
          <ActivityIndicator color={InventarioColors.accent} />
        </View>
      </ModalScaffold>
    );
  }

  return (
    <ModalScaffold title={titulo}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Field
        label="Código del cartón (codpro)"
        value={codproVal}
        onChangeText={(t) => setCodproVal(normalizeCodproInput(t))}
        editable={!esEdicion}
      />
      <Field
        label="Descripción (despro)"
        value={despro}
        onChangeText={(t) => setDespro(normalizeDesproInput(t))}
        autoCapitalize="characters"
      />
      <Field label="Unidad (u.m.)" value={um} onChangeText={setUm} />
      <Field label="Costo proveedor" value={costo} onChangeText={setCosto} keyboardType="decimal-pad" />
      <Field label="PVP A (pvpA)" value={pvpa} onChangeText={setPvpa} keyboardType="decimal-pad" />
      <Field label="Marca (opcional)" value={marca} onChangeText={setMarca} />
      <Field label="Stock sistema (opcional)" value={stockSistema} onChangeText={setStockSistema} keyboardType="decimal-pad" />

      <Text style={styles.label}>Familia (obligatoria)</Text>
      {familias.length === 0 ? (
        <Text style={styles.familiaHint}>
          No hay familias activas. Créalas en la pestaña Familias.
        </Text>
      ) : null}
      <View style={styles.chips}>
        {familias.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.chip, familiaId === f.id && styles.chipOn]}
            onPress={() => setFamiliaId(f.id)}>
            <Text style={familiaId === f.id ? styles.chipTextOn : styles.chipText}>{f.nombre}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.save} onPress={guardar}>
        <Text style={styles.saveText}>Guardar producto</Text>
      </Pressable>
    </ScrollView>
    </ModalScaffold>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  editable?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  autoCapitalize?: 'none' | 'characters' | 'sentences';
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={InventarioColors.textMuted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center' },
  label: { color: InventarioColors.textMuted, marginTop: 12, marginBottom: 6 },
  familiaHint: { color: InventarioColors.accent, fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 14,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  inputDisabled: { opacity: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  chipOn: { backgroundColor: InventarioColors.accent, borderColor: InventarioColors.accent },
  chipText: { color: InventarioColors.text },
  chipTextOn: { color: '#111', fontWeight: '700' },
  save: {
    marginTop: 24,
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveText: { color: '#111', fontWeight: '800' },
});
