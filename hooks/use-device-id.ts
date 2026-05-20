import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getConfig, setConfig } from '@/lib/db/repository';

function generarId(): string {
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useDeviceId(): string {
  const db = useSQLiteContext();
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      let id = await getConfig(db, 'device_id');
      if (!id) {
        id = generarId();
        await setConfig(db, 'device_id', id);
      }
      if (activo) setDeviceId(id);
    })();
    return () => {
      activo = false;
    };
  }, [db]);

  return deviceId;
}
