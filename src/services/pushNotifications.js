import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests OS permission (if not already granted/denied) and returns this device's Expo push
// token, or null if permission was refused or we're running in the Simulator (no APNs there).
const getExpoPushToken = async () => {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
};

// Registers this device's push token for the given wishlist (called when the owner turns the
// "push notifications" toggle on in Edit Wishlist). Returns true on success.
export const registerPushToken = async (wishlistAdminKey) => {
  const token = await getExpoPushToken();
  if (!token) return false;

  try {
    await api.post(`/wishlists/${wishlistAdminKey}/push_token`, { token });
    return true;
  } catch (error) {
    return false;
  }
};

// Unregisters this device's push token (called when the toggle is turned off).
export const unregisterPushToken = async (wishlistAdminKey) => {
  if (!Device.isDevice) return;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    await api.delete(`/wishlists/${wishlistAdminKey}/push_token`, { data: { token } });
  } catch (error) {
    // Nothing to clean up if we can't resolve the token (e.g. permission was revoked).
  }
};
