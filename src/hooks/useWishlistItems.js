import { useState, useEffect } from 'react';
import api from '../services/api';

export const useWishlistItems = (wishlist, authToken) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistData, setWishlistData] = useState(null);
  const [locked, setLocked] = useState(false);

  const loadItems = async () => {
    try {
      const response = await api.get(`/wishlists/${wishlist.admin_key}/admin`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const { items: loadedItems, ...wishlistFields } = response.data;
      setItems(loadedItems || []);
      setWishlistData(wishlistFields);
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.error === 'Wishlist is locked') {
        setLocked(true);
      }
      setItems([]);
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

  const addItem = async (itemData) => {
    const response = await api.post(`/wishlists/${wishlist.admin_key}/items`, itemData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    await loadItems();
    return response.data;
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
    updateItem,
    deleteItem,
    addItem,
    loadSingleItem,
    updateWishlist,
    deleteWishlist
  };
};