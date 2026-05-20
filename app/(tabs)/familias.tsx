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
import {
  activarFamilia,
  countProductosEnFamilia,
  desactivarFamilia,
  eliminarFamilia,
  listFamilias,
  upsertFamilia,
} from '@/lib/db/repository';
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

  const confirmarDesactivar = (item: Familia) => {
    Alert.alert(
      'Desactivar familia',
      `«${item.nombre}» dejará de aparecer en los filtros de Inventario. Los productos conservan su familia.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          onPress: async () => {
            await desactivarFamilia(db, item.id);
            await cargar();
          },
        },
      ]
    );
  };

  const confirmarEliminar = async (item: Familia) => {
    const productos = await countProductosEnFamilia(db, item.id);
    if (productos > 0) {
      Alert.alert(
        'No se puede eliminar',
        `Hay ${productos} producto${productos === 1 ? '' : 's'} con la familia «${item.nombre}». Desactívala o reasigna esos productos antes de eliminar.`
      );
      return;
    }
    Alert.alert(
      'Eliminar familia',
      `¿Eliminar «${item.nombre}» de forma permanente? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await eliminarFamilia(db, item.id);
            if (!result.ok) {
              Alert.alert(
                'No se puede eliminar',
                `Hay ${result.productos} producto(s) con esta familia.`
              );
              return;
            }
            await cargar();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Cada operador puede filtrar por familia en Inventario (ej. solo Frenos, solo Motor).
        Desactivar oculta la familia en filtros; eliminar la borra si no tiene productos.
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
            <View style={styles.itemInfo}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.estado}>
                {item.activa ? 'Activa' : 'Inactiva'}
                {item.activa ? '' : ' · no aparece en Inventario'}
              </Text>
            </View>
            <View style={styles.acciones}>
              {item.activa ? (
                <Pressable style={styles.accionBtn} onPress={() => confirmarDesactivar(item)}>
                  <Text style={styles.accionText}>Desactivar</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.accionBtn}
                  onPress={async () => {
                    await activarFamilia(db, item.id);
                    await cargar();
                  }}>
                  <Text style={styles.accionText}>Activar</Text>
                </Pressable>
              )}
              <Pressable style={styles.accionBtn} onPress={() => confirmarEliminar(item)}>
                <Text style={styles.eliminarText}>Eliminar</Text>
              </Pressable>
            </View>
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
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  itemInfo: { marginBottom: 10 },
  nombre: { color: InventarioColors.text, fontWeight: '700', fontSize: 16 },
  estado: { color: InventarioColors.textMuted, fontSize: 12, marginTop: 2 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accionBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  accionText: { color: InventarioColors.accent, fontWeight: '600', fontSize: 14 },
  eliminarText: { color: '#F87171', fontWeight: '600', fontSize: 14 },
});
