import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../i18n';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle } from '../styles/fonts';
import { BANNER_HEIGHT, AVATAR_SIZE } from '../styles/shared';
import ImageCropper from '../components/ImageCropper';

const { width } = Dimensions.get('window');

// Mirrors wishsite3's background_image/user_image "update with crop_x/y/w/h/ratio" endpoints
// (app/controllers/api/v1/background_images_controller.rb, app/controllers/api/v1/user_images_controller.rb).
const ImageCropScreen = ({ mode, wishlistId, imageUri, initialCrop, onCancel, onSaved }) => {
  const { theme } = useTheme();
  // Rendered inside a <Modal> (separate native presentation), where SafeAreaView's automatic
  // inset padding is unreliable — read insets explicitly and pad the header ourselves instead.
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const cropperRef = useRef(null);
  const isAvatar = mode === 'avatar';

  const frameWidth = isAvatar ? AVATAR_SIZE : width;
  const frameHeight = isAvatar ? AVATAR_SIZE : BANNER_HEIGHT;

  const handleSave = async () => {
    const rect = cropperRef.current?.getCropRect();
    if (!rect) return;

    setSaving(true);
    try {
      const field = isAvatar ? 'user_image' : 'background_image';
      const endpoint = isAvatar ? `/wishlists/${wishlistId}/user_image` : `/wishlists/${wishlistId}/background_image`;
      const { data } = await api.patch(endpoint, {
        [`${field}_crop_x`]: rect.x,
        [`${field}_crop_y`]: rect.y,
        [`${field}_crop_w`]: rect.w,
        [`${field}_crop_h`]: rect.h,
        [`${field}_crop_ratio`]: rect.ratio,
      });
      // Use the resolved (cropped) URL for display, not the unversioned base image.
      onSaved(isAvatar ? data.resolved_user_image_url : data.resolved_background_image_url);
    } catch (error) {
      Alert.alert(i18n.t('wishlist.error'), i18n.t('wishlist.cropSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: insets.top + 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerButton: {
      minWidth: 60,
      paddingVertical: 6,
    },
    cancelText: {
      ...bodyStyle(16),
      color: theme.text,
    },
    saveText: {
      ...bodyStyle(16),
      color: theme.primary,
      textAlign: 'right',
    },
    title: {
      ...headingStyle(16),
      color: theme.text,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hint: {
      ...bodyStyle(13),
      color: theme.textMuted,
      textAlign: 'center',
      paddingHorizontal: 30,
      paddingVertical: 20,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>{i18n.t('wishlist.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isAvatar ? i18n.t('wishlist.cropAvatarTitle') : i18n.t('wishlist.cropBackgroundTitle')}
        </Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.primary} /> : <Text style={styles.saveText}>{i18n.t('wishlist.save')}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <ImageCropper
          ref={cropperRef}
          imageUri={imageUri}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          shape={isAvatar ? 'circle' : 'rect'}
          initialCrop={initialCrop}
        />
      </View>

      <Text style={[styles.hint, { paddingBottom: 20 + insets.bottom }]}>{i18n.t('wishlist.cropHint')}</Text>
    </View>
  );
};

export default ImageCropScreen;
