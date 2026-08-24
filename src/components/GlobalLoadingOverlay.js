import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useIsLoading } from '../hooks/useLoadingStatus';

// Mirrors wishsite3's global showOverlay()/hideOverlay() (functions/baseEventListener.js +
// overlay.js.erb): a dim overlay shown automatically for every mutating request (see api.js's
// interceptors), instead of each screen having to build its own "is this saving?" indicator.
//
// A plain absolutely-positioned View would land behind any currently-open <Modal> (e.g. the item
// detail view, or the image search picker) — Modal always renders in its own native layer above
// the regular view tree regardless of zIndex, same reasoning as Toast.js. Wrapping this in its
// own transparent Modal instead is what actually gets it to show above other open modals, and
// blocks interaction underneath for free (matching web's document.body.style.overflow='hidden')
// since a presented Modal always captures all touches within its bounds itself.
const GlobalLoadingOverlay = () => {
  const isLoading = useIsLoading();

  return (
    <Modal transparent visible={isLoading} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GlobalLoadingOverlay;
