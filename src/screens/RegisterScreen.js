import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Linking, Alert } from 'react-native';
import { SvgXml } from 'react-native-svg';
import api from '../services/api';
import i18n from '../i18n';
import { headingStyle, bodyStyle, strongStyle } from '../styles/fonts';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardStyle } from '../styles/shared';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useFacebookLogin } from '../hooks/useFacebookLogin';
import { facebookIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const RegisterScreen = ({ onRegister, onBackToLogin }) => {
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newsletterAccepted, setNewsletterAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState([]);
  const { loginWithFacebook, loading: fbLoading } = useFacebookLogin();

  const handleFacebookLogin = async () => {
    setError([]);
    try {
      const userData = await loginWithFacebook();
      if (userData) {
        onRegister(userData);
      }
    } catch (error) {
      setError([i18n.t('register.failed')]);
    }
  };

  const handleRegister = async () => {
    setError([]);

    if (!email || !password || !confirmPassword) {
      setError([i18n.t('register.fillFields')]);
      return;
    }

    if (password !== confirmPassword) {
      setError([i18n.t('register.passwordMismatch')]);
      return;
    }

    setLoading(true);
    try {
      await api.post('/signup', {
        user: {
          email,
          password,
          password_confirmation: confirmPassword,
          newsletter_accepted: newsletterAccepted,
        }
      });

      Alert.alert(
        i18n.t('register.successTitle'),
        i18n.t('register.successMessage'),
        [{ text: 'OK', onPress: onBackToLogin }]
      );
    } catch (error) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = [];
        Object.keys(errors).forEach(field => {
          errors[field].forEach(msg => {
            errorMessages.push(msg);
          });
        });
        setError(errorMessages);
      } else {
        setError([i18n.t('register.failed')]);
      }
    } finally {
      setLoading(false);
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
    button: {
      marginTop: 10,
    },
    errorContainer: {
      backgroundColor: theme.dangerBackground,
      paddingVertical: isTablet ? 16 : 12,
      paddingLeft: isTablet ? 26 : 22,
      paddingRight: isTablet ? 16 : 12,
      borderRadius: RADIUS.small,
      borderLeftWidth: 4,
      borderLeftColor: theme.danger,
      marginBottom: 15,
    },
    errorItem: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    errorBullet: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.danger,
      marginLeft: isTablet ? -16 : -12,
      marginRight: 6,
    },
    errorText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.danger,
    },
    backLink: {
      marginTop: isTablet ? 30 : 20,
      alignItems: 'center',
    },
    backText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
    },
    checkboxContainer: {
      marginBottom: 15,
    },
    checkbox: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkboxBox: {
      width: 20,
      height: 20,
      borderRadius: RADIUS.small,
      backgroundColor: theme.primaryMuted,
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
    },
    checkboxMark: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    checkboxText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.text,
    },
    termsContainer: {
      marginBottom: 15,
    },
    termsText: {
      ...bodyStyle(isTablet ? 12 : 11),
      color: theme.text,
      textAlign: 'left',
      lineHeight: isTablet ? 18 : 16,
    },
    termsLink: {
      ...bodyStyle(isTablet ? 12 : 11),
      color: theme.link,
      textDecorationLine: 'underline',
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
        <Text style={styles.title}>{i18n.t('register.title')}</Text>

        {error.length > 0 ? (
          <View style={styles.errorContainer}>
            {error.map((msg, index) => (
              <View key={index} style={styles.errorItem}>
                {error.length > 1 && <Text style={styles.errorBullet}>•</Text>}
                <Text style={styles.errorText}>{msg}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{i18n.t('register.email')}</Text>
            <TextField
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              fontSize={isTablet ? 18 : 16}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{i18n.t('register.password')}</Text>
            <TextField
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              fontSize={isTablet ? 18 : 16}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{i18n.t('register.confirmPassword')}</Text>
            <TextField
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              fontSize={isTablet ? 18 : 16}
            />
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setNewsletterAccepted(!newsletterAccepted)}
            >
              <View style={[styles.checkboxBox, newsletterAccepted && styles.checkboxChecked]}>
                {newsletterAccepted && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>{i18n.t('register.newsletter')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {i18n.t('register.termsAcceptance1')}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL(i18n.t('register.termsUrl'))}
              >
                {i18n.t('register.termsAcceptance2')}
              </Text>
              {i18n.t('register.termsAcceptance3')}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL(i18n.t('register.privacyUrl'))}
              >
                {i18n.t('register.termsAcceptance4')}
              </Text>
              {i18n.t('register.termsAcceptance5')}
            </Text>
          </View>

          <Button
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
            loading={loading}
            fontSize={isTablet ? 18 : 16}
            title={i18n.t('register.registerButton')}
          />

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
          style={styles.backLink}
          onPress={onBackToLogin}
        >
          <Text style={styles.backText}>{i18n.t('register.backToLogin')}</Text>
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default RegisterScreen;
