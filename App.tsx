import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View, Dimensions, AppState, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import WishlistDetailScreen from './src/screens/WishlistDetailScreen';
import ShareFormScreen from './src/screens/ShareFormScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import AccountScreen from './src/screens/AccountScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import BiometricLockScreen from './src/screens/BiometricLockScreen';
import BiometricSetupPrompt from './src/components/BiometricSetupPrompt';
import OfflineBanner from './src/components/OfflineBanner';
import Toast from './src/components/Toast';
import { useShareHandler } from './src/hooks/useShareHandler';
import i18n from './src/i18n';
import { setAuthToken as setApiAuthToken, setSessionExpiredHandler } from './src/services/api';
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled,
  isBiometricSupported,
  authenticateWithBiometrics,
  hasAskedBiometricPrompt,
  setAskedBiometricPrompt,
} from './src/services/biometricAuth';
import { saveSession, loadSession, clearSession } from './src/services/session';
import './src/services/pushNotifications';
import { useState, useEffect, useRef } from 'react';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('./src/assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('./src/assets/fonts/Montserrat-Bold.ttf'),
    'MontserratAlternates-Bold': require('./src/assets/fonts/MontserratAlternates-Bold.ttf'),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {fontsLoaded ? <AppContent /> : <LoadingScreen />}
        <OfflineBanner />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState(null);
  const [autoOpenEditWishlist, setAutoOpenEditWishlist] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [showShareForm, setShowShareForm] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showBiometricSetupPrompt, setShowBiometricSetupPrompt] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const userRef = useRef(user);
  userRef.current = user;

  // Re-lock whenever the app comes back from the background (not on cold start — without a
  // persisted login token there's already a fresh login screen gating that case). Reads the
  // toggle fresh from storage each time rather than from React state, so a change made in
  // AccountScreen takes effect immediately without needing to thread it through props.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appState.current === 'active' && nextState === 'background' && userRef.current) {
        const enabled = await getBiometricLockEnabled();
        if (enabled) {
          setIsLocked(true);
        }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Restores a persisted session on cold start so the user doesn't have to log in every time.
  // If the biometric lock is enabled, gate that restored session behind Face ID/Touch ID right
  // away (user + isLocked both get set before this render commits, so the very first frame
  // already shows the lock screen instead of briefly flashing the restored wishlist).
  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session) {
        setUser(session.user);
        setAuthToken(session.token);
        setApiAuthToken(session.token);
        const shouldLock = await getBiometricLockEnabled();
        if (shouldLock) {
          setIsLocked(true);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // A persisted session can outlive its server-side token (revoked, expired, account deleted
  // elsewhere, ...). api.js can't reach into this component's state directly, so it calls this
  // registered handler instead whenever /user or /guest_wishlists — the only Bearer-token-
  // authenticated endpoints — come back 401. The ref guards against several requests failing at
  // once and stacking multiple alerts; it's cleared on the next successful login.
  const sessionExpiredHandledRef = useRef(false);
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (sessionExpiredHandledRef.current) return;
      sessionExpiredHandledRef.current = true;
      handleLogout();
      Alert.alert(i18n.t('login.sessionExpiredTitle'), i18n.t('login.sessionExpiredMessage'));
    });
  }, []);

  const handleShareReceived = (sharedData) => {
    if (user && authToken) {
      setShareData(sharedData);
      setShowShareForm(true);
    }
  };

  useShareHandler(handleShareReceived);

  const handleWelcomeContinue = () => {
    setShowWelcome(false);
  };

  // Offers to turn Face ID/Touch ID on right after a successful login/registration, instead of
  // relying on the user to find the toggle in Account settings themselves. Only ever once per
  // device (persisted flag) and only when there's actually something to offer (already enabled,
  // or the device has no enrolled biometrics — nothing to ask about either way).
  const maybeOfferBiometricSetup = async () => {
    if (await getBiometricLockEnabled()) return;
    if (await hasAskedBiometricPrompt()) return;
    if (!(await isBiometricSupported())) return;

    await setAskedBiometricPrompt();
    setShowBiometricSetupPrompt(true);
  };

  const handleAcceptBiometricSetup = async () => {
    if (await authenticateWithBiometrics()) {
      await setBiometricLockEnabled(true);
    }
    setShowBiometricSetupPrompt(false);
  };

  const handleLogin = (userData) => {
    const token = userData.token || userData.auth_token;
    setUser(userData);
    setAuthToken(token);
    setApiAuthToken(token);
    setShowRegister(false);
    saveSession(userData, token);
    sessionExpiredHandledRef.current = false;
    maybeOfferBiometricSetup();
  };

  const handleRegister = (userData) => {
    const token = userData.token || userData.auth_token;
    setUser(userData);
    setAuthToken(token);
    setApiAuthToken(token);
    setShowRegister(false);
    saveSession(userData, token);
    sessionExpiredHandledRef.current = false;
    maybeOfferBiometricSetup();
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    setApiAuthToken(null);
    setShowRegister(false);
    setShowForgotPassword(false);
    setSelectedWishlist(null);
    setShowAccount(false);
    setIsLocked(false);
    clearSession();
  };

  const handleWishlistSelect = (wishlist, options) => {
    setSelectedWishlist(wishlist);
    setAutoOpenEditWishlist(!!options?.openEdit);
  };

  const handleBackToWishlists = () => {
    setSelectedWishlist(null);
    setAutoOpenEditWishlist(false);
  };

  const showRegisterScreen = () => {
    setShowRegister(true);
    setShowForgotPassword(false);
  };

  const showLoginScreen = () => {
    setShowRegister(false);
    setShowForgotPassword(false);
  };

  const showForgotPasswordScreen = () => {
    setShowForgotPassword(true);
    setShowRegister(false);
  };

  const handleShareFormBack = () => {
    setShowShareForm(false);
    setShareData(null);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isLocked && user) {
    return <BiometricLockScreen onUnlock={() => setIsLocked(false)} />;
  }

  if (showWelcome && !user) {
    return <WelcomeScreen onContinue={handleWelcomeContinue} />;
  }

  return (
    <View style={styles.container}>
      {!user ? (
        showForgotPassword ? (
          <ForgotPasswordScreen 
            onBackToLogin={showLoginScreen} 
          />
        ) : showRegister ? (
          <RegisterScreen 
            onRegister={handleRegister} 
            onBackToLogin={showLoginScreen} 
          />
        ) : (
          <LoginScreen 
            onLogin={handleLogin} 
            onShowRegister={showRegisterScreen}
            onShowForgotPassword={showForgotPasswordScreen}
          />
        )
      ) : (
        showAccount ? (
          <AccountScreen
            onBack={() => setShowAccount(false)}
            onLogout={handleLogout}
            onAccountDeleted={handleLogout}
          />
        ) : showShareForm ? (
          <ShareFormScreen 
            route={{
              params: {
                sharedUrl: shareData,
                wishlistId: selectedWishlist?.admin_key || null
              }
            }}
            navigation={{
              goBack: handleShareFormBack
            }}
          />
        ) : selectedWishlist ? (
          <WishlistDetailScreen
            wishlist={selectedWishlist}
            authToken={authToken}
            onBack={handleBackToWishlists}
            onLogout={handleLogout}
            autoOpenEdit={autoOpenEditWishlist}
          />
        ) : (
          <WishlistScreen 
            onLogout={handleLogout} 
            authToken={authToken}
            onWishlistSelect={handleWishlistSelect}
            onAccountPress={() => setShowAccount(true)}
          />
        )
      )}
      <BiometricSetupPrompt
        visible={showBiometricSetupPrompt}
        onAccept={handleAcceptBiometricSetup}
        onDecline={() => setShowBiometricSetupPrompt(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;