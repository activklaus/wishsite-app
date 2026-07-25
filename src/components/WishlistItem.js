import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

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
  const optionsButtonRef = useRef(null);

  return (
    <View style={[styles.itemCard, isActive && styles.itemCardActive]}>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          ref={optionsButtonRef}
          style={styles.optionsButton}
          onPress={(e) => {
            e.stopPropagation();
            if (optionsVisible === item.id) {
              setOptionsVisible(null);
            } else {
              optionsButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                onOptionsPress(item.id, pageX, pageY + height);
              });
            }
          }}
        >
          <Text style={optionsVisible === item.id ? styles.optionsCloseText : styles.optionsText}>{optionsVisible === item.id ? '×' : '⋯'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => onItemPress(item)}
        onLongPress={onDrag}
        delayLongPress={200}
      >
        <Image
          source={item.image_url ? { uri: item.image_url } : require('../../assets/placeholder.png')}
          style={styles.itemImage}
          resizeMode="cover"
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={2} ellipsizeMode="tail">{item.description}</Text>
          )}
          <View style={styles.itemDetails}>
            <Text style={styles.itemPrice}>{item.price}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default WishlistItem;