import { Stack } from 'expo-router';

import { InventarioColors } from '@/constants/inventario-theme';

export default function AlmacenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: InventarioColors.bg },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[codigo]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
