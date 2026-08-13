import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, RefreshControl, Linking, Alert, Platform } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef, useAnimatedStyle, useSharedValue, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../i18n';
import { headingStyle, bodyStyle } from '../styles/fonts';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardShadow } from '../styles/shared';
import Button from '../components/Button';
import CommentsGiftSharesScreen from './CommentsGiftSharesScreen';
import ReservationsScreen from './ReservationsScreen';
import { SvgXml } from 'react-native-svg';
import { editIcon, duplicateIcon, moveIcon, deleteIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
// Same "never upscale past natural size, only cap it" rule as WishlistItem.js's list thumbnail
// (mirrors wishsite3's .item-image-frame img max-width/max-height) - just a bigger box, matching
// this screen's own content padding/previous fixed image height.
const ITEM_DETAIL_IMAGE_MAX_WIDTH = width - 2 * (isTablet ? 30 : 20);
const ITEM_DETAIL_IMAGE_MAX_HEIGHT = isTablet ? 250 : 200;

const ItemDetailScreen = ({ item, onBack, onEdit, wishlistAdminKey, itemsSharable, namedReservationRequired, onDuplicate, onMove, onDelete, onChangeImagePress, refreshing, onRefresh }) => {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const hasImage = !!item.image_url;
  // Natural size capped at ITEM_DETAIL_IMAGE_MAX_WIDTH/HEIGHT, never upscaled - null (unknown
  // yet, or no image) falls back to filling the frame like before.
  const [imageSize, setImageSize] = useState(null);

  useEffect(() => {
    if (!item.image_url) {
      setImageSize(null);
      return;
    }
    let cancelled = false;
    Image.getSize(
      item.image_url,
      (naturalWidth, naturalHeight) => {
        if (cancelled || !naturalWidth || !naturalHeight) return;
        const scale = Math.min(1, ITEM_DETAIL_IMAGE_MAX_WIDTH / naturalWidth, ITEM_DETAIL_IMAGE_MAX_HEIGHT / naturalHeight);
        setImageSize({
          width: Math.round(naturalWidth * scale),
          height: Math.round(naturalHeight * scale),
        });
      },
      () => { if (!cancelled) setImageSize(null); }
    );
    return () => { cancelled = true; };
  }, [item.image_url]);
  // Mirrors web's showPopup() always removing any existing #popup first — only one of these can
  // be open at a time, opening one replaces the other instead of stacking.
  const [activePopup, setActivePopup] = useState(null); // null | 'reservations' | 'giftShares'
  const slideAnim = useSharedValue(width);
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));
  const scrollRef = useAnimatedRef();
  // Declared before swipeBackGesture below (not just called from it) - Reanimated's worklet
  // closure capture grabs referenced outer variables at gesture-creation time, and a `const`
  // declared later in this same component body is still in its temporal dead zone at that point.
  // Calling runOnJS(handleBack) while it's in that state doesn't throw immediately; it silently
  // captures an unresolved reference that only blows up ("Cannot read property
  // '__remoteFunction' of undefined") later when the worklet actually invokes it - i.e. exactly
  // when a swipe past the threshold tries to call it.
  const handleBack = () => {
    slideAnim.value = withTiming(width, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onBack)();
      }
    });
  };
  // Gesture.Pan() instead of PanResponder: a plain PanResponder loses the touch negotiation
  // against the ScrollView below for any drag starting over it, so swipe-back only worked when
  // started right over the header. activeOffsetX/failOffsetY let this coexist with the
  // ScrollView's own vertical scrolling — from anywhere on screen, not just a thin edge strip.
  // simultaneousWithExternalGesture is additionally required for pull-to-refresh specifically:
  // without it, this Pan gesture intercepts the initial touch before the ScrollView's native
  // RefreshControl gesture recognizer gets a chance to, even though this one fails moments later
  // for a vertical drag — the refresh spinner just never appears.
  // ScrollView here is deliberately gesture-handler's own (not React Native's) so
  // simultaneousWithExternalGesture below has a real gesture handler to negotiate with on
  // Android, where a bare RN ScrollView isn't part of RNGH's gesture arena the way it is on iOS.
  //
  // On Android, this gesture was reported to only "win" the touch when a swipe started right at
  // the screen edge. Investigated live via an Android emulator (adb + on-screen debug output):
  // this gesture's onTouchesDown never fires ANYWHERE, edge included — what looked like "edge
  // works" is actually Android's own predictive-back gesture (confirmed via
  // DisplayBackGestureHandler in the system log) closing the surrounding <Modal> through its
  // onRequestClose prop (WishlistDetailScreen.js), which is RN Modal's built-in back-dismiss
  // behavior on Android - entirely unrelated to this gesture. So mid-screen was never worse than
  // the edge; this gesture appears not to receive touches via synthetic input at all on this
  // setup. Rewritten on shared values so onUpdate/onEnd run natively on the UI thread (matching
  // the ScrollView's own gesture) rather than bouncing every touch-move through the JS thread via
  // .runOnJS(true) as before - a legitimate improvement either way, but flagged here since it
  // could not be confirmed to fix the underlying report given the finding above. Needs a real
  // device/finger check, not just the emulator's synthetic swipes.
  const swipeBackGesture = Gesture.Pan()
    .activeOffsetX(8)
    .failOffsetY([-40, 40])
    .simultaneousWithExternalGesture(scrollRef)
    .onUpdate((e) => {
      if (e.translationX > 0) {
        slideAnim.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX > width * 0.3) {
        runOnJS(handleBack)();
      } else {
        slideAnim.value = withSpring(0);
      }
    });

  useEffect(() => {
    slideAnim.value = withTiming(0, { duration: 300 });
  }, []);

  const handleShowCommentsGiftShares = () => {
    Alert.alert(
      i18n.t('wishlist.giftShares.confirmEditHeader'),
      i18n.t('wishlist.giftShares.confirmEditGiftShares'),
      [
        { text: i18n.t('wishlist.giftShares.cancel'), style: 'cancel' },
        { text: i18n.t('wishlist.giftShares.confirm'), onPress: () => setActivePopup('giftShares') }
      ]
    );
  };

  const handleShowReservations = () => {
    Alert.alert(
      i18n.t('wishlist.reservations.confirmEditHeader'),
      i18n.t('wishlist.reservations.confirmEditReservations'),
      [
        { text: i18n.t('wishlist.reservations.cancel'), style: 'cancel' },
        { text: i18n.t('wishlist.reservations.confirm'), onPress: () => setActivePopup('reservations') }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: insets.top + 15,
      paddingHorizontal: isTablet ? 30 : 20,
      paddingBottom: 8,
      backgroundColor: theme.background,
    },
    // Same visual box as WishlistDetailScreen's floatingBackButton either way; only the
    // positioning differs (inline in the header vs. floating over the image, see below).
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: 0.9,
      ...cardShadow(theme, isDarkMode),
    },
    // Applied on top of `backButton` only when the item has an image, so the button floats over
    // it (matching WishlistDetailScreen's banner treatment) instead of taking up its own row.
    backButtonFloating: {
      position: 'absolute',
      top: insets.top + 15,
      left: 16,
      zIndex: 10,
    },
    backButtonText: {
      fontSize: 22,
      color: theme.text,
      fontWeight: 'bold',
      // Android-only: it adds extra vertical font padding by default that pushes glyphs like
      // this one below true center within the circle, even with the parent's flex centering -
      // iOS never had this offset, and forcing the same lineHeight there shifted it too high.
      ...(Platform.OS === 'android' ? { lineHeight: 22, includeFontPadding: false, textAlignVertical: 'center' } : null),
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: isTablet ? 30 : 20,
      paddingTop: isTablet ? 12 : 8,
      paddingBottom: isTablet ? 60 : 45,
    },
    // Fixed-size white frame regardless of the actual image's (never-upscaled) natural size -
    // otherwise a small source image would shrink this whole area down with it instead of
    // sitting centered in a normal-looking image slot.
    itemImageWrapper: {
      position: 'relative',
      width: '100%',
      height: isTablet ? 250 : 200,
      marginBottom: isTablet ? 20 : 15,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    // Mirrors .item-img-menu-toggler (lists_and_items.scss): a small dark circular button
    // pinned to the image's top-right corner.
    changeImageButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Mirrors wishsite3's .admin-item-toolbar-detailed (controllers/wishlist.scss) — a centered
    // row of circular icon buttons above the title (delete/move/duplicate/edit on web).
    adminToolbar: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: isTablet ? 20 : 15,
    },
    adminToolbarButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemTitle: {
      ...headingStyle(isTablet ? 24 : 20),
      color: theme.text,
      marginBottom: isTablet ? 10 : 8,
    },
    itemDescription: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      marginBottom: isTablet ? 15 : 12,
      lineHeight: isTablet ? 22 : 20,
    },
    itemPrice: {
      ...headingStyle(isTablet ? 20 : 16),
      color: theme.positive,
      marginBottom: isTablet ? 20 : 15,
    },
    linksContainer: {
      marginTop: isTablet ? 20 : 15,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: isTablet ? 12 : 10,
      paddingVertical: 8,
    },
    linkFavicon: {
      width: 14,
      height: 14,
      borderRadius: 3,
    },
    linkText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
      flexShrink: 1,
    },
    // Wraps the two optional buttons so the section as a whole gets the bigger gap that used to
    // separate the old Edit button (now in the toolbar above) from the item content, regardless
    // of which of the two — or both — end up being shown.
    actionButtonsSection: {
      marginTop: isTablet ? 30 : 20,
      gap: isTablet ? 15 : 10,
    },
  });

  return (
    // This screen is only ever rendered inside a <Modal> (WishlistDetailScreen.js), which on
    // Android renders its content in a separate native window/Dialog outside the app's single
    // root-level GestureHandlerRootView (App.tsx) - gestures inside it silently receive no
    // touches at all there without their own nested GestureHandlerRootView. iOS doesn't need
    // this (its Modal implementation doesn't split the touch dispatch chain the same way), but
    // wrapping unconditionally is harmless there.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeBackGesture}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
      {hasImage ? (
        <TouchableOpacity style={[styles.backButton, styles.backButtonFloating]} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, hasImage && { paddingTop: insets.top }]}
        refreshControl={
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {item.image_url && (
          <View style={styles.itemImageWrapper}>
            <Image
              source={{ uri: item.image_url }}
              style={imageSize || styles.itemImage}
              resizeMode="contain"
            />
            {/* Mirrors .item-img-menu-toggler (app/views/items/_show.html.erb) - opens the
                change/crop image action sheet, see handleChangeItemImagePress in
                WishlistDetailScreen.js. */}
            <TouchableOpacity style={styles.changeImageButton} onPress={onChangeImagePress}>
              <SvgXml xml={editIcon('#FFFFFF')} width={16} height={16} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.adminToolbar}>
          <TouchableOpacity style={styles.adminToolbarButton} onPress={() => onEdit(item)}>
            <SvgXml xml={editIcon(theme.text)} width={18} height={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminToolbarButton} onPress={() => onDuplicate(item)}>
            <SvgXml xml={duplicateIcon(theme.text)} width={18} height={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminToolbarButton} onPress={() => onMove(item)}>
            <SvgXml xml={moveIcon(theme.text)} width={18} height={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminToolbarButton} onPress={() => onDelete(item)}>
            <SvgXml xml={deleteIcon(theme.danger)} width={18} height={18} />
          </TouchableOpacity>
        </View>

        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}
        <Text style={styles.itemPrice}>{item.price}</Text>

        {item.links && item.links.length > 0 && (
          <View style={styles.linksContainer}>
            {item.links.map((link, index) => (
              <TouchableOpacity
                key={link.id ?? index}
                style={styles.linkRow}
                onPress={() => Linking.openURL(link.url)}
              >
                {link.favicon_domain && (
                  <Image
                    source={{ uri: `https://icons.duckduckgo.com/ip3/${link.favicon_domain}.ico` }}
                    style={styles.linkFavicon}
                  />
                )}
                <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                  {link.display_name || link.url}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(!!item.allow_reservation || !!itemsSharable) && (
          <View style={styles.actionButtonsSection}>
            {!!item.allow_reservation && (
              <Button
                variant="secondary"
                onPress={handleShowReservations}
                fontSize={isTablet ? 16 : 14}
                title={i18n.t('wishlist.reservations.showLink')}
              />
            )}
            {!!itemsSharable && (
              <Button
                variant="secondary"
                onPress={handleShowCommentsGiftShares}
                fontSize={isTablet ? 16 : 14}
                title={i18n.t('wishlist.giftShares.showLink')}
              />
            )}
          </View>
        )}
        </ScrollView>
      </Animated.View>
      </GestureDetector>
      {activePopup === 'reservations' && (
        <ReservationsScreen
          wishlistAdminKey={wishlistAdminKey}
          item={item}
          namedReservationRequired={namedReservationRequired}
          onBack={() => setActivePopup(null)}
        />
      )}
      {activePopup === 'giftShares' && (
        <CommentsGiftSharesScreen
          wishlistAdminKey={wishlistAdminKey}
          item={item}
          onBack={() => setActivePopup(null)}
        />
      )}
    </GestureHandlerRootView>
  );
};

export default ItemDetailScreen;
