import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, INPUT_RADIUS } from '../styles/shared';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ModalSkeleton = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.titleSkeleton} />

      <View style={styles.inputSkeleton} />
      <View style={styles.inputSkeleton} />
      <View style={styles.inputSkeleton} />
      <View style={styles.inputSkeleton} />

      <View style={styles.sectionSkeleton}>
        <View style={styles.sectionTitleSkeleton} />
        <View style={styles.linkInputSkeleton} />
        <View style={styles.linkInputSkeleton} />
      </View>

      <View style={styles.radioGroupSkeleton}>
        <View style={styles.radioTitleSkeleton} />
        <View style={styles.radioOptionsSkeleton}>
          <View style={styles.radioOptionSkeleton} />
          <View style={styles.radioOptionSkeleton} />
        </View>
      </View>

      <View style={styles.buttonsSkeleton}>
        <View style={styles.buttonSkeleton} />
        <View style={styles.buttonSkeleton} />
      </View>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    padding: isTablet ? 30 : 20,
  },
  titleSkeleton: {
    height: isTablet ? 24 : 20,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: isTablet ? 20 : 15,
    width: '60%',
    alignSelf: 'center',
  },
  inputSkeleton: {
    height: isTablet ? 50 : 44,
    backgroundColor: theme.border,
    ...INPUT_RADIUS,
    marginBottom: isTablet ? 20 : 15,
  },
  sectionSkeleton: {
    marginBottom: isTablet ? 20 : 15,
  },
  sectionTitleSkeleton: {
    height: isTablet ? 18 : 16,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 10,
    width: '40%',
  },
  linkInputSkeleton: {
    height: isTablet ? 50 : 44,
    backgroundColor: theme.border,
    ...INPUT_RADIUS,
    marginBottom: 10,
  },
  radioGroupSkeleton: {
    marginBottom: isTablet ? 20 : 15,
  },
  radioTitleSkeleton: {
    height: isTablet ? 18 : 16,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    marginBottom: 10,
    width: '50%',
  },
  radioOptionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  radioOptionSkeleton: {
    height: isTablet ? 20 : 18,
    backgroundColor: theme.border,
    borderRadius: RADIUS.small,
    width: '30%',
  },
  buttonsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: isTablet ? 20 : 15,
  },
  buttonSkeleton: {
    height: isTablet ? 50 : 44,
    backgroundColor: theme.border,
    borderRadius: RADIUS.pill,
    flex: 1,
    marginHorizontal: 4,
  },
});

export default ModalSkeleton;
