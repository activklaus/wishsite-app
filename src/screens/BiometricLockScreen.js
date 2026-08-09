import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import i18n from '../i18n';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle } from '../styles/fonts';
import Button from '../components/Button';
import { lockIcon } from '../styles/icons';
import { authenticateWithBiometrics } from '../services/biometricAuth';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Shown whenever the app returns to the foreground with the biometric lock enabled (see
// App.tsx's AppState listener) — blocks the last screen from being visible until the user
// authenticates again, protecting an already-logged-in session on a shared device.
const BiometricLockScreen = ({ onUnlock }) => {
  const { theme } = useTheme();
  const [authenticating, setAuthenticating] = useState(false);
  const [failed, setFailed] = useState(false);

  const attemptUnlock = async () => {
    setAuthenticating(true);
    setFailed(false);
    const success = await authenticateWithBiometrics();
    setAuthenticating(false);
    if (success) {
      onUnlock();
    } else {
      setFailed(true);
    }
  };

  useEffect(() => {
    attemptUnlock();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: isTablet ? 40 : 24,
    },
    iconWrapper: {
      width: isTablet ? 96 : 80,
      height: isTablet ? 96 : 80,
      borderRadius: isTablet ? 48 : 40,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      ...headingStyle(isTablet ? 24 : 20),
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      marginBottom: 32,
      textAlign: 'center',
    },
    button: {
      minWidth: isTablet ? 260 : 220,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconWrapper}>
        <SvgXml xml={lockIcon(theme.text)} width={isTablet ? 40 : 32} height={isTablet ? 40 : 32} />
      </View>
      <Text style={styles.title}>{i18n.t('biometricLock.title')}</Text>
      <Text style={styles.subtitle}>
        {failed ? i18n.t('biometricLock.failedSubtitle') : i18n.t('biometricLock.subtitle')}
      </Text>
      <Button
        style={styles.button}
        onPress={attemptUnlock}
        loading={authenticating}
        disabled={authenticating}
        fontSize={isTablet ? 18 : 16}
        title={i18n.t('biometricLock.unlockButton')}
      />
    </SafeAreaView>
  );
};

export default BiometricLockScreen;
