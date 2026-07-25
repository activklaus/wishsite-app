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

const ShareFormScreen = ({ route, navigation }) => {
  const { sharedUrl, wishlistId } = route.params;
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wishlists, setWishlists] = useState([]);
  const [loadingWishlists, setLoadingWishlists] = useState(!wishlistId);
  const [selectedAdminKey, setSelectedAdminKey] = useState(wishlistId || null);
  const [imageUrl, setImageUrl] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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

    if (!wishlistId) {
      loadWishlists();
    }
  }, [sharedUrl]);

  const loadWishlists = async () => {
    try {
      const { data } = await api.get('/user');
      setWishlists(data.wishlists || []);
    } catch (error) {
      // Leave the picker empty; the user can still cancel out.
    } finally {
      setLoadingWishlists(false);
    }
  };

  const fetchItemData = async (url) => {
    try {
      const { data } = await api.post('/search', { q: url });
      const product = data.product || {};
      setFormData(prev => ({
        ...prev,
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        link: url,
      }));
      setImageUrl(product.image_url || null);
    } catch (error) {
      // Leave the form blank; the user can fill it in manually.
    } finally {
      setLoading(false);
    }
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
        remote_image_url: imageUrl,
      };

      await api.post(`/wishlists/${selectedAdminKey}/items`, itemData);
      navigation.goBack();
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
        {!wishlistId && (
          <View style={[styles.form, cardStyle(theme, isDarkMode), { marginBottom: 12 }]}>
            <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>
              {i18n.t('wishlist.shareFormSelectWishlist')} *
            </Text>
            {loadingWishlists ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 8 }} />
            ) : wishlists.length === 0 ? (
              <Text style={{ color: theme.textSecondary, marginTop: 8 }}>
                {i18n.t('wishlist.shareFormNoWishlists')}
              </Text>
            ) : (
              wishlists.map((wl) => {
                const selected = wl.admin_key === selectedAdminKey;
                return (
                  <TouchableOpacity
                    key={wl.admin_key}
                    style={[
                      styles.wishlistOption,
                      { borderColor: theme.border },
                      selected && { borderColor: theme.primary, backgroundColor: isDarkMode ? theme.background : '#F5F0FF' }
                    ]}
                    onPress={() => setSelectedAdminKey(wl.admin_key)}
                  >
                    <Text style={[styles.wishlistOptionText, { color: theme.text }]} numberOfLines={1}>
                      {wl.title}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View style={[styles.form, cardStyle(theme, isDarkMode)]}>
          <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>
            {i18n.t('wishlist.titlePlaceholder')} *
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
          title={i18n.t('wishlist.save')}
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
  wishlistOption: {
    borderWidth: 1,
    borderRadius: RADIUS.small,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  wishlistOptionText: {
    fontSize: 15,
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
