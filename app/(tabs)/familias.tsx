import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import { listFamilias, toggleFamiliaActiva, upsertFamilia } from '@/lib/db/repository';
import type { Familia } from '@/lib/types';

export default function FamiliasScreen() {
  const db = useSQLiteContext();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [nueva, setNueva] = useState('');

  const cargar = useCallback(async () => {
    setFamilias(await listFamilias(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const agregar = async () => {
    const nombre = nueva.trim();
    if (!nombre) return;
    try {
      await upsertFamilia(db, nombre);
      setNueva('');
      await cargar();
    } catch {
      Alert.alert('Error', 'Ya existe una familia con ese nombre.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Cada operador puede filtrar por familia en Inventario (ej. solo Frenos, solo Motor).
      </Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Nueva familia (ej. Frenos)"
          placeholderTextColor={InventarioColors.textMuted}
          value={nueva}
          onChangeText={setNueva}
        />
        <Pressable style={styles.btn} onPress={agregar}>
          <Text style={styles.btnText}>Agregar</Text>
        </Pressable>
      </View>

      <FlatList
        data={familias}
        keyExtractor={(f) => String(f.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.estado}>{item.activa ? 'Activa' : 'Inactiva'}</Text>
            </View>
            <Pressable
              style={styles.toggle}
              onPress={async () => {
                await toggleFamiliaActiva(db, item.id);
                await cargar();
              }}>
              <Text style={styles.toggleText}>{item.activa ? 'Desactivar' : 'Activar'}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: InventarioColors.bg, padding: 16 },
  help: { color: InventarioColors.textMuted, marginBottom: 16, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  btn: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  btnText: { color: '#111', fontWeight: '700' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  nombre: { color: InventarioColors.text, fontWeight: '700', fontSize: 16 },
  estado: { color: InventarioColors.textMuted, fontSize: 12, marginTop: 2 },
  toggle: { padding: 8 },
  toggleText: { color: InventarioColors.accent, fontWeight: '600' },
});
