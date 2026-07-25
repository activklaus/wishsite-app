import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../i18n';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle } from '../styles/fonts';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Mirrors wishsite3's wishlist_locked.de/en.html.erb — shown when the API's
// admin action returns 403 "Wishlist is locked" (WishlistAdminLogic#check_wishlist_access).
const WishlistLockedScreen = ({ onBack }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isTablet ? 30 : 20,
      paddingTop: insets.top + 12,
      paddingBottom: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      marginRight: isTablet ? 20 : 15,
    },
    backArrowText: {
      ...bodyStyle(isTablet ? 20 : 18),
      color: theme.link,
    },
    contentContainer: {
      padding: isTablet ? 40 : 24,
      alignItems: 'center',
    },
    title: {
      ...headingStyle(isTablet ? 24 : 20),
      color: theme.text,
      textAlign: 'center',
      marginBottom: isTablet ? 24 : 18,
    },
    intro: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: isTablet ? 16 : 12,
    },
    reasonsList: {
      alignSelf: 'stretch',
      marginBottom: isTablet ? 20 : 16,
    },
    reasonItem: {
      flexDirection: 'row',
      marginBottom: 6,
      paddingHorizontal: isTablet ? 20 : 8,
    },
    bullet: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      marginRight: 8,
    },
    reasonText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      flex: 1,
    },
    outro: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: isTablet ? 8 : 6,
    },
    contactEmail: {
      ...headingStyle(isTablet ? 17 : 15),
      color: theme.text,
      textAlign: 'center',
      marginVertical: isTablet ? 16 : 12,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{i18n.t('wishlist.locked.title')}</Text>
        <Text style={styles.intro}>{i18n.t('wishlist.locked.intro')}</Text>
        <View style={styles.reasonsList}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={styles.reasonItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.reasonText}>{i18n.t(`wishlist.locked.reason${n}`)}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.intro}>{i18n.t('wishlist.locked.contactIntro')}</Text>
        <Text style={styles.contactEmail}>info@wishsite.de</Text>
        <Text style={styles.outro}>{i18n.t('wishlist.locked.contactOutro')}</Text>
      </ScrollView>
    </View>
  );
};

export default WishlistLockedScreen;
