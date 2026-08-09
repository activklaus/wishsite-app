import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ScrollView, RefreshControl, Linking, Animated, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedRef } from 'react-native-reanimated';
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

const ItemDetailScreen = ({ item, onBack, onEdit, wishlistAdminKey, itemsSharable, namedReservationRequired, onDuplicate, onMove, onDelete, refreshing, onRefresh }) => {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const hasImage = !!item.image_url;
  // Mirrors web's showPopup() always removing any existing #popup first — only one of these can
  // be open at a time, opening one replaces the other instead of stacking.
  const [activePopup, setActivePopup] = useState(null); // null | 'reservations' | 'giftShares'
  const slideAnim = useRef(new Animated.Value(width)).current;
  const scrollRef = useAnimatedRef();
  // Gesture.Pan() instead of PanResponder: a plain PanResponder loses the touch negotiation
  // against the ScrollView below for any drag starting over it, so swipe-back only worked when
  // started right over the header. activeOffsetX/failOffsetY let this coexist with the
  // ScrollView's own vertical scrolling — from anywhere on screen, not just a thin edge strip.
  // simultaneousWithExternalGesture is additionally required for pull-to-refresh specifically:
  // without it, this Pan gesture intercepts the initial touch before the ScrollView's native
  // RefreshControl gesture recognizer gets a chance to, even though this one fails moments later
  // for a vertical drag — the refresh spinner just never appears.
  const swipeBackGesture = Gesture.Pan()
    .activeOffsetX(15)
    .failOffsetY([-15, 15])
    .simultaneousWithExternalGesture(scrollRef)
    .onUpdate((e) => {
      if (e.translationX > 0) {
        slideAnim.setValue(e.translationX);
      }
    })
    .onEnd((e) => {
      if (e.translationX > width * 0.3) {
        handleBack();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    })
    .runOnJS(true);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
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

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onBack();
    });
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
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: isTablet ? 30 : 20,
      paddingTop: isTablet ? 12 : 8,
      paddingBottom: isTablet ? 60 : 45,
    },
    itemImage: {
      width: '100%',
      height: isTablet ? 250 : 200,
      borderRadius: RADIUS.card,
      marginBottom: isTablet ? 20 : 15,
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
    <>
      <GestureDetector gesture={swipeBackGesture}>
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
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
          <Image
            source={{ uri: item.image_url }}
            style={styles.itemImage}
            resizeMode="cover"
          />
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
    </>
  );
};

export default ItemDetailScreen;
