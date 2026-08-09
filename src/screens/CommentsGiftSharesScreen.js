import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import i18n from '../i18n';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { bodyStyle, strongStyle } from '../styles/fonts';
import { RADIUS } from '../styles/shared';
import { SvgXml } from 'react-native-svg';
import { deleteIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Admin-only popup mirroring wishsite3's gift_shares/edit.js.erb (showPopup(...) over the
// current page), reached behind a warning (confirm_edit) since comments/gift shares are a
// visitor coordination tool that the wishlist owner is not normally meant to see.
const CommentsGiftSharesScreen = ({ wishlistAdminKey, item, onBack }) => {
  const { theme } = useTheme();
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
      maxHeight: '80%',
      position: 'relative',
    },
    // Mirrors web's showPopup(), which always prepends a titlebar with the wishsite logo and a
    // close button to every popup, regardless of its content.
    titlebar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    logo: {
      width: 90,
      height: 18,
      opacity: 0.7,
    },
    modalCloseButton: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseText: {
      fontSize: 24,
      color: theme.text,
      fontWeight: 'bold',
    },
    section: {
      marginBottom: isTablet ? 30 : 24,
    },
    // Mirrors web's "#gift-shares + #comments { margin-top: 100px; }" (controllers/gift_shares.scss,
    // scoped to #popup) — a deliberately large gap separating the two sections when both are shown.
    commentsSectionAfterShares: {
      marginTop: isTablet ? 60 : 48,
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
  });

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onBack}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.titlebar}>
            <Image source={require('../../assets/wishsite_logo_name_100.png')} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity style={styles.modalCloseButton} onPress={onBack}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginBottom: 20 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
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

              <View style={[styles.section, showShares && styles.commentsSectionAfterShares]}>
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
      </View>
    </Modal>
  );
};

export default CommentsGiftSharesScreen;
