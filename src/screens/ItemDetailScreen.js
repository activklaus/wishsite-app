import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ScrollView, Linking, Animated, PanResponder, Alert } from 'react-native';
import i18n from '../i18n';
import { headingStyle, bodyStyle } from '../styles/fonts';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import { RADIUS } from '../styles/shared';
import Button from '../components/Button';
import CommentsGiftSharesScreen from './CommentsGiftSharesScreen';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ItemDetailScreen = ({ item, onBack, onEdit, wishlistAdminKey, itemsSharable }) => {
  const { theme } = useTheme();
  const [showCommentsGiftShares, setShowCommentsGiftShares] = useState(false);
  const slideAnim = useRef(new Animated.Value(width)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > width * 0.3) {
          handleBack();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleShowCommentsGiftShares = () => {
    Alert.alert(
      i18n.t('wishlist.giftShares.confirmEditHeader'),
      i18n.t('wishlist.giftShares.confirmEditGiftShares'),
      [
        { text: i18n.t('wishlist.giftShares.cancel'), style: 'cancel' },
        { text: i18n.t('wishlist.giftShares.confirm'), onPress: () => setShowCommentsGiftShares(true) }
      ]
    );
  };

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onBack();
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: isTablet ? 30 : 20,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      marginRight: isTablet ? 20 : 15,
    },
    backButtonText: {
      ...bodyStyle(isTablet ? 18 : 16),
      color: theme.link,
    },
    title: {
      ...headingStyle(isTablet ? 24 : 20),
      color: theme.text,
      flex: 1,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: isTablet ? 30 : 20,
    },
    itemImage: {
      width: '100%',
      height: isTablet ? 250 : 200,
      borderRadius: RADIUS.card,
      marginBottom: isTablet ? 20 : 15,
    },
    itemTitle: {
      ...headingStyle(isTablet ? 24 : 20),
      color: theme.text,
      marginBottom: isTablet ? 10 : 8,
    },
    itemDescription: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.textSecondary,
      marginBottom: isTablet ? 15 : 12,
      lineHeight: isTablet ? 22 : 20,
    },
    itemPrice: {
      ...headingStyle(isTablet ? 20 : 16),
      color: theme.positive,
      marginBottom: isTablet ? 20 : 15,
    },
    linksContainer: {
      marginTop: isTablet ? 20 : 15,
    },
    linksTitle: {
      ...headingStyle(isTablet ? 18 : 16),
      color: theme.text,
      marginBottom: isTablet ? 15 : 12,
    },
    linkText: {
      ...bodyStyle(isTablet ? 16 : 14),
      color: theme.link,
      textDecorationLine: 'underline',
      marginBottom: isTablet ? 12 : 10,
      paddingVertical: 8,
    },
    editButton: {
      marginTop: isTablet ? 30 : 20,
    },
    giftSharesButton: {
      marginTop: isTablet ? 15 : 10,
    },
  });

  if (showCommentsGiftShares) {
    return (
      <ScreenWrapper hideBottomBar={true}>
        <CommentsGiftSharesScreen
          wishlistAdminKey={wishlistAdminKey}
          item={item}
          onBack={() => setShowCommentsGiftShares(false)}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper hideBottomBar={true}>
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]} {...panResponder.panHandlers}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← {i18n.t('wishlist.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('wishlist.itemDetails')}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        )}

        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}
        <Text style={styles.itemPrice}>{item.price}</Text>

        {item.links && item.links.length > 0 && (
          <View style={styles.linksContainer}>
            <Text style={styles.linksTitle}>{i18n.t('wishlist.allLinks')}</Text>
            {item.links.map((link, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => Linking.openURL(link)}
              >
                <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                  {link}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Button
          style={styles.editButton}
          onPress={() => onEdit(item)}
          fontSize={isTablet ? 16 : 14}
          title={i18n.t('wishlist.editItem')}
        />
        {!!itemsSharable && (
          <Button
            style={styles.giftSharesButton}
            variant="secondary"
            onPress={handleShowCommentsGiftShares}
            fontSize={isTablet ? 16 : 14}
            title={i18n.t('wishlist.giftShares.showLink')}
          />
        )}
        </ScrollView>
      </Animated.View>
    </ScreenWrapper>
  );
};

export default ItemDetailScreen;
