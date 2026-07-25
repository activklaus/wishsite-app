import React, { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const SafeImage = ({ source, style, resizeMode = 'cover', onLoad, onError, ...props }) => {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad();
  };

  const handleError = (error) => {
    setIsLoading(false);
    setHasError(true);
    if (onError) onError(error);
  };

  const styles = StyleSheet.create({
    errorContainer: {
      backgroundColor: theme.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    loadingContainer: {
      backgroundColor: theme.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    errorText: {
      fontSize: 20,
    },
    loadingText: {
      fontSize: 16,
    },
  });

  if (hasError) {
    return (
      <View style={[style, styles.errorContainer]}>
        <Text style={styles.errorText}>📷</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={source}
        style={[style, { position: 'absolute' }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      {isLoading && (
        <View style={[style, styles.loadingContainer]}>
          <Text style={styles.loadingText}>⏳</Text>
        </View>
      )}
    </View>
  );
};

export default SafeImage;
