import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Modal, TextInput, Alert, ScrollView, TouchableWithoutFeedback, Image, Animated, PanResponder, Linking, ActivityIndicator, Share } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import i18n from '../i18n';
import { headingStyle, bodyStyle, buttonStyle, strongStyle } from '../styles/fonts';
import ItemDetailScreen from './ItemDetailScreen';
import WishlistLockedScreen from './WishlistLockedScreen';
import WishlistItem from '../components/WishlistItem';
import SkeletonLoader from '../components/SkeletonLoader';
import ModalSkeleton from '../components/ModalSkeleton';
import SafeImage from '../components/SafeImage';
import { useWishlistItems } from '../hooks/useWishlistItems';
import api, { WEB_BASE_URL } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, INPUT_RADIUS, cardShadow, cardStyle, BANNER_HEIGHT, AVATAR_SIZE, AVATAR_BOTTOM_OFFSET } from '../styles/shared';
import { palette } from '../styles/colors';
import Button from '../components/Button';
import TextField from '../components/TextField';
import ImageCropScreen from './ImageCropScreen';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { SvgXml } from 'react-native-svg';
import { editIcon, cropIcon, backgroundIcon, userImageIcon, openIcon, clipboardIcon, shortlinkIcon, qrcodeIcon, embedIcon, shareIcon, deleteIcon } from '../styles/icons';

const { height: screenHeight, width } = Dimensions.get('window');
const isTablet = width >= 768;

// Ported from wishsite3 WishlistHelper::WISHLIST_COLOR_SCHEMES
const WISHLIST_COLOR_SCHEMES = {
  blue: palette.blue.l1,
  green: palette.green.l1,
  yellow: palette.yellow.l1,
  red: palette.red.l1,
  pink: palette.pink.l1,
  violet: palette.violet.l1,
  brown: palette.brown.l1,
  mono: palette.black.l1,
};

const getWishlistBannerColor = (color) => {
  if (!color || color === '#ffffff') return null;
  if (color.startsWith('#')) return color;
  return WISHLIST_COLOR_SCHEMES[color] || null;
};

