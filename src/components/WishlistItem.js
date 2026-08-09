import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { lockIcon, hiddenIcon, dragHandleIcon } from '../styles/icons';

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

      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => onItemPress(item)}
        onLongPress={onDrag}
        delayLongPress={200}
      >
        <View style={styles.itemImageWrapper}>
          <Image
            source={item.image_url ? { uri: item.image_url } : require('../../assets/placeholder.png')}
            style={styles.itemImage}
            resizeMode="cover"
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
              <Text style={styles.itemLinkText} numberOfLines={1} ellipsizeMode="middle">
                {item.links[0].display_name || item.links[0].url}
              </Text>
              {item.links.length > 1 && (
                <Text style={styles.itemLinkExtra}>+{item.links.length - 1}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

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