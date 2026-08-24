import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle, buttonStyle } from '../styles/fonts';
import i18n from '../i18n';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// The backend returns images in two different shapes depending on source: scrape_product_data's
// generic (non-Amazon) path and images_controller#load_images both return {uri: "..."} objects
// (ApplicationController#parse_image_urls / #build_array_of_images), while the Amazon-only
// single-image fallback (product.image_url) is a plain string - callers that save the selected
// image (not just render it) need the raw URL string regardless of which shape it came in as.
export const getImageUri = (item) => (typeof item === 'string' ? item : item?.uri) || null;

// Mirrors wishsite3's images/load_images.js.erb: a scraped URL either yields a strip of
// candidate images to pick from, or (else-branch) no_image.png plus a hint that the user can
// still add one manually. Shared by WishlistDetailScreen's direct-add-by-URL form and
// ShareFormScreen (share-sheet add) - both drive the exact same /search scrape and used to
// duplicate this block.
const ProductImageCarousel = ({ images, imagesChecked, selectedIndex, onSelectIndex }) => {
  const { theme } = useTheme();

  if (images && images.length > 0) {
    return (
      <View style={styles.imageCarousel}>
        <Text style={[styles.carouselTitle, { color: theme.text }]}>{i18n.t('wishlist.selectImages')}</Text>
        <FlatList
          horizontal
          data={images}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => onSelectIndex(index)}
              style={[
                styles.carouselImageContainer,
                index === selectedIndex && [styles.selectedImageContainer, { borderColor: theme.primary }]
              ]}
            >
              <View style={styles.carouselImage}>
                <View style={[styles.imageFallback, { backgroundColor: theme.text }]}>
                  <Text style={[styles.fallbackText, { color: theme.text }]}>📷</Text>
                </View>
                <Image
                  source={typeof item === 'string' ? { uri: item } : item}
                  style={[styles.carouselImage, { position: 'absolute', zIndex: 1 }]}
                  resizeMode="contain"
                />
              </View>
              {index === selectedIndex && (
                <View style={[styles.selectedOverlay, { backgroundColor: theme.primary }]}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        />
      </View>
    );
  }

  if (imagesChecked) {
    return (
      <View style={styles.noImagesFound}>
        <Image source={require('../../assets/no_image.png')} style={styles.noImagesFoundImage} resizeMode="contain" />
        <Text style={[styles.noImagesFoundText, { color: theme.textMuted }]}>{i18n.t('wishlist.noImagesFoundNotice')}</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
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
    textAlign: 'center',
  },
  carouselTitle: {
    ...headingStyle(isTablet ? 18 : 16),
    marginBottom: 10,
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
    opacity: 0.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    ...bodyStyle(isTablet ? 28 : 24),
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
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
});

export default ProductImageCarousel;
