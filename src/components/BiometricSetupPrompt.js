import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import i18n from '../i18n';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle } from '../styles/fonts';
import { RADIUS } from '../styles/shared';
import { lockIcon } from '../styles/icons';
import Button from './Button';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Shown once, right after the very first login/registration on this device (see App.tsx's
// maybeOfferBiometricSetup) — a custom dialog instead of the native Alert so the confirm button
// can actually be styled as the prominent action, without hijacking Alert's `cancel` style
// (which carries real platform semantics like VoiceOver's escape gesture, not just bold text).
const BiometricSetupPrompt = ({ visible, onAccept, onDecline }) => {
  const { theme } = useTheme();
  const [activating, setActivating] = useState(false);

  const handleAccept = async () => {
    setActivating(true);
    await onAccept();
    setActivating(false);
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: isTablet ? 30 : 24,
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
    },
    iconWrapper: {
      width: isTablet ? 72 : 60,
      height: isTablet ? 72 : 60,
      borderRadius: isTablet ? 36 : 30,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 18,
    },
    title: {
      ...headingStyle(isTablet ? 22 : 19),
      color: theme.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    message: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 10,
    },
    hint: {
      ...bodyStyle(isTablet ? 13 : 12),
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 24,
    },
    buttonRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
    },
    button: {
      flex: 1,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <SvgXml xml={lockIcon(theme.text)} width={isTablet ? 30 : 26} height={isTablet ? 30 : 26} />
          </View>
          <Text style={styles.title}>{i18n.t('biometricLock.setupPromptTitle')}</Text>
          <Text style={styles.message}>{i18n.t('biometricLock.setupPromptMessage')}</Text>
          <Text style={styles.hint}>{i18n.t('biometricLock.setupPromptHint')}</Text>
          <View style={styles.buttonRow}>
            <Button
              style={styles.button}
              variant="secondary"
              disabled={activating}
              onPress={onDecline}
              fontSize={isTablet ? 16 : 14}
              title={i18n.t('biometricLock.setupPromptDecline')}
            />
            <Button
              style={styles.button}
              variant="positive"
              loading={activating}
              onPress={handleAccept}
              fontSize={isTablet ? 16 : 14}
              title={i18n.t('biometricLock.setupPromptAccept')}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BiometricSetupPrompt;
