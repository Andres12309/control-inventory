import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
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

import { InventarioColors } from '@/constants/inventario-theme';
import { useDeviceId } from '@/hooks/use-device-id';
import { useInventarioActivo } from '@/hooks/use-inventario-activo';
import {
  aplicarSyncPull,
  buildSyncPushPayload,
  getConfig,
  listParaExportar,
  setConfig,
} from '@/lib/db/repository';
import { elegirArchivoExcel, leerFilasDesdeExcelUri } from '@/lib/excel-import';
import { exportarInventarioExcel } from '@/lib/excel-export';
import { importarDesdeExcel } from '@/lib/db/repository';
import { pingServer, syncPull, syncPush } from '@/lib/sync-client';

export default function AjustesScreen() {
  const db = useSQLiteContext();
  const deviceId = useDeviceId();
  const { activo, resumenVentas, iniciar, cerrar } = useInventarioActivo();
  const [serverUrl, setServerUrl] = useState('192.168.1.100:8787');
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [probandoConexion, setProbandoConexion] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const url = await getConfig(db, 'sync_server_url');
        if (url) setServerUrl(url);
      })();
    }, [db])
  );

  const guardarUrl = async () => {
    await setConfig(db, 'sync_server_url', serverUrl.trim());
    Alert.alert('Guardado', 'URL del coordinador actualizada.');
  };

  const probarConexion = async () => {
    await setConfig(db, 'sync_server_url', serverUrl.trim());
    setProbandoConexion(true);
    try {
      const result = await pingServer(serverUrl);
      if (result.ok) {
        Alert.alert('Conexión OK', `El coordinador responde en ${serverUrl.trim()}`);
      } else {
        const expoGo =
          Constants.appOwnership === 'expo'
            ? '\n\nEstás en Expo Go: si es iPhone, acepta «Red local» cuando lo pida el sistema. Si sigue fallando, instala el APK (build EAS) en lugar de Expo Go.'
            : '';
        Alert.alert('No se pudo conectar', result.error + expoGo);
      }
    } finally {
      setProbandoConexion(false);
    }
  };

  const importar = async () => {
    if (!deviceId) return;
    setImportando(true);
    try {
      const uri = await elegirArchivoExcel();
      if (!uri) return;
      const filas = await leerFilasDesdeExcelUri(uri);
      if (filas.length === 0) {
        Alert.alert('Archivo vacío', 'No se encontraron filas con columna de código de producto.');
        return;
      }
      const { importados, omitidos } = await importarDesdeExcel(db, filas, deviceId);
      Alert.alert(
        'Importación lista',
        `${importados} productos importados (código y descripción en MAYÚSCULAS).${omitidos ? ` ${omitidos} filas omitidas.` : ''}`
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo importar');
    } finally {
      setImportando(false);
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const items = await listParaExportar(db);
      if (items.length === 0) {
        Alert.alert('Sin datos', 'No hay productos para exportar.');
        return;
      }
      await exportarInventarioExcel(items);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo exportar');
    } finally {
      setExportando(false);
    }
  };

  const sincronizar = async () => {
    if (!deviceId) return;
    await setConfig(db, 'sync_server_url', serverUrl.trim());
    setSincronizando(true);
    try {
      const config = { servidorUrl: serverUrl, deviceId };
      const ping = await pingServer(serverUrl);
      if (!ping.ok) {
        Alert.alert('Servidor no disponible', ping.error);
        return;
      }
      const remoto = await syncPull(config);
      await aplicarSyncPull(db, remoto);
      const local = await buildSyncPushPayload(db);
      await syncPush(config, local);
      Alert.alert('Listo', 'Inventario sincronizado con el coordinador.');
    } catch (e) {
      Alert.alert('Error de sincronización', e instanceof Error ? e.message : 'Falló la sync');
    } finally {
      setSincronizando(false);
    }
  };

  const cerrarJornada = () => {
    Alert.alert(
      'Cerrar jornada',
      '¿Finalizar el inventario en curso? Las ventas quedan guardadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar', onPress: () => cerrar() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Inventario sin cerrar tienda</Text>
      <Text style={styles.desc}>
        Activa la jornada al empezar a contar. Registra cada venta mientras atiendes para que el
        inventario no pierda unidades ni se duplique stock.
      </Text>
      {activo ? (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Jornada activa</Text>
            <Text style={styles.infoItem}>
              {resumenVentas.movimientos} ventas · {resumenVentas.unidades} unidades
            </Text>
          </View>
          <Pressable style={styles.primary} onPress={() => router.push('/venta-rapida')}>
            <Text style={styles.primaryText}>− Registrar venta</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.push('/inventario-en-curso')}>
            <Text style={styles.secondaryText}>Ver movimientos y cerrar jornada</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={cerrarJornada}>
            <Text style={styles.secondaryText}>Cerrar jornada rápido</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          style={styles.primary}
          onPress={async () => {
            await iniciar();
            Alert.alert('Listo', 'Inventario en curso activado. Registra las ventas del mostrador.');
          }}>
          <Text style={styles.primaryText}>Activar inventario en curso</Text>
        </Pressable>
      )}

      <Text style={[styles.section, { marginTop: 28 }]}>Excel</Text>
      <Text style={styles.desc}>
        Al exportar, la columna Stock trae el stock real a esa fecha (conteo menos ventas posteriores).
        Sin columnas de movimientos. Al importar acepta muchas variantes de encabezados.
      </Text>
      <Pressable
        style={[styles.secondary, importando && styles.disabled]}
        disabled={importando}
        onPress={importar}>
        {importando ? (
          <ActivityIndicator color={InventarioColors.text} />
        ) : (
          <Text style={styles.secondaryText}>Importar catálogo (.xlsx)</Text>
        )}
      </Pressable>
      <Pressable
        style={[styles.primary, exportando && styles.disabled]}
        disabled={exportando}
        onPress={exportar}>
        {exportando ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.primaryText}>Exportar inventario (.xlsx)</Text>
        )}
      </Pressable>

      <Text style={[styles.section, { marginTop: 28 }]}>Sincronización en red (LAN)</Text>
      <Text style={styles.desc}>
        Varios teléfonos pueden contar a la vez. El PC debe tener npm run sync-server activo. Teléfono
        y PC en la misma WiFi (no datos móviles). Usa solo IP:puerto, ej. 192.168.0.108:8787
      </Text>
      <Text style={styles.label}>IP del coordinador</Text>
      <TextInput
        style={styles.input}
        value={serverUrl}
        onChangeText={setServerUrl}
        placeholder="192.168.1.100:8787"
        placeholderTextColor={InventarioColors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={styles.secondary} onPress={guardarUrl}>
        <Text style={styles.secondaryText}>Guardar IP</Text>
      </Pressable>
      <Pressable
        style={[styles.secondary, probandoConexion && styles.disabled]}
        disabled={probandoConexion}
        onPress={probarConexion}>
        {probandoConexion ? (
          <ActivityIndicator color={InventarioColors.text} />
        ) : (
          <Text style={styles.secondaryText}>Probar conexión</Text>
        )}
      </Pressable>
      <Pressable
        style={[styles.primary, sincronizando && styles.disabled]}
        disabled={sincronizando || !deviceId}
        onPress={sincronizar}>
        {sincronizando ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.primaryText}>Sincronizar ahora</Text>
        )}
      </Pressable>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Cómo usar varios teléfonos</Text>
        <Text style={styles.infoItem}>1. En un PC de la tienda: npm run sync-server</Text>
        <Text style={styles.infoItem}>2. Anota la IP que muestra (ej. 192.168.1.50:8787)</Text>
        <Text style={styles.infoItem}>3. Activa «Inventario en curso» y registra ventas al atender</Text>
        <Text style={styles.infoItem}>4. Cada operador elige su familia en Inventario</Text>
        <Text style={styles.infoItem}>5. Al terminar un bloque, pulsa Sincronizar (incluye ventas)</Text>
        <Text style={styles.infoItem}>6. Al cerrar el día, exporta Excel desde cualquier móvil</Text>
      </View>

      <Text style={styles.deviceId}>ID dispositivo: {deviceId || '...'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: InventarioColors.bg },
  content: { padding: 16, paddingBottom: 40 },
  section: { color: InventarioColors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  desc: { color: InventarioColors.textMuted, lineHeight: 20, marginBottom: 16 },
  label: { color: InventarioColors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    padding: 14,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    marginBottom: 10,
  },
  primary: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#111', fontWeight: '800', fontSize: 16 },
  secondary: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: InventarioColors.border,
    marginBottom: 8,
  },
  secondaryText: { color: InventarioColors.text, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  infoBox: {
    marginTop: 24,
    backgroundColor: InventarioColors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  infoTitle: { color: InventarioColors.accent, fontWeight: '700', marginBottom: 10 },
  infoItem: { color: InventarioColors.textMuted, marginBottom: 6, lineHeight: 18 },
  deviceId: { color: InventarioColors.textMuted, fontSize: 11, marginTop: 20, textAlign: 'center' },
});
