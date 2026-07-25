import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strongStyle } from '../styles/fonts';
import { useTheme } from '../hooks/useTheme';
import { RADIUS } from '../styles/shared';
import { accountIcon, logoutIcon } from '../styles/icons';
import i18n from '../i18n';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ScreenWrapper = ({ children, onLogout, showMenu = false, onLogoPress, onNewWishlist, showBackArrow = false, hideBottomBar = false, onAccountPress }) => {
  const { theme } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={onLogoPress}>
          {showBackArrow ? (
            <Text style={[styles.backArrow, { color: theme.text }]}>←</Text>
          ) : (
            <Image 
              source={require('../../assets/wishsite_logo_name_100.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
        {showMenu && (
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.burgerButton}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <SvgXml xml={accountIcon(theme.text)} width={isTablet ? 24 : 20} height={isTablet ? 24 : 20} />
            </TouchableOpacity>
            
            {menuVisible && (
              <>
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                  <View style={styles.menuOverlay} />
                </TouchableWithoutFeedback>
                <View style={[styles.dropdownMenu, { backgroundColor: theme.surface }]}>
                  <View style={styles.menuHeader}>
                    <TouchableOpacity 
                      style={styles.menuCloseButton}
                      onPress={() => setMenuVisible(false)}
                    >
                      <Text style={[styles.closeIcon, { color: theme.text }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                {onAccountPress && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      onAccountPress();
                    }}
                  >
                    <View style={styles.menuItemContent}>
                      <SvgXml xml={accountIcon(theme.text)} width={16} height={16} style={styles.menuItemIcon} />
                      <Text style={[styles.menuItemText, { color: theme.text }]}>{i18n.t('account.editHeader')}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    onLogout && onLogout();
                  }}
                >
                  <View style={styles.menuItemContent}>
                    <SvgXml xml={logoutIcon(theme.text)} width={16} height={16} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>{i18n.t('logout')}</Text>
                  </View>
                </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>
      <View style={styles.content}>
        {children}
      </View>
      {!hideBottomBar && (
        <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.positive }]}
            onPress={onNewWishlist}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10000,
  },
  logo: {
    width: 100,
    height: 40,
  },
  backArrow: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  content: {
    flex: 1,
  },
  menuContainer: {
    position: 'relative',
    zIndex: 10000,
  },
  burgerButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burgerIcon: {
    width: isTablet ? 24 : 20,
    height: isTablet ? 24 : 20,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: RADIUS.small * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 220,
    zIndex: 10001,
  },
  menuItem: {
    padding: 15,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    fontSize: isTablet ? 18 : 16,
    marginRight: 10,
  },
  menuItemText: {
    ...strongStyle(isTablet ? 16 : 14),
  },

  menuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 5,
  },
  menuCloseButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    height: isTablet ? 60 : 50,
    position: 'relative',
  },
  addButton: {
    position: 'absolute',
    top: isTablet ? -30 : -28,
    left: '50%',
    marginLeft: isTablet ? -30 : -28,
    width: isTablet ? 60 : 56,
    height: isTablet ? 60 : 56,
    borderRadius: isTablet ? 30 : 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    fontSize: isTablet ? 28 : 24,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ScreenWrapper;