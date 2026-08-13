import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Modal, TextInput, Alert, ScrollView, Image, Animated, Linking, ActivityIndicator, Share, Platform, KeyboardAvoidingView, RefreshControl as RNRefreshControl } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Gesture, GestureDetector, RefreshControl as GHRefreshControl } from 'react-native-gesture-handler';

// The RefreshControl class needs to differ by platform for this DraggableFlatList (see its
// refreshControl prop below): iOS needs React Native's own, because gesture-handler's wraps the
// native UIRefreshControl in an extra NativeViewGestureHandler view that breaks iOS's
// RCTScrollView native z-order/inset handling for it (spinner rendered behind the banner
// instead of pinned above it). Android needs the opposite - gesture-handler's own, because a
// plain RN RefreshControl's pull gesture doesn't properly participate in RNGH's touch arena
// there alongside DraggableFlatList's own internal drag gesture, and silently never activates.
const RefreshControl = Platform.OS === 'ios' ? RNRefreshControl : GHRefreshControl;
import { useAnimatedRef } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import i18n from '../i18n';
import { headingStyle, bodyStyle, buttonStyle, strongStyle } from '../styles/fonts';
import ItemDetailScreen from './ItemDetailScreen';
import CommentsGiftSharesScreen from './CommentsGiftSharesScreen';
import ReservationsScreen from './ReservationsScreen';
import WishlistLockedScreen from './WishlistLockedScreen';
import WishlistItem from '../components/WishlistItem';
import SkeletonLoader from '../components/SkeletonLoader';
import ModalSkeleton from '../components/ModalSkeleton';
import SafeImage from '../components/SafeImage';
import { useWishlistItems } from '../hooks/useWishlistItems';
import { showToast } from '../services/toast';
import api, { WEB_BASE_URL } from '../services/api';
import { registerPushToken, unregisterPushToken } from '../services/pushNotifications';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, INPUT_RADIUS, cardShadow, BANNER_HEIGHT, AVATAR_SIZE, AVATAR_BOTTOM_OFFSET } from '../styles/shared';
import { palette } from '../styles/colors';
import Button from '../components/Button';
import TextField from '../components/TextField';
import AnimatedMenu from '../components/AnimatedMenu';
import ImageCropScreen from './ImageCropScreen';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { SvgXml } from 'react-native-svg';
import { editIcon, cropIcon, backgroundIcon, userImageIcon, openIcon, clipboardIcon, shortlinkIcon, qrcodeIcon, embedIcon, shareIcon, deleteIcon, duplicateIcon, moveIcon, lockIcon, hiddenIcon, sortIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Ported from wishsite3's `body[data-theme="..."]` rules (controllers/wishlist.scss) — a
// wishlist color scheme doesn't just tint the banner on web, it also recolors the wishlist
// title, item card backgrounds + top border, item price text, and the share button. Named
// colors reuse the same shade (_l_1/_d_1) for accent/border/shareBg; "mono" is special-cased
// since it mixes shades from three different palette entries (black + sand + white).
const WISHLIST_THEME_COLORS = (() => {
  const fromShades = (c) => ({
    cardBg: c.l4, cardBgDark: c.d4,
    accent: c.l1, accentDark: c.d1,
    border: c.l1, borderDark: c.d1,
    shareBg: c.l1, shareBgDark: c.d1,
  });
  return {
    blue: fromShades(palette.blue),
    green: fromShades(palette.green),
    yellow: fromShades(palette.yellow),
    red: fromShades(palette.red),
    pink: fromShades(palette.pink),
    violet: fromShades(palette.violet),
    brown: fromShades(palette.brown),
    mono: {
      cardBg: palette.sand.l4, cardBgDark: palette.whiteDark.d4,
      accent: palette.black.l1, accentDark: palette.whiteDark.d1,
      border: palette.black.l2, borderDark: palette.whiteDark.d3,
      shareBg: palette.black.l1, shareBgDark: palette.whiteDark.d3,
    },
  };
})();

// Mirrors wishsite3's `_wl_theme` computation (layouts/application.html.erb): the named
// scheme can live in either the `theme` column or (legacy) `background_color`.
const getWishlistThemeColors = (wishlist) => {
  const key = [wishlist?.theme, wishlist?.background_color].find((v) => v && WISHLIST_THEME_COLORS[v]);
  return key ? WISHLIST_THEME_COLORS[key] : null;
};

const getWishlistBannerColor = (color) => {
  if (!color || color === '#ffffff') return null;
  if (color.startsWith('#')) return color;
  return WISHLIST_THEME_COLORS[color]?.accent || null;
};

const getWishlistBannerDarkColor = (color) => {
  if (!color || color === '#ffffff') return null;
  if (color.startsWith('#')) return color;
  return WISHLIST_THEME_COLORS[color]?.accentDark || null;
};

const WishlistDetailScreen = ({ wishlist, authToken, onBack, onWishlistUpdate, onLogout, autoOpenEdit }) => {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, setItems, loading, loadItems, wishlistData, locked, updateItem, deleteItem, duplicateItem, moveItem, addItem, loadSingleItem, loadItemAdmin, updateWishlist, deleteWishlist } = useWishlistItems(wishlist, authToken);
  const [refreshing, setRefreshing] = useState(false);
  const [itemRefreshing, setItemRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [wishTitle, setWishTitle] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [moreResultsLoaded, setMoreResultsLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [addingItem, setAddingItem] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(null);
  const [optionsMenuPosition, setOptionsMenuPosition] = useState({ x: 0, y: 0 });
  // Mirrors items_controller.rb#move_form (web) — picking a target among the user's own
  // other wishlists. moveItemTarget is the item being moved (null when the picker is closed).
  const [moveItemTarget, setMoveItemTarget] = useState(null);
  const [moveWishlists, setMoveWishlists] = useState([]);
  const [loadingMoveWishlists, setLoadingMoveWishlists] = useState(false);
  const [movingItem, setMovingItem] = useState(false);
  const [directAddMode, setDirectAddMode] = useState(false);
  const [imagePickerItem, setImagePickerItem] = useState(null); // { itemId, images, selectedIndex }
  const [loadingImages, setLoadingImages] = useState(false);
  // Mirrors web's showOverlay(true, true) shown while items_controller.rb#copy / #move run.
  const [performingItemAction, setPerformingItemAction] = useState(false);
  const [fromSearch, setFromSearch] = useState(false);
  // imagesChecked: true once an image-scrape attempt for a URL has actually completed (whether
  // or not it found anything) — distinguishes "no URL entered yet" (images: [], stay silent)
  // from "URL scraped, found nothing" (images: [], show the no-image-found notice), mirroring
  // wishsite3's images/load_images.js.erb `if @images.size > 0 ... else <no_image.png notice>`.
  const [directWish, setDirectWish] = useState({ title: '', description: '', price: '', url: '', hidden: false, allow_reservation: true, images: [], imagesChecked: false, selectedImageIndex: 0, position: 0 });
  const [itemDetailMode, setItemDetailMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // Mirrors web's showPopup() always removing any existing #popup first — only one of these can
  // be open at a time, opening one replaces the other instead of stacking.
  const [activeEditItemPopup, setActiveEditItemPopup] = useState(null); // null | 'reservations' | 'giftShares'
  const [wishlistScrollPosition, setWishlistScrollPosition] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editItem, setEditItem] = useState({ title: '', description: '', price: '', quantity: '1', links: [{ url: '' }], allow_reservation: true, hidden: false });
  const [showQuantityPicker, setShowQuantityPicker] = useState(false);
  const QUANTITY_OPTIONS = Array.from({ length: 100 }, (_, i) => i + 1); // matches web's <select> of 1..100
  const [wishlistOptionsVisible, setWishlistOptionsVisible] = useState(false);
  const [editWishlistMode, setEditWishlistMode] = useState(false);
  const [loadingEditWishlist, setLoadingEditWishlist] = useState(false);
  const [loadingShareMenu, setLoadingShareMenu] = useState(false);
  const [editWishlist, setEditWishlist] = useState({ title: '', description: '', owner_name: '', theme: '', named_reservation_required: false, items_sharable: true, hide_reserved_items_by_default: true, crawlable: false, reservation_notices: false, push_notifications: false, newsletter_accepted: false });
  const [showEmailField, setShowEmailField] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [resendingNewsletterConfirmation, setResendingNewsletterConfirmation] = useState(false);
  const [currentWishlist, setCurrentWishlist] = useState(wishlist);
  const [reservedItemsCount, setReservedItemsCount] = useState(null);

  useEffect(() => {
    if (wishlistData) {
      setCurrentWishlist(prev => ({ ...prev, ...wishlistData }));
    }
  }, [wishlistData]);

  const [savingItem, setSavingItem] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [loadingEditItem, setLoadingEditItem] = useState(false);
  const [cropSession, setCropSession] = useState(null); // { mode: 'background' | 'avatar', imageUri }
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [shareSubView, setShareSubView] = useState(null); // null | 'shortlink' | 'qrcode' | 'changeLink' | 'embed'
  const [linkCopied, setLinkCopied] = useState(false);
  const [shortlinkCopied, setShortlinkCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loadingQrCode, setLoadingQrCode] = useState(false);
  const [savingQrCodeToPhotos, setSavingQrCodeToPhotos] = useState(false);
  const [qrCodeSaved, setQrCodeSaved] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [savingCustomKey, setSavingCustomKey] = useState(false);
  const flatListRef = useRef(null);
  // useAnimatedRef (not a plain useRef) so swipeBackGesture below can be marked as running
  // simultaneously with this list's own native gestures — otherwise it fully compatible as a
  // normal ref for the imperative scrollToIndex/scrollToOffset calls used elsewhere.
  const wishlistRef = useAnimatedRef();
  // Starts off-screen and animates in on mount (see the useEffect below) — matches
  // ItemDetailScreen's entrance animation, so opening a wishlist flies in from the right just
  // like opening an item does. Also doubles as the swipe-back-out gesture's animated value.
  const slideAnim = useRef(new Animated.Value(width)).current;

  // Gesture.Pan() (react-native-gesture-handler) instead of the old PanResponder: a plain
  // PanResponder loses the touch-negotiation against the items FlatList/ScrollView for any drag
  // starting over them, so swipe-back only ever worked when started right over the header.
  // activeOffsetX/failOffsetY let this coexist with the list's own vertical scrolling — a
  // predominantly vertical drag fails this gesture and falls through to the list; a
  // predominantly horizontal-rightward one wins it, from anywhere on screen. Recreated fresh
  // every render (cheap), so — unlike the old useRef(PanResponder...) — it never goes stale.
  // simultaneousWithExternalGesture is additionally required for pull-to-refresh specifically:
  // without it, this Pan gesture intercepts the initial touch before the list's native
  // RefreshControl gesture recognizer gets a chance to, even though this one fails moments later
  // for a vertical drag — the refresh spinner just never appears.
  const swipeBackGesture = Gesture.Pan()
    .enabled(!modalVisible && !editMode && !editWishlistMode && !itemDetailMode)
    .activeOffsetX(15)
    .failOffsetY([-15, 15])
    .simultaneousWithExternalGesture(wishlistRef)
    .onUpdate((e) => {
      if (e.translationX > 0) {
        slideAnim.setValue(e.translationX);
      }
    })
    .onEnd((e) => {
      if (e.translationX > width * 0.3) {
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onBack());
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

  // Tapping the back button (as opposed to swiping) skipped the slide-out animation entirely —
  // matches ItemDetailScreen's handleBack.
  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onBack();
    });
  };

  // Pull-to-refresh: scrolling past the top of the item list re-fetches both the items and the
  // wishlist header fields (reserved counts, etc.) — loadItems() already covers both.
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handleAddWish = (position = 0) => {
    closeAllMenus();
    setDirectWish({ ...directWish, position });
    setModalVisible(true);
  };

  const handleSearchProduct = async () => {
    if (!wishTitle.trim()) return;
    
    setSearching(true);
    setMoreResultsLoaded(false);
    try {
      const response = await api.post('/search', { q: wishTitle });
      const data = response.data;
      
      if (data.results && Array.isArray(data.results)) {
        setSearchResults(data.results.map(item => ({
          ...item,
          image_url: item.small_image_url
        })));
      } else if (data.product) {

        const imagesArray = data.product.images || [];
        if (data.product.image_url && imagesArray.length === 0) {
          imagesArray.push(data.product.image_url);
        }
        setDirectAddMode(true);
        setFromSearch(true);
        setDirectWish({
          title: data.product.title || '',
          description: data.product.description || '',
          price: data.product.price ? data.product.price.replace(/[^\d.,]/g, '').replace(',', '.') : '',
          url: data.product.url || '',
          hidden: false,
          allow_reservation: true,
          images: imagesArray,
          imagesChecked: true,
          selectedImageIndex: 0,
          position: directWish.position
        });
      }
    } catch (error) {
    } finally {
      setSearching(false);
    }
  };

  const handleSearchMore = async () => {
    setSearching(true);
    try {
      const response = await api.post('/search', { q: wishTitle, limit: 20 });
      const data = response.data;
      
      if (data.results && Array.isArray(data.results)) {
        setSearchResults(data.results.map(item => ({
          ...item,
          image_url: item.small_image_url
        })));
        setMoreResultsLoaded(true);
      }
    } catch (error) {
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleBackToResults = () => {
    setSelectedProduct(null);
    setTimeout(() => {
      if (flatListRef.current && scrollPosition > 0) {
        flatListRef.current.scrollToOffset({ offset: scrollPosition, animated: false });
      }
    }, 100);
  };

  const handleAddToWishlist = async (product) => {
    setAddingItem(product.deeplink);
    try {
      const itemData = {
        title: product.title,
        description: product.description || '',
        price: parseFloat(product.price),
        quantity: 1,
        allow_reservation: true,
        hidden: false,
        links: [{ url: product.deeplink }],
        position: directWish.position,
        remote_image_url: product.image_url
      };
      
      console.log('=== SEARCH PRODUCT REQUEST ===');
      console.log('Request Data:', JSON.stringify(itemData, null, 2));
      
      const newItem = await addItem(itemData);
      
      // Scroll to new item
      setTimeout(() => {
        if (wishlistRef.current && newItem) {
          const newIndex = items.findIndex(item => item.id === newItem.id);
          if (newIndex !== -1) {
            wishlistRef.current.scrollToIndex({ index: newIndex, animated: true });
          }
        }
      }, 100);
      
      setWishTitle('');
      setSearchResults([]);
      setSelectedProduct(null);
      setModalVisible(false);
    } catch (error) {
    } finally {
      setAddingItem(null);
    }
  };

  // Mirrors items_controller.rb#copy (web) — clones the item server-side and re-inserts it
  // directly after the original. Web also shows a loading overlay for the duration and, on
  // success, a flash notice plus a jump back to the original item's position (@last_item_id).
  const handleDuplicateItem = async (item) => {
    setOptionsVisible(null);
    const wasInDetailView = itemDetailMode;
    setPerformingItemAction(true);
    try {
      const freshItems = await duplicateItem(item.id);
      if (wasInDetailView) {
        setItemDetailMode(false);
        setSelectedItem(null);
        const index = freshItems.findIndex((i) => i.id === item.id);
        if (index >= 0) {
          setTimeout(() => {
            wishlistRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
          }, 200);
        }
      }
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.duplicateItemError'));
    } finally {
      setPerformingItemAction(false);
    }
  };

  // Mirrors items_controller.rb#move_form (web): loads the user's own other wishlists to
  // pick a move target from.
  const handleOpenMoveItem = async (item) => {
    setOptionsVisible(null);
    setMoveItemTarget(item);
    setLoadingMoveWishlists(true);
    try {
      const { data } = await api.get('/user');
      setMoveWishlists((data.wishlists || []).filter((wl) => wl.admin_key !== currentWishlist.admin_key));
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.moveItemLoadError'));
      setMoveItemTarget(null);
    } finally {
      setLoadingMoveWishlists(false);
    }
  };

  const handleCloseMoveItem = () => {
    setMoveItemTarget(null);
    setMoveWishlists([]);
  };

  // Mirrors items_controller.rb#move (web) — reassigns the item to the chosen wishlist and
  // appends it at the end there.
  const handleMoveItemTo = async (targetWishlist) => {
    if (!moveItemTarget) return;
    // The item now belongs to a different wishlist — nothing left to show here if its detail
    // view was open. Its current index is captured now (before it's removed from this list) so
    // we can scroll back to roughly where it used to sit.
    const wasInDetailView = itemDetailMode && selectedItem?.id === moveItemTarget.id;
    const previousIndex = items.findIndex((i) => i.id === moveItemTarget.id);
    setMovingItem(true);
    setPerformingItemAction(true);
    try {
      const freshItems = await moveItem(moveItemTarget.id, targetWishlist.admin_key);
      handleCloseMoveItem();
      showToast(i18n.t('wishlist.moveItemSuccess', { wishlist: targetWishlist.title }));
      if (wasInDetailView) {
        setItemDetailMode(false);
        setSelectedItem(null);
        if (previousIndex >= 0 && freshItems.length > 0) {
          const clampedIndex = Math.min(previousIndex, freshItems.length - 1);
          setTimeout(() => {
            wishlistRef.current?.scrollToIndex({ index: clampedIndex, animated: true, viewPosition: 0.3 });
          }, 200);
        }
      }
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.moveItemError'));
    } finally {
      setMovingItem(false);
      setPerformingItemAction(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      i18n.t('wishlist.removeConfirm'),
      i18n.t('wishlist.removeMessage', { title: item.title }),
      [
        {
          text: i18n.t('wishlist.cancel'),
          style: 'cancel',
          onPress: () => setOptionsVisible(null)
        },
        {
          text: i18n.t('wishlist.remove'),
          style: 'destructive',
          onPress: () => handleDeleteConfirm(item.id)
        }
      ]
    );
  };

  const handleDeleteConfirm = async (itemId) => {
    try {
      await deleteItem(itemId);
      setOptionsVisible(null);
      // The item detail view (if open for this item) has nothing left to show once it's deleted.
      if (itemDetailMode && selectedItem?.id === itemId) {
        handleBackFromItemDetail();
      }
    } catch (error) {
    }
  };

  const handleDirectAdd = async () => {
    setDirectAddMode(true);
    setFromSearch(false);
    const initialWish = { title: wishTitle, description: '', price: '', url: '', hidden: false, allow_reservation: true, images: [], imagesChecked: false, selectedImageIndex: 0 };
    setDirectWish(initialWish);

    // Wenn wishTitle eine URL ist, lade Bilder
    if (wishTitle.trim().startsWith('http://') || wishTitle.trim().startsWith('https://')) {
      try {
        const response = await api.get(`/images/load_images?url=${encodeURIComponent(wishTitle.trim())}`);
        if (response.data.images && Array.isArray(response.data.images)) {
          setDirectWish(prev => ({
            ...prev,
            url: wishTitle.trim(),
            images: response.data.images,
            imagesChecked: true,
            selectedImageIndex: 0
          }));
        }
      } catch (error) {
        console.log('Error loading images:', error);
      }
    }
  };

  const handleSaveDirectWish = async () => {
    if (directWish.title.trim()) {
      try {
        const itemData = {
          title: directWish.title,
          description: directWish.description || '',
          price: directWish.price,
          quantity: 1,
          links: directWish.url ? [{ url: directWish.url }] : [],
          hidden: directWish.hidden,
          allow_reservation: directWish.allow_reservation,
          position: directWish.position
        };
        
        const savedUrl = directWish.url.trim();
        const newItem = await addItem(itemData);
        
        setWishTitle('');
        setDirectWish({ title: '', description: '', price: '', url: '', hidden: false, allow_reservation: true, images: [], selectedImageIndex: 0 });
        setDirectAddMode(false);
        setFromSearch(false);
        setModalVisible(false);

        if (newItem && savedUrl && (savedUrl.startsWith('http://') || savedUrl.startsWith('https://'))) {
          setLoadingImages(true);
          try {
            const response = await api.get(`/images/load_images?url=${encodeURIComponent(savedUrl)}`);
            if (response.data.images && Array.isArray(response.data.images) && response.data.images.length > 0) {
              setImagePickerItem({ itemId: newItem.id, images: response.data.images, selectedIndex: 0 });
            }
          } catch (e) {}
          setLoadingImages(false);
        }
      } catch (error) {
      }
    }
  };

  const handleBackToSearch = () => {
    setDirectAddMode(false);
    setFromSearch(false);
    setDirectWish({ title: '', description: '', price: '', url: '', hidden: false, allow_reservation: true });
  };

  // Mirrors wishlist_controller.rb#reorder (web, Sortable.js drag-and-drop) via the new
  // api/v1/items#reorder action. previousItems lets a failed request roll the local list back.
  const handleDragEnd = async ({ data }) => {
    const previousItems = items;
    setItems(data);
    try {
      await api.put(`/wishlists/${currentWishlist.admin_key}/items/reorder`, {
        order: data.map(item => item.id),
      });
    } catch (error) {
      setItems(previousItems);
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.shareGenericError'));
    }
  };

  const handleBackFromItemDetail = () => {
    console.log('WishlistDetailScreen handleBackFromItemDetail called');
    setItemDetailMode(false);
    setSelectedItem(null);
    setTimeout(() => {
      if (wishlistRef.current && wishlistScrollPosition > 0) {
        wishlistRef.current.scrollToOffset({ offset: wishlistScrollPosition, animated: false });
      }
    }, 100);
  };

  const handleSaveEdit = async () => {
    if (editItem.title.trim()) {
      setSavingItem(true);
      try {
        // Sammle alle ursprünglichen Link IDs
        const originalLinkIds = editItem.originalLinks ? editItem.originalLinks.map(link => link.id).filter(Boolean) : [];
        
        // Aktuelle Links (behalten/neu)
        const currentLinks = editItem.links
          .filter(link => link.url && link.url.trim())
          .map(link => ({
            url: link.url,
            ...(link.id && { id: link.id }),
            _destroy: false
          }));
        
        // Entfernte Links (mit _destroy: true)
        const currentLinkIds = currentLinks.map(link => link.id).filter(Boolean);
        const removedLinkIds = originalLinkIds.filter(id => !currentLinkIds.includes(id));
        const removedLinks = removedLinkIds.map(id => ({
          id: id,
          _destroy: true
        }));
        
        const allLinks = [...currentLinks, ...removedLinks];
        
        await updateItem(editItem.id, {
          title: editItem.title,
          description: editItem.description || '',
          price: parseFloat(editItem.price) || 0,
          quantity: parseInt(editItem.quantity) || 1,
          links: allLinks,
          allow_reservation: editItem.allow_reservation,
          hidden: editItem.hidden
        });
        
        setEditMode(false);
        setEditItem({ title: '', description: '', price: '', quantity: '1', links: [{ url: '' }], allow_reservation: true, hidden: false });
      } catch (error) {
      } finally {
        setSavingItem(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditItem({ title: '', description: '', price: '', quantity: '1', links: [{ url: '' }], allow_reservation: true, hidden: false });
  };

  const handleCancelWish = () => {
    setWishTitle('');
    setSearchResults([]);
    setSelectedProduct(null);
    setDirectAddMode(false);
    setFromSearch(false);
    setDirectWish({ title: '', description: '', price: '', url: '', hidden: false, allow_reservation: true });
    setModalVisible(false);
  };

  const handleEditItem = async (item) => {
    setLoadingEditItem(true);
    try {
      const freshItem = await loadSingleItem(item.id);
      
      const linksArray = freshItem.links && freshItem.links.length > 0
        ? freshItem.links.map(link => ({
            id: link.id,
            url: link.url
          }))
        : [{ url: '' }];
      
      const finalEditItem = {
        id: freshItem.id,
        title: freshItem.title,
        description: freshItem.description || '',
        price: freshItem.price?.toString() || '',
        quantity: freshItem.quantity?.toString() || '1',
        links: linksArray,
        originalLinks: linksArray, // Speichere ursprüngliche Links
        allow_reservation: freshItem.allow_reservation !== false,
        hidden: freshItem.hidden || false
      };
      

      
      setEditItem(finalEditItem);
      
      setOptionsVisible(null);
      setEditMode(true);
    } catch (error) {
    } finally {
      setLoadingEditItem(false);
    }
  };

  // Shared by handleItemPress's background refresh-on-open and the item detail view's
  // pull-to-refresh — re-fetches the whole item list (reservation status etc. can only be
  // known list-wide) and re-applies just the one item, if it's still the one being viewed.
  const refreshSelectedItem = async (itemId) => {
    try {
      const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/admin`);
      setItems(data.items || []);
      const fresh = (data.items || []).find(i => i.id === itemId);
      if (fresh) {
        // Only apply if the user is still looking at this same item (avoids a late response
        // overwriting a different item they've since navigated to).
        setSelectedItem(prev => (prev && prev.id === itemId ? fresh : prev));
      }
    } catch (error) {
      // keep showing the already-cached item, non-fatal
    }
  };

  const handleItemPress = (item) => {
    setSelectedItem(item);
    setItemDetailMode(true);
    // Refresh in the background so reservation status etc. can't go stale while the modal is
    // open, without blocking on a loading spinner for what's otherwise an instant view action.
    refreshSelectedItem(item.id);
  };

  // Used by the item detail view's own pull-to-refresh - unlike refreshSelectedItem above, this
  // fetches just the one item (GET .../items/:id) instead of the whole wishlist, since the user
  // pulling to refresh from inside a single item's view shouldn't reload the entire list.
  const refreshSingleItem = async (itemId) => {
    try {
      const fresh = await loadItemAdmin(itemId);
      setSelectedItem(prev => (prev && prev.id === itemId ? fresh : prev));
      setItems(prev => prev.map(i => (i.id === itemId ? fresh : i)));
    } catch (error) {
      // keep showing the already-cached item, non-fatal
    }
  };

  const addLinkField = () => {
    setEditItem({...editItem, links: [...editItem.links, { url: '' }]});
  };

  const removeLinkField = (index) => {
    const newLinks = editItem.links.filter((_, i) => i !== index);
    if (newLinks.length === 0) {
      newLinks.push({ url: '' });
    }
    setEditItem({...editItem, links: newLinks});
  };

  const updateLink = (index, value) => {
    const newLinks = [...editItem.links];
    newLinks[index] = { ...newLinks[index], url: value };
    setEditItem({...editItem, links: newLinks});
  };

  const handleEditWishlist = async () => {
    setLoadingEditWishlist(true);
    try {
      const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/edit`);
      setCurrentWishlist(prev => ({ ...prev, ...data }));
      setEditWishlist({
        title: data.title || '',
        description: data.description || '',
        owner_name: data.owner_name || '',
        theme: data.theme || '',
        named_reservation_required: data.named_reservation_required || false,
        items_sharable: data.items_sharable !== false,
        // Column default is true (db/schema.rb), so only an explicit `false` should opt out.
        hide_reserved_items_by_default: data.hide_reserved_items_by_default !== false,
        crawlable: data.crawlable || false,
        reservation_notices: data.reservation_notices || false,
        push_notifications: data.push_notifications || false,
        newsletter_accepted: data.newsletter_accepted || false
      });
      setNewEmailInput(data.new_email || '');
      setShowEmailField(false);
      setEditWishlistMode(true);
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.shareGenericError'));
    } finally {
      setLoadingEditWishlist(false);
    }
  };

  // Deep-link from the overview screen's "Edit wishsite" menu item (WishlistScreen.js), which
  // navigates here fresh (full remount, no nav stack) rather than opening the modal itself.
  useEffect(() => {
    if (autoOpenEdit) {
      handleEditWishlist();
    }
  }, []);

  // Mobile-only opt-in (no web equivalent): registers/unregisters this device's Expo push
  // token right away so the toggle takes effect even if the user backs out without saving,
  // while `push_notifications` itself still rides along in the regular save payload below.
  const handleTogglePushNotifications = async (enabled) => {
    if (enabled) {
      const success = await registerPushToken(currentWishlist.admin_key);
      if (!success) {
        Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.pushNotificationsPermissionError'));
        return;
      }
    } else {
      unregisterPushToken(currentWishlist.admin_key);
    }
    setEditWishlist(prev => ({ ...prev, push_notifications: enabled }));
  };

  const handleSaveWishlist = async () => {
    setSavingWishlist(true);
    try {
      const payload = { ...editWishlist, new_email: newEmailInput.trim() };
      const updatedWishlist = await updateWishlist(payload);
      // Update local state (server response carries the synced background_color / new_email confirmation state)
      setCurrentWishlist({ ...currentWishlist, ...payload, ...updatedWishlist });
      // Update parent if callback provided
      if (onWishlistUpdate) {
        onWishlistUpdate(updatedWishlist);
      }
      setEditWishlistMode(false);
    } catch (error) {
    } finally {
      setSavingWishlist(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendingConfirmation(true);
    try {
      const { data } = await api.post(`/wishlists/${currentWishlist.admin_key}/resend_email_confirmation`);
      setCurrentWishlist(prev => ({ ...prev, new_email_confirmation_sent_at: data.new_email_confirmation_sent_at }));
      Alert.alert(i18n.t('wishlist.mailConfirmationSent'));
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.shareGenericError'));
    } finally {
      setResendingConfirmation(false);
    }
  };

  // Newsletter opt-in confirmation for the wishlist's stored email — a separate flow from
  // handleResendConfirmation above (which resends the new_email/email-change confirmation).
  const handleResendNewsletterConfirmation = async () => {
    setResendingNewsletterConfirmation(true);
    try {
      const { data } = await api.post(`/wishlists/${currentWishlist.admin_key}/resend_newsletter_confirmation`);
      Alert.alert(
        data.already_confirmed ? i18n.t('wishlist.newsletterAlreadyConfirmed') : i18n.t('wishlist.newsletterConfirmationMailSent')
      );
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.shareGenericError'));
    } finally {
      setResendingNewsletterConfirmation(false);
    }
  };

  // Ported from wishsite3's background_image/user_image upload + crop flow
  // (app/controllers/api/v1/background_images_controller.rb, app/controllers/api/v1/user_images_controller.rb).
  const pickAndUploadImage = async (mode) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('wishlist.permissionRequiredTitle'), i18n.t('wishlist.photoPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const field = mode === 'avatar' ? 'user_image' : 'background_image';
    const endpoint = `/wishlists/${currentWishlist.admin_key}/${field}`;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append(field, {
        uri: asset.uri,
        name: asset.fileName || 'upload.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      const { data } = await api.patch(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCropSession({ mode, imageUri: mode === 'avatar' ? data.user_image_url : data.background_image_url });
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.imageUploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const openCropExisting = async (mode) => {
    const field = mode === 'avatar' ? 'user_image' : 'background_image';
    try {
      const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/${field}/edit`);
      const cropX = data[`${field}_crop_x`];
      const cropY = data[`${field}_crop_y`];
      const cropW = data[`${field}_crop_w`];
      const cropH = data[`${field}_crop_h`];
      const initialCrop = cropW && cropH
        ? { x: Number(cropX) || 0, y: Number(cropY) || 0, w: Number(cropW), h: Number(cropH) }
        : null;
      setCropSession({
        mode,
        imageUri: mode === 'avatar' ? data.user_image_url : data.background_image_url,
        initialCrop,
      });
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.imageUploadError'));
    }
  };

  const handleCropSaved = (newUrl) => {
    if (cropSession.mode === 'item') {
      // The item's image_url is derived (resolved_item_image_url, api/v1/item_images_controller.rb)
      // rather than a single field on currentWishlist - just re-fetch that one item instead of
      // patching newUrl in by hand.
      refreshSingleItem(cropSession.itemId);
      setCropSession(null);
      return;
    }
    const field = cropSession.mode === 'avatar' ? 'user_image_url' : 'background_image_url';
    setCurrentWishlist(prev => ({ ...prev, [field]: newUrl }));
    setCropSession(null);
  };

  // Mirrors wishsite3's item image edit/crop flyout (app/views/items/_show.html.erb) - "change
  // image" always available, "crop image" only once an image exists to crop.
  const pickAndUploadItemImage = async (item) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(i18n.t('wishlist.permissionRequiredTitle'), i18n.t('wishlist.photoPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'upload.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      const { data } = await api.patch(`/wishlists/${currentWishlist.admin_key}/items/${item.id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCropSession({ mode: 'item', itemId: item.id, imageUri: data.image_url });
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.imageUploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const openCropExistingItemImage = async (item) => {
    try {
      const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/items/${item.id}/image/edit`);
      const initialCrop = data.image_crop_w && data.image_crop_h
        ? { x: Number(data.image_crop_x) || 0, y: Number(data.image_crop_y) || 0, w: Number(data.image_crop_w), h: Number(data.image_crop_h) }
        : null;
      setCropSession({ mode: 'item', itemId: item.id, imageUri: data.image_url, initialCrop });
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.imageUploadError'));
    }
  };

  const handleChangeItemImagePress = (item) => {
    const buttons = [
      { text: i18n.t('wishlist.changeItemImageLink'), onPress: () => pickAndUploadItemImage(item) },
    ];
    if (item.image_url) {
      buttons.push({
        text: i18n.t('wishlist.cropItemImageLink'),
        onPress: () => openCropExistingItemImage(item),
      });
    }
    buttons.push({ text: i18n.t('wishlist.cancel'), style: 'cancel' });
    Alert.alert(i18n.t('wishlist.changeItemImageLink'), null, buttons);
  };

  const imageActionLabel = (mode) => {
    const isAvatar = mode === 'avatar';
    const hasImage = isAvatar ? !!currentWishlist.user_image_url : !!currentWishlist.background_image_url;
    if (hasImage) {
      return isAvatar ? i18n.t('wishlist.changeAvatarLink') : i18n.t('wishlist.changeBackgroundLink');
    }
    return isAvatar ? i18n.t('wishlist.addAvatarLink') : i18n.t('wishlist.addBackgroundLink');
  };

  const handleChangeImagePress = (mode) => {
    const isAvatar = mode === 'avatar';
    const hasImage = isAvatar ? !!currentWishlist.user_image_url : !!currentWishlist.background_image_url;
    const buttons = [
      { text: i18n.t('wishlist.selectImages'), onPress: () => pickAndUploadImage(mode) },
    ];
    if (hasImage) {
      if (!isAvatar) {
        buttons.push({
          text: i18n.t('wishlist.cropBackgroundLink'),
          onPress: () => openCropExisting(mode),
        });
      }
      buttons.push({
        text: isAvatar ? i18n.t('wishlist.removeAvatarLink') : i18n.t('wishlist.removeBackgroundLink'),
        style: 'destructive',
        // Deferred: firing a second Alert.alert synchronously from within another alert's
        // onPress is unreliable on iOS (the first alert's dismiss animation swallows it).
        onPress: () => setTimeout(() => confirmRemoveImage(mode), 400),
      });
    }
    buttons.push({ text: i18n.t('wishlist.cancel'), style: 'cancel' });
    Alert.alert(
      imageActionLabel(mode),
      null,
      buttons
    );
  };

  const confirmRemoveImage = (mode) => {
    const isAvatar = mode === 'avatar';
    Alert.alert(
      i18n.t('wishlist.removeImageConfirmTitle'),
      isAvatar ? i18n.t('wishlist.removeAvatarConfirmMessage') : i18n.t('wishlist.removeBackgroundConfirmMessage'),
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        { text: i18n.t('wishlist.remove'), style: 'destructive', onPress: () => removeImage(mode) },
      ]
    );
  };

  const removeImage = async (mode) => {
    const isAvatar = mode === 'avatar';
    const field = isAvatar ? 'user_image' : 'background_image';
    try {
      await api.patch(`/wishlists/${currentWishlist.admin_key}/${field}`, { [`remove_${field}`]: '1' });
      setCurrentWishlist(prev => ({ ...prev, [`${field}_url`]: null }));
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.imageRemoveError'));
    }
  };

  // Ported from wishsite3's #share-wl / #share-menu (app/views/wishlist/_admin_menu.html.erb).
  const shareKey = currentWishlist.custom_key || currentWishlist.access_key;
  const shareUrl = `${WEB_BASE_URL}/wishlist/${shareKey}`;

  const openShareMenu = async () => {
    closeAllMenus();
    setShareSubView(null);
    setQrCodeUrl(null);
    setLoadingShareMenu(true);
    try {
      const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/admin`);
      const { items: _items, ...wishlistFields } = data;
      setCurrentWishlist(prev => ({ ...prev, ...wishlistFields }));
      setCustomKeyInput(wishlistFields.custom_key || '');
    } catch (error) {
      setCustomKeyInput(currentWishlist.custom_key || '');
    } finally {
      setLoadingShareMenu(false);
      setShareMenuVisible(true);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyShortlink = async () => {
    await Clipboard.setStringAsync(currentWishlist.shortlink_url);
    setShortlinkCopied(true);
    setTimeout(() => setShortlinkCopied(false), 2000);
  };

  const handleCopyEmbed = async () => {
    await Clipboard.setStringAsync(currentWishlist.embed_code);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const handleShowQrCode = async () => {
    setLoadingQrCode(true);
    try {
      const { data } = await api.post(`/wishlists/${currentWishlist.admin_key}/qrcode`);
      setQrCodeUrl(data.qrcode_url);
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.shareGenericError'));
    } finally {
      setLoadingQrCode(false);
    }
  };

  const handleSaveQrCodeToPhotos = async () => {
    setSavingQrCodeToPhotos(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(i18n.t('wishlist.permissionRequiredTitle'), i18n.t('wishlist.photoLibraryPermissionMessage'));
        return;
      }
      const localUri = FileSystem.cacheDirectory + `wishsite_qr_${currentWishlist.admin_key}.png`;
      const { uri } = await FileSystem.downloadAsync(qrCodeUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      setQrCodeSaved(true);
      setTimeout(() => setQrCodeSaved(false), 2000);
      Alert.alert(i18n.t('wishlist.shareQrCodeSaved'));
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.shareQrCodeSaveError'));
    } finally {
      setSavingQrCodeToPhotos(false);
    }
  };

  const handleSaveCustomKey = async () => {
    setSavingCustomKey(true);
    try {
      const { data } = await api.patch(`/wishlists/${currentWishlist.admin_key}/update_key`, {
        custom_key: customKeyInput.trim(),
      });
      setCurrentWishlist(prev => ({ ...prev, custom_key: data.custom_key }));
      setShareSubView(null);
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), error.response?.data?.error || i18n.t('wishlist.shareGenericError'));
    } finally {
      setSavingCustomKey(false);
    }
  };

  const handleNativeShare = () => {
    Share.share({ message: shareUrl });
  };

  const handleCancelWishlistEdit = () => {
    setEditWishlistMode(false);
    setEditWishlist({ title: '', description: '', owner_name: '', theme: '', named_reservation_required: false, items_sharable: true, hide_reserved_items_by_default: true, crawlable: false, reservation_notices: false, push_notifications: false, newsletter_accepted: false });
    setShowEmailField(false);
    setNewEmailInput('');
  };

  const handleShowReservedItemsCount = () => {
    Alert.alert(
      i18n.t('wishlist.stats.header'),
      i18n.t('wishlist.stats.confirmShowReservedItemsCount'),
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        {
          text: i18n.t('wishlist.yes'),
          onPress: async () => {
            try {
              const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/show_reserved_items_count`);
              setReservedItemsCount(data.reserved_count);
            } catch (error) {}
          }
        }
      ]
    );
  };

  const handleResetStats = () => {
    Alert.alert(
      i18n.t('wishlist.stats.header'),
      i18n.t('wishlist.resetStats.confirmText'),
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        {
          text: i18n.t('wishlist.resetStats.submit'),
          onPress: async () => {
            try {
              const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/reset_stats`);
              setCurrentWishlist(prev => ({ ...prev, visitors_count: data.visitors_count }));
            } catch (error) {}
          }
        }
      ]
    );
  };

  const handleDeleteWishlist = () => {
    Alert.alert(
      i18n.t('wishlist.deleteTitle'),
      i18n.t('wishlist.deleteMessage', { title: currentWishlist.title }),
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        {
          text: i18n.t('wishlist.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWishlist();
              setEditWishlistMode(false);
              handleBack();
            } catch (error) {}
          }
        }
      ]
    );
  };

  const renderItem = ({ item, getIndex, drag, isActive }) => (
    <React.Fragment key={`item-${item.id}`}>
      <TouchableOpacity
        style={styles.insertRow}
        onPress={() => handleAddWish(getIndex())}
        disabled={isActive}
      >
        <View style={styles.insertLine} />
        <View style={styles.insertButton}>
          <Text style={styles.insertButtonText}>+</Text>
        </View>
        <View style={styles.insertLine} />
      </TouchableOpacity>

      <WishlistItem
        item={item}
        index={getIndex()}
        items={items}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onDrag={drag}
        isActive={isActive}
        onItemPress={handleItemPress}
        optionsVisible={optionsVisible}
        setOptionsVisible={setOptionsVisible}
        onOptionsPress={(id, x, y) => {
          closeAllMenus();
          setOptionsMenuPosition({ x, y });
          setOptionsVisible(id);
        }}
        styles={styles}
      />
    </React.Fragment>
  );

  const closeAllMenus = () => {
    setOptionsVisible(null);
    setWishlistOptionsVisible(false);
    setAvatarMenuVisible(false);
    setShareMenuVisible(false);
  };

  // A wishlist color scheme, when set, recolors the title, item cards, item price and the
  // share button — not just the banner (see WISHLIST_THEME_COLORS above). null when the
  // wishlist has no named scheme, in which case everything below falls back to the app's
  // own light/dark UI theme as before.
  const wlColors = getWishlistThemeColors(currentWishlist);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    floatingBackButton: {
      position: 'absolute',
      // SafeAreaView (the screen's outer wrapper) already pads for the safe-area inset itself,
      // matching the old header bar's plain paddingTop — no extra insets.top needed here.
      // (top is set per-instance via backButtonTop, below.)
      left: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      // Matches wishsite3's #edit-wl-banner/#img-menu-toolbar opacity (controllers/wishlist.scss)
      // so the floating button reads as an overlay control, not another primary action.
      opacity: 0.9,
      ...cardShadow(theme, isDarkMode),
    },
    floatingBackArrowText: {
      fontSize: 22,
      color: theme.text,
      fontWeight: 'bold',
      // Android-only: it adds extra vertical font padding by default that pushes glyphs like
      // this one below true center within the circle, even with the parent's flex centering -
      // iOS never had this offset, and forcing the same lineHeight there shifted it too high.
      ...(Platform.OS === 'android' ? { lineHeight: 22, includeFontPadding: false, textAlignVertical: 'center' } : null),
    },
    // Stand-in for the native pull-to-refresh spinner when a banner is present - see the
    // refreshControl/customRefreshIndicator comments where this is used.
    customRefreshIndicator: {
      position: 'absolute',
      // Centered within the status-bar strip itself (insets.top tall), well clear of the
      // banner's top edge below it - a small nudge here previously wasn't enough to read as
      // clearly separate from the banner.
      top: insets.top - 30,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 500,
    },
    shareSection: {
      alignItems: 'center',
      paddingBottom: 36,
    },
    shareButton: {
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: RADIUS.pill,
      // Mirrors wishsite3's `#share-wl { background-color: var(--#{t}_l_1) }` per-scheme rule.
      backgroundColor: wlColors ? (isDarkMode ? wlColors.shareBgDark : wlColors.shareBg) : theme.primary,
      minWidth: 180,
      alignItems: 'center',
      ...cardShadow(theme, isDarkMode),
    },
    shareButtonText: {
      ...buttonStyle(16),
      color: 'white',
    },
    headerOptionsButton: {
      padding: 5,
      width: isTablet ? 34 : 30,
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    headerOptionsText: {
      ...buttonStyle(isTablet ? 24 : 20),
      color: theme.text,
      textAlign: 'center',
    },
    headerOptionsCloseText: {
      fontSize: 24,
      color: theme.text,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    bannerWrapper: {
      position: 'relative',
      width: '100%',
    },
    banner: {
      width: '100%',
      height: BANNER_HEIGHT,
    },
    avatarContainer: {
      position: 'absolute',
      left: '50%',
      marginLeft: -AVATAR_SIZE / 2,
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    },
    avatarCircle: {
      width: '100%',
      height: '100%',
      borderRadius: AVATAR_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: theme.surface,
      ...cardShadow(theme, isDarkMode),
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    avatarMenuToggle: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      // Matches wishsite3's #edit-wl-banner opacity (controllers/wishlist.scss).
      opacity: 0.9,
      ...cardShadow(theme, isDarkMode),
    },
    avatarMenuToggleText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    avatarMenu: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.small * 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      minWidth: 250,
      paddingTop: 40,
      paddingBottom: 6,
      zIndex: 1000,
    },
    avatarMenuCloseButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroDetails: {
      paddingHorizontal: 24,
      paddingTop: 10,
      paddingBottom: 28,
      zIndex: 100,
    },
    heroDetailsWithBanner: {
      marginTop: -22,
    },
    // No banner/avatar to push things down. The floating back button also drops to this same
    // level in that case (see backButtonTop below), so the title doesn't need a huge top
    // clearance just to stay clear of a button parked way up at the very top of the screen.
    heroDetailsNoBanner: {
      paddingTop: 24,
    },
    // Normal-flow row above the title (not absolutely positioned) so it reliably sits above
    // the title regardless of heroDetails' paddingTop, instead of relying on guessed offsets.
    wishlistOptionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      zIndex: 1000,
      // headerOptionsMenu (the open dropdown) is position:absolute and contributes nothing to
      // flow height, so without a fixed height here the row collapses when it opens, pulling
      // the title up. A fixed height keeps the title's position stable either way.
      height: 40,
    },
    wishlistOptionsAnchor: {
      position: 'relative',
    },
    heroTitle: {
      ...headingStyle(28),
      // Mirrors wishsite3's `#wishlist-header { color: var(--#{t}_l_1) }` per-scheme rule.
      color: wlColors ? (isDarkMode ? wlColors.accentDark : wlColors.accent) : theme.text,
      textAlign: 'center',
      marginTop: 14,
      marginBottom: 12,
    },
    heroOwnerName: {
      ...strongStyle(13),
      color: theme.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    heroDescription: {
      ...bodyStyle(14),
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginTop: 4,
    },
    backButtonText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
    },
    headerOptionsMenu: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.small * 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      minWidth: 250,
      paddingTop: 40,
      paddingBottom: 6,
      zIndex: 1000,
    },
    headerOptionsCloseButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerOptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 15,
    },
    headerOptionText: {
      ...strongStyle(isTablet ? 18 : 16),
      color: theme.text,
    },
    // No paddingTop: the banner (this container's first child, via ListHeaderComponent) needs
    // to sit flush against the colored status-bar strip above it — even a few px gap here
    // shows through as a visible seam between the two.
    listContainer: {
      paddingBottom: 24,
    },
    insertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 18,
      marginHorizontal: isTablet ? 30 : 20,
      marginVertical: 4,
    },
    insertLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    insertButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    insertButtonText: {
      fontSize: 13,
      lineHeight: 15,
      color: theme.textMuted,
      fontWeight: 'bold',
    },
    newItemCard: {
      marginHorizontal: isTablet ? 30 : 20,
      marginTop: 18,
      marginBottom: 16,
      minHeight: 100,
      borderRadius: RADIUS.card,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    newItemPlus: {
      ...strongStyle(28),
      color: theme.textSecondary,
    },
    newItemText: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
    },
    statsSection: {
      marginHorizontal: isTablet ? 30 : 20,
      marginTop: 20,
      marginBottom: 16,
    },
    statsHeader: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.text,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    statsLabel: {
      ...bodyStyle(isTablet ? 15 : 13),
      color: theme.textSecondary,
      flex: 1,
    },
    statsValue: {
      ...strongStyle(isTablet ? 15 : 13),
      color: theme.text,
    },
    statsRevealLink: {
      ...bodyStyle(isTablet ? 15 : 13),
      color: theme.link,
    },
    statsResetLink: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.link,
      textAlign: 'center',
      marginTop: 10,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Mirrors web's showOverlay(true, true) — full-screen dim + spinner while duplicate/move run.
    actionLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 4000,
    },
    uploadOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3000,
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: 20,
      width: '90%',
      maxHeight: '80%',
      position: 'relative',
    },
    modalCloseButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    modalCloseText: {
      fontSize: 24,
      color: theme.text,
      fontWeight: 'bold',
    },
    modalTitle: {
      ...headingStyle(isTablet ? 20 : 18),
      color: theme.text,
      marginBottom: 15,
      textAlign: 'center',
    },
    shareModalTitlebar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    shareModalLogo: {
      width: 130,
      height: 26,
    },
    shareBackButton: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    shareBackArrowText: {
      fontSize: 26,
      color: theme.text,
      fontWeight: 'bold',
      ...(Platform.OS === 'android' ? { lineHeight: 26, includeFontPadding: false, textAlignVertical: 'center' } : null),
    },
    shareSubViewTitle: {
      ...headingStyle(isTablet ? 18 : 16),
      color: theme.text,
      marginBottom: 15,
    },
    shareUrlLabel: {
      ...strongStyle(13),
      color: theme.text,
      marginTop: 10,
      marginBottom: 10,
      textAlign: 'center',
    },
    shareUrlBox: {
      backgroundColor: theme.primary,
      ...INPUT_RADIUS,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 25,
      alignItems: 'center',
    },
    shareUrlText: {
      ...bodyStyle(14),
      color: palette.white.l1,
    },
    menuSectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 10,
    },
    menuSectionDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.textMuted,
    },
    menuSectionDividerText: {
      ...strongStyle(14),
      color: theme.textMuted,
      marginHorizontal: 10,
    },
    embedCodeText: {
      ...bodyStyle(12),
      color: palette.white.l1,
    },
    shareCopyButton: {
      alignSelf: 'center',
    },
    shareInputLabel: {
      ...strongStyle(13),
      color: theme.text,
      marginBottom: 6,
    },
    inputLabel: {
      ...strongStyle(isTablet ? 15 : 13),
      color: theme.text,
      marginBottom: 6,
    },
    themeSwatches: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 16,
      marginTop: 8,
      marginBottom: 15,
    },
    themeSwatchItem: {
      alignItems: 'center',
      gap: 6,
      width: '30%',
    },
    themeSwatchCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    themeSwatchDefault: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    themeSwatchSelected: {
      borderColor: theme.text,
    },
    themeSwatchName: {
      ...bodyStyle(12),
      color: theme.textSecondary,
      textAlign: 'center',
    },
    emailInfoText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.text,
    },
    emailInfoLabel: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.text,
    },
    emailChangeLink: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.link,
    },
    emailConfirmHint: {
      ...bodyStyle(isTablet ? 15 : 13),
      color: theme.danger,
    },
    newsletterCheckbox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    newsletterCheckboxBox: {
      width: 20,
      height: 20,
      borderRadius: RADIUS.small,
      backgroundColor: theme.primaryMuted,
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    newsletterCheckboxChecked: {
      backgroundColor: theme.primary,
    },
    newsletterCheckboxMark: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    newsletterCheckboxText: {
      ...bodyStyle(isTablet ? 15 : 13),
      color: theme.text,
      flex: 1,
    },
    shareMenuItem: {
      paddingVertical: 12,
    },
    shareMenuItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    shareMenuItemText: {
      ...strongStyle(16),
      color: theme.text,
    },
    shareHint: {
      ...bodyStyle(12),
      color: theme.textMuted,
      marginTop: 4,
    },
    qrCodeBox: {
      alignItems: 'center',
      paddingVertical: 15,
      gap: 12,
    },
    qrCodeImage: {
      width: 180,
      height: 180,
    },
    textInput: {
      ...bodyStyle(isTablet ? 18 : 16),
      color: theme.text,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: 'transparent',
      ...INPUT_RADIUS,
      padding: isTablet ? 15 : 12,
      marginBottom: 15,
    },
    searchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: 'transparent',
      ...INPUT_RADIUS,
      overflow: 'hidden',
    },
    searchInput: {
      flex: 1,
      marginBottom: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
      paddingRight: 0,
      borderRadius: 0,
    },
    continueButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      borderRadius: 0,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    modalButtons: {
      marginTop: 20,
    },
    modalLinkButton: {
      marginTop: 14,
      alignItems: 'center',
    },
    modalLinkButtonText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
    },
    modalButtonsNarrow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    saveButton: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: RADIUS.pill,
    },
    saveButtonText: {
      ...buttonStyle(isTablet ? 18 : 16),
      color: 'white',
    },
    saveButtonDisabled: {
      backgroundColor: theme.text,
      opacity: 0.3,
    },
    directAddButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: RADIUS.pill,
      marginRight: 10,
    },
    directAddButtonText: {
      ...buttonStyle(isTablet ? 18 : 16),
      color: theme.text,
    },
    loadMoreButton: {
      backgroundColor: theme.primary,
      paddingVertical: 5,
      paddingHorizontal: 30,
      borderRadius: RADIUS.pill,
      marginTop: 10,
      marginBottom: 10,
    },
    loadMoreButtonText: {
      ...buttonStyle(isTablet ? 18 : 16),
      color: 'white',
    },
    searchResults: {
      maxHeight: 300,
      marginVertical: 10,
    },
    resultsList: {
      flexGrow: 0,
    },
    resultItem: {
      flexDirection: 'row',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    resultImage: {
      width: 60,
      height: 60,
      borderRadius: RADIUS.small,
      marginRight: 10,
    },
    resultInfo: {
      flex: 1,
    },
    resultTitle: {
      ...headingStyle(isTablet ? 16 : 14),
      color: theme.text,
      marginBottom: 5,
    },
    resultPrice: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      marginBottom: 5,
    },
    resultMerchant: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.textSecondary,
      marginBottom: 5,
    },
    addToWishlistButton: {
      backgroundColor: theme.primary,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: RADIUS.pill,
      alignSelf: 'flex-start',
    },
    addToWishlistText: {
      ...buttonStyle(isTablet ? 14 : 12),
      color: 'white',
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    detailImage: {
      width: '100%',
      height: 200,
      borderRadius: RADIUS.card,
      marginBottom: 15,
    },
    detailTitle: {
      ...headingStyle(isTablet ? 20 : 18),
      color: theme.text,
      marginBottom: 10,
    },
    detailPrice: {
      ...bodyStyle(isTablet ? 18 : 16),
      color: theme.link,
      marginBottom: 10,
    },
    detailMerchant: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
      marginBottom: 10,
    },
    detailDescription: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.text,
      opacity: 0.8,
      lineHeight: isTablet ? 24 : 20,
    },
    radioGroup: {
      marginBottom: 15,
    },
    radioGroupTitle: {
      ...headingStyle(isTablet ? 18 : 16),
      marginBottom: 10,
      color: theme.text,
    },
    radioOptions: {
      flexDirection: 'row',
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 20,
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: 8,
    },
    radioSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    radioText: {
      ...bodyStyle(isTablet ? 18 : 16),
      color: theme.text,
    },
    linksSection: {
      marginBottom: 15,
    },
    linksSectionTitle: {
      ...headingStyle(isTablet ? 18 : 16),
      marginBottom: 10,
      color: theme.text,
    },
    linkInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    linkInput: {
      flex: 1,
      marginBottom: 0,
      marginRight: 10,
    },
    removeLinkButton: {
      backgroundColor: theme.danger,
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeLinkText: {
      ...buttonStyle(isTablet ? 20 : 18),
      color: 'white',
    },
    addLinkButton: {
      backgroundColor: theme.positive,
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: RADIUS.pill,
      alignSelf: 'flex-start',
    },
    addLinkText: {
      ...buttonStyle(isTablet ? 16 : 14),
      color: 'white',
    },
    imageCarousel: {
      marginBottom: 15,
    },
    noImagesFound: {
      alignItems: 'center',
      marginBottom: 15,
      padding: 10,
    },
    noImagesFoundImage: {
      width: 70,
      height: 70,
      marginBottom: 10,
      opacity: 0.7,
    },
    noImagesFoundText: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textMuted,
      textAlign: 'center',
    },
    carouselTitle: {
      ...headingStyle(isTablet ? 18 : 16),
      marginBottom: 10,
      color: theme.text,
    },
    carouselContent: {
      paddingHorizontal: 5,
    },
    carouselImageContainer: {
      marginHorizontal: 5,
      position: 'relative',
    },
    selectedImageContainer: {
      borderWidth: 2,
      borderColor: theme.primary,
      borderRadius: 8,
    },
    carouselImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    imageFallback: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.text,
      opacity: 0.1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackText: {
      ...bodyStyle(isTablet ? 28 : 24),
      color: theme.text,
    },
    selectedOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: theme.primary,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      ...buttonStyle(isTablet ? 14 : 12),
      color: 'white',
    },
    allLinksContainer: {
      marginVertical: 10,
    },
    linksTitle: {
      ...headingStyle(isTablet ? 18 : 16),
      marginBottom: 10,
      color: theme.text,
    },
    fullLinkText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
      marginBottom: 5,
    },
    // Mirrors wishsite3's `.item.card { background-color: var(--#{t}_l_4) }` and
    // `.item.card:not(.reserved) { border-top: 3px solid var(--#{t}_l_1) }` per-scheme rules
    // (the admin's own item view has no "reserved" concept to exclude, unlike the public one).
    itemCard: {
      backgroundColor: wlColors ? (isDarkMode ? wlColors.cardBgDark : wlColors.cardBg) : theme.surface,
      marginHorizontal: 20,
      borderRadius: RADIUS.card,
      padding: 16,
      ...cardShadow(theme, isDarkMode),
      position: 'relative',
      ...(wlColors ? {
        borderTopWidth: 3,
        borderTopColor: isDarkMode ? wlColors.borderDark : wlColors.border,
      } : null),
    },
    // Visual feedback for the item currently being long-press-dragged.
    itemCardActive: {
      opacity: 0.9,
      shadowOpacity: isDarkMode ? 0.5 : 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    // Mirrors #items.sortable-mode li.item .drag-handle's darkened background + centered grab
    // icon (controllers/wishlist.scss) — RN has no direct backdrop-filter:blur equivalent
    // without an extra native dependency, so this uses a plain darkened overlay instead.
    dragActiveOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: RADIUS.card,
      backgroundColor: 'rgba(0, 0, 0, 0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionsContainer: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 100,
    },
    optionsButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // fontSize 20 to match the "⋯" toggle everywhere else (WishlistScreen's card menus).
    optionsText: {
      ...buttonStyle(20),
      color: theme.text,
    },
    optionsCloseText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    optionsMenu: {
      position: 'absolute',
      top: 30,
      right: 0,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.small * 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      minWidth: 150,
      zIndex: 1000,
    },
    // top:0/right:0, not inset — this exactly overlays the "⋯" button it replaces (the menu's
    // own top-right corner is positioned to match that button's measured position precisely,
    // see optionsOverlay), so the × lands in exactly the same spot the "⋯" occupied.
    optionsCloseButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // No divider, matching wishsite3's .admin-item-menu (controllers/wishlist.scss) — plain
    // padding between entries, no border-bottom.
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 15,
    },
    optionText: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.text,
    },
    removeText: {
      color: theme.danger,
    },
    itemContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    // Wraps the image so the hidden-overlay/no-reservation badge (both position:absolute) can
    // be anchored to the image itself, matching wishsite3's .item-image-frame.
    itemImageWrapper: {
      width: isTablet ? 140 : 100,
      height: isTablet ? 140 : 100,
      marginRight: 16,
      borderRadius: RADIUS.card,
      overflow: 'hidden',
      position: 'relative',
    },
    // Centers a natural-size (capped, never upscaled) image within the fixed frame above -
    // see MAX_ITEM_IMAGE_SIZE/imageSize in WishlistItem.js.
    itemImageWrapperCentered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    // Mirrors .item-image-frame.is-hidden (controllers/wishlist.scss): dark overlay + centered
    // white "eye-off" icon over the image of a hidden item.
    hiddenImageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Mirrors .no-reservation-badge: small dark circular badge, bottom-right of the image.
    noReservationBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    // Mirrors `.card.hidden { outline: 2px dashed ... }` (controllers/wishlist.scss).
    itemCardHidden: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.textMuted,
    },
    placeholderImage: {
      backgroundColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      ...bodyStyle(isTablet ? 12 : 10),
      color: theme.textMuted,
      textAlign: 'center',
    },
    itemInfo: {
      flex: 1,
      paddingRight: 30,
    },
    // Mirrors `<h4>{show_quantity} {title}</h4>` (wishlist/_admin_item.html.erb) — quantity
    // badge and title sit on the same line, not stacked.
    itemNameRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginBottom: 6,
    },
    itemName: {
      ...strongStyle(isTablet ? 20 : 18),
      color: theme.text,
      lineHeight: isTablet ? 25 : 22,
      flexShrink: 1,
    },
    // Mirrors .quantity-box (controllers/wishlist.scss) — shown only when quantity > 1
    // (items_helper.rb#show_quantity, admin branch), simple "{quantity}x" bordered badge.
    quantityBox: {
      borderWidth: 2,
      borderColor: theme.text,
      borderRadius: 5,
      paddingHorizontal: 4,
      paddingVertical: 1,
      flexShrink: 0,
    },
    quantityBoxText: {
      ...strongStyle(isTablet ? 13 : 12),
      color: theme.text,
    },
    itemDescription: {
      ...bodyStyle(isTablet ? 15 : 14),
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 10,
    },
    itemDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    // Mirrors wishsite3's `.item .item-price { color: var(--#{t}_l_1) }` per-scheme rule.
    itemPrice: {
      ...strongStyle(isTablet ? 19 : 17),
      color: wlColors ? (isDarkMode ? wlColors.accentDark : wlColors.accent) : theme.primary,
    },
    // Mirrors .item-links-inline / .item-link-hint (modules/lists_and_items.scss).
    itemLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    itemLinkFavicon: {
      width: 12,
      height: 12,
      borderRadius: 2,
    },
    itemLinkText: {
      ...strongStyle(isTablet ? 13 : 12),
      color: theme.link,
      flexShrink: 1,
    },
    itemLinkExtra: {
      ...strongStyle(isTablet ? 13 : 12),
      color: theme.link,
      flexShrink: 0,
    },
    deleteWishlistLink: {
      marginTop: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    moveItemEmptyText: {
      ...bodyStyle(isTablet ? 15 : 14),
      color: theme.textMuted,
      textAlign: 'center',
      marginVertical: 20,
    },
    moveItemWishlistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    moveItemAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 12,
      backgroundColor: theme.background,
    },
    moveItemWishlistTitle: {
      ...strongStyle(isTablet ? 16 : 15),
      color: theme.text,
      flex: 1,
    },
    // Mirrors web's showPopup(), which always prepends a titlebar with the wishsite logo and a
    // close button to every popup, regardless of its content (see ReservationsScreen.js).
    moveItemTitlebar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    moveItemLogo: {
      width: 90,
      height: 18,
      opacity: 0.7,
    },
    moveItemCloseButton: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editWishlistBorderedSection: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 16,
    },
    editWishlistRadioTitle: {
      ...strongStyle(isTablet ? 14 : 12),
      marginBottom: 14,
      color: theme.text,
    },
    deleteWishlistText: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.danger,
    },

  });

  const optionsOverlay = optionsVisible && (() => {
    const activeItem = items.find(i => i.id === optionsVisible);
    if (!activeItem) return null;
    // optionsMenuPosition is the touch point, treated as the button's approximate center
    // (the button is a fixed 32x32 target) — so the 32x32 close button is centered on it.
    // No insets.top subtraction here: this overlay's wrapper is position:absolute, and
    // absolutely-positioned children in RN ignore their parent's padding (a longstanding
    // Yoga/RN quirk) — SafeAreaView's padding-top (== insets.top) that pushes the normal-flow
    // content down does NOT apply to this wrapper, so its top:0 is already true screen y=0,
    // matching the touch event's own (also true-screen) pageY directly.
    const BUTTON_SIZE = 32;
    const { x: touchX, y: touchY } = optionsMenuPosition;
    const top = touchY - BUTTON_SIZE / 2;
    const right = width - (touchX + BUTTON_SIZE / 2);
    return (
      // pointerEvents="box-none": this wrapper spans the full screen only so the menu can
      // escape the DraggableFlatList's clipping/z-index — it must NOT swallow touches meant
      // for other rows' "⋯" triggers underneath it (that was the "first tap only closes the
      // old menu, doesn't open the new one" bug). Only the menu box itself (a real child)
      // still receives touches; tapping another item's trigger now switches directly, same
      // as the wishlist overview's card menus, which never had a full-screen backdrop either.
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }} pointerEvents="box-none">
        <AnimatedMenu style={[
          styles.optionsMenu,
          { position: 'absolute', top, right, left: 'auto', paddingTop: BUTTON_SIZE },
        ]}>
          <TouchableOpacity style={styles.optionsCloseButton} onPress={() => setOptionsVisible(null)}>
            <Text style={styles.optionsCloseText}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionItem} onPress={() => { handleEditItem(activeItem); setOptionsVisible(null); }}>
            <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
            <Text style={styles.optionText}>{i18n.t('wishlist.editItem')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionItem} onPress={() => handleDuplicateItem(activeItem)}>
            <SvgXml xml={duplicateIcon(theme.text)} width={16} height={16} />
            <Text style={styles.optionText}>{i18n.t('wishlist.duplicateItem')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              setOptionsVisible(null);
              Alert.alert(i18n.t('wishlist.sortItems'), i18n.t('wishlist.sortItemsHint'));
            }}
          >
            <SvgXml xml={sortIcon(theme.text)} width={16} height={16} />
            <Text style={styles.optionText}>{i18n.t('wishlist.sortItems')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionItem} onPress={() => handleOpenMoveItem(activeItem)}>
            <SvgXml xml={moveIcon(theme.text)} width={16} height={16} />
            <Text style={styles.optionText}>{i18n.t('wishlist.moveItem')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionItem} onPress={() => { handleDeleteItem(activeItem); setOptionsVisible(null); }}>
            <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
            <Text style={[styles.optionText, styles.removeText]}>{i18n.t('wishlist.remove')}</Text>
          </TouchableOpacity>
        </AnimatedMenu>
      </View>
    );
  })();

  if (locked) {
    return <WishlistLockedScreen onBack={onBack} />;
  }

  // Header banner/avatar sizing, ported from WishlistHelper#set_wl_banner_wrapper_height (wishsite3),
  // is_admin branch: full height whenever a banner exists (image or non-default color), regardless
  // of whether an avatar is also present; "reduced-height" only for an avatar with no banner at all;
  // no wrapper (0) when neither is present, so it takes up no space.
  const bannerColor = isDarkMode
    ? getWishlistBannerDarkColor(currentWishlist.background_color)
    : getWishlistBannerColor(currentWishlist.background_color);
  const hasBanner = !!currentWishlist.background_image_url || !!bannerColor;
  const hasAvatar = !!currentWishlist.user_image_url;
  const bannerWrapperHeight = !hasBanner && !hasAvatar ? 0 : (hasBanner ? 325 : 275);
  // With a real banner, the avatar keeps web's fixed bottom offset so it overlaps the banner
  // consistently. Without one, there's nothing to anchor to, so instead center it in the space
  // between the top bar and the title (that space = bannerWrapperHeight, then -22 from
  // heroDetailsWithBanner's marginTop, +10 heroDetails paddingTop, +14 heroTitle marginTop).
  const avatarTop = hasBanner
    ? bannerWrapperHeight - AVATAR_BOTTOM_OFFSET - AVATAR_SIZE
    : (bannerWrapperHeight - 22 + 10 + 14 - AVATAR_SIZE) / 2;
  // Matches heroDetailsNoBanner's paddingTop, so the button sits level with the title instead
  // of parked high up with a big empty gap below it before the title starts.
  const backButtonTop = bannerWrapperHeight > 0 ? 15 : 24;

  // Mirrors items_controller.rb#move_form (web) — pick which of the user's own other wishlists
  // to move this item to. A plain top-level <Modal> here only ever presents correctly when the
  // item detail Modal isn't already showing on top of it: iOS won't present a second modal from
  // underneath one that's already presented, so triggering "Move" from within the item detail
  // view would silently do nothing. Taking a `visible` param instead of reading state directly
  // lets the same content be mounted twice — once at top level, once nested inside the item
  // detail Modal — with mutually exclusive visibility, so exactly the right one ever activates.
  const renderMoveItemPicker = (visible) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleCloseMoveItem}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.moveItemTitlebar}>
            <Image source={require('../../assets/wishsite_logo_name_100.png')} style={styles.moveItemLogo} resizeMode="contain" />
            <TouchableOpacity style={styles.moveItemCloseButton} onPress={handleCloseMoveItem}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalTitle}>{i18n.t('wishlist.moveItemTitle')}</Text>
          {loadingMoveWishlists ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
          ) : moveWishlists.length === 0 ? (
            <Text style={styles.moveItemEmptyText}>{i18n.t('wishlist.moveItemNoWishlists')}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {moveWishlists.map((wl) => (
                <TouchableOpacity
                  key={wl.id}
                  style={styles.moveItemWishlistRow}
                  disabled={movingItem}
                  onPress={() => handleMoveItemTo(wl)}
                >
                  <Image
                    source={wl.user_image_url ? { uri: wl.user_image_url } : require('../../assets/placeholder.png')}
                    style={styles.moveItemAvatar}
                  />
                  <Text style={styles.moveItemWishlistTitle} numberOfLines={1}>{wl.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Same reasoning as renderMoveItemPicker above: needs to be mountable both at top level and
  // nested inside the item detail Modal, so it's visible regardless of which context triggered
  // the duplicate/move action. Unlike the picker, this is a plain View, not a Modal — it only
  // ever needs to cover whatever is already the frontmost layer, not become a new one itself.
  const performingItemActionOverlay = performingItemAction && (
    <View style={styles.actionLoadingOverlay}>
      <ActivityIndicator color="#FFFFFF" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container]}>
      <StatusBar style={bannerColor ? 'light' : (isDarkMode ? 'light' : 'dark')} />
      {/* Extends the wishlist's scheme color into the status bar area. Deliberately a direct
          sibling of the Animated.View below, not nested inside it: position:'absolute'
          children ignore their immediate parent's padding in RN, so as a direct child of
          this padded SafeAreaView its top:0 lands at the true screen top (behind the notch)
          instead of just below it — the same mechanism the item options menu overlay relies
          on elsewhere on this screen. */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: bannerColor || theme.background }} />
      <GestureDetector gesture={swipeBackGesture}>
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
      <TouchableOpacity onPress={handleBack} style={[styles.floatingBackButton, { top: backButtonTop }]}>
        <Text style={styles.floatingBackArrowText}>←</Text>
      </TouchableOpacity>

      {/* Stand-in for the native pull-to-refresh spinner when there's a banner (see the
          refreshControl comment below) - pinned to a fixed screen position right under the
          status bar, so it's never at the mercy of how far the native gesture reveals content.
          Shown once the list is pulled down far enough to be close to where the native gesture
          would actually commit to onRefresh (~60pt, roughly UIRefreshControl's own trigger
          distance) - not on every small overscroll bounce (too sensitive at -10, appeared on
          ordinary flicks/bounces and lingered through the spring-back), and not just once
          `refreshing` flips true either - otherwise it only ever appeared once already released. */}
      {(refreshing || wishlistScrollPosition < -60) && hasBanner && (
        <View style={styles.customRefreshIndicator} pointerEvents="none">
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      )}

      {(() => {
        const wishlistHeader = (
          <>
            {bannerWrapperHeight > 0 && (
              <View style={[styles.bannerWrapper, { height: bannerWrapperHeight }]}>
                {hasBanner && (
                  currentWishlist.background_image_url ? (
                    <SafeImage
                      source={{ uri: currentWishlist.background_image_url }}
                      style={styles.banner}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.banner, { backgroundColor: bannerColor }]} />
                  )
                )}
                {hasAvatar && (
                  <View
                    style={[
                      styles.avatarContainer,
                      { top: avatarTop },
                    ]}
                  >
                    <View style={styles.avatarCircle}>
                      <SafeImage
                        source={{ uri: currentWishlist.user_image_url }}
                        style={styles.avatar}
                        resizeMode="cover"
                      />
                    </View>
                    {!avatarMenuVisible && (
                      <TouchableOpacity
                        style={styles.avatarMenuToggle}
                        onPress={() => {
                          closeAllMenus();
                          setAvatarMenuVisible(true);
                        }}
                      >
                        <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
                      </TouchableOpacity>
                    )}
                    {avatarMenuVisible && (
                      <AnimatedMenu style={styles.avatarMenu}>
                        <TouchableOpacity style={styles.avatarMenuCloseButton} onPress={() => setAvatarMenuVisible(false)}>
                          <Text style={styles.avatarMenuToggleText}>×</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerOptionItem} onPress={() => { setAvatarMenuVisible(false); pickAndUploadImage('avatar'); }}>
                          <SvgXml xml={userImageIcon(theme.text)} width={16} height={16} />
                          <Text style={styles.headerOptionText}>{i18n.t('wishlist.selectImages')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerOptionItem} onPress={() => { setAvatarMenuVisible(false); openCropExisting('avatar'); }}>
                          <SvgXml xml={cropIcon(theme.text)} width={16} height={16} />
                          <Text style={styles.headerOptionText}>{i18n.t('wishlist.cropAvatarLink')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerOptionItem} onPress={() => { setAvatarMenuVisible(false); confirmRemoveImage('avatar'); }}>
                          <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
                          <Text style={[styles.headerOptionText, { color: theme.danger }]}>{i18n.t('wishlist.removeAvatarLink')}</Text>
                        </TouchableOpacity>
                      </AnimatedMenu>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={[styles.heroDetails, bannerWrapperHeight > 0 ? styles.heroDetailsWithBanner : styles.heroDetailsNoBanner]}>
              <View style={styles.wishlistOptionsRow}>
              <View style={styles.wishlistOptionsAnchor}>
                {!wishlistOptionsVisible && (
                  <TouchableOpacity
                    style={styles.headerOptionsButton}
                    onPress={() => {
                      closeAllMenus();
                      setWishlistOptionsVisible(true);
                    }}
                  >
                    <Text style={styles.headerOptionsText}>⋯</Text>
                  </TouchableOpacity>
                )}
                {wishlistOptionsVisible && (
                  <AnimatedMenu style={styles.headerOptionsMenu}>
                    <TouchableOpacity style={styles.headerOptionsCloseButton} onPress={() => setWishlistOptionsVisible(false)}>
                      <Text style={styles.headerOptionsCloseText}>×</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerOptionItem} onPress={() => { setWishlistOptionsVisible(false); handleEditWishlist(); }}>
                      <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
                      <Text style={styles.headerOptionText}>{i18n.t('wishlist.editWishlist')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerOptionItem} onPress={() => { setWishlistOptionsVisible(false); handleChangeImagePress('avatar'); }}>
                      <SvgXml xml={userImageIcon(theme.text)} width={16} height={16} />
                      <Text style={styles.headerOptionText}>{imageActionLabel('avatar')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerOptionItem} onPress={() => { setWishlistOptionsVisible(false); handleChangeImagePress('background'); }}>
                      <SvgXml xml={backgroundIcon(theme.text)} width={16} height={16} />
                      <Text style={styles.headerOptionText}>{imageActionLabel('background')}</Text>
                    </TouchableOpacity>
                  </AnimatedMenu>
                )}
              </View>
              </View>
              <Text style={styles.heroTitle}>{currentWishlist.title}</Text>
              {currentWishlist.owner_name ? (
                <Text style={styles.heroOwnerName}>{i18n.t('wishlist.ownerNamePrefix')} {currentWishlist.owner_name}</Text>
              ) : null}
              {currentWishlist.description ? (
                <Text style={styles.heroDescription}>{currentWishlist.description}</Text>
              ) : null}
            </View>

            <View style={styles.shareSection}>
              <TouchableOpacity style={styles.shareButton} onPress={openShareMenu}>
                <Text style={styles.shareButtonText}>{i18n.t('wishlist.shareButton')}</Text>
              </TouchableOpacity>
            </View>
          </>
        );

        if (loading) {
          return (
            <ScrollView showsVerticalScrollIndicator={false}>
              {wishlistHeader}
              <SkeletonLoader type="item" count={5} />
            </ScrollView>
          );
        }

        return (
          <DraggableFlatList
            ref={wishlistRef}
            data={items}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id.toString()}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            // Without this, DraggableFlatList's internal reorder-drag gesture has no directional
            // activation threshold at all and claims every touch-drag over the list immediately,
            // in any direction — starving the screen's own swipe-back gesture (GestureDetector
            // above) of horizontal drags entirely. This constrains it to the vertical axis,
            // matching what reordering actually needs, and lets horizontal swipes fall through.
            activationDistance={10}
            // Must be passed as an explicit element rather than the refreshing/onRefresh
            // shorthand — the underlying FlatList here is gesture-handler's wrapper (see
            // react-native-draggable-flatlist's AnimatedFlatList), which doesn't auto-construct a
            // RefreshControl from the shorthand props the way RN's own FlatList does.
            // The RefreshControl class itself (RN's vs gesture-handler's) differs by platform -
            // see the import comment above for why.
            // When there's a banner, the iOS native spinner still only reveals a sliver right at the
            // banner's own top edge — not enough room appears above it for the full spinner to
            // clear, so it reads as "hidden behind the banner". Rather than fight that (an
            // attempt to force extra room via a permanent content offset caused the list to
            // scroll into the status bar instead — worse), the native spinner is made invisible
            // here (transparent tint, still fully functional for the gesture/refreshing state)
            // and a custom indicator is rendered instead, pinned right under the status bar - see
            // the `refreshing && hasBanner` block near the floating back button below.
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={hasBanner ? 'transparent' : theme.primary}
                progressViewOffset={insets.top}
              />
            }
            // scrollToIndex (used after duplicate/move to jump back to the item's position) can
            // fail to measure a target that hasn't rendered/laid out yet, since rows don't all
            // share one fixed height here. Falls back to an estimate instead of throwing.
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                wishlistRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
              }, 100);
            }}
            // DraggableFlatList does NOT forward a plain `onScroll` prop to the underlying
            // list — it drives scrolling through its own internal Reanimated scroll handler
            // and exposes this callback (a plain number, not an event) instead. The previous
            // `onScroll={...}` here was silently never firing at all.
            onScrollOffsetChange={(offset) => {
              setWishlistScrollPosition(offset);
              // The item options menu is a page-absolute overlay (needed to escape the
              // DraggableFlatList's own clipping/z-index), positioned once from the tap
              // coordinates — it has no way to track/follow the list's scroll offset, so it
              // would otherwise stay frozen in place while the item underneath it scrolls
              // away. Dismiss it as soon as scrolling starts, same as most iOS/Android list
              // menus do, rather than have it visibly detach from its item.
              if (optionsVisible !== null) {
                closeAllMenus();
              }
            }}
            scrollEventThrottle={16}
            ListHeaderComponent={wishlistHeader}
            ListFooterComponent={
              <>
                <TouchableOpacity style={styles.newItemCard} onPress={() => handleAddWish(items.length)}>
                  <Text style={styles.newItemPlus}>+</Text>
                  <Text style={styles.newItemText}>{i18n.t('wishlist.addWish')}</Text>
                </TouchableOpacity>
                <View style={styles.statsSection}>
                  <Text style={styles.statsHeader}>{i18n.t('wishlist.stats.header')}</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>{i18n.t('wishlist.stats.wishCountLabel')}</Text>
                    <Text style={styles.statsValue}>{currentWishlist.wish_count ?? 0}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>{i18n.t('wishlist.stats.visitorsCountLabel')}</Text>
                    <Text style={styles.statsValue}>{currentWishlist.visitors_count ?? 0}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>{i18n.t('wishlist.stats.reservedItemsCountLabel')}</Text>
                    {reservedItemsCount === null ? (
                      <TouchableOpacity onPress={handleShowReservedItemsCount}>
                        <Text style={styles.statsRevealLink}>{i18n.t('wishlist.stats.showReservedItemsCountLink')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.statsValue}>{reservedItemsCount}</Text>
                    )}
                  </View>
                  {!!currentWishlist.visitors_count && (
                    <TouchableOpacity onPress={handleResetStats}>
                      <Text style={styles.statsResetLink}>{i18n.t('wishlist.stats.resetStatsLink')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            }
          />
        );
      })()}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancelWish}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleCancelWish} // oder handleCancelEdit oder handleCancelWishlistEdit
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            {directAddMode ? (
              // Direct Add Form
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.detailHeader}>
                  <TouchableOpacity onPress={handleBackToSearch}>
                    <Text style={styles.backButtonText}>{i18n.t('wishlist.backButton')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{fromSearch ? i18n.t('wishlist.newWishTitle') : i18n.t('wishlist.directWishTitle')}</Text>
                </View>
                


                {directWish.images && directWish.images.length > 0 && (
                  <View style={styles.imageCarousel}>
                    <Text style={styles.carouselTitle}>{i18n.t('wishlist.selectImages')}</Text>
                    <FlatList
                      horizontal
                      data={directWish.images}
                      keyExtractor={(item, index) => index.toString()}
                      renderItem={({ item, index }) => (
                        <TouchableOpacity
                          onPress={() => setDirectWish({...directWish, selectedImageIndex: index})}
                          style={[
                            styles.carouselImageContainer,
                            index === directWish.selectedImageIndex && styles.selectedImageContainer
                          ]}
                        >
                          <View style={styles.carouselImage}>
                            <View style={styles.imageFallback}>
                              <Text style={styles.fallbackText}>📷</Text>
                            </View>
                            <Image
                              source={typeof item === 'string' ? { uri: item } : item}
                              style={[styles.carouselImage, { position: 'absolute', zIndex: 1 }]}
                              resizeMode="contain"
                            />
                          </View>
                          {index === directWish.selectedImageIndex && (
                            <View style={styles.selectedOverlay}>
                              <Text style={styles.checkmark}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.carouselContent}
                    />
                  </View>
                )}

                {/* Mirrors wishsite3's images/load_images.js.erb else-branch: a URL was
                    scraped but no images came back, shown with no_image.png + a hint that
                    the user can still add an image themselves. */}
                {directWish.imagesChecked && directWish.images.length === 0 && (
                  <View style={styles.noImagesFound}>
                    <Image source={require('../../assets/no_image.png')} style={styles.noImagesFoundImage} resizeMode="contain" />
                    <Text style={styles.noImagesFoundText}>{i18n.t('wishlist.noImagesFoundNotice')}</Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>{i18n.t('wishlist.titlePlaceholder')}</Text>
                <TextField
                  style={{ marginBottom: 15 }}
                  placeholder={i18n.t('wishlist.titlePlaceholder')}
                  value={directWish.title}
                  onChangeText={(text) => setDirectWish({...directWish, title: text})}
                  fontSize={isTablet ? 18 : 16}
                />

                <Text style={styles.inputLabel}>{i18n.t('wishlist.descriptionPlaceholder')}</Text>
                <TextField
                  style={{ marginBottom: 15 }}
                  placeholder={i18n.t('wishlist.descriptionPlaceholder')}
                  value={directWish.description}
                  onChangeText={(text) => setDirectWish({...directWish, description: text})}
                  multiline
                  fontSize={isTablet ? 18 : 16}
                />

                <Text style={styles.inputLabel}>{i18n.t('wishlist.pricePlaceholder')}</Text>
                <TextField
                  style={{ marginBottom: 15 }}
                  placeholder={i18n.t('wishlist.pricePlaceholder')}
                  value={directWish.price}
                  onChangeText={(text) => setDirectWish({...directWish, price: text})}
                  keyboardType="numeric"
                  fontSize={isTablet ? 18 : 16}
                />

                <Text style={styles.inputLabel}>{i18n.t('wishlist.linkPlaceholder')}</Text>
                <TextField
                  style={{ marginBottom: 15 }}
                  placeholder={i18n.t('wishlist.linkPlaceholder')}
                  value={directWish.url}
                  onChangeText={(text) => setDirectWish({...directWish, url: text})}
                  fontSize={isTablet ? 18 : 16}
                />
                
                <View style={styles.radioGroup}>
                  <Text style={styles.radioGroupTitle}>{i18n.t('wishlist.reservationLabel')}</Text>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity 
                      style={styles.radioOption}
                      onPress={() => setDirectWish({...directWish, allow_reservation: true})}
                    >
                      <View style={[styles.radioCircle, directWish.allow_reservation && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.radioOption}
                      onPress={() => setDirectWish({...directWish, allow_reservation: false})}
                    >
                      <View style={[styles.radioCircle, !directWish.allow_reservation && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.radioGroup}>
                  <Text style={styles.radioGroupTitle}>{i18n.t('wishlist.visibilityLabel')}</Text>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity 
                      style={styles.radioOption}
                      onPress={() => setDirectWish({...directWish, hidden: false})}
                    >
                      <View style={[styles.radioCircle, !directWish.hidden && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.forAll')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.radioOption}
                      onPress={() => setDirectWish({...directWish, hidden: true})}
                    >
                      <View style={[styles.radioCircle, directWish.hidden && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.onlyForMe')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.modalButtons}>
                  <Button onPress={handleSaveDirectWish} fontSize={isTablet ? 18 : 16} title={i18n.t('wishlist.addWishSubmit')} />
                </View>
              </ScrollView>
            ) : selectedProduct ? (
              selectedProduct.deeplink ? (
                // Search Product Details View
                <>
                  <View style={styles.detailHeader}>
                    <TouchableOpacity onPress={handleBackToResults}>
                      <Text style={styles.backButtonText}>← Zurück</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Produktdetails</Text>
                  </View>
                  
                  <Image 
                    source={{ uri: selectedProduct.image_url }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                  
                  <Text style={styles.detailTitle}>{selectedProduct.title}</Text>
                  <Text style={styles.detailPrice}>{selectedProduct.price}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(selectedProduct.deeplink)}>
                    <Text style={styles.detailMerchant}>{selectedProduct.merchant_name}</Text>
                  </TouchableOpacity>
                  
                  {selectedProduct.description && (
                    <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
                  )}
                  
                  <View style={styles.modalButtons}>
                    <Button
                      onPress={() => handleAddToWishlist(selectedProduct)}
                      disabled={addingItem === selectedProduct.deeplink}
                      loading={addingItem === selectedProduct.deeplink}
                      fontSize={isTablet ? 18 : 16}
                      title="Hinzufügen"
                    />
                  </View>
                </>
              ) : (
                // Wishlist Item Details View
                <>
                  <View style={styles.detailHeader}>
                    <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                      <Text style={styles.backButtonText}>← Zurück</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Item Details</Text>
                  </View>
                  
                  {selectedProduct.image_url && (
                    <Image 
                      source={{ uri: selectedProduct.image_url }}
                      style={styles.detailImage}
                      resizeMode="cover"
                    />
                  )}
                  
                  <Text style={styles.detailTitle}>{selectedProduct.title}</Text>
                  <Text style={styles.detailPrice}>{selectedProduct.price}</Text>
                  
                  {selectedProduct.links && selectedProduct.links.length > 0 && (
                    <View style={styles.allLinksContainer}>
                      <Text style={styles.linksTitle}>Alle Links:</Text>
                      {selectedProduct.links.map((link, index) => (
                        <TouchableOpacity 
                          key={index}
                          onPress={() => Linking.openURL(link)}
                        >
                          <Text style={styles.fullLinkText} numberOfLines={1} ellipsizeMode="middle">
                            {link}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )
            ) : (
              // Search View
              <>
                <Text style={styles.modalTitle}>{i18n.t('wishlist.addWish')}</Text>
                <View style={styles.searchInputRow}>
                  <TextInput
                    style={[styles.textInput, styles.searchInput]}
                    placeholder={i18n.t('wishlist.enterWish')}
                    value={wishTitle}
                    onChangeText={setWishTitle}
                    autoFocus={true}
                  />
                  <TouchableOpacity 
                    style={[styles.continueButton, searching && styles.saveButtonDisabled]} 
                    onPress={handleSearchProduct}
                    disabled={searching}
                  >
                    <Text style={styles.saveButtonText}>
                      {searching ? i18n.t('wishlist.searching') : i18n.t('wishlist.continue')}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    <FlatList
                      ref={flatListRef}
                      data={searchResults}
                      keyExtractor={(item, index) => index.toString()}
                      onScroll={(event) => setScrollPosition(event.nativeEvent.contentOffset.y)}
                      scrollEventThrottle={16}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.resultItem}
                          onPress={() => handleSelectProduct(item)}
                        >
                          {/* Product search results mirror wishsite3's search_products/_result(_item).html.erb,
                              which falls back to no_image.png specifically here — not default_wish_img.jpg
                              (the logo placeholder used for actual wishlist items/avatars elsewhere). */}
                          <Image
                            source={item.image_url ? { uri: item.image_url } : require('../../assets/no_image.png')}
                            style={styles.resultImage}
                            resizeMode="cover"
                          />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{item.title}</Text>
                            <Text style={styles.resultPrice}>{item.price}</Text>
                            <Text style={styles.resultMerchant}>{item.merchant_name}</Text>
                            <TouchableOpacity 
                              style={styles.addToWishlistButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleAddToWishlist(item);
                              }}
                              disabled={addingItem === item.deeplink}
                            >
                              <Text style={styles.addToWishlistText}>
                                {addingItem === item.deeplink ? i18n.t('wishlist.addingToWishlist') : i18n.t('wishlist.addToMyWishlist')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      )}
                      ListFooterComponent={
                        searchResults.length > 5 && !moreResultsLoaded ? (
                          <View style={styles.modalButtonsNarrow}>
                            <TouchableOpacity 
                              style={[styles.loadMoreButton, searching && styles.saveButtonDisabled]}
                              onPress={handleSearchMore}
                              disabled={searching}
                            >
                              <Text style={styles.loadMoreButtonText}>
                                {searching ? 'Suche...' : 'Weitere Ergebnisse laden'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null
                      }
                      style={styles.resultsList}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                )}
                
                <View style={styles.modalButtonsNarrow}>
                  <TouchableOpacity 
                    style={styles.directAddButton}
                    onPress={handleDirectAdd}
                  >
                    <Text style={styles.directAddButtonText}>{i18n.t('wishlist.directAdd')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      <Modal
        animationType="none"
        transparent={false}
        visible={itemDetailMode && selectedItem !== null}
        onRequestClose={handleBackFromItemDetail}
      >
        {selectedItem && (
          <ItemDetailScreen
            item={selectedItem}
            onBack={handleBackFromItemDetail}
            onEdit={(item) => {
              setItemDetailMode(false);
              handleEditItem(item);
            }}
            wishlistAdminKey={currentWishlist.admin_key}
            itemsSharable={currentWishlist.items_sharable}
            namedReservationRequired={currentWishlist.named_reservation_required}
            onDuplicate={handleDuplicateItem}
            onMove={handleOpenMoveItem}
            onDelete={handleDeleteItem}
            onChangeImagePress={() => handleChangeItemImagePress(selectedItem)}
            refreshing={itemRefreshing}
            onRefresh={async () => {
              if (!selectedItem) return;
              setItemRefreshing(true);
              await refreshSingleItem(selectedItem.id);
              setItemRefreshing(false);
            }}
          />
        )}
        {renderMoveItemPicker(!!moveItemTarget && itemDetailMode)}
        {performingItemActionOverlay}
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editMode}
        onRequestClose={handleCancelEdit}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={handleCancelEdit} // oder handleCancelEdit oder handleCancelWishlistEdit
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            {loadingEditItem ? (
              <ModalSkeleton />
            ) : (
              <>
                <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{i18n.t('wishlist.editItem')}</Text>
            
            <Text style={styles.inputLabel}>{i18n.t('wishlist.title')}</Text>
            <TextField
              style={{ marginBottom: 15 }}
              placeholder={i18n.t('wishlist.title')}
              value={editItem.title}
              onChangeText={(text) => setEditItem({...editItem, title: text})}
              fontSize={isTablet ? 18 : 16}
            />

            <Text style={styles.inputLabel}>{i18n.t('wishlist.description')}</Text>
            <TextField
              style={{ marginBottom: 15 }}
              placeholder={i18n.t('wishlist.description')}
              value={editItem.description}
              onChangeText={(text) => setEditItem({...editItem, description: text})}
              multiline
              fontSize={isTablet ? 18 : 16}
            />

            <Text style={styles.inputLabel}>{i18n.t('wishlist.price')}</Text>
            <TextField
              style={{ marginBottom: 15 }}
              placeholder={i18n.t('wishlist.price')}
              value={editItem.price}
              onChangeText={(text) => setEditItem({...editItem, price: text})}
              keyboardType="numeric"
              fontSize={isTablet ? 18 : 16}
            />

            <Text style={styles.inputLabel}>{i18n.t('wishlist.quantity')}</Text>
            {/* Web uses a <select> of 1..100 (items/_form.html.erb) — a plain number is the
                only possible value there. Mobile equivalent: tapping opens a picker list
                instead of a free-text field, same guarantee without relying on input filtering. */}
            <TouchableOpacity
              style={{ marginBottom: 15 }}
              activeOpacity={0.7}
              onPress={() => setShowQuantityPicker(true)}
            >
              <TextField
                value={editItem.quantity}
                editable={false}
                showClear={false}
                pointerEvents="none"
                fontSize={isTablet ? 18 : 16}
              />
            </TouchableOpacity>

            <View style={styles.linksSection}>
              <Text style={styles.linksSectionTitle}>{i18n.t('wishlist.linksTitle')}</Text>
              {editItem.links.map((link, index) => (
                <View key={index} style={styles.linkInputContainer}>
                  <TextInput
                    style={[styles.textInput, styles.linkInput]}
                    placeholder={`${i18n.t('wishlist.link')} ${index + 1}`}
                    value={link.url || ''}
                    onChangeText={(text) => updateLink(index, text)}
                    autoCapitalize="none"
                  />
                  {editItem.links.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeLinkButton}
                      onPress={() => removeLinkField(index)}
                    >
                      <Text style={styles.removeLinkText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addLinkButton} onPress={addLinkField}>
                <Text style={styles.addLinkText}>+ {i18n.t('wishlist.addLink')}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.radioGroup}>
              <Text style={styles.radioGroupTitle}>{i18n.t('wishlist.reservationLabel')}</Text>
              <View style={styles.radioOptions}>
                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={() => setEditItem({...editItem, allow_reservation: true})}
                >
                  <View style={[styles.radioCircle, editItem.allow_reservation && styles.radioSelected]} />
                  <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={() => setEditItem({...editItem, allow_reservation: false})}
                >
                  <View style={[styles.radioCircle, !editItem.allow_reservation && styles.radioSelected]} />
                  <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.radioGroup}>
              <Text style={styles.radioGroupTitle}>{i18n.t('wishlist.visibilityLabel')}</Text>
              <View style={styles.radioOptions}>
                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={() => setEditItem({...editItem, hidden: false})}
                >
                  <View style={[styles.radioCircle, !editItem.hidden && styles.radioSelected]} />
                  <Text style={styles.radioText}>{i18n.t('wishlist.forAll')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={() => setEditItem({...editItem, hidden: true})}
                >
                  <View style={[styles.radioCircle, editItem.hidden && styles.radioSelected]} />
                  <Text style={styles.radioText}>{i18n.t('wishlist.onlyForMe')}</Text>
                </TouchableOpacity>
              </View>
            </View>
                </ScrollView>
            
                <View style={styles.modalButtons}>
                  <Button
                    onPress={handleSaveEdit}
                    disabled={savingItem}
                    loading={savingItem}
                    fontSize={isTablet ? 18 : 16}
                    title={i18n.t('wishlist.save')}
                  />
                </View>
                {!!editItem.allow_reservation && (
                  <TouchableOpacity
                    style={styles.modalLinkButton}
                    onPress={() => {
                      Alert.alert(
                        i18n.t('wishlist.reservations.confirmEditHeader'),
                        i18n.t('wishlist.reservations.confirmEditReservations'),
                        [
                          { text: i18n.t('wishlist.reservations.cancel'), style: 'cancel' },
                          { text: i18n.t('wishlist.reservations.confirm'), onPress: () => setActiveEditItemPopup('reservations') }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.modalLinkButtonText}>{i18n.t('wishlist.reservations.showLink')}</Text>
                  </TouchableOpacity>
                )}
                {!!currentWishlist.items_sharable && (
                  <TouchableOpacity
                    style={styles.modalLinkButton}
                    onPress={() => {
                      Alert.alert(
                        i18n.t('wishlist.giftShares.confirmEditHeader'),
                        i18n.t('wishlist.giftShares.confirmEditGiftShares'),
                        [
                          { text: i18n.t('wishlist.giftShares.cancel'), style: 'cancel' },
                          { text: i18n.t('wishlist.giftShares.confirm'), onPress: () => setActiveEditItemPopup('giftShares') }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.modalLinkButtonText}>{i18n.t('wishlist.giftShares.showLink')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {activeEditItemPopup === 'reservations' && (
        <ReservationsScreen
          wishlistAdminKey={currentWishlist.admin_key}
          item={editItem}
          namedReservationRequired={currentWishlist.named_reservation_required}
          onBack={() => setActiveEditItemPopup(null)}
        />
      )}

      {activeEditItemPopup === 'giftShares' && (
        <CommentsGiftSharesScreen
          wishlistAdminKey={currentWishlist.admin_key}
          item={editItem}
          onBack={() => setActiveEditItemPopup(null)}
        />
      )}

      {/* Mobile equivalent of web's <select> 1..100 for quantity (items/_form.html.erb) — a
          tap-to-pick list instead of a dropdown. */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showQuantityPicker}
        onRequestClose={() => setShowQuantityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowQuantityPicker(false)}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{i18n.t('wishlist.quantity')}</Text>
            <FlatList
              data={QUANTITY_OPTIONS}
              keyExtractor={(n) => n.toString()}
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: n }) => (
                <TouchableOpacity
                  style={styles.moveItemWishlistRow}
                  onPress={() => {
                    setEditItem({ ...editItem, quantity: n.toString() });
                    setShowQuantityPicker(false);
                  }}
                >
                  <Text style={[
                    styles.moveItemWishlistTitle,
                    n.toString() === editItem.quantity && { color: theme.primary },
                  ]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editWishlistMode}
        onRequestClose={handleCancelWishlistEdit}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={handleCancelWishlistEdit} // oder handleCancelEdit oder handleCancelWishlistEdit
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { marginBottom: 30 }]}>{i18n.t('wishlist.editWishlist')}</Text>

              <Text style={styles.inputLabel}>{i18n.t('wishlist.title')}</Text>
              <TextField
                style={{ marginBottom: 24 }}
                placeholder={i18n.t('wishlist.title')}
                value={editWishlist.title}
                onChangeText={(text) => setEditWishlist({...editWishlist, title: text})}
                fontSize={isTablet ? 18 : 16}
              />

              <Text style={styles.inputLabel}>{i18n.t('wishlist.description')}</Text>
              <TextField
                style={{ marginBottom: 24 }}
                placeholder={i18n.t('wishlist.description')}
                value={editWishlist.description}
                onChangeText={(text) => setEditWishlist({...editWishlist, description: text})}
                multiline
                fontSize={isTablet ? 18 : 16}
              />

              <Text style={styles.inputLabel}>{i18n.t('wishlist.ownerName')}</Text>
              <TextField
                style={{ marginBottom: 34 }}
                placeholder={i18n.t('wishlist.ownerName')}
                value={editWishlist.owner_name}
                onChangeText={(text) => setEditWishlist({...editWishlist, owner_name: text})}
                fontSize={isTablet ? 18 : 16}
              />

              <View style={styles.editWishlistBorderedSection}>
                <View style={styles.radioGroup}>
                  <Text style={styles.editWishlistRadioTitle}>{i18n.t('wishlist.namedReservationLabel')}</Text>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, named_reservation_required: true})}
                    >
                      <View style={[styles.radioCircle, editWishlist.named_reservation_required && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, named_reservation_required: false})}
                    >
                      <View style={[styles.radioCircle, !editWishlist.named_reservation_required && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.radioGroup}>
                  <Text style={styles.editWishlistRadioTitle}>{i18n.t('wishlist.itemsSharableLabel')}</Text>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, items_sharable: true})}
                    >
                      <View style={[styles.radioCircle, editWishlist.items_sharable && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, items_sharable: false})}
                    >
                      <View style={[styles.radioCircle, !editWishlist.items_sharable && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.radioGroup}>
                  <Text style={styles.editWishlistRadioTitle}>{i18n.t('wishlist.hideReservedItemsByDefaultLabel')}</Text>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, hide_reserved_items_by_default: true})}
                    >
                      <View style={[styles.radioCircle, editWishlist.hide_reserved_items_by_default && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, hide_reserved_items_by_default: false})}
                    >
                      <View style={[styles.radioCircle, !editWishlist.hide_reserved_items_by_default && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.radioGroup, { marginBottom: 0 }]}>
                  <Text style={styles.editWishlistRadioTitle}>{i18n.t('wishlist.crawlableLabel')}</Text>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, crawlable: true})}
                    >
                      <View style={[styles.radioCircle, editWishlist.crawlable && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setEditWishlist({...editWishlist, crawlable: false})}
                    >
                      <View style={[styles.radioCircle, !editWishlist.crawlable && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.editWishlistBorderedSection}>
                <Text style={styles.inputLabel}>{i18n.t('wishlist.themeLabel')}</Text>
                <View style={[styles.themeSwatches, { marginBottom: 0 }]}>
                  <TouchableOpacity style={styles.themeSwatchItem} onPress={() => setEditWishlist({...editWishlist, theme: ''})}>
                    <View style={[styles.themeSwatchCircle, styles.themeSwatchDefault, !editWishlist.theme && styles.themeSwatchSelected]} />
                    <Text style={styles.themeSwatchName}>{i18n.t('wishlist.themeDefault')}</Text>
                  </TouchableOpacity>
                  {Object.entries(WISHLIST_THEME_COLORS).map(([key, colors]) => (
                    <TouchableOpacity key={key} style={styles.themeSwatchItem} onPress={() => setEditWishlist({...editWishlist, theme: key})}>
                      <View style={[styles.themeSwatchCircle, { backgroundColor: colors.accent }, editWishlist.theme === key && styles.themeSwatchSelected]} />
                      <Text style={styles.themeSwatchName}>{i18n.t(`wishlist.theme_${key}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.editWishlistBorderedSection}>
                {!!currentWishlist.email && (
                  <View style={styles.radioGroup}>
                    <Text style={styles.editWishlistRadioTitle}>{i18n.t('wishlist.reservationNoticesLabel')}</Text>
                    <View style={styles.radioOptions}>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setEditWishlist({...editWishlist, reservation_notices: true})}
                      >
                        <View style={[styles.radioCircle, editWishlist.reservation_notices && styles.radioSelected]} />
                        <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setEditWishlist({...editWishlist, reservation_notices: false})}
                      >
                        <View style={[styles.radioCircle, !editWishlist.reservation_notices && styles.radioSelected]} />
                        <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.radioGroup}>
                  <Text style={styles.editWishlistRadioTitle}>{i18n.t('wishlist.pushNotificationsLabel')}</Text>
                  <View style={styles.radioOptions}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => handleTogglePushNotifications(true)}
                    >
                      <View style={[styles.radioCircle, editWishlist.push_notifications && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.yes')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => handleTogglePushNotifications(false)}
                    >
                      <View style={[styles.radioCircle, !editWishlist.push_notifications && styles.radioSelected]} />
                      <Text style={styles.radioText}>{i18n.t('wishlist.no')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {currentWishlist.email ? (
                  <Text style={styles.emailInfoText}>
                    <Text style={styles.emailInfoLabel}>{i18n.t('wishlist.storedEmailLabel')}: </Text>
                    {currentWishlist.email}{'  '}
                    <Text style={styles.emailChangeLink} onPress={() => setShowEmailField(!showEmailField)}>{i18n.t('wishlist.replaceEmail')}</Text>
                  </Text>
                ) : (
                  <Text style={styles.emailChangeLink} onPress={() => setShowEmailField(true)}>{i18n.t('wishlist.addEmail')}</Text>
                )}

                {showEmailField && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                      {currentWishlist.email ? i18n.t('wishlist.newEmailLabel') : i18n.t('wishlist.addEmailLabel')}
                    </Text>
                    <TextField
                      value={newEmailInput}
                      onChangeText={setNewEmailInput}
                      placeholder="email@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      fontSize={isTablet ? 18 : 16}
                    />
                    {!(currentWishlist.email_confirmed_at && currentWishlist.newsletter_accepted) && (
                      <TouchableOpacity
                        style={styles.newsletterCheckbox}
                        onPress={() => setEditWishlist({...editWishlist, newsletter_accepted: !editWishlist.newsletter_accepted})}
                      >
                        <View style={[styles.newsletterCheckboxBox, editWishlist.newsletter_accepted && styles.newsletterCheckboxChecked]}>
                          {editWishlist.newsletter_accepted && <Text style={styles.newsletterCheckboxMark}>✓</Text>}
                        </View>
                        <Text style={styles.newsletterCheckboxText}>{i18n.t('wishlist.newsletterAcceptedLabel')}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {!!currentWishlist.newsletter_confirmation_pending && (
                  <View style={{ marginTop: 15 }}>
                    <Text style={styles.emailConfirmHint}>{i18n.t('wishlist.newsletterUnconfirmedHint')}</Text>
                    {resendingNewsletterConfirmation ? (
                      <ActivityIndicator color={theme.primary} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                    ) : (
                      <Text style={[styles.emailChangeLink, { marginTop: 6 }]} onPress={handleResendNewsletterConfirmation}>
                        {i18n.t('wishlist.resendNewsletterConfirmationLink')}
                      </Text>
                    )}
                  </View>
                )}

                {!!currentWishlist.new_email && (!currentWishlist.new_email_confirmed_at || currentWishlist.new_email_confirmed_at < currentWishlist.new_email_confirmation_sent_at) && (
                  <View style={{ marginTop: 15 }}>
                    <Text style={styles.emailInfoText}>
                      <Text style={styles.emailInfoLabel}>{i18n.t('wishlist.newStoredEmailLabel')}: </Text>
                      {currentWishlist.new_email}
                    </Text>
                    {!!currentWishlist.new_email_confirmation_sent_at && (
                      <Text style={[styles.emailInfoText, { marginTop: 6 }]}>
                        <Text style={styles.emailInfoLabel}>{i18n.t('wishlist.confirmationSentAtLabel')}: </Text>
                        {new Date(currentWishlist.new_email_confirmation_sent_at).toLocaleString()}
                      </Text>
                    )}
                    <Text style={[styles.emailConfirmHint, { marginTop: 6 }]}>{i18n.t('wishlist.confirmNewEmailHint')}</Text>
                    {resendingConfirmation ? (
                      <ActivityIndicator color={theme.primary} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
                    ) : (
                      <Text style={[styles.emailChangeLink, { marginTop: 6 }]} onPress={handleResendConfirmation}>
                        {i18n.t('wishlist.resendConfirmationLink')}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalButtons, { marginTop: 30 }]}>
              <Button
                onPress={handleSaveWishlist}
                disabled={savingWishlist}
                loading={savingWishlist}
                fontSize={isTablet ? 18 : 16}
                title={i18n.t('wishlist.save')}
              />
            </View>

            <TouchableOpacity onPress={handleDeleteWishlist} style={styles.deleteWishlistLink}>
              <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
              <Text style={styles.deleteWishlistText}>{i18n.t('wishlist.deleteTitle')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Mirrors items_controller.rb#move_form (web) — pick which of the user's own other
          wishlists to move this item to. Rendered here (top-level, sibling of the item detail
          Modal below) only when NOT triggered from within that Modal — see renderMoveItemPicker
          for why it needs a second, nested copy for that case. */}
      {renderMoveItemPicker(!!moveItemTarget && !itemDetailMode)}
      {performingItemActionOverlay}
      </Animated.View>
      </GestureDetector>
      {optionsOverlay}

      {/* Loading overlay while fetching images */}
      {loadingImages && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <Text style={{ color: 'white', fontSize: 16 }}>Bilder werden geladen...</Text>
        </View>
      )}

      {/* Loading overlay while fetching fresh wishlist data for the edit form */}
      {loadingEditWishlist && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      )}

      {/* Loading overlay while fetching fresh wishlist data for the share menu */}
      {loadingShareMenu && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      )}

      {/* Image picker modal after item save */}
      <Modal animationType="slide" transparent={true} visible={!!imagePickerItem} onRequestClose={() => setImagePickerItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setImagePickerItem(null)}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{i18n.t('wishlist.selectImages')}</Text>
            {imagePickerItem && (
              <>
                <FlatList
                  horizontal
                  data={imagePickerItem.images}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => setImagePickerItem({ ...imagePickerItem, selectedIndex: index })}
                      style={[styles.carouselImageContainer, index === imagePickerItem.selectedIndex && styles.selectedImageContainer]}
                    >
                      <Image source={{ uri: item.uri }} style={styles.carouselImage} resizeMode="contain" />
                      {index === imagePickerItem.selectedIndex && (
                        <View style={styles.selectedOverlay}><Text style={styles.checkmark}>✓</Text></View>
                      )}
                    </TouchableOpacity>
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContent}
                />
                <View style={styles.modalButtons}>
                  <Button
                    onPress={async () => {
                      const img = imagePickerItem.images[imagePickerItem.selectedIndex];
                      await updateItem(imagePickerItem.itemId, { remote_image_url: img.uri });
                      setImagePickerItem(null);
                    }}
                    fontSize={isTablet ? 18 : 16}
                    title={i18n.t('wishlist.save')}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {uploadingImage && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      <Modal animationType="slide" transparent={false} visible={!!cropSession} onRequestClose={() => setCropSession(null)}>
        {cropSession && (
          <ImageCropScreen
            mode={cropSession.mode}
            wishlistId={currentWishlist.admin_key}
            itemId={cropSession.itemId}
            imageUri={cropSession.imageUri}
            initialCrop={cropSession.initialCrop}
            onCancel={() => setCropSession(null)}
            onSaved={handleCropSaved}
          />
        )}
      </Modal>

      <Modal animationType="slide" transparent={true} visible={shareMenuVisible} onRequestClose={() => (shareSubView ? setShareSubView(null) : setShareMenuVisible(false))}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.shareModalTitlebar}>
              {shareSubView ? (
                <TouchableOpacity style={styles.shareBackButton} onPress={() => setShareSubView(null)}>
                  <Text style={styles.shareBackArrowText}>←</Text>
                </TouchableOpacity>
              ) : (
                <Image source={require('../../assets/wishsite_logo_name_100.png')} style={styles.shareModalLogo} resizeMode="contain" />
              )}
              <TouchableOpacity style={{ width: 30, height: 30, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShareMenuVisible(false)}>
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            {shareSubView === 'shortlink' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.shareSubViewTitle}>{i18n.t('wishlist.shareShortlinkTitle')}</Text>
                <Text style={styles.shareHint}>{i18n.t('wishlist.shareShortlinkHint')}</Text>
                <View style={[styles.shareUrlBox, { marginTop: 8, marginBottom: 15 }]}>
                  <Text style={styles.shareUrlText} numberOfLines={1} ellipsizeMode="middle">{currentWishlist.shortlink_url}</Text>
                </View>
                <Button
                  variant="secondary"
                  onPress={handleCopyShortlink}
                  fontSize={14}
                  title={shortlinkCopied ? i18n.t('wishlist.shareLinkCopied') : i18n.t('wishlist.shareCopyLink')}
                  style={styles.shareCopyButton}
                />
              </ScrollView>
            )}

            {shareSubView === 'qrcode' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.shareSubViewTitle}>{i18n.t('wishlist.shareQrCodeTitle')}</Text>
                {loadingQrCode && <ActivityIndicator color={theme.primary} style={{ marginBottom: 10 }} />}
                {qrCodeUrl && (
                  <View style={styles.qrCodeBox}>
                    <Image source={{ uri: qrCodeUrl }} style={styles.qrCodeImage} resizeMode="contain" />
                    <Text style={[styles.shareHint, { marginBottom: 15 }]}>{i18n.t('wishlist.shareQrCodeHint')}</Text>
                    <Button
                      variant="secondary"
                      onPress={handleSaveQrCodeToPhotos}
                      disabled={savingQrCodeToPhotos}
                      loading={savingQrCodeToPhotos}
                      fontSize={14}
                      title={qrCodeSaved ? i18n.t('wishlist.shareQrCodeSaved') : i18n.t('wishlist.shareQrCodeSave')}
                      style={{ marginBottom: 10 }}
                    />
                    <Button
                      variant="secondary"
                      onPress={() => Share.share({ url: qrCodeUrl })}
                      fontSize={14}
                      title={i18n.t('wishlist.shareQrCodeShare')}
                    />
                  </View>
                )}
              </ScrollView>
            )}

            {shareSubView === 'changeLink' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.shareSubViewTitle}>{i18n.t('wishlist.shareChangeLinkTitle')}</Text>
                <Text style={[styles.shareHint, { marginBottom: 15 }]}>
                  {i18n.t('wishlist.shareChangeLinkHint', { accessKey: currentWishlist.access_key })}
                </Text>
                <Text style={styles.shareInputLabel}>{i18n.t('wishlist.shareCustomKeyLabel')}</Text>
                <TextField
                  value={customKeyInput}
                  onChangeText={setCustomKeyInput}
                  autoCapitalize="none"
                  placeholder={i18n.t('wishlist.shareCustomKeyPlaceholder')}
                  fontSize={16}
                />
                <Button
                  style={{ marginTop: 10 }}
                  onPress={handleSaveCustomKey}
                  disabled={savingCustomKey}
                  loading={savingCustomKey}
                  fontSize={16}
                  title={i18n.t('wishlist.shareCustomKeySave')}
                />
              </ScrollView>
            )}

            {shareSubView === 'embed' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.shareSubViewTitle}>{i18n.t('wishlist.shareEmbedTitle')}</Text>
                <Text style={styles.shareHint}>{i18n.t('wishlist.shareEmbedHint')}</Text>
                <View style={[styles.shareUrlBox, { marginTop: 8, marginBottom: 15, alignItems: 'flex-start' }]}>
                  <Text style={styles.embedCodeText}>{currentWishlist.embed_code}</Text>
                </View>
                <Button
                  variant="secondary"
                  onPress={handleCopyEmbed}
                  fontSize={14}
                  title={embedCopied ? i18n.t('wishlist.shareLinkCopied') : i18n.t('wishlist.shareCopyLink')}
                  style={styles.shareCopyButton}
                />
              </ScrollView>
            )}

            {!shareSubView && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.shareUrlLabel}>{i18n.t('wishlist.shareUrlLabel')}</Text>
                <View style={styles.shareUrlBox}>
                  <Text style={styles.shareUrlText} numberOfLines={1} ellipsizeMode="middle">{shareUrl}</Text>
                </View>

                <TouchableOpacity style={[styles.shareMenuItem, styles.shareMenuItemRow]} onPress={() => Linking.openURL(shareUrl)}>
                  <SvgXml xml={openIcon(theme.text)} width={16} height={16} />
                  <Text style={styles.shareMenuItemText}>{i18n.t('wishlist.shareOpenLink')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.shareMenuItem, styles.shareMenuItemRow]} onPress={handleCopyLink}>
                  <SvgXml xml={clipboardIcon(theme.text)} width={16} height={16} />
                  <Text style={styles.shareMenuItemText}>{linkCopied ? i18n.t('wishlist.shareLinkCopied') : i18n.t('wishlist.shareCopyLink')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.shareMenuItem, styles.shareMenuItemRow]} onPress={() => setShareSubView('shortlink')}>
                  <SvgXml xml={shortlinkIcon(theme.text)} width={16} height={16} />
                  <Text style={styles.shareMenuItemText}>{i18n.t('wishlist.shareShortlinkLabel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shareMenuItem, styles.shareMenuItemRow]}
                  onPress={() => { setShareSubView('qrcode'); if (!qrCodeUrl) handleShowQrCode(); }}
                >
                  <SvgXml xml={qrcodeIcon(theme.text)} width={16} height={16} />
                  <Text style={styles.shareMenuItemText}>{i18n.t('wishlist.shareQrCode')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.shareMenuItem, styles.shareMenuItemRow]} onPress={() => setShareSubView('changeLink')}>
                  <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
                  <Text style={styles.shareMenuItemText}>{i18n.t('wishlist.shareChangeLink')}</Text>
                </TouchableOpacity>

                <View style={styles.menuSectionDivider}>
                  <View style={styles.menuSectionDividerLine} />
                  <Text style={styles.menuSectionDividerText}>{i18n.t('wishlist.shareWishlistSection')}</Text>
                  <View style={styles.menuSectionDividerLine} />
                </View>

                <TouchableOpacity style={[styles.shareMenuItem, styles.shareMenuItemRow]} onPress={handleNativeShare}>
                  <SvgXml xml={shareIcon(theme.text)} width={16} height={16} />
                  <Text style={styles.shareMenuItemText}>{i18n.t('wishlist.shareNative')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.shareMenuItem, styles.shareMenuItemRow]} onPress={() => setShareSubView('embed')}>
                  <SvgXml xml={embedIcon(theme.text)} width={16} height={16} />
                  <Text style={styles.shareMenuItemText}>{i18n.t('wishlist.shareEmbedLabel')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default WishlistDetailScreen;
