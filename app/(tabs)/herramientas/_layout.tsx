import { Stack } from 'expo-router';

import { InventarioColors } from '@/constants/inventario-theme';

export default function HerramientasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: InventarioColors.bg },
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
