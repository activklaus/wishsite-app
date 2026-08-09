import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Alert, ActivityIndicator } from 'react-native';
import { SvgXml } from 'react-native-svg';
import api from '../services/api';
import i18n from '../i18n';
import { headingStyle, bodyStyle, strongStyle } from '../styles/fonts';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardStyle } from '../styles/shared';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useFacebookLogin } from '../hooks/useFacebookLogin';
import { facebookIcon, lockIcon } from '../styles/icons';
import { getBiometricLockEnabled, authenticateWithBiometrics } from '../services/biometricAuth';
import { loadSession } from '../services/session';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const LoginScreen = ({ onLogin, onShowRegister, onShowForgotPassword }) => {
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const { loginWithFacebook, loading: fbLoading } = useFacebookLogin();
  // Set only when biometric lock is on AND a session was kept around from a previous logout
  // (see App.tsx's handleLogout) - that's the only time this screen shows at all while a
  // Face ID/Touch ID-recoverable login still exists to offer instead of retyping credentials.
  const [biometricSession, setBiometricSession] = useState(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await getBiometricLockEnabled())) return;
      const session = await loadSession();
      if (session) setBiometricSession(session);
    })();
  }, []);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    const success = await authenticateWithBiometrics();
    setBiometricLoading(false);
    if (success) {
      onLogin(biometricSession.user);
    }
  };

  const handleFacebookLogin = async () => {
    setError('');
    try {
      const userData = await loginWithFacebook();
      if (userData) {
        onLogin(userData);
      }
    } catch (error) {
      setError(i18n.t('login.loginFailed'));
    }
  };

  const handleLogin = async () => {
    setError('');
    setUnconfirmed(false);

    if (!email || !password) {
      setError(i18n.t('login.fillFields'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/login', {
        email,
        password,
        remember_me: true,
      });

      onLogin(response.data);
    } catch (error) {
      if (error.response?.data?.error_code === 'unconfirmed') {
        setUnconfirmed(true);
        setError(i18n.t('login.unconfirmedError'));
      } else {
        setError(i18n.t('login.wrongCredentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendingConfirmation(true);
    try {
      await api.post('/user/resend_confirmation_by_email', { email });
      Alert.alert(i18n.t('login.title'), i18n.t('login.confirmationResent'));
    } catch (error) {
      Alert.alert(i18n.t('login.title'), i18n.t('login.wrongCredentials'));
    } finally {
      setResendingConfirmation(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    logo: {
      width: isTablet ? 200 : 150,
      height: isTablet ? 80 : 60,
      alignSelf: 'center',
      marginTop: isTablet ? 60 : 40,
      marginBottom: isTablet ? 40 : 30,
    },
    formContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: isTablet ? 60 : 20,
      paddingTop: 50,
      paddingBottom: isTablet ? 60 : 40,
    },
    formContent: {
      width: '100%',
      maxWidth: isTablet ? 400 : '100%',
    },
    title: {
      ...headingStyle(isTablet ? 32 : 24),
      textAlign: 'center',
      marginBottom: isTablet ? 40 : 30,
      color: theme.text,
    },
    card: {
      ...cardStyle(theme, isDarkMode),
      marginBottom: 14,
    },
    inputContainer: {
      marginBottom: 15,
    },
    label: {
      ...strongStyle(isTablet ? 15 : 13),
      color: theme.text,
      marginBottom: 6,
    },
    forgotPasswordLink: {
      marginTop: isTablet ? 20 : 15,
      alignItems: 'center',
    },
    forgotPasswordText: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.textSecondary,
      textDecorationLine: 'underline',
    },
    registerLink: {
      marginTop: isTablet ? 20 : 15,
      alignItems: 'center',
    },
    registerText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
    },
    button: {
      marginTop: 10,
    },
    errorContainer: {
      backgroundColor: theme.dangerBackground,
      padding: isTablet ? 16 : 12,
      borderRadius: RADIUS.small,
      borderLeftWidth: 4,
      borderLeftColor: theme.danger,
      marginBottom: 15,
    },
    errorText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.danger,
    },
    resendLink: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.danger,
      textDecorationLine: 'underline',
      marginTop: 8,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: isTablet ? 20 : 15,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.textMuted,
      marginHorizontal: 10,
    },
    facebookButton: {
      backgroundColor: '#1877F2',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    facebookButtonText: {
      ...strongStyle(isTablet ? 18 : 16),
      color: '#FFFFFF',
      marginLeft: 10,
    },
    faceIdButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    faceIdButtonText: {
      ...strongStyle(isTablet ? 18 : 16),
      color: theme.text,
      marginLeft: 10,
    },
  });

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/wishsite_logo_name_250.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.formContainer}>
        <View style={styles.formContent}>
        <Text style={styles.title}>{i18n.t('login.title')}</Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {unconfirmed && (
              resendingConfirmation ? (
                <ActivityIndicator color={theme.danger} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
              ) : (
                <TouchableOpacity onPress={handleResendConfirmation}>
                  <Text style={styles.resendLink}>{i18n.t('login.resendConfirmationLink')}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        ) : null}

        <View style={styles.card}>
          {biometricSession && (
            <>
              <Button
                style={styles.faceIdButton}
                variant="secondary"
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
                loading={biometricLoading}
                fontSize={isTablet ? 18 : 16}
              >
                <SvgXml xml={lockIcon(theme.text)} width={18} height={18} />
                <Text style={styles.faceIdButtonText}>{i18n.t('login.faceIdButton')}</Text>
              </Button>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{i18n.t('login.orDivider')}</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{i18n.t('login.email')}</Text>
            <TextField
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              fontSize={isTablet ? 18 : 16}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{i18n.t('login.password')}</Text>
            <TextField
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              fontSize={isTablet ? 18 : 16}
            />
          </View>

          <Button
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            fontSize={isTablet ? 18 : 16}
            title={i18n.t('login.loginButton')}
          />

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={onShowForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>{i18n.t('login.forgotPassword')}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{i18n.t('login.orDivider')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            style={styles.facebookButton}
            onPress={handleFacebookLogin}
            disabled={fbLoading}
            loading={fbLoading}
            fontSize={isTablet ? 18 : 16}
          >
            <SvgXml xml={facebookIcon('#FFFFFF')} width={18} height={18} />
            <Text style={styles.facebookButtonText}>{i18n.t('login.facebookButton')}</Text>
          </Button>
        </View>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={onShowRegister}
        >
          <Text style={styles.registerText}>{i18n.t('login.registerLink')}</Text>
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;
