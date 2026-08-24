import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { fontStyles } from '../styles/fonts';
import { INPUT_RADIUS } from '../styles/shared';

// Text input with the asymmetric corner radius from wishsite3 (.input-field in global.scss):
// transparent border by default, border turns primary-colored on focus.
const TextField = ({
  value,
  onChangeText,
  fontSize = 16,
  showClear = true,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize,
  autoCorrect,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const canClear = showClear && !multiline && !!value;

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        // Secure fields must never auto-capitalize or auto-correct: iOS still applies
        // both (first-letter capitalization, smart-punctuation substitution) to masked
        // input, silently changing the submitted value from what was actually typed.
        autoCapitalize={autoCapitalize ?? (secureTextEntry ? 'none' : 'sentences')}
        autoCorrect={autoCorrect ?? !secureTextEntry}
        onFocus={(e) => {
          setFocused(true);
          onFocus && onFocus(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur && onBlur(e);
        }}
        style={[
          styles.input,
          INPUT_RADIUS,
          fontStyles.body,
          {
            fontSize,
            color: theme.text,
            backgroundColor: theme.inputBackground,
            borderColor: focused ? theme.primary : 'transparent',
            paddingRight: canClear ? 45 : 20,
          },
          multiline && styles.multiline,
          inputStyle,
        ]}
        {...rest}
      />
      {canClear ? (
        <TouchableOpacity style={[styles.clearButton, { backgroundColor: theme.border }]} onPress={() => onChangeText('')}>
          <Text style={[styles.clearText, { color: theme.text }]}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  multiline: {
    minHeight: 100,
    // Capped so a long description can't grow tall enough to swallow every touch drag for its
    // own cursor placement instead of the popup's surrounding ScrollView - past this height it
    // scrolls internally instead of growing further.
    maxHeight: 250,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 12,
  },
});

export default TextField;
