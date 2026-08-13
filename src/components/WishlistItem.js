import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
// react-native-gesture-handler's own TouchableOpacity, not react-native's - this row's long-press
// (onDrag below) needs to compete for the touch arena against WishlistDetailScreen's screen-wide
// swipeBackGesture (a Gesture.Pan()) and DraggableFlatList's own internal reorder Gesture.Pan().
// A plain RN Touchable isn't part of that arena at all, so on Android its long-press can get
// starved by the ancestor Pan gesture's native touch interception before it ever fires.
// Only used for the row itself, not the options button below - its onPress callback doesn't
// receive a full RN SyntheticEvent (no e.stopPropagation()/e.nativeEvent.pageX,Y), which that
// button relies on.
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';
import { lockIcon, hiddenIcon, dragHandleIcon } from '../styles/icons';

// Matches the .item-image-frame img max-width/max-height breakpoints (lists_and_items.scss) -
// the web never upscales a wish image past its natural size, it only caps it at this box size.
const isTablet = Dimensions.get('window').width >= 768;
const MAX_ITEM_IMAGE_SIZE = isTablet ? 140 : 100;

const WishlistItem = ({
  item,
  index,
  items,
  onEdit,
  onDelete,
  onDrag,
  isActive,
  onItemPress,
  optionsVisible,
  setOptionsVisible,
  onOptionsPress,
  styles
}) => {
  // Natural size capped at MAX_ITEM_IMAGE_SIZE, never upscaled - null (unknown yet, or no
  // image_url) falls back to filling the frame like before, matching Image.getSize's own
  // (network round-trip) latency without a layout flash.
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
        const scale = Math.min(1, MAX_ITEM_IMAGE_SIZE / naturalWidth, MAX_ITEM_IMAGE_SIZE / naturalHeight);
        setImageSize({
          width: Math.round(naturalWidth * scale),
          height: Math.round(naturalHeight * scale),
        });
      },
      () => { if (!cancelled) setImageSize(null); }
    );
    return () => { cancelled = true; };
  }, [item.image_url]);

  return (
    <View style={[styles.itemCard, item.hidden && styles.itemCardHidden, isActive && styles.itemCardActive]}>
      <View style={styles.optionsContainer}>
        {optionsVisible !== item.id && !isActive && (
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={(e) => {
              e.stopPropagation();
              // pageX/pageY is the touch's true screen position — reliable regardless of any
              // Reanimated-driven transform on this DraggableFlatList row. Treated as the
              // button's approximate center (see optionsOverlay in WishlistDetailScreen).
              const { pageX, pageY } = e.nativeEvent;
              onOptionsPress(item.id, pageX, pageY);
            }}
          >
            <Text style={styles.optionsText}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>

      <GHTouchableOpacity
        style={styles.itemContent}
        onPress={() => onItemPress(item)}
        onLongPress={onDrag}
        delayLongPress={200}
      >
        <View style={[styles.itemImageWrapper, styles.itemImageWrapperCentered]}>
          <Image
            source={item.image_url ? { uri: item.image_url } : require('../../assets/placeholder.png')}
            style={item.image_url && imageSize ? imageSize : styles.itemImage}
            resizeMode="contain"
          />
          {item.hidden && (
            <View style={styles.hiddenImageOverlay}>
              <SvgXml xml={hiddenIcon('#FFFFFF')} width={28} height={28} />
            </View>
          )}
          {!item.allow_reservation && (
            <View style={styles.noReservationBadge}>
              <SvgXml xml={lockIcon('#FFFFFF')} width={14} height={14} />
            </View>
          )}
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemNameRow}>
            {item.quantity > 1 && (
              <View style={styles.quantityBox}>
                <Text style={styles.quantityBoxText}>{item.quantity}x</Text>
              </View>
            )}
            <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
          </View>
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={2} ellipsizeMode="tail">{item.description}</Text>
          )}
          <View style={styles.itemDetails}>
            <Text style={styles.itemPrice}>{item.price}</Text>
          </View>
          {/* Mirrors .item-links-inline (modules/lists_and_items.scss): favicon (via the
              same icons.duckduckgo.com service wishsite3 uses) + link text + "+N" for extra
              links, all below the price. */}
          {item.links && item.links.length > 0 && (
            <View style={styles.itemLinkRow}>
              {item.links[0].favicon_domain && (
                <Image
                  source={{ uri: `https://icons.duckduckgo.com/ip3/${item.links[0].favicon_domain}.ico` }}
                  style={styles.itemLinkFavicon}
                />
              )}
              {/* display_name (link.full_link_display, wishsite3) is already truncated
                  server-side with a trailing "..." - ellipsizeMode="tail" here keeps any
                  further RN-side truncation on that same end instead of also cutting into
                  the middle, which produced two separate ellipses on longer links. */}
              <Text style={styles.itemLinkText} numberOfLines={1} ellipsizeMode="tail">
                {item.links[0].display_name || item.links[0].url}
              </Text>
              {item.links.length > 1 && (
                <Text style={styles.itemLinkExtra}>+{item.links.length - 1}</Text>
              )}
            </View>
          )}
        </View>
      </GHTouchableOpacity>

      {/* Mirrors #items.sortable-mode li.item .drag-handle (controllers/wishlist.scss) — a
          darkened, blurred-feeling overlay with a grab icon, shown for as long as this exact
          item is the one being dragged, so it's unmistakable a reorder is in progress instead
          of relying on the subtle opacity/shadow bump alone. */}
      {isActive && (
        <View style={styles.dragActiveOverlay} pointerEvents="none">
          <SvgXml xml={dragHandleIcon('#FFFFFF')} width={18} height={24} />
        </View>
      )}
    </View>
  );
};

export default WishlistItem;