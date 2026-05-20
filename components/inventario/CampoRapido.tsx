import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInput as TextInputType } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  flex?: number;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  placeholder?: string;
  autoCapitalize?: 'none' | 'characters' | 'sentences';
  editable?: boolean;
  autoFocus?: boolean;
};

export const CampoRapido = forwardRef<TextInputType, Props>(function CampoRapido(
  {
    label,
    value,
    onChangeText,
    flex = 1,
    keyboardType = 'default',
    placeholder,
    autoCapitalize = 'none',
    editable = true,
    autoFocus,
  },
  ref
) {
  return (
    <View style={{ flex }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, { flex }, !editable && styles.disabled]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={InventarioColors.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        autoFocus={autoFocus}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  label: { color: InventarioColors.textMuted, fontSize: 11, marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    fontSize: 15,
    minHeight: 44,
  },
  disabled: { opacity: 0.55 },
});
