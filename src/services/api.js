import axios from 'axios';
import { Platform } from 'react-native';

const API_VERSION = 'v1';
const API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api/' + API_VERSION
  : 'http://localhost:3000/api/' + API_VERSION;

// Public web host (same Rails app as the API), used to build shareable wishlist links.
export const WEB_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;