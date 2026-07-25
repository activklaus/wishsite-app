import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardShadow } from '../styles/shared';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const SkeletonLoader = ({ type = 'item', count = 3 }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme, isDarkMode);

  const renderItemSkeleton = () => (
    <View style={styles.itemSkeleton}>
      <View style={styles.imageSkeleton} />
      <View style={styles.contentSkeleton}>
        <View style={styles.titleSkeleton} />
        <View style={styles.descriptionSkeleton} />
        <View style={styles.priceSkeleton} />
        <View style={styles.linksSkeleton}>
          <View style={styles.linkSkeleton} />
          <View style={styles.linkSkeleton} />
        </View>
      </View>
      <View style={styles.optionsSkeleton} />
    </View>
  );

  const renderHeaderSkeleton = () => (
    <View style={styles.headerSkeleton}>
      <View style={styles.backButtonSkeleton} />
      <View style={styles.titleHeaderSkeleton} />
      <View style={styles.menuButtonSkeleton} />
    </View>
  );

  if (type === 'header') {
    return renderHeaderSkeleton();
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
});

export default SkeletonLoader;
