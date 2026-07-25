import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, ScrollView, Animated, PanResponder, ActivityIndicator } from 'react-native';
import api from '../services/api';
import i18n from '../i18n';
import { SvgXml } from 'react-native-svg';
import { headingStyle, bodyStyle, strongStyle } from '../styles/fonts';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardStyle } from '../styles/shared';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { deleteIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const AccountScreen = ({ onBack, onLogout, onAccountDeleted }) => {
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [provider, setProvider] = useState(null);
  const [confirmed, setConfirmed] = useState(true);
  const [newsletterPending, setNewsletterPending] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [resendingNewsletter, setResendingNewsletter] = useState(false);
  const [error, setError] = useState('');
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 20 && Math.abs(gestureState.dy) < 80;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > width * 0.3) {
          Animated.timing(translateX, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onBack());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/user');
      setEmail(response.data.email || '');
      setNewEmail(response.data.new_email || '');
      setProvider(response.data.provider || null);
      setConfirmed(response.data.confirmed !== false);
      setNewsletterPending(!!response.data.newsletter_confirmation_pending);
    } catch (error) {
      setError(i18n.t('account.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendingConfirmation(true);
    try {
      const { data } = await api.post('/user/resend_confirmation');
      Alert.alert(
        i18n.t('account.editHeader'),
        data.already_confirmed ? i18n.t('account.alreadyConfirmed') : i18n.t('account.confirmationSent')
      );
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('account.saveError'));
    } finally {
      setResendingConfirmation(false);
    }
  };

  const handleResendNewsletterConfirmation = async () => {
    setResendingNewsletter(true);
    try {
      const { data } = await api.post('/user/resend_newsletter_confirmation');
      Alert.alert(
        i18n.t('account.editHeader'),
        data.already_confirmed ? i18n.t('account.newsletterAlreadyConfirmed') : i18n.t('account.newsletterConfirmationSent')
      );
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('account.saveError'));
    } finally {
      setResendingNewsletter(false);
    }
  };

  const handleSave = async () => {
    setError('');

    if (!currentPassword) {
      setError(i18n.t('account.currentPasswordRequired'));
      return;
    }

    if (password && password !== passwordConfirmation) {
      setError(i18n.t('register.passwordMismatch'));
      return;
    }

    setSaving(true);
    try {
      const userData = {
        email,
        current_password: currentPassword
      };

      if (password) {
        userData.password = password;
        userData.password_confirmation = passwordConfirmation;
      }

      const response = await api.patch('/user', { user: userData });

      Alert.alert(i18n.t('account.editHeader'), response.data.message || i18n.t('account.saved'));

      setPassword('');
      setPasswordConfirmation('');
      setCurrentPassword('');

      // Update state with response data
      if (response.data.email) {
        setEmail(response.data.email);
      }
      if (response.data.new_email !== undefined) {
        setNewEmail(response.data.new_email);
      }
    } catch (error) {
      setError(error.response?.data?.error || i18n.t('account.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      i18n.t('account.deleteTitle'),
      i18n.t('account.deletePrompt'),
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        {
          text: i18n.t('account.deleteAccountOnly'),
          onPress: () => confirmDelete(false)
        },
        {
          text: i18n.t('account.deleteAccountAndWishsites'),
          style: 'destructive',
          onPress: () => confirmDelete(true)
        }
      ]
    );
  };

  const confirmDelete = (deleteWishlists) => {
    const message = deleteWishlists
      ? i18n.t('account.confirmDeleteAll')
      : i18n.t('account.confirmDeleteAccountOnly');

    Alert.alert(
      i18n.t('account.confirmTitle'),
      message,
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        {
          text: i18n.t('wishlist.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/user', {
                params: { delete_wishlists: deleteWishlists }
              });
              onAccountDeleted();
            } catch (error) {
              Alert.alert(i18n.t('wishlist.error'), i18n.t('account.deleteFailedMessage'));
            }
          }
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: isTablet ? 30 : 20,
    },
    title: {
      ...headingStyle(isTablet ? 28 : 22),
      color: theme.text,
      marginBottom: isTablet ? 30 : 20,
    },
    card: {
      ...cardStyle(theme, isDarkMode),
    },
    inputSpacing: {
      marginBottom: 15,
    },
    label: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.text,
      marginBottom: 5,
      marginTop: 10,
    },
    button: {
      marginTop: 20,
    },
    deleteLink: {
      marginTop: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    deleteLinkText: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.danger,
    },
    errorText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.danger,
      marginBottom: 15,
    },
    infoBox: {
      backgroundColor: theme.warningBackground,
      padding: isTablet ? 12 : 10,
      borderRadius: RADIUS.small,
      borderLeftWidth: 4,
      borderLeftColor: theme.warning,
      marginBottom: 15,
    },
    infoText: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.text,
    },
    resendLink: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.link,
      textDecorationLine: 'underline',
      marginTop: 6,
    },
    providerInfoText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.text,
      marginBottom: 15,
    },
    disabledFieldWrapper: {
      opacity: 0.6,
    },
    hintText: {
      ...bodyStyle(isTablet ? 13 : 11),
      color: theme.textMuted,
      marginBottom: 5,
    },
  });

  if (loading) {
    return (
      <Animated.View style={[{ flex: 1, transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <ScreenWrapper showMenu={true} onLogout={onLogout} onLogoPress={onBack} showBackArrow={true} hideBottomBar={true}>
          <View style={styles.container}>
            <Text style={styles.title}>{i18n.t('wishlist.loading')}</Text>
          </View>
        </ScreenWrapper>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1, transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      <ScreenWrapper showMenu={true} onLogout={onLogout} onLogoPress={onBack} showBackArrow={true} hideBottomBar={true}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{i18n.t('account.editHeader')}</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!confirmed && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{i18n.t('account.unconfirmed')}</Text>
              <TouchableOpacity onPress={handleResendConfirmation} disabled={resendingConfirmation}>
                <Text style={styles.resendLink}>{i18n.t('account.resendConfirmationLink')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {newsletterPending && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{i18n.t('account.newsletterUnconfirmed')}</Text>
              <TouchableOpacity onPress={handleResendNewsletterConfirmation} disabled={resendingNewsletter}>
                <Text style={styles.resendLink}>{i18n.t('account.resendNewsletterConfirmationLink')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {newEmail ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {i18n.t('account.pendingReconfirmation', { email: newEmail })}
              </Text>
              {resendingConfirmation ? (
                <ActivityIndicator color={theme.primary} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
              ) : (
                <TouchableOpacity onPress={handleResendConfirmation} disabled={resendingConfirmation}>
                  <Text style={styles.resendLink}>{i18n.t('account.resendConfirmationLink')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {provider ? (
            <View style={styles.card}>
              <Text style={styles.providerInfoText}>
                {i18n.t('account.loggedInViaProviderInfo', { provider })}
              </Text>
              <Text style={styles.label}>{i18n.t('account.emailLabel')}</Text>
              <View style={styles.disabledFieldWrapper}>
                <TextField
                  value={email}
                  editable={false}
                  showClear={false}
                  fontSize={isTablet ? 18 : 16}
                />
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>{i18n.t('account.emailLabel')}</Text>
              <View style={styles.inputSpacing}>
                <TextField
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  fontSize={isTablet ? 18 : 16}
                />
              </View>

              <Text style={styles.label}>{i18n.t('account.newPasswordLabel')}</Text>
              <Text style={styles.hintText}>{i18n.t('account.leaveBlankInfo')}</Text>
              <View style={styles.inputSpacing}>
                <TextField
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  fontSize={isTablet ? 18 : 16}
                />
              </View>

              <Text style={styles.label}>{i18n.t('account.passwordConfirmationLabel')}</Text>
              <View style={styles.inputSpacing}>
                <TextField
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                  secureTextEntry
                  fontSize={isTablet ? 18 : 16}
                />
              </View>

              <Text style={styles.label}>{i18n.t('account.currentPasswordLabel')} *</Text>
              <Text style={styles.hintText}>{i18n.t('account.currentPasswordInfo')}</Text>
              <View style={styles.inputSpacing}>
                <TextField
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  fontSize={isTablet ? 18 : 16}
                />
              </View>

              <Button
                onPress={handleSave}
                disabled={saving}
                loading={saving}
                fontSize={isTablet ? 18 : 16}
                title={i18n.t('account.saveChanges')}
              />
            </View>
          )}

          <TouchableOpacity onPress={handleDelete} style={styles.deleteLink}>
            <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
            <Text style={styles.deleteLinkText}>{i18n.t('account.cancelAccountLink')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
    </Animated.View>
  );
};

export default AccountScreen;
