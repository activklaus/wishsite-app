import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { WEB_BASE_URL } from '../services/api';

// Matches the CFBundleURLSchemes/AndroidManifest scheme already registered natively
// (see ios/Wishsite/Info.plist, android/app/src/main/AndroidManifest.xml) and app.json's expo.scheme.
const REDIRECT_URL = 'net.wishsite.app://auth-callback';

const parseQueryParams = (url) => {
  const queryString = url.split('?')[1] || '';
  const params = {};
  queryString.split('&').forEach((pair) => {
    if (!pair) return;
    const [key, value] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent((value || '').replace(/\+/g, ' '));
  });
  return params;
};

// Mirrors wishsite3's Facebook login (Devise :omniauthable, User.from_omniauth).
// The web flow requires a POST with a Rails CSRF token (OmniAuth::RailsCsrfProtection),
// so we open a GET-accessible bridge page (pages#facebook_login_app) that auto-submits
// that POST, then follows the OAuth redirect chain back to a net.wishsite.app:// deep link
// carrying an api_token (see omniauth_callbacks_controller.rb#from_app?).
export const useFacebookLogin = () => {
  const [loading, setLoading] = useState(false);

  const loginWithFacebook = async () => {
    setLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(`${WEB_BASE_URL}/facebook_login_app`, REDIRECT_URL);
      if (result.type !== 'success' || !result.url) {
        return null;
      }
      const params = parseQueryParams(result.url);
      if (params.error) {
        throw new Error(params.error);
      }
      if (!params.token) {
        return null;
      }
      return {
        token: params.token,
        user: { id: params.id, email: params.email, name: params.name },
      };
    } finally {
      setLoading(false);
    }
  };

  return { loginWithFacebook, loading };
};
