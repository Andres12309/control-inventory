import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InventarioColors } from '@/constants/inventario-theme';

type Props = {
  title: string;
  children: ReactNode;
};

export function ModalScaffold({ title, children }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: InventarioColors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: InventarioColors.border,
    backgroundColor: InventarioColors.surface,
  },
  backBtn: { minWidth: 88, paddingHorizontal: 8 },
  backText: { color: InventarioColors.accent, fontWeight: '700', fontSize: 16 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: InventarioColors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  body: { flex: 1 },
});
