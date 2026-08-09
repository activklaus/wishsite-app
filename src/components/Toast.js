import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, Dimensions, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setToastListener } from '../services/toast';
import { bodyStyle } from '../styles/fonts';
import { RADIUS } from '../styles/shared';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const DISPLAY_DURATION = 3000;

// Mounted once at the app root (App.tsx), like OfflineBanner — any code can trigger it via
// showToast() without needing to be a descendant of this component.
const Toast = () => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef(null);

  const hide = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setMessage(null);
    });
  };

  useEffect(() => {
    setToastListener((text) => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      setMessage(text);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimeout.current = setTimeout(hide, DISPLAY_DURATION);
    });

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  const styles = StyleSheet.create({
    wrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    container: {
      marginHorizontal: 16,
      marginBottom: insets.bottom + 20,
      backgroundColor: 'rgba(20, 20, 20, 0.92)',
      borderRadius: RADIUS.small,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    text: {
      ...bodyStyle(isTablet ? 15 : 13),
      color: '#FFFFFF',
      textAlign: 'center',
    },
  });

  // A plain absolutely-positioned View would land behind any currently-open <Modal> (e.g. the
  // "new wishsite" form) — Modal always renders in its own native layer above the regular view
  // tree, regardless of zIndex. Wrapping the toast in its own transparent Modal, presented after
  // (i.e. on top of) whatever else is open, is what actually gets it to show above other modals.
  //
  // Trade-off: on iOS, a presented Modal always captures all touches within its bounds itself —
  // there's no way to let them fall through to whatever is presented underneath, transparent or
  // not (that's UIKit modal-presentation behavior, not something pointerEvents can undo). So
  // while this toast is up, taps on the screen behind it don't reach it. Tapping anywhere here
  // dismisses the toast immediately instead of waiting out the full duration, which keeps that
  // window as short as a single wasted tap rather than a forced few-second wait.
  return (
    <Modal transparent visible={!!message} animationType="none" statusBarTranslucent>
      <Pressable style={styles.wrapper} onPress={hide}>
        <Animated.View style={[styles.container, { opacity }]}>
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default Toast;
