import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../i18n';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle, strongStyle } from '../styles/fonts';
import { RADIUS, cardStyle } from '../styles/shared';
import { SvgXml } from 'react-native-svg';
import { deleteIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Admin-only read view mirroring wishsite3's gift_shares/_edit_gift_shares.html.erb,
// reached behind a warning (confirm_edit) since comments/gift shares are a visitor
// coordination tool that the wishlist owner is not normally meant to see.
const CommentsGiftSharesScreen = ({ wishlistAdminKey, item, onBack }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [giftShares, setGiftShares] = useState([]);
  const [shareSum, setShareSum] = useState(0);

  const showShares = !!item.allow_reservation;

  useEffect(() => {
    const load = async () => {
      try {
        const requests = [api.get(`/wishlists/${wishlistAdminKey}/items/${item.id}/comments`)];
        if (showShares) {
          requests.push(api.get(`/wishlists/${wishlistAdminKey}/items/${item.id}/gift_shares`));
        }
        const results = await Promise.all(requests);
        setComments(results[0].data || []);
        if (showShares && results[1]) {
          setGiftShares(results[1].data.shares || []);
          setShareSum(results[1].data.sum || 0);
        }
      } catch (error) {
        // leave lists empty on error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDeleteComment = (comment) => {
    Alert.alert(
      i18n.t('wishlist.giftShares.confirmAdminCommentDelete'),
      null,
      [
        { text: i18n.t('wishlist.no'), style: 'cancel' },
        {
          text: i18n.t('wishlist.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/wishlists/${wishlistAdminKey}/items/${item.id}/comments/${comment.id}`);
              setComments(prev => prev.filter(c => c.id !== comment.id));
            } catch (error) {}
          }
        }
      ]
    );
  };

  const handleDeleteShare = (share) => {
    Alert.alert(
      i18n.t('wishlist.giftShares.confirmAdminDelete'),
      null,
      [
        { text: i18n.t('wishlist.no'), style: 'cancel' },
        {
          text: i18n.t('wishlist.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/wishlists/${wishlistAdminKey}/items/${item.id}/gift_shares/${share.id}`);
              setGiftShares(prev => {
                const next = prev.filter(s => s.id !== share.id);
                setShareSum(next.reduce((sum, s) => sum + parseFloat(s.value), 0));
                return next;
              });
            } catch (error) {}
          }
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isTablet ? 30 : 20,
      paddingTop: insets.top + 12,
      paddingBottom: 12,
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
    contentContainer: {
      padding: isTablet ? 30 : 20,
    },
    section: {
      marginBottom: isTablet ? 24 : 18,
      ...cardStyle(theme, false),
    },
    sectionHeader: {
      ...strongStyle(isTablet ? 17 : 15),
      color: theme.text,
      marginBottom: 12,
    },
    emptyText: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textMuted,
    },
    shareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    shareName: {
      ...bodyStyle(isTablet ? 15 : 13),
      color: theme.text,
      flex: 1,
    },
    shareValue: {
      ...strongStyle(isTablet ? 15 : 13),
      color: theme.text,
      marginRight: 12,
    },
    sumRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 10,
    },
    sumLabel: {
      ...strongStyle(isTablet ? 15 : 13),
      color: theme.text,
      marginRight: 12,
    },
    commentBlock: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    commentAuthor: {
      ...strongStyle(isTablet ? 14 : 13),
      color: theme.text,
      flex: 1,
    },
    commentDate: {
      ...bodyStyle(isTablet ? 12 : 11),
      color: theme.textMuted,
      marginRight: 12,
    },
    commentContent: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textSecondary,
      lineHeight: isTablet ? 20 : 18,
    },
    deleteButton: {
      padding: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← {i18n.t('wishlist.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('wishlist.giftShares.header')}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {showShares && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>
                {giftShares.length > 0
                  ? i18n.t('wishlist.giftShares.giftSharesHeaderWithCount', { count: giftShares.length })
                  : i18n.t('wishlist.giftShares.giftSharesHeader')}
              </Text>
              {giftShares.length === 0 ? (
                <Text style={styles.emptyText}>{i18n.t('wishlist.giftShares.adminNoSharesPresent')}</Text>
              ) : (
                <>
                  {giftShares.map((share) => (
                    <View key={share.id} style={styles.shareRow}>
                      <Text style={styles.shareName}>{share.name}</Text>
                      <Text style={styles.shareValue}>{share.value} {share.currency}</Text>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteShare(share)}>
                        <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>{i18n.t('wishlist.giftShares.sum')}: {shareSum} {giftShares[0]?.currency}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              {comments.length > 0
                ? i18n.t('wishlist.giftShares.commentsHeaderWithCount', { count: comments.length })
                : i18n.t('wishlist.giftShares.commentsHeader')}
            </Text>
            {comments.length === 0 ? (
              <Text style={styles.emptyText}>{i18n.t('wishlist.giftShares.adminNoComments')}</Text>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentBlock}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.author}</Text>
                    <Text style={styles.commentDate}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteComment(comment)}>
                      <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default CommentsGiftSharesScreen;