const WishlistDetailScreen = ({ wishlist, authToken, onBack, onWishlistUpdate, onLogout, autoOpenEdit }) => {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, setItems, loading, wishlistData, locked, updateItem, deleteItem, addItem, loadSingleItem, updateWishlist, deleteWishlist } = useWishlistItems(wishlist, authToken);
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
  const [directAddMode, setDirectAddMode] = useState(false);
  const [imagePickerItem, setImagePickerItem] = useState(null); // { itemId, images, selectedIndex }
  const [loadingImages, setLoadingImages] = useState(false);
  const [fromSearch, setFromSearch] = useState(false);
  const [directWish, setDirectWish] = useState({ title: '', description: '', price: '', url: '', hidden: false, allow_reservation: true, images: [], selectedImageIndex: 0, position: 0 });
  const [itemDetailMode, setItemDetailMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [wishlistScrollPosition, setWishlistScrollPosition] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editItem, setEditItem] = useState({ title: '', description: '', price: '', quantity: '1', links: [{ url: '' }], allow_reservation: true, hidden: false });
  const [wishlistOptionsVisible, setWishlistOptionsVisible] = useState(false);
  const [editWishlistMode, setEditWishlistMode] = useState(false);
  const [loadingEditWishlist, setLoadingEditWishlist] = useState(false);
  const [loadingShareMenu, setLoadingShareMenu] = useState(false);
  const [editWishlist, setEditWishlist] = useState({ title: '', description: '', owner_name: '', theme: '', named_reservation_required: false, items_sharable: true, crawlable: false, reservation_notices: false, newsletter_accepted: false });
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
  const wishlistRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => gestureState.dx > 20 && !modalVisible && !editMode && !editWishlistMode && !itemDetailMode,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > width * 0.3) {
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
      },
    })
  ).current;



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
    } catch (error) {
    }
  };

  const handleDirectAdd = async () => {
    setDirectAddMode(true);
    setFromSearch(false);
    const initialWish = { title: wishTitle, description: '', price: '', url: '', hidden: false, allow_reservation: true, images: [], selectedImageIndex: 0 };
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

  const handleItemPress = async (item) => {
    setSelectedItem(item);
    setItemDetailMode(true);
    // Refresh in the background so reservation status etc. can't go stale while the modal is open,
    // without blocking on a loading spinner for what's otherwise an instant view action.
    try {
      const { data } = await api.get(`/wishlists/${currentWishlist.admin_key}/admin`);
      setItems(data.items || []);
      const fresh = (data.items || []).find(i => i.id === item.id);
      if (fresh) {
        // Only apply if the user is still looking at this same item (avoids a late response
        // overwriting a different item they've since navigated to).
        setSelectedItem(prev => (prev && prev.id === item.id ? fresh : prev));
      }
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
        crawlable: data.crawlable || false,
        reservation_notices: data.reservation_notices || false,
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
    const field = cropSession.mode === 'avatar' ? 'user_image_url' : 'background_image_url';
    setCurrentWishlist(prev => ({ ...prev, [field]: newUrl }));
    setCropSession(null);
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
    setEditWishlist({ title: '', description: '', owner_name: '', theme: '', named_reservation_required: false, items_sharable: true, crawlable: false, reservation_notices: false, newsletter_accepted: false });
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
              onBack();
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
    },
    shareSection: {
      alignItems: 'center',
      paddingBottom: 36,
    },
    shareButton: {
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: RADIUS.pill,
      backgroundColor: theme.primary,
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
      color: theme.text,
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
    listContainer: {
      paddingTop: 4,
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
      marginBottom: 16,
      ...cardStyle(theme, isDarkMode),
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
    itemCard: {
      backgroundColor: theme.surface,
      marginHorizontal: 20,
      borderRadius: RADIUS.card,
      padding: 16,
      ...cardShadow(theme, isDarkMode),
      position: 'relative',
    },
    // Visual feedback for the item currently being long-press-dragged.
    itemCardActive: {
      opacity: 0.9,
      shadowOpacity: isDarkMode ? 0.5 : 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    optionsContainer: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 100,
    },
    optionsButton: {
      padding: 5,
    },
    optionsText: {
      ...buttonStyle(24),
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
    optionItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
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
    itemImage: {
      width: isTablet ? 140 : 100,
      height: isTablet ? 140 : 100,
      borderRadius: RADIUS.card,
      marginRight: 16,
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
    itemName: {
      ...strongStyle(isTablet ? 20 : 18),
      color: theme.text,
      lineHeight: isTablet ? 25 : 22,
      marginBottom: 6,
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
    itemPrice: {
      ...strongStyle(isTablet ? 19 : 17),
      color: theme.primary,
    },
    deleteWishlistLink: {
      marginTop: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
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
    const menuHeight = 100;
    // Content now starts right after the safe-area inset — no header bar height to add anymore.
    const headerOffset = insets.top;
    const adjustedY = optionsMenuPosition.y - headerOffset;
    const top = adjustedY + menuHeight > screenHeight - headerOffset
      ? adjustedY - menuHeight
      : adjustedY;
    return (
      <TouchableWithoutFeedback onPress={() => setOptionsVisible(null)}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }}>
          <View style={[styles.optionsMenu, { position: 'absolute', top, right: 20, left: 'auto' }]}>
            <TouchableOpacity style={styles.optionItem} onPress={() => { handleEditItem(activeItem); setOptionsVisible(null); }}>
              <Text style={styles.optionText}>{i18n.t('wishlist.editItem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem} onPress={() => { handleDeleteItem(activeItem); setOptionsVisible(null); }}>
              <Text style={[styles.optionText, styles.removeText]}>{i18n.t('wishlist.remove')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  })();

  if (locked) {
    return <WishlistLockedScreen onBack={onBack} />;
  }

  // Header banner/avatar sizing, ported from WishlistHelper#set_wl_banner_wrapper_height (wishsite3),
  // is_admin branch: full height whenever a banner exists (image or non-default color), regardless
  // of whether an avatar is also present; "reduced-height" only for an avatar with no banner at all;
  // no wrapper (0) when neither is present, so it takes up no space.
  const bannerColor = getWishlistBannerColor(currentWishlist.background_color);
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

  return (
    <SafeAreaView style={[styles.container]}>
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]} {...panResponder.panHandlers}>
      <TouchableOpacity onPress={onBack} style={[styles.floatingBackButton, { top: backButtonTop }]}>
        <Text style={styles.floatingBackArrowText}>←</Text>
      </TouchableOpacity>

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
                      <View style={styles.avatarMenu}>
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
                      </View>
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
                  <View style={styles.headerOptionsMenu}>
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
                  </View>
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
            onScroll={(event) => setWishlistScrollPosition(event.nativeEvent.contentOffset.y)}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={handleCancelWish} // oder handleCancelEdit oder handleCancelWishlistEdit
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            {directAddMode ? (
              // Direct Add Form
              <>
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
                  <Button onPress={handleSaveDirectWish} fontSize={isTablet ? 18 : 16} title={i18n.t('wishlist.save')} />
                </View>
              </>
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
                          <Image 
                            source={item.image_url ? { uri: item.image_url } : require('../../assets/placeholder.png')}
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
        </View>
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
          />
        )}
      </Modal>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={editMode}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
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
            <TextField
              style={{ marginBottom: 15 }}
              placeholder={i18n.t('wishlist.quantity')}
              value={editItem.quantity}
              onChangeText={(text) => setEditItem({...editItem, quantity: text})}
              keyboardType="numeric"
              fontSize={isTablet ? 18 : 16}
            />
            
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
              </>
            )}
          </View>
        </View>
      </Modal>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={editWishlistMode}
        onRequestClose={handleCancelWishlistEdit}
      >
        <View style={styles.modalOverlay}>
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
                  {Object.entries(WISHLIST_COLOR_SCHEMES).map(([key, color]) => (
                    <TouchableOpacity key={key} style={styles.themeSwatchItem} onPress={() => setEditWishlist({...editWishlist, theme: key})}>
                      <View style={[styles.themeSwatchCircle, { backgroundColor: color }, editWishlist.theme === key && styles.themeSwatchSelected]} />
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
        </View>
      </Modal>
      </Animated.View>
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
            imageUri={cropSession.imageUri}
            initialCrop={cropSession.initialCrop}
            onCancel={() => setCropSession(null)}
            onSaved={handleCropSaved}
          />
        )}
      </Modal>

      <Modal animationType="slide" transparent={true} visible={shareMenuVisible} onRequestClose={() => (shareSubView ? setShareSubView(null) : setShareMenuVisible(false))}>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default WishlistDetailScreen;
