import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardShadow } from '../styles/shared';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const SkeletonLoader = ({ type = 'item', count = 3 }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const Box = ({ style }) => <Animated.View style={[style, { opacity: pulseAnim }]} />;

  const renderItemSkeleton = () => (
    <View style={styles.itemSkeleton}>
      <Box style={styles.imageSkeleton} />
      <View style={styles.contentSkeleton}>
        <Box style={styles.titleSkeleton} />
        <Box style={styles.descriptionSkeleton} />
        <Box style={styles.priceSkeleton} />
        <View style={styles.linksSkeleton}>
          <Box style={styles.linkSkeleton} />
          <Box style={styles.linkSkeleton} />
        </View>
      </View>
      <Box style={styles.optionsSkeleton} />
    </View>
  );

  const renderHeaderSkeleton = () => (
    <View style={styles.headerSkeleton}>
      <Box style={styles.backButtonSkeleton} />
      <Box style={styles.titleHeaderSkeleton} />
      <Box style={styles.menuButtonSkeleton} />
    </View>
  );

  // Mirrors OwnWishlistCard's real layout (WishlistScreen.js) — avatar circle + title/meta rows —
  // so the overview doesn't visibly jump in size once real cards replace these.
  const renderWishlistCardSkeleton = () => (
    <View style={styles.wishlistCardSkeleton}>
      <Box style={styles.wishlistCardAvatar} />
      <View style={styles.wishlistCardInfo}>
        <Box style={styles.wishlistCardTitle} />
        <Box style={styles.wishlistCardMeta} />
        <Box style={styles.wishlistCardMetaSmall} />
      </View>
    </View>
  );

  if (type === 'header') {
    return renderHeaderSkeleton();
  }

  if (type === 'wishlistCard') {
    return (
      <View style={styles.wishlistCardContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <View key={index}>
            {renderWishlistCardSkeleton()}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index}>
          {renderItemSkeleton()}
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    padding: isTablet ? 30 : 20,
  },
  itemSkeleton: {
    backgroundColor: theme.surface,
    padding: isTablet ? 20 : 15,
    borderRadius: RADIUS.card,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...cardShadow(theme, isDarkMode),
  },
  imageSkeleton: {
    width: isTablet ? 80 : 60,
    height: isTablet ? 80 : 60,
    borderRadius: RADIUS.small,
    backgroundColor: theme.border,
    marginRight: isTablet ? 15 : 12,
  },
  contentSkeleton: {
    flex: 1,
  },
  titleSkeleton: {
    height: isTablet ? 20 : 18,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 8,
    width: '70%',
  },
  descriptionSkeleton: {
    height: isTablet ? 16 : 14,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 8,
    width: '90%',
  },
  priceSkeleton: {
    height: isTablet ? 18 : 16,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 8,
    width: '30%',
  },
  linksSkeleton: {
    marginTop: 8,
  },
  linkSkeleton: {
    height: isTablet ? 14 : 12,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 4,
    width: '80%',
  },
  optionsSkeleton: {
    width: 24,
    height: 24,
    backgroundColor: theme.border,
    borderRadius: 12,
  },
  headerSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTablet ? 30 : 20,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButtonSkeleton: {
    width: isTablet ? 80 : 60,
    height: isTablet ? 20 : 18,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginRight: isTablet ? 20 : 15,
  },
  titleHeaderSkeleton: {
    flex: 1,
    height: isTablet ? 24 : 20,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
  },
  menuButtonSkeleton: {
    width: 24,
    height: 24,
    backgroundColor: theme.border,
    borderRadius: 12,
    marginLeft: isTablet ? 20 : 15,
  },
  // Matches WishlistScreen.js's own listContainer/card padding+spacing so the skeleton sits
  // exactly where the real cards will appear once loaded.
  wishlistCardContainer: {
    padding: isTablet ? 30 : 20,
  },
  wishlistCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: RADIUS.card,
    paddingVertical: isTablet ? 20 : 16,
    paddingHorizontal: isTablet ? 20 : 16,
    marginBottom: 20,
    ...cardShadow(theme, isDarkMode),
  },
  wishlistCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.border,
  },
  wishlistCardInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 40,
  },
  wishlistCardTitle: {
    height: isTablet ? 18 : 16,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 8,
    width: '60%',
  },
  wishlistCardMeta: {
    height: isTablet ? 12 : 11,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 6,
    width: '40%',
  },
  wishlistCardMetaSmall: {
    height: isTablet ? 12 : 11,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    width: '50%',
  },
});

export default SkeletonLoader;
