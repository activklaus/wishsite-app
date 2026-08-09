import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../i18n';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { bodyStyle } from '../styles/fonts';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Mounted once at the app root (App.tsx) so it's visible above whatever screen is active,
// instead of every screen having to check connectivity itself.
const OfflineBanner = () => {
  const isConnected = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  const styles = StyleSheet.create({
    banner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: insets.top + 6,
      paddingBottom: 6,
      paddingHorizontal: 16,
      backgroundColor: '#B00020',
      zIndex: 9999,
    },
    text: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: '#FFFFFF',
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.banner} pointerEvents="none">
      <Text style={styles.text}>{i18n.t('offline.banner')}</Text>
    </View>
  );
};

export default OfflineBanner;
