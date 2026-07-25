import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Modal, FlatList } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { headingStyle, bodyStyle } from '../styles/fonts';
import { RADIUS } from '../styles/shared';
import Button from '../components/Button';
import i18n from '../i18n';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = height < 700;

const WelcomeScreen = ({ onContinue }) => {
  const { theme } = useTheme();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef(null);

  const slides = [
    {
      title: 'Die einfachste Art zu wünschen',
      subtitle: 'Millionen erfüllte Wünsche, über 99% Zufriedenheit',
      icon: '🎁'
    },
    {
      title: 'Nur wenige Klicks',
      subtitle: 'Lege in wenigen Sekunden deine eigene wishsite an',
      icon: '⚡'
    },
    {
      title: 'Wünsche sammeln',
      subtitle: 'Füge so viele Wünsche hinzu wie du möchtest - egal aus welchem Shop',
      icon: '📝'
    },
    {
      title: 'Mit anderen teilen',
      subtitle: 'Teile deine wishsite ganz einfach mit Familie und Freunden',
      icon: '👥'
    }
  ];

  const getCurrentFlag = () => {
    return i18n.locale === 'en' ? '🇺🇸' : '🇩🇪';
  };

  const handleLanguageSelect = (language) => {
    i18n.locale = language;
    setLanguageModalVisible(false);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentSlide(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <Text style={[styles.welcomeTitle, { color: theme.text }]}>
        {item.title}
      </Text>

      <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
        {item.subtitle}
      </Text>

      <View style={[styles.dummyImage, { backgroundColor: theme.surface }]}>
        <Text style={[styles.dummyImageText, { color: theme.text }]}>{item.icon}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/wishsite_logo_name_100.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={[styles.languageButton, { backgroundColor: theme.surface }]}
          onPress={() => setLanguageModalVisible(true)}
        >
          <Text style={[styles.languageButtonText, { color: theme.text }]}>🌐</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          style={styles.carousel}
        />

        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentSlide ? theme.primary : theme.border,
                }
              ]}
            />
          ))}
        </View>

        <Button
          style={styles.continueButton}
          onPress={onContinue}
          title="Los geht's"
        />
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sprache wählen</Text>

            <TouchableOpacity
              style={[styles.languageOption, { borderBottomColor: theme.border }]}
              onPress={() => handleLanguageSelect('de')}
            >
              <Text style={[styles.languageOptionText, { color: theme.text }]}>🇩🇪 Deutsch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.languageOption, { borderBottomColor: theme.border }]}
              onPress={() => handleLanguageSelect('en')}
            >
              <Text style={[styles.languageOptionText, { color: theme.text }]}>🇺🇸 English</Text>
            </TouchableOpacity>

            <Button
              style={styles.cancelButton}
              variant="secondary"
              onPress={() => setLanguageModalVisible(false)}
              title="Abbrechen"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: isTablet ? 60 : (isSmallScreen ? 30 : 40),
    paddingBottom: isSmallScreen ? 10 : 20,
  },
  logo: {
    width: 100,
    height: 40,
  },
  languageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 60 : 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTablet ? 30 : (isSmallScreen ? 15 : 20),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  welcomeTitle: {
    ...headingStyle(isTablet ? 28 : (isSmallScreen ? 20 : 24)),
    textAlign: 'center',
    marginBottom: isTablet ? 20 : (isSmallScreen ? 10 : 15),
  },
  welcomeSubtitle: {
    ...bodyStyle(isTablet ? 16 : (isSmallScreen ? 12 : 14)),
    textAlign: 'center',
    lineHeight: isTablet ? 24 : (isSmallScreen ? 16 : 20),
    marginBottom: isTablet ? 30 : (isSmallScreen ? 15 : 20),
  },
  dummyImage: {
    width: isTablet ? 150 : (isSmallScreen ? 80 : 120),
    height: isTablet ? 150 : (isSmallScreen ? 80 : 120),
    borderRadius: RADIUS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTablet ? 30 : (isSmallScreen ? 15 : 20),
  },
  dummyImageText: {
    fontSize: isTablet ? 50 : (isSmallScreen ? 30 : 40),
  },
  continueButton: {
    minWidth: isTablet ? 180 : 140,
    marginHorizontal: isTablet ? 60 : 40,
    marginBottom: isTablet ? 60 : (isSmallScreen ? 30 : 50),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: RADIUS.card,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    ...headingStyle(isTablet ? 20 : 18),
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  languageOptionText: {
    ...bodyStyle(isTablet ? 18 : 16),
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 15,
  },
});

export default WelcomeScreen;
