import { Platform } from 'react-native';

import type { SyncConfig } from '@/lib/types';

const SYNC_TIMEOUT_MS = 12000;

export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

type HttpResponse = { status: number; text: string };

function xhrRequest(
  method: string,
  url: string,
  body?: string,
  headers?: Record<string, string>
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = SYNC_TIMEOUT_MS;
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText ?? '' });
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Timeout'));
    xhr.open(method, url);
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v);
      }
    }
    xhr.send(body ?? null);
  });
}

async function fetchRequest(
  method: string,
  url: string,
  body?: string,
  headers?: Record<string, string>
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timeout);
  }
}

/** En móvil usamos XHR: suele funcionar mejor con HTTP local que fetch. */
async function httpRequest(
  method: string,
  url: string,
  body?: string,
  headers?: Record<string, string>
): Promise<HttpResponse> {
  if (Platform.OS === 'web') {
    return fetchRequest(method, url, body, headers);
  }
  try {
    return await xhrRequest(method, url, body, headers);
  } catch (xhrErr) {
    try {
      return await fetchRequest(method, url, body, headers);
    } catch {
      throw xhrErr;
    }
  }
}

export type PingResult = { ok: true } | { ok: false; error: string };

export async function pingServer(url: string): Promise<PingResult> {
  const base = normalizeServerUrl(url);
  if (!base) {
    return { ok: false, error: 'Escribe la IP del coordinador (ej. 192.168.0.108:8787)' };
  }
  const healthUrl = `${base}/api/health`;
  try {
    const { status, text } = await httpRequest('GET', healthUrl);
    if (status < 200 || status >= 300) {
      return { ok: false, error: `El coordinador respondió con error ${status}` };
    }
    try {
      const data = JSON.parse(text) as { ok?: boolean };
      if (data.ok === false) return { ok: false, error: 'Respuesta inválida del coordinador' };
    } catch {
      /* cuerpo no JSON pero HTTP 200: aceptar */
    }
    return { ok: true };
  } catch (e) {
    const detalle = e instanceof Error ? e.message : 'Sin conexión';
    return {
      ok: false,
      error: `${detalle}\n\nURL: ${healthUrl}\n\n• Misma WiFi (no datos móviles)\n• Servidor activo en el PC\n• En iPhone: permitir «Red local» para Expo Go\n• Si usas APK: reinstala el build más reciente`,
    };
  }
}

export async function syncPull(config: SyncConfig): Promise<{
  familias: import('@/lib/types').Familia[];
  productos: import('@/lib/types').Producto[];
  conteos: {
    codpro: string;
    stock: number;
    notas: string | null;
    device_id: string | null;
    updated_at: string;
  }[];
  movimientos?: {
    codpro: string;
    cantidad: number;
    tipo: string;
    device_id: string | null;
    created_at: string;
  }[];
  inventario_activo?: string;
  inventario_inicio_at?: string | null;
}> {
  const base = normalizeServerUrl(config.servidorUrl);
  const { status, text } = await httpRequest('GET', `${base}/api/sync/pull`, undefined, {
    'X-Device-Id': config.deviceId,
  });
  if (status < 200 || status >= 300) {
    throw new Error(`Error al descargar (${status})`);
  }
  return JSON.parse(text);
}

export async function syncPush(
  config: SyncConfig,
  payload: Awaited<ReturnType<typeof import('@/lib/db/repository').buildSyncPushPayload>>
): Promise<void> {
  const base = normalizeServerUrl(config.servidorUrl);
  const { status } = await httpRequest(
    'POST',
    `${base}/api/sync/push`,
    JSON.stringify(payload),
    {
      'Content-Type': 'application/json',
      'X-Device-Id': config.deviceId,
    }
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Error al subir (${status})`);
  }
}
