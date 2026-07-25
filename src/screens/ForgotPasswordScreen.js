import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import api from '../services/api';
import i18n from '../i18n';
import { headingStyle, bodyStyle, strongStyle } from '../styles/fonts';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardStyle } from '../styles/shared';
import Button from '../components/Button';
import TextField from '../components/TextField';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ForgotPasswordScreen = ({ onBackToLogin }) => {
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSendInstructions = async () => {
    setError('');

    if (!email) {
      setError(i18n.t('forgotPassword.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/password/forgot', { email });
      setSuccess(true);
    } catch (error) {
      setError(i18n.t('forgotPassword.sendError'));
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
    backLink: {
      marginTop: isTablet ? 30 : 20,
      alignItems: 'center',
    },
    backText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
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
    successContainer: {
      backgroundColor: theme.successBackground,
      padding: isTablet ? 16 : 12,
      borderRadius: RADIUS.small,
      borderLeftWidth: 4,
      borderLeftColor: theme.positive,
      marginBottom: 15,
    },
    successText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.text,
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
        <Text style={styles.title}>{i18n.t('forgotPassword.title')}</Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              {i18n.t('forgotPassword.successMessage')}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{i18n.t('forgotPassword.emailPlaceholder')}</Text>
            <TextField
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              fontSize={isTablet ? 18 : 16}
            />
          </View>

          <Button
            style={styles.button}
            onPress={handleSendInstructions}
            disabled={loading}
            loading={loading}
            fontSize={isTablet ? 18 : 16}
            title={i18n.t('forgotPassword.sendButton')}
          />
        </View>

        <TouchableOpacity
          style={styles.backLink}
          onPress={onBackToLogin}
        >
          <Text style={styles.backText}>{i18n.t('forgotPassword.backToLogin')}</Text>
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ForgotPasswordScreen;
