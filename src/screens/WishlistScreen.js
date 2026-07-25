import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, Image, ScrollView, Linking } from 'react-native';
import { SvgXml } from 'react-native-svg';
import api from '../services/api';
import i18n from '../i18n';
import { headingStyle, bodyStyle, strongStyle } from '../styles/fonts';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, cardShadow } from '../styles/shared';
import { palette } from '../styles/colors';
import Button from '../components/Button';
import TextField from '../components/TextField';
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

// Own-wishlist card, mirrors wishsite3 users#show "#user-wishlists" cards
// (app/views/users/show.html.erb + helpers#wishlist_card_content).
const OwnWishlistCard = ({ item, theme, isDarkMode, onSelect, onEdit, onDelete, menuOpen, onToggleMenu }) => {
  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: RADIUS.card,
      padding: isTablet ? 16 : 12,
      marginBottom: 12,
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
      marginBottom: 3,
    },
    meta: {
      ...bodyStyle(isTablet ? 14 : 13),
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
    menu: {
      position: 'absolute',
      top: 40,
      right: 8,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.small * 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      minWidth: 200,
      zIndex: 1000,
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
      <TouchableOpacity style={styles.menuToggle} onPress={(e) => { e.stopPropagation(); onToggleMenu(); }}>
        <Text style={styles.menuToggleText}>⋯</Text>
      </TouchableOpacity>
      {menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onEdit(item); }}>
            <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
            <Text style={styles.menuItemText}>{i18n.t('wishlist.editWishlistLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onDelete(item); }}>
            <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
            <Text style={[styles.menuItemText, { color: theme.danger }]}>{i18n.t('wishlist.deleteWishlistLinkTitle')}</Text>
          </TouchableOpacity>
        </View>
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
      padding: isTablet ? 16 : 12,
      marginBottom: 12,
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
      marginBottom: 3,
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
    menu: {
      position: 'absolute',
      top: 40,
      right: 8,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.small * 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      minWidth: 200,
      zIndex: 1000,
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
      <TouchableOpacity style={styles.menuToggle} onPress={(e) => { e.stopPropagation(); onToggleMenu(); }}>
        <Text style={styles.menuToggleText}>⋯</Text>
      </TouchableOpacity>
      {menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onEdit(item); }}>
            <SvgXml xml={editIcon(theme.text)} width={16} height={16} />
            <Text style={styles.menuItemText}>{i18n.t('guestWishlist.editMenuTitle')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={(e) => { e.stopPropagation(); onToggleMenu(); onDelete(item); }}>
            <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
            <Text style={[styles.menuItemText, { color: theme.danger }]}>{i18n.t('guestWishlist.deleteMenuTitle')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const WishlistScreen = ({ onLogout, authToken, onWishlistSelect, onAccountPress }) => {
  const { theme, isDarkMode } = useTheme();
  const [wishlists, setWishlists] = useState([]);
  const [guestWishlists, setGuestWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWishlistModal, setNewWishlistModal] = useState(false);
  const [newWishlistTitle, setNewWishlistTitle] = useState('');
  const [newWishlistDescription, setNewWishlistDescription] = useState('');
  const [linkMode, setLinkMode] = useState(false);
  const [adminLink, setAdminLink] = useState('');
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);
  const [openWishlistMenu, setOpenWishlistMenu] = useState(null);
  const [openGuestMenu, setOpenGuestMenu] = useState(null);

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

  const loadWishlists = async () => {
    try {
      const response = await api.get('/user');
      setWishlists(response.data.wishlists || []);
      setGuestWishlists(response.data.guest_wishlists || []);
      setUserId(response.data.id);
    } catch (error) {
      console.log('Error loading wishlists:', error);
      setWishlists([]);
      setGuestWishlists([]);
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
      marginTop: isTablet ? 20 : 15,
      marginBottom: 15,
    },
    sectionTitle: {
      ...headingStyle(isTablet ? 28 : 22),
      color: theme.text,
      marginTop: isTablet ? 70 : 55,
      marginBottom: 15,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...bodyStyle(isTablet ? 18 : 16),
      color: theme.textSecondary,
    },
    emptyText: {
      ...bodyStyle(isTablet ? 18 : 16),
      color: theme.textSecondary,
      textAlign: 'center',
      paddingHorizontal: isTablet ? 60 : 40,
      lineHeight: isTablet ? 26 : 22,
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
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>{i18n.t('wishlist.loading')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{i18n.t('wishlist.overviewHeader')}</Text>
            {wishlists.length === 0 ? (
              <Text style={styles.emptyText}>{i18n.t('wishlist.empty')}</Text>
            ) : (
              wishlists.map((item) => (
                <OwnWishlistCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  isDarkMode={isDarkMode}
                  onSelect={onWishlistSelect}
                  onEdit={(wl) => onWishlistSelect(wl, { openEdit: true })}
                  onDelete={confirmDelete}
                  menuOpen={openWishlistMenu === item.id}
                  onToggleMenu={() => setOpenWishlistMenu(openWishlistMenu === item.id ? null : item.id)}
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
                menuOpen={openGuestMenu === item.access_key}
                onToggleMenu={() => setOpenGuestMenu(openGuestMenu === item.access_key ? null : item.access_key)}
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
          animationType="slide"
          transparent={true}
          visible={newWishlistModal}
          onRequestClose={() => {
            setNewWishlistModal(false);
            setLinkMode(false);
          }}
        >
          <View style={styles.modalOverlay}>
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
                  title={i18n.t('wishlist.save')}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={guestWishlistModal}
          onRequestClose={() => setGuestWishlistModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setGuestWishlistModal(false)}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>

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
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

export default WishlistScreen;
