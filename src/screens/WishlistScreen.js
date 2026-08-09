import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, Image, ScrollView, Linking, Platform, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SvgXml } from 'react-native-svg';
import api, { isNetworkError } from '../services/api';
import i18n from '../i18n';
import { headingStyle, bodyStyle, strongStyle } from '../styles/fonts';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardShadow } from '../styles/shared';
import { palette } from '../styles/colors';
import Button from '../components/Button';
import TextField from '../components/TextField';
import AnimatedMenu from '../components/AnimatedMenu';
import SkeletonLoader from '../components/SkeletonLoader';
import { editIcon, deleteIcon, giftIcon, createdAtIcon, updatedAtIcon, linkIcon, bookmarkIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Mirrors wishsite3's users#show pluralization (config/locales/*.yml, users.show.items_count).
const itemsCountText = (count) => {
  if (!count) return i18n.t('wishlist.itemsCountZero');
  if (count === 1) return i18n.t('wishlist.itemsCountOne');
  return i18n.t('wishlist.itemsCountOther', { count });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(i18n.locale === 'de' ? 'de-DE' : 'en-US');
};

// Mirrors wishsite3's UsersController#show WISHLIST_SORT_OPTIONS / session[:wishlists_sort] —
// same three options and the same default, persisted locally instead of server-side in a
// session.
const SORT_STORAGE_KEY = 'wishlistSortOption';
const SORT_OPTIONS = ['created_at', 'title', 'updated_at'];
const SORT_LABEL_KEYS = {
  created_at: 'wishlist.sortByCreatedAt',
  title: 'wishlist.sortByTitle',
  updated_at: 'wishlist.sortByUpdatedAt',
};

const sortWishlists = (list, sortOption) => {
  const sorted = [...list];
  switch (sortOption) {
    case 'title':
      return sorted.sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()));
    case 'updated_at':
      return sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

// Own-wishlist card, mirrors wishsite3 users#show "#user-wishlists" cards
// (app/views/users/show.html.erb + helpers#wishlist_card_content).
const OwnWishlistCard = ({ item, theme, isDarkMode, onSelect, onEdit, onDelete, menuOpen, onToggleMenu }) => {
  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      // Matches wishsite3's .card (padding: 12px 14px) plus the #wishlists ul grid's row gap
      // (6px) folded into this card's own bottom margin (controllers/users.scss), scaled up
      // slightly for touch targets.
      paddingVertical: isTablet ? 20 : 16,
      paddingHorizontal: isTablet ? 20 : 16,
      marginBottom: 20,
      ...cardShadow(theme, isDarkMode),
    },
    // Without this, the dropdown menu below (position:absolute, zIndex:1000) only outranks
    // its own siblings inside this card — the NEXT card in the list still paints over it,
    // since that card is a later sibling at the same (default) zIndex one level up.
    cardMenuOpen: {
      zIndex: 1000,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.background,
    },
    info: {
      flex: 1,
      marginLeft: 12,
      // Reserve room for the absolutely-positioned "⋯" toggle (width 32 + right 4) so long
      // titles/text truncate before running underneath it instead of overlapping.
      paddingRight: 40,
    },
    title: {
      ...headingStyle(isTablet ? 18 : 16),
      color: theme.text,
      // Matches wishsite3's .wl-meta { margin-top: 8px } (controllers/users.scss) — the gap
      // lives on the title side here instead, same visual result.
      marginBottom: 8,
    },
    // Matches wishsite3's .wl-meta { font-size: 0.8 * $fontSize } (controllers/users.scss) —
    // same size as metaSmall below, web uses one size for items-count and the date rows alike.
    meta: {
      ...bodyStyle(isTablet ? 12 : 11),
      color: theme.textSecondary,
      marginBottom: 2,
    },
    metaSmall: {
      ...bodyStyle(isTablet ? 12 : 11),
      color: theme.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    // Mirrors wishsite3's .wl-menu-toolbar (controllers/users.scss): position:absolute,
    // top/right 8px — anchored to the card's top-right corner, level with the title, not
    // vertically centered against the whole (taller) card.
    // Fixed, self-centered box instead of relying on the "⋯" glyph's own line-height padding
    // to land it in the right spot — top is measured level with the title text.
    menuToggle: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    menuToggleText: {
      ...strongStyle(20),
      color: theme.text,
    },
    // Anchored at the exact same top/right as menuToggle (not a separate offset below it), so
    // the close button inside — positioned at this box's own top:0/right:0 — lands exactly
    // where the "⋯" toggle was, instead of floating below/beside it.
    menu: {
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
      minWidth: 200,
      paddingTop: 32,
      zIndex: 1000,
    },
    menuCloseButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuCloseText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
    },
    menuItemText: {
      ...strongStyle(isTablet ? 15 : 14),
      color: theme.text,
    },
  });

  return (
    <TouchableOpacity style={[styles.card, menuOpen && styles.cardMenuOpen]} onPress={() => onSelect(item)} activeOpacity={0.8}>
      <Image
        source={item.user_image_url ? { uri: item.user_image_url } : require('../../assets/placeholder.png')}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title || '...'}</Text>
        <View style={styles.metaRow}>
          <SvgXml xml={giftIcon(theme.textSecondary)} width={12} height={12} />
          <Text style={styles.meta}>{itemsCountText(item.items_count)}</Text>
        </View>
        <View style={styles.metaRow}>
          <SvgXml xml={createdAtIcon(theme.textMuted)} width={11} height={11} />
          <Text style={styles.metaSmall}>{i18n.t('wishlist.createdAtLabel')} {formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.metaRow}>
          <SvgXml xml={updatedAtIcon(theme.textMuted)} width={11} height={11} />
          <Text style={styles.metaSmall}>{i18n.t('wishlist.updatedAtLabel')} {formatDate(item.updated_at)}</Text>
        </View>
      </View>
      {!menuOpen && (
        <TouchableOpacity style={styles.menuToggle} onPress={(e) => { e.stopPropagation(); onToggleMenu(); }}>
          <Text style={styles.menuToggleText}>⋯</Text>
        </TouchableOpacity>
      )}
      {menuOpen && (
        <AnimatedMenu style={styles.menu}>
          <TouchableOpacity style={styles.menuCloseButton} onPress={(e) => { e.stopPropagation(); onToggleMenu(); }}>
            <Text style={styles.menuCloseText}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onEdit(item); }}>
            <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
            <Text style={styles.menuItemText}>{i18n.t('wishlist.editWishlistLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onDelete(item); }}>
            <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
            <Text style={[styles.menuItemText, { color: theme.danger }]}>{i18n.t('wishlist.deleteWishlistLinkTitle')}</Text>
          </TouchableOpacity>
        </AnimatedMenu>
      )}
    </TouchableOpacity>
  );
};

