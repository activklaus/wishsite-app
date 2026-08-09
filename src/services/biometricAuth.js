import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

const STORAGE_KEY = 'biometricLockEnabled';
const PROMPT_ASKED_KEY = 'biometricPromptAsked';

// Whether this device can even offer the feature: has the hardware AND the user actually
// enrolled a face/fingerprint in the OS. Used to hide/disable the toggle otherwise.
export const isBiometricSupported = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
};

export const getBiometricLockEnabled = async () => {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value === 'true';
};

export const setBiometricLockEnabled = async (enabled) => {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
};

// Tracks whether the "enable Face ID?" prompt has already been shown once on this device, so it
// only ever asks after the very first login/registration, not on every subsequent one.
export const hasAskedBiometricPrompt = async () => {
  const value = await AsyncStorage.getItem(PROMPT_ASKED_KEY);
  return value === 'true';
};

export const setAskedBiometricPrompt = async () => {
  await AsyncStorage.setItem(PROMPT_ASKED_KEY, 'true');
};

// Falls back to the device passcode/PIN automatically if Face ID/Touch ID fails or isn't
// available in the moment (e.g. temporarily disabled after too many failed attempts) — this is
// expo-local-authentication's default behavior unless disableDeviceFallback is set.
export const authenticateWithBiometrics = async () => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: i18n.t('biometricLock.promptMessage'),
    cancelLabel: i18n.t('biometricLock.cancel'),
  });
  return result.success;
};
