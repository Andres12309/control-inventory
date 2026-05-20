import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  value: string;
  onChange: (value: string) => void;
  tint?: string;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export function NumPad({ value, onChange, tint = '#E85D04' }: Props) {
  const pulse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const onKey = (key: string) => {
    pulse();
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.' && value.includes('.')) return;
    if (value === '0' && key !== '.') {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <Pressable
          key={key}
          style={({ pressed }) => [
            styles.key,
            pressed && { backgroundColor: '#2A2A2A' },
            key === '⌫' && styles.keyAccent,
          ]}
          onPress={() => onKey(key)}>
          <Text style={[styles.keyText, key === '⌫' && { color: tint }]}>{key}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  key: {
    width: '31%',
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyAccent: {
    backgroundColor: '#2B1A10',
  },
  keyText: {
    color: '#F5F5F5',
    fontSize: 24,
    fontWeight: '600',
  },
});