// Guest-wishlist (bookmark) card, mirrors app/views/guest_wishlists/_guest_wishlist.html.erb.
// Shows the LINKED wishlist's own image/title, plus the bookmark's own optional nickname.
const GuestWishlistCard = ({ item, theme, isDarkMode, onOpen, onEdit, onDelete, menuOpen, onToggleMenu }) => {
  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      // Matches wishsite3's .card (padding: 12px 14px) plus the #wishlists ul grid's row gap
      // (6px) folded into this card's own bottom margin (controllers/users.scss), scaled up
      // slightly for touch targets.
      paddingVertical: isTablet ? 20 : 16,
      paddingHorizontal: isTablet ? 20 : 16,
      marginBottom: 20,
      ...cardShadow(theme, isDarkMode),
    },
    // Without this, the dropdown menu below (position:absolute, zIndex:1000) only outranks
    // its own siblings inside this card — the NEXT card in the list still paints over it,
    // since that card is a later sibling at the same (default) zIndex one level up.
    cardMenuOpen: {
      zIndex: 1000,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.background,
    },
    info: {
      flex: 1,
      marginLeft: 12,
      // Reserve room for the absolutely-positioned "⋯" toggle (width 32 + right 4) so long
      // titles/text truncate before running underneath it instead of overlapping.
      paddingRight: 40,
    },
    title: {
      ...headingStyle(isTablet ? 18 : 16),
      color: theme.text,
      // Matches wishsite3's .wl-meta { margin-top: 8px } (controllers/users.scss) — the gap
      // lives on the title side here instead, same visual result.
      marginBottom: 8,
    },
    nickname: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textSecondary,
      marginBottom: 2,
    },
    link: {
      ...bodyStyle(isTablet ? 12 : 11),
      color: theme.textMuted,
    },
    // Mirrors wishsite3's .wl-menu-toolbar (controllers/users.scss): position:absolute,
    // top/right 8px — anchored to the card's top-right corner, level with the title, not
    // vertically centered against the whole (taller) card.
    // Fixed, self-centered box instead of relying on the "⋯" glyph's own line-height padding
    // to land it in the right spot — top is measured level with the title text.
    menuToggle: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    menuToggleText: {
      ...strongStyle(20),
      color: theme.text,
    },
    // Anchored at the exact same top/right as menuToggle (not a separate offset below it), so
    // the close button inside — positioned at this box's own top:0/right:0 — lands exactly
    // where the "⋯" toggle was, instead of floating below/beside it.
    menu: {
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
      minWidth: 200,
      paddingTop: 32,
      zIndex: 1000,
    },
    menuCloseButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuCloseText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
    },
    menuItemText: {
      ...strongStyle(isTablet ? 15 : 14),
      color: theme.text,
    },
  });

  return (
    <TouchableOpacity style={[styles.card, menuOpen && styles.cardMenuOpen]} onPress={() => onOpen(item)} activeOpacity={0.8}>
      <Image
        source={item.user_image_url ? { uri: item.user_image_url } : require('../../assets/placeholder.png')}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.wishlist_title || '...'}</Text>
        {!!item.title && (
          <Text style={styles.nickname} numberOfLines={1}>{item.title}</Text>
        )}
        <Text style={styles.link} numberOfLines={1}>{item.link}</Text>
      </View>
      {!menuOpen && (
        <TouchableOpacity style={styles.menuToggle} onPress={(e) => { e.stopPropagation(); onToggleMenu(); }}>
          <Text style={styles.menuToggleText}>⋯</Text>
        </TouchableOpacity>
      )}
      {menuOpen && (
        <AnimatedMenu style={styles.menu}>
          <TouchableOpacity style={styles.menuCloseButton} onPress={(e) => { e.stopPropagation(); onToggleMenu(); }}>
            <Text style={styles.menuCloseText}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onEdit(item); }}>
            <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
            <Text style={styles.menuItemText}>{i18n.t('guestWishlist.editMenuTitle')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onDelete(item); }}>
            <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
            <Text style={[styles.menuItemText, { color: theme.danger }]}>{i18n.t('guestWishlist.deleteMenuTitle')}</Text>
          </TouchableOpacity>
        </AnimatedMenu>
      )}
    </TouchableOpacity>
  );
};

