import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';

export type BuildInfo = {
  appVersion: string;
  nativeVersion: string;
  nativeBuild: string;
  runtimeVersion: string;
  channel: string;
  updateId: string;
  updateCreatedAt: string;
  launchType: string;
  platform: string;
  isOtaEnabled: boolean;
  isExpoGo: boolean;
  easProjectId: string;
};

function formatDate(iso: Date | string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    return d.toLocaleString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

export function getBuildInfo(): BuildInfo {
  const expoConfig = Constants.expoConfig;
  const easProjectId =
    (expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? '—';

  return {
    appVersion: expoConfig?.version ?? '—',
    nativeVersion: Constants.nativeAppVersion ?? '—',
    nativeBuild: Constants.nativeBuildVersion ?? '—',
    runtimeVersion:
      Updates.runtimeVersion ??
      (typeof expoConfig?.runtimeVersion === 'string'
        ? expoConfig.runtimeVersion
        : expoConfig?.runtimeVersion
          ? JSON.stringify(expoConfig.runtimeVersion)
          : '—'),
    channel: Updates.channel ?? '—',
    updateId: Updates.updateId ?? '—',
    updateCreatedAt: formatDate(Updates.createdAt),
    launchType: Updates.isEmbeddedLaunch ? 'Build nativo (embebido)' : 'Actualización OTA',
    platform: Platform.OS,
    isOtaEnabled: Updates.isEnabled,
    isExpoGo: Constants.appOwnership === 'expo',
    easProjectId,
  };
}

export type CheckUpdateResult =
  | { status: 'disabled'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'upToDate'; message: string }
  | { status: 'available'; message: string }
  | { status: 'error'; message: string };

export async function checkForOtaUpdate(): Promise<CheckUpdateResult> {
  if (Constants.appOwnership === 'expo') {
    return {
      status: 'unavailable',
      message:
        'Expo Go no recibe actualizaciones OTA. Instala el APK/AAB generado con EAS (perfil preview o production).',
    };
  }
  if (!Updates.isEnabled) {
    return {
      status: 'disabled',
      message: 'Las actualizaciones OTA no están habilitadas en este build.',
    };
  }
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) {
      return { status: 'upToDate', message: 'Ya tienes la última actualización publicada en tu canal.' };
    }
    return {
      status: 'available',
      message: 'Hay una actualización nueva. Pulsa «Descargar e instalar».',
    };
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'No se pudo comprobar actualizaciones',
    };
  }
}

export async function downloadAndApplyOtaUpdate(): Promise<{ ok: boolean; message: string }> {
  if (!Updates.isEnabled) {
    return { ok: false, message: 'OTA no disponible en este entorno.' };
  }
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return { ok: true, message: 'No hay actualización pendiente.' };
    }
    const fetched = await Updates.fetchUpdateAsync();
    if (!fetched.isNew) {
      return { ok: true, message: 'No se descargó una actualización nueva.' };
    }
    return { ok: true, message: 'Actualización descargada. Reiniciando la app…' };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Error al descargar la actualización',
    };
  }
}

export async function reloadApp(): Promise<void> {
  await Updates.reloadAsync();
}

export function isOtaSupported(): boolean {
  return Constants.appOwnership !== 'expo' && Updates.isEnabled;
}

let startupUpdateCheck: Promise<boolean> | null = null;

/** Inicia la comprobación en paralelo (p. ej. durante el splash). */
export function beginStartupUpdateCheck(): Promise<boolean> {
  if (startupUpdateCheck) return startupUpdateCheck;

  startupUpdateCheck = (async () => {
    if (!isOtaSupported()) return false;
    try {
      const result = await Updates.checkForUpdateAsync();
      return result.isAvailable;
    } catch {
      return false;
    }
  })();

  return startupUpdateCheck;
}

/** Si hay update pendiente, pide Aceptar → descarga → reinicio. */
export async function promptStartupUpdateIfAvailable(): Promise<void> {
  const available = await beginStartupUpdateCheck();
  if (!available) return;

  try {
    await new Promise<void>((resolve) => {
      Alert.alert(
        'Actualización disponible',
        'Hay una versión nueva de la aplicación. Pulsa Aceptar para descargarla e instalarla. La app se reiniciará automáticamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              void (async () => {
                try {
                  const fetched = await Updates.fetchUpdateAsync();
                  if (fetched.isNew) {
                    await Updates.reloadAsync();
                  }
                } catch (e) {
                  Alert.alert(
                    'No se pudo actualizar',
                    e instanceof Error
                      ? e.message
                      : 'Error al descargar la actualización. Inténtalo más tarde.',
                  );
                } finally {
                  resolve();
                }
              })();
            },
          },
        ],
        { cancelable: false },
      );
    });
  } catch {
    // Sin red o servidor: continuar sin bloquear el arranque.
  }
}
