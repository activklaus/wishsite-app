import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { buttonStyle } from '../styles/fonts';
import { RADIUS } from '../styles/shared';

// Pill-shaped button, ported from wishsite3 (.btn-primary / .new-wishlist-button in global.scss)
const variantColors = (theme) => ({
  primary: { bg: theme.primary, pressedBg: theme.primaryActive, text: '#FFFFFF' },
  positive: { bg: theme.positive, pressedBg: theme.positiveActive, text: '#FFFFFF' },
  danger: { bg: theme.danger, pressedBg: theme.danger, text: '#FFFFFF' },
  secondary: { bg: 'transparent', pressedBg: theme.border, text: theme.text, border: theme.border },
});

const Button = ({
  title,
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fontSize = 16,
  style,
  textStyle,
  ...rest
}) => {
  const { theme } = useTheme();
  const colors = variantColors(theme)[variant] || variantColors(theme).primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.pressedBg : colors.bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : title ? (
        <Text style={[buttonStyle(fontSize), { color: colors.text }, textStyle]}>{title}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