const WishlistScreen = ({ onLogout, authToken, onWishlistSelect, onAccountPress }) => {
  const { theme, isDarkMode } = useTheme();
  const [wishlists, setWishlists] = useState([]);
  const [loadError, setLoadError] = useState(null); // null | 'network'
  const [sortOption, setSortOption] = useState('created_at');
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [guestWishlists, setGuestWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWishlistModal, setNewWishlistModal] = useState(false);
  const [newWishlistTitle, setNewWishlistTitle] = useState('');
  const [newWishlistDescription, setNewWishlistDescription] = useState('');
  const [linkMode, setLinkMode] = useState(false);
  const [adminLink, setAdminLink] = useState('');
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);
  // Single source of truth for the open card menu (own-wishlist or guest-wishlist card),
  // so opening one always closes any other — never more than one context menu at a time.
  const [openCardMenu, setOpenCardMenu] = useState(null); // { type: 'wishlist' | 'guest', id }

  const [guestWishlistModal, setGuestWishlistModal] = useState(false);
  const [editingGuestWishlist, setEditingGuestWishlist] = useState(null);
  const [guestWishlistTitleInput, setGuestWishlistTitleInput] = useState('');
  const [guestWishlistLinkInput, setGuestWishlistLinkInput] = useState('');
  const [savingGuestWishlist, setSavingGuestWishlist] = useState(false);
  const [guestWishlistError, setGuestWishlistError] = useState('');

  useEffect(() => {
    if (authToken) {
      loadWishlists();
    }
  }, [authToken]);

  useEffect(() => {
    AsyncStorage.getItem(SORT_STORAGE_KEY).then((stored) => {
      if (stored && SORT_OPTIONS.includes(stored)) {
        setSortOption(stored);
      }
    });
  }, []);

  const handleSelectSort = (option) => {
    setSortOption(option);
    setShowSortPicker(false);
    AsyncStorage.setItem(SORT_STORAGE_KEY, option);
  };

  const sortedWishlists = useMemo(() => sortWishlists(wishlists, sortOption), [wishlists, sortOption]);

  const loadWishlists = async () => {
    try {
      const response = await api.get('/user');
      setWishlists(response.data.wishlists || []);
      setGuestWishlists(response.data.guest_wishlists || []);
      setUserId(response.data.id);
      setLoadError(null);
    } catch (error) {
      console.log('Error loading wishlists:', error);
      if (isNetworkError(error)) {
        // Keep whatever was loaded before (e.g. a background refresh failing shouldn't wipe an
        // already-visible list) and let the render below show a distinct offline message
        // instead of the "you have no wishsites yet" empty state when there's nothing cached.
        setLoadError('network');
      } else {
        setWishlists([]);
        setGuestWishlists([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const createWishlist = async () => {
    if (!newWishlistTitle.trim()) return;

    setCreating(true);
    try {
      await api.post('/wishlists', {
        title: newWishlistTitle,
        description: newWishlistDescription || '',
        user_id: userId
      });

      await loadWishlists();

      setNewWishlistModal(false);
      setNewWishlistTitle('');
      setNewWishlistDescription('');
      setLinkMode(false);
    } catch (error) {
      console.log('Error creating wishlist:', error);
    } finally {
      setCreating(false);
    }
  };

  const linkWishlist = async () => {
    if (!adminLink.trim()) return;

    setCreating(true);
    try {
      await api.post('/user/link_wishlist', { admin_link: adminLink });

      await loadWishlists();

      setNewWishlistModal(false);
      setAdminLink('');
      setLinkMode(false);
    } catch (error) {
      const errorMessage = error.response?.data?.error || i18n.t('wishlist.linkError');
      Alert.alert(i18n.t('wishlist.error'), errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const deleteWishlist = async (wishlist) => {
    try {
      await api.delete(`/wishlists/${wishlist.admin_key}`);
      setWishlists(prevWishlists => prevWishlists.filter(w => w.admin_key !== wishlist.admin_key));
    } catch (error) {
      console.log('Error deleting wishlist:', error);
    }
  };

  const confirmDelete = (wishlist) => {
    Alert.alert(
      i18n.t('wishlist.deleteTitle'),
      i18n.t('wishlist.deleteMessage', { title: wishlist.title }),
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        {
          text: i18n.t('wishlist.deleteButton'),
          style: 'destructive',
          onPress: () => deleteWishlist(wishlist)
        }
      ]
    );
  };

  const openAddGuestWishlist = () => {
    setEditingGuestWishlist(null);
    setGuestWishlistTitleInput('');
    setGuestWishlistLinkInput('');
    setGuestWishlistError('');
    setGuestWishlistModal(true);
  };

  const openEditGuestWishlist = (gw) => {
    setEditingGuestWishlist(gw);
    setGuestWishlistTitleInput(gw.title || '');
    setGuestWishlistLinkInput(gw.link || '');
    setGuestWishlistError('');
    setGuestWishlistModal(true);
  };

  const saveGuestWishlist = async () => {
    if (!guestWishlistLinkInput.trim()) return;
    setSavingGuestWishlist(true);
    setGuestWishlistError('');
    try {
      const payload = { title: guestWishlistTitleInput, link: guestWishlistLinkInput };
      if (editingGuestWishlist) {
        const { data } = await api.patch(`/guest_wishlists/${editingGuestWishlist.access_key}`, payload);
        setGuestWishlists(prev => prev.map(gw => gw.access_key === editingGuestWishlist.access_key ? data : gw));
      } else {
        const { data } = await api.post('/guest_wishlists', payload);
        setGuestWishlists(prev => [data, ...prev]);
      }
      setGuestWishlistModal(false);
    } catch (error) {
      setGuestWishlistError(error.response?.data?.error || i18n.t('wishlist.error'));
    } finally {
      setSavingGuestWishlist(false);
    }
  };

  const deleteGuestWishlist = async (gw) => {
    try {
      await api.delete(`/guest_wishlists/${gw.access_key}`);
      setGuestWishlists(prev => prev.filter(g => g.access_key !== gw.access_key));
    } catch (error) {
      console.log('Error deleting guest wishlist:', error);
    }
  };

  const confirmDeleteGuestWishlist = (gw) => {
    Alert.alert(
      i18n.t('guestWishlist.deleteMenuTitle'),
      i18n.t('guestWishlist.deleteConfirmText'),
      [
        { text: i18n.t('wishlist.cancel'), style: 'cancel' },
        {
          text: i18n.t('guestWishlist.deleteSubmit'),
          style: 'destructive',
          onPress: () => deleteGuestWishlist(gw)
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    title: {
      ...headingStyle(isTablet ? 28 : 22),
      color: theme.text,
    },
    headerRow: {
      marginTop: isTablet ? 20 : 15,
      marginBottom: 8,
    },
    // Own row below the heading (web wraps the sort control onto its own line here too once
    // it no longer fits next to the title - #user-wishlists-header .container is flex-wrap).
    // Still right-aligned, matching web's margin-left: auto within that row.
    sortRow: {
      alignItems: 'flex-end',
      marginBottom: 15,
    },
    // Web: #wl_sort { border-radius: 0 30px 30px 30px } (controllers/users.scss) - same
    // one-square-corner shape as INPUT_RADIUS, but NOT the same radius value: on web this sits
    // on a native <select> only ~26-30px tall, so the browser clamps that 30px down to roughly
    // half its own height (a subtle curve). Our chip is taller (bigger touch target), so the
    // literal 30 rendered as a much more exaggerated pill - scaled down here to match the same
    // *proportional* rounding instead of the same raw number.
    sortButton: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      borderBottomLeftRadius: 10,
    },
    sortButtonText: {
      ...bodyStyle(isTablet ? 14 : 12),
      color: theme.link,
    },
    sortPickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    sortPickerOptionText: {
      ...bodyStyle(isTablet ? 16 : 14),
    },
    sortPickerCheck: {
      ...strongStyle(isTablet ? 16 : 14),
      color: theme.primary,
    },
    sectionTitle: {
      ...headingStyle(isTablet ? 28 : 22),
      color: theme.text,
      marginTop: isTablet ? 70 : 55,
      marginBottom: 15,
    },
    emptyText: {
      ...bodyStyle(isTablet ? 18 : 16),
      color: theme.textSecondary,
      textAlign: 'center',
      paddingHorizontal: isTablet ? 60 : 40,
      paddingVertical: isTablet ? 50 : 36,
      lineHeight: isTablet ? 26 : 22,
    },
    offlineState: {
      alignItems: 'center',
      marginBottom: isTablet ? 30 : 20,
    },
    offlineRetryButton: {
      marginTop: 16,
      alignSelf: 'center',
    },
    listContainer: {
      paddingHorizontal: isTablet ? 30 : 20,
      paddingBottom: isTablet ? 30 : 20,
    },
    tile: {
      borderRadius: RADIUS.card,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingVertical: 18,
      alignItems: 'center',
      marginBottom: 12,
    },
    // Mirrors wishsite3's li.card.new-wishlist :hover state (controllers/users.scss) — dashed
    // green border + light green fill (--green_l_4/d_4), not solid. Mobile has no hover state,
    // so this "engaged" look is shown statically to draw attention to the CTA.
    tileGreen: {
      borderColor: theme.positive,
      backgroundColor: isDarkMode ? palette.green.d4 : palette.green.l4,
      minHeight: isTablet ? 108 : 96,
      justifyContent: 'center',
    },
    tileTextGreen: {
      ...strongStyle(isTablet ? 15 : 14),
      color: theme.positive,
    },
    // Web's default <a> color is blue (global.scss), matching the .link-color icon filter
    // used on both of these tiles — text and icon are the same blue there, not gray.
    tileText: {
      ...strongStyle(isTablet ? 15 : 14),
      color: theme.link,
    },
    tileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '85%',
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
    modalInstructions: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textSecondary,
      marginBottom: 15,
      lineHeight: isTablet ? 20 : 18,
    },
    tabContainer: {
      flexDirection: 'row',
      marginBottom: 15,
      borderRadius: RADIUS.pill,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    tab: {
      flex: 1,
      padding: isTablet ? 12 : 10,
      backgroundColor: theme.background,
    },
    tabActive: {
      backgroundColor: theme.primary,
    },
    tabText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.text,
      textAlign: 'center',
    },
    tabTextActive: {
      color: 'white',
      fontWeight: '600',
    },
    inputSpacing: {
      marginBottom: 15,
    },
    inputLabel: {
      ...strongStyle(isTablet ? 15 : 13),
      color: theme.text,
      marginBottom: 6,
    },
    modalButtons: {
      marginTop: 20,
    },
    errorText: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.danger,
      marginBottom: 12,
    },
  });

  return (
    <ScreenWrapper showMenu={true} onLogout={onLogout} onLogoPress={() => {}} onAccountPress={onAccountPress} hideBottomBar={true}>
      <View style={styles.container}>
        {loading ? (
          <ScrollView contentContainerStyle={{ paddingTop: isTablet ? 70 : 55 }} showsVerticalScrollIndicator={false}>
            <SkeletonLoader type="wishlistCard" count={4} />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{i18n.t('wishlist.overviewHeader')}</Text>
            </View>
            {wishlists.length > 0 && (
              <View style={styles.sortRow}>
                <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortPicker(true)}>
                  <Text style={styles.sortButtonText}>{i18n.t(SORT_LABEL_KEYS[sortOption])}</Text>
                </TouchableOpacity>
              </View>
            )}
            {loadError === 'network' && wishlists.length === 0 ? (
              <View style={styles.offlineState}>
                <Text style={styles.emptyText}>{i18n.t('wishlist.loadErrorOffline')}</Text>
                <Button
                  style={styles.offlineRetryButton}
                  variant="secondary"
                  onPress={loadWishlists}
                  fontSize={isTablet ? 15 : 13}
                  title={i18n.t('wishlist.retry')}
                />
              </View>
            ) : wishlists.length === 0 ? (
              <Text style={styles.emptyText}>{i18n.t('wishlist.empty')}</Text>
            ) : (
              sortedWishlists.map((item) => (
                <OwnWishlistCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  isDarkMode={isDarkMode}
                  onSelect={onWishlistSelect}
                  onEdit={(wl) => onWishlistSelect(wl, { openEdit: true })}
                  onDelete={confirmDelete}
                  menuOpen={openCardMenu?.type === 'wishlist' && openCardMenu.id === item.id}
                  onToggleMenu={() => setOpenCardMenu(
                    (openCardMenu?.type === 'wishlist' && openCardMenu.id === item.id) ? null : { type: 'wishlist', id: item.id }
                  )}
                />
              ))
            )}

            <TouchableOpacity style={[styles.tile, styles.tileGreen]} onPress={() => setNewWishlistModal(true)}>
              <Text style={styles.tileTextGreen}>+ {i18n.t('wishlist.newWishlistTileText')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tile}
              onPress={() => { setLinkMode(true); setNewWishlistModal(true); }}
            >
              <View style={styles.tileRow}>
                <SvgXml xml={linkIcon(theme.link)} width={16} height={16} />
                <Text style={styles.tileText}>{i18n.t('wishlist.addWishlistButtonText')}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>{i18n.t('wishlist.guestWishlistsHeader')}</Text>

            {guestWishlists.map((item) => (
              <GuestWishlistCard
                key={item.access_key}
                item={item}
                theme={theme}
                isDarkMode={isDarkMode}
                onOpen={(gw) => Linking.openURL(gw.link)}
                onEdit={openEditGuestWishlist}
                onDelete={confirmDeleteGuestWishlist}
                menuOpen={openCardMenu?.type === 'guest' && openCardMenu.id === item.access_key}
                onToggleMenu={() => setOpenCardMenu(
                  (openCardMenu?.type === 'guest' && openCardMenu.id === item.access_key) ? null : { type: 'guest', id: item.access_key }
                )}
              />
            ))}

            <TouchableOpacity style={styles.tile} onPress={openAddGuestWishlist}>
              <View style={styles.tileRow}>
                <SvgXml xml={bookmarkIcon(theme.link)} width={16} height={16} />
                <Text style={styles.tileText}>{i18n.t('wishlist.addGuestWishlistButtonText')}</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}

        <Modal
          animationType="fade"
          transparent={true}
          visible={showSortPicker}
          onRequestClose={() => setShowSortPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowSortPicker(false)}>
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{i18n.t('wishlist.sortLabel')}</Text>
              {SORT_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortPickerOption,
                    { borderBottomColor: theme.border, borderBottomWidth: index === SORT_OPTIONS.length - 1 ? 0 : 1 },
                  ]}
                  onPress={() => handleSelectSort(option)}
                >
                  <Text style={[styles.sortPickerOptionText, { color: option === sortOption ? theme.primary : theme.text }]}>
                    {i18n.t(SORT_LABEL_KEYS[option])}
                  </Text>
                  {option === sortOption && <Text style={styles.sortPickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={newWishlistModal}
          onRequestClose={() => {
            setNewWishlistModal(false);
            setLinkMode(false);
          }}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setNewWishlistModal(false);
                  setNewWishlistTitle('');
                  setNewWishlistDescription('');
                  setAdminLink('');
                  setLinkMode(false);
                }}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{i18n.t('wishlist.modalTitle')}</Text>

              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, !linkMode && styles.tabActive]}
                  onPress={() => setLinkMode(false)}
                >
                  <Text style={[styles.tabText, !linkMode && styles.tabTextActive]}>
                    {i18n.t('wishlist.tabCreate')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, linkMode && styles.tabActive]}
                  onPress={() => setLinkMode(true)}
                >
                  <Text style={[styles.tabText, linkMode && styles.tabTextActive]}>
                    {i18n.t('wishlist.tabLink')}
                  </Text>
                </TouchableOpacity>
              </View>

              {linkMode ? (
                <View style={styles.inputSpacing}>
                  <Text style={styles.inputLabel}>{i18n.t('wishlist.adminLinkPlaceholder')}</Text>
                  <TextField
                    placeholder={i18n.t('wishlist.adminLinkPlaceholder')}
                    value={adminLink}
                    onChangeText={setAdminLink}
                    autoFocus={true}
                    autoCapitalize="none"
                  />
                </View>
              ) : (
                <>
                  <View style={styles.inputSpacing}>
                    <Text style={styles.inputLabel}>{i18n.t('wishlist.titlePlaceholder')}</Text>
                    <TextField
                      placeholder={i18n.t('wishlist.titlePlaceholder')}
                      value={newWishlistTitle}
                      onChangeText={setNewWishlistTitle}
                      autoFocus={true}
                    />
                  </View>
                  <View style={styles.inputSpacing}>
                    <Text style={styles.inputLabel}>{i18n.t('wishlist.descriptionPlaceholder')}</Text>
                    <TextField
                      placeholder={i18n.t('wishlist.descriptionPlaceholder')}
                      value={newWishlistDescription}
                      onChangeText={setNewWishlistDescription}
                      multiline
                    />
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <Button
                  onPress={linkMode ? linkWishlist : createWishlist}
                  disabled={creating || (linkMode ? !adminLink.trim() : !newWishlistTitle.trim())}
                  loading={creating}
                  fontSize={isTablet ? 18 : 16}
                  title={i18n.t(linkMode ? 'wishlist.linkWishlistSubmit' : 'wishlist.createWishlistSubmit')}
                />
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={guestWishlistModal}
          onRequestClose={() => setGuestWishlistModal(false)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setGuestWishlistModal(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingGuestWishlist ? i18n.t('guestWishlist.editHeader') : i18n.t('guestWishlist.formHeader')}
              </Text>

              {!editingGuestWishlist && (
                <Text style={styles.modalInstructions}>{i18n.t('guestWishlist.instructions')}</Text>
              )}

              {guestWishlistError ? <Text style={styles.errorText}>{guestWishlistError}</Text> : null}

              <View style={styles.inputSpacing}>
                <Text style={styles.inputLabel}>{i18n.t('guestWishlist.titleLabel')}</Text>
                <TextField
                  placeholder={i18n.t('guestWishlist.titlePlaceholder')}
                  value={guestWishlistTitleInput}
                  onChangeText={setGuestWishlistTitleInput}
                />
              </View>
              <View style={styles.inputSpacing}>
                <Text style={styles.inputLabel}>{i18n.t('guestWishlist.linkLabel')}</Text>
                <TextField
                  placeholder={i18n.t('guestWishlist.linkPlaceholder')}
                  value={guestWishlistLinkInput}
                  onChangeText={setGuestWishlistLinkInput}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  onPress={saveGuestWishlist}
                  disabled={savingGuestWishlist || !guestWishlistLinkInput.trim()}
                  loading={savingGuestWishlist}
                  fontSize={isTablet ? 18 : 16}
                  title={i18n.t('guestWishlist.submit')}
                />
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

export default WishlistScreen;
