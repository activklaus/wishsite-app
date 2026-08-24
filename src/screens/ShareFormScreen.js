import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { headingStyle } from '../styles/fonts';
import { cardStyle, RADIUS } from '../styles/shared';
import api from '../services/api';
import i18n from '../i18n';
import Button from '../components/Button';
import TextField from '../components/TextField';
import ProductImageCarousel, { getImageUri } from '../components/ProductImageCarousel';

const ShareFormScreen = ({ route, navigation }) => {
  const { sharedUrl, sharedTitle, sharedDescription, wishlistId } = route.params;
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wishlists, setWishlists] = useState([]);
  const [loadingWishlists, setLoadingWishlists] = useState(true);
  const [selectedAdminKey, setSelectedAdminKey] = useState(wishlistId || null);
  const [images, setImages] = useState([]);
  const [imagesChecked, setImagesChecked] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    // Seeded from the share sheet's own page title/description (see useShareHandler.js) so
    // there's already a sensible suggestion even before/if the /search scrape below finds
    // something more specific. Price isn't seeded this way - see useShareHandler.js for why.
    title: sharedTitle || '',
    description: sharedDescription || '',
    price: '',
    link: sharedUrl || '',
    quantity: '1'
  });

  useEffect(() => {
    if (sharedUrl) {
      fetchItemData(sharedUrl);
    } else {
      setLoading(false);
    }

    loadWishlists();
  }, [sharedUrl]);

  const loadWishlists = async () => {
    try {
      const { data } = await api.get('/user');
      const loaded = data.wishlists || [];
      setWishlists(loaded);
      // Nothing to actually decide with just one wishsite - skip the picker and use it
      // regardless of what was (or wasn't) already open when the share sheet was invoked.
      if (loaded.length === 1) {
        setSelectedAdminKey(loaded[0].admin_key);
      }
    } catch (error) {
      // Leave the picker empty; the user can still cancel out.
    } finally {
      setLoadingWishlists(false);
    }
  };

  const fetchItemData = async (url) => {
    // Mirrors WishlistDetailScreen's handleSearchProduct (the in-app "add wish by URL" search)
    // exactly, including on failure: rather than dead-ending on a stuck screen, fall through to
    // an (empty) product so the form still opens, pre-filled with whatever the share sheet
    // already gave us (title/description), letting the user fill in the rest by hand.
    let product = {};
    try {
      // A URL query goes through scrape_product_data server-side (full page fetch + AI
      // extraction for non-Amazon domains) - this can legitimately take 30-40s, far past the
      // axios default of 10s, so it needs its own generous timeout here.
      const { data } = await api.post('/search', { q: url }, { timeout: 60000 });
      product = data.product || {};
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.shareGenericError'));
    }

    const imagesArray = product.images || [];
    if (product.image_url && imagesArray.length === 0) {
      imagesArray.push(product.image_url);
    }
    setFormData(prev => ({
      ...prev,
      title: product.title || sharedTitle || '',
      description: product.description || sharedDescription || '',
      price: product.price ? product.price.replace(/[^\d.,]/g, '').replace(',', '.') : '',
      link: url,
    }));
    setImages(imagesArray);
    setImagesChecked(true);
    setSelectedImageIndex(0);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert(i18n.t('login.error'), i18n.t('wishlist.shareFormError'));
      return;
    }

    if (!selectedAdminKey) {
      Alert.alert(i18n.t('login.error'), i18n.t('wishlist.shareFormSelectWishlistError'));
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 1,
        allow_reservation: true,
        hidden: false,
        links: formData.link ? [{ url: formData.link }] : [],
        remote_image_url: getImageUri(images[selectedImageIndex]),
      };

      const { data } = await api.post(`/wishlists/${selectedAdminKey}/items`, itemData);
      // Tells App.tsx to land on the wishsite the item was just added to, scrolled to it -
      // the plain no-arg goBack() (header back button above) just returns to whatever was
      // showing before instead.
      navigation.goBack(selectedAdminKey, data.id);
    } catch (error) {
      Alert.alert(i18n.t('login.error'), i18n.t('wishlist.shareFormSaveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {i18n.t('wishlist.searching')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: theme.primary }]}>
            {i18n.t('wishlist.backButton')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, headingStyle(18), { color: theme.text }]}>
          {i18n.t('wishlist.shareFormTitle')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Hidden while wishlists are still loading (avoids a spinner flash for the common case
            below) and once loaded there's exactly one wishsite to use. Otherwise always shown -
            even when a specific wishsite was already open when the share sheet was invoked -
            so the target is never just an invisible, possibly-stale bit of navigation state. */}
        {!loadingWishlists && wishlists.length !== 1 && (
          <View style={[styles.form, cardStyle(theme, isDarkMode), { marginBottom: 12 }]}>
            <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>
              {i18n.t('wishlist.shareFormSelectWishlist')}
            </Text>
            {wishlists.length === 0 ? (
              <Text style={{ color: theme.textSecondary, marginTop: 8 }}>
                {i18n.t('wishlist.shareFormNoWishlists')}
              </Text>
            ) : (
              <View style={styles.wishlistChipRow}>
                {wishlists.map((wl) => {
                  const selected = wl.admin_key === selectedAdminKey;
                  return (
                    <TouchableOpacity
                      key={wl.admin_key}
                      style={[
                        styles.wishlistChip,
                        { borderColor: theme.border, backgroundColor: theme.surface },
                        selected && { borderColor: theme.primary, backgroundColor: theme.primary }
                      ]}
                      onPress={() => setSelectedAdminKey(wl.admin_key)}
                    >
                      <Text
                        style={[styles.wishlistChipText, { color: selected ? '#FFFFFF' : theme.text }]}
                        numberOfLines={1}
                      >
                        {wl.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={[styles.form, cardStyle(theme, isDarkMode)]}>
          <ProductImageCarousel
            images={images}
            imagesChecked={imagesChecked}
            selectedIndex={selectedImageIndex}
            onSelectIndex={setSelectedImageIndex}
          />

          <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>
            {i18n.t('wishlist.titlePlaceholder')}
          </Text>
          <TextField
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder={i18n.t('wishlist.titlePlaceholder')}
          />

          <Text style={[styles.label, { color: theme.text }]}>
            {i18n.t('wishlist.descriptionPlaceholder')}
          </Text>
          <TextField
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder={i18n.t('wishlist.descriptionPlaceholder')}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, { color: theme.text }]}>
            {i18n.t('wishlist.pricePlaceholder')}
          </Text>
          <TextField
            value={formData.price}
            onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
            placeholder={i18n.t('wishlist.pricePlaceholder')}
          />

          <Text style={[styles.label, { color: theme.text }]}>
            {i18n.t('wishlist.linkPlaceholder')}
          </Text>
          <TextField
            value={formData.link}
            onChangeText={(text) => setFormData(prev => ({ ...prev, link: text }))}
            placeholder={i18n.t('wishlist.linkPlaceholder')}
          />

          <Text style={[styles.label, { color: theme.text }]}>
            {i18n.t('wishlist.quantity')}
          </Text>
          <TextField
            value={formData.quantity}
            onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
            placeholder="1"
            keyboardType="numeric"
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          variant="positive"
          title={i18n.t('wishlist.addWishSubmit')}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  wishlistChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  wishlistChip: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  wishlistChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default ShareFormScreen;
