import { useState, useEffect } from 'react';
import api, { isNetworkError } from '../services/api';

export const useWishlistItems = (wishlist, authToken) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistData, setWishlistData] = useState(null);
  const [locked, setLocked] = useState(false);
  const [loadError, setLoadError] = useState(null); // null | 'network'

  const loadItems = async () => {
    try {
      const response = await api.get(`/wishlists/${wishlist.admin_key}/admin`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const { items: loadedItems, ...wishlistFields } = response.data;
      setItems(loadedItems || []);
      setWishlistData(wishlistFields);
      setLoadError(null);
      // Returned directly (not just set as state) so callers like duplicateItem/moveItem can act
      // on the up-to-date list right away — React state updates aren't visible in the same
      // closure until the next render, which is too late for e.g. finding an item's new index.
      return loadedItems || [];
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.error === 'Wishlist is locked') {
        setLocked(true);
      }
      if (isNetworkError(error)) {
        // Keep whatever was already loaded (e.g. a background refresh) instead of wiping it —
        // the screen shows a distinct offline message only when there's nothing cached yet.
        setLoadError('network');
      } else {
        setItems([]);
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (itemId, itemData) => {
    try {
      const response = await api.put(`/wishlists/${wishlist.admin_key}/items/${itemId}`, itemData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      await loadItems();
    } catch (error) {
      throw error;
    }
  };

  const deleteItem = async (itemId) => {
    await api.delete(`/wishlists/${wishlist.admin_key}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    await loadItems();
  };

  // Mirrors items_controller.rb#copy (web) — server clones the item (incl. links/image) and
  // re-inserts it directly after the original; loadItems() picks up the result in order.
  const duplicateItem = async (itemId) => {
    await api.post(`/wishlists/${wishlist.admin_key}/items/${itemId}/duplicate`, null, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return await loadItems();
  };

  // Mirrors items_controller.rb#move (web) — reassigns the item to another of the user's own
  // wishlists (identified by its admin_key) and appends it at the end there.
  const moveItem = async (itemId, newWishlistAdminKey) => {
    await api.patch(`/wishlists/${wishlist.admin_key}/items/${itemId}/move`, { new_wishlist_admin_key: newWishlistAdminKey }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return await loadItems();
  };

  const addItem = async (itemData) => {
    const response = await api.post(`/wishlists/${wishlist.admin_key}/items`, itemData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    // Returned alongside the fresh list (not just the created item) so callers can find its
    // index to scroll to it right away, the same way duplicateItem/moveItem already do - the
    // component's own `items` state wouldn't reflect this update yet inside the same closure.
    const freshItems = await loadItems();
    return { item: response.data, items: freshItems };
  };

  const loadSingleItem = async (itemId) => {
    try {
      const response = await api.get(`/wishlists/${wishlist.admin_key}/items/${itemId}/edit`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Unlike loadSingleItem (the edit-form shape - raw remote_image_url, no reservation count/
  // favicon data), this mirrors loadItems' per-item shape (image_url, reserved_count, link
  // display fields) so the result can be used to refresh a single item's detail view or list
  // entry without re-fetching the whole wishlist.
  const loadItemAdmin = async (itemId) => {
    const response = await api.get(`/wishlists/${wishlist.admin_key}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data;
  };

  const updateWishlist = async (wishlistData) => {
    try {
      const response = await api.put(`/wishlists/${wishlist.admin_key}`, wishlistData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const deleteWishlist = async () => {
    await api.delete(`/wishlists/${wishlist.admin_key}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  };

  useEffect(() => {
    loadItems();
  }, []);

  return {
    items,
    setItems,
    loading,
    wishlistData,
    locked,
    loadError,
    loadItems,
    updateItem,
    deleteItem,
    duplicateItem,
    moveItem,
    addItem,
    loadSingleItem,
    loadItemAdmin,
    updateWishlist,
    deleteWishlist
  };
};