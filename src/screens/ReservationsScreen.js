import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import i18n from '../i18n';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle } from '../styles/fonts';
import { RADIUS } from '../styles/shared';
import { SvgXml } from 'react-native-svg';
import { deleteIcon } from '../styles/icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Admin-only popup mirroring wishsite3's reservations/edit.js.erb (showPopup(...) over the
// current page), reached behind a warning (confirm_edit) just like CommentsGiftSharesScreen.
const ReservationsScreen = ({ wishlistAdminKey, item, namedReservationRequired, onBack }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/wishlists/${wishlistAdminKey}/items/${item.id}/reservations`);
        setReservations(data || []);
      } catch (error) {
        // leave list empty on error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDeleteReservation = (reservation) => {
    Alert.alert(
      reservation.guest_email
        ? i18n.t('wishlist.reservations.confirmDeleteWithEmail')
        : i18n.t('wishlist.reservations.confirmDeleteNoEmail'),
      null,
      [
        { text: i18n.t('wishlist.no'), style: 'cancel' },
        {
          text: i18n.t('wishlist.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/wishlists/${wishlistAdminKey}/items/${item.id}/reservations/${reservation.id}`);
              setReservations(prev => prev.filter(r => r.id !== reservation.id));
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
    modalTitle: {
      ...headingStyle(isTablet ? 20 : 18),
      color: theme.text,
      marginBottom: 15,
      textAlign: 'center',
    },
    infoText: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textMuted,
    },
    listHeader: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textSecondary,
      marginBottom: 18,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
      paddingBottom: 8,
    },
    tableHeaderCell: {
      ...bodyStyle(isTablet ? 12 : 11),
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: theme.textMuted,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    nameCol: {
      flex: 1,
      paddingRight: 8,
    },
    emailCol: {
      flex: 1.3,
      paddingRight: 8,
    },
    actionCol: {
      width: 32,
      alignItems: 'center',
    },
    tableCellText: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.text,
    },
    tableCellTextMuted: {
      ...bodyStyle(isTablet ? 14 : 13),
      color: theme.textMuted,
      fontStyle: 'italic',
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
          <Text style={styles.modalTitle}>{i18n.t('wishlist.reservations.header')}</Text>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {reservations.length === 0 ? (
                <Text style={styles.infoText}>{i18n.t('wishlist.reservations.noReservationsPresent')}</Text>
              ) : (
                <>
                  <Text style={styles.listHeader}>
                    {i18n.t('wishlist.reservations.listHeader', { item: item.title })}
                  </Text>
                  <View style={styles.tableHeaderRow}>
                    {namedReservationRequired && (
                      <Text style={[styles.tableHeaderCell, styles.nameCol]}>{i18n.t('wishlist.reservations.reservedByNameLabel')}</Text>
                    )}
                    <Text style={[styles.tableHeaderCell, styles.emailCol]}>{i18n.t('wishlist.reservations.reservedByEmailLabel')}</Text>
                    <View style={styles.actionCol} />
                  </View>
                  {reservations.map((reservation) => (
                    <View key={reservation.id} style={styles.tableRow}>
                      {namedReservationRequired && (
                        <Text style={[reservation.guest_name ? styles.tableCellText : styles.tableCellTextMuted, styles.nameCol]}>
                          {reservation.guest_name || i18n.t('wishlist.reservations.noNamePresent')}
                        </Text>
                      )}
                      <Text style={[reservation.guest_email ? styles.tableCellText : styles.tableCellTextMuted, styles.emailCol]}>
                        {reservation.guest_email || i18n.t('wishlist.reservations.noEmailPresent')}
                      </Text>
                      <TouchableOpacity style={[styles.deleteButton, styles.actionCol]} onPress={() => handleDeleteReservation(reservation)}>
                        <SvgXml xml={deleteIcon(theme.danger)} width={16} height={16} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ReservationsScreen;
