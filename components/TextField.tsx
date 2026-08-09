import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radius, spacing, type } from '../theme';

type TextFieldProps = TextInputProps & {
  /** Small caption above the field. */
  label: string;
  /** Georgian error text; turns the border coral and shows underneath. */
  error?: string | null;
};

/** Labelled input built from the existing tokens. No new colours, no new radii. */
export function TextField({ label, error, style, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        onFocus={(event) => {
          setFocused(true);
          input.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          input.onBlur?.(event);
        }}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    ...type.body,
    color: colors.text,
    minHeight: 56,
    paddingHorizontal: spacing.card,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.divider,
  },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.accent },
  error: {
    ...type.meta,
    color: colors.accent,
    marginTop: 6,
    marginLeft: 2,
  },
});
