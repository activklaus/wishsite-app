import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View, Dimensions } from 'react-native';
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
import { useShareHandler } from './src/hooks/useShareHandler';
import i18n from './src/i18n';
import { setAuthToken as setApiAuthToken } from './src/services/api';
import { useState, useEffect } from 'react';

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

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
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

  const handleLogin = (userData) => {
    const token = userData.token || userData.auth_token;
    setUser(userData);
    setAuthToken(token);
    setApiAuthToken(token);
    setShowRegister(false);
  };

  const handleRegister = (userData) => {
    const token = userData.token || userData.auth_token;
    setUser(userData);
    setAuthToken(token);
    setApiAuthToken(token);
    setShowRegister(false);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    setApiAuthToken(null);
    setShowRegister(false);
    setShowForgotPassword(false);
    setSelectedWishlist(null);
    setShowAccount(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;