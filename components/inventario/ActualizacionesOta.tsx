import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import {
  checkForOtaUpdate,
  downloadAndApplyOtaUpdate,
  getBuildInfo,
  reloadApp,
  type BuildInfo,
  type CheckUpdateResult,
} from '@/lib/app-updates';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

export function ActualizacionesOta() {
  const [info, setInfo] = useState<BuildInfo>(() => getBuildInfo());
  const [estado, setEstado] = useState<CheckUpdateResult | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const refrescarInfo = useCallback(() => {
    setInfo(getBuildInfo());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refrescarInfo();
    }, [refrescarInfo])
  );

  const buscarActualizacion = async () => {
    setBuscando(true);
    try {
      const result = await checkForOtaUpdate();
      setEstado(result);
    } finally {
      setBuscando(false);
    }
  };

  const descargarEInstalar = async () => {
    setDescargando(true);
    try {
      const result = await downloadAndApplyOtaUpdate();
      if (!result.ok) {
        Alert.alert('Error', result.message);
        return;
      }
      if (result.message.includes('Reiniciando')) {
        await reloadApp();
        return;
      }
      Alert.alert('Actualización', result.message);
      refrescarInfo();
    } finally {
      setDescargando(false);
    }
  };

  const reiniciarApp = () => {
    Alert.alert('Reiniciar app', '¿Recargar la aplicación ahora?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        onPress: async () => {
          try {
            await reloadApp();
          } catch {
            Alert.alert('No disponible', 'Reinicio manual: cierra y abre la app.');
          }
        },
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.desc}>
        Actualizaciones over-the-air (EAS Update). Requiere build instalado (no Expo Go). Publica con:{' '}
        <Text style={styles.mono}>eas update --channel production</Text>
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Información del build</Text>
        <InfoRow label="Versión app" value={info.appVersion} />
        <InfoRow label="Build nativo" value={`${info.nativeVersion} (${info.nativeBuild})`} />
        <InfoRow label="Runtime" value={info.runtimeVersion} />
        <InfoRow label="Canal OTA" value={info.channel} />
        <InfoRow label="Tipo de arranque" value={info.launchType} />
        <InfoRow label="ID actualización" value={info.updateId} />
        <InfoRow label="Fecha actualización" value={info.updateCreatedAt} />
        <InfoRow label="Plataforma" value={info.platform} />
        <InfoRow label="OTA activo" value={info.isOtaEnabled ? 'Sí' : 'No'} />
        <InfoRow label="Entorno" value={info.isExpoGo ? 'Expo Go' : 'Build instalado'} />
        <InfoRow label="Proyecto EAS" value={info.easProjectId} />
      </View>

      {estado ? (
        <View
          style={[
            styles.estadoBox,
            estado.status === 'available' && styles.estadoOk,
            (estado.status === 'error' || estado.status === 'disabled') && styles.estadoWarn,
          ]}>
          <Text style={styles.estadoText}>{estado.message}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.secondary, buscando && styles.disabled]}
        disabled={buscando}
        onPress={buscarActualizacion}>
        {buscando ? (
          <ActivityIndicator color={InventarioColors.text} />
        ) : (
          <Text style={styles.secondaryText}>Buscar actualización</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.primary, (descargando || estado?.status !== 'available') && styles.disabled]}
        disabled={descargando || estado?.status !== 'available'}
        onPress={descargarEInstalar}>
        {descargando ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.primaryText}>Descargar e instalar</Text>
        )}
      </Pressable>

      <Pressable style={styles.secondary} onPress={reiniciarApp}>
        <Text style={styles.secondaryText}>Reiniciar app</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  desc: { color: InventarioColors.textMuted, lineHeight: 20, marginBottom: 12, fontSize: 13 },
  mono: { fontFamily: 'monospace', color: InventarioColors.accent, fontSize: 12 },
  infoBox: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    marginBottom: 12,
  },
  infoTitle: { color: InventarioColors.accent, fontWeight: '700', marginBottom: 10 },
  row: { marginBottom: 8 },
  rowLabel: { color: InventarioColors.textMuted, fontSize: 11, textTransform: 'uppercase' },
  rowValue: { color: InventarioColors.text, fontSize: 13, marginTop: 2 },
  estadoBox: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  estadoOk: { borderColor: '#40916C', backgroundColor: '#1B2E1B' },
  estadoWarn: { borderColor: '#7F1D1D', backgroundColor: '#2B1515' },
  estadoText: { color: InventarioColors.text, fontSize: 13, lineHeight: 18 },
  primary: {
    backgroundColor: InventarioColors.accent,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#111', fontWeight: '800', fontSize: 15 },
  secondary: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: InventarioColors.border,
    marginBottom: 8,
  },
  secondaryText: { color: InventarioColors.text, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
