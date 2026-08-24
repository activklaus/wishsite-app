import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../i18n';
import { useIsOffline } from '../hooks/useNetworkStatus';
import { checkConnectivity } from '../services/offlineStatus';
import { bodyStyle, strongStyle } from '../styles/fonts';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Mounted once at the app root (App.tsx) so it's visible above whatever screen is active,
// instead of every screen having to check connectivity itself. Only appears in response to a
// real failed request (see api.js's response interceptor) and clears itself as soon as any
// request succeeds - no background polling, since that was wrong far more often than it was
// right. The "Aktualisieren" button lets the user force a one-off check on demand instead.
const OfflineBanner = () => {
  const isOffline = useIsOffline();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  if (!isOffline) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await checkConnectivity();
    } finally {
      setRefreshing(false);
    }
  };

  const styles = StyleSheet.create({
    banner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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
    refreshButton: {
      marginLeft: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    refreshText: {
      ...strongStyle(isTablet ? 14 : 12),
      color: '#FFFFFF',
      textDecorationLine: 'underline',
    },
  });

  return (
    // "box-none": the banner strip itself doesn't intercept touches (screens can still reach
    // whatever's underneath it, same as before), but the refresh button inside it still can.
    <View style={styles.banner} pointerEvents="box-none">
      <Text style={styles.text}>{i18n.t('offline.banner')}</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.refreshText}>{i18n.t('offline.refresh')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default OfflineBanner;
