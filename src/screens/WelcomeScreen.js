import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Modal, FlatList } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../hooks/useLocale';
import { headingStyle, bodyStyle } from '../styles/fonts';
import { RADIUS } from '../styles/shared';
import Button from '../components/Button';
import i18n from '../i18n';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = height < 700;
// Explicit pixel size instead of width:'100%' + aspectRatio - the slide's flex:1 ancestor chain
// resolved that combination unpredictably (image ended up filling nearly the full screen height,
// pushing the title/subtitle out of view). Images are square (1:1), driven off a fixed HEIGHT.
const SLIDE_IMAGE_HEIGHT = isTablet ? 420 : (isSmallScreen ? 260 : 360);
const SLIDE_IMAGE_WIDTH = SLIDE_IMAGE_HEIGHT;

const AUTO_ADVANCE_INTERVAL = 4000;

const WelcomeScreen = ({ onContinue }) => {
  const { theme } = useTheme();
  const { locale, setLocale } = useLocale();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef(null);

  const slides = [
    {
      title: i18n.t('onboarding.slide1Title'),
      subtitle: i18n.t('onboarding.slide1Subtitle'),
      image: require('../../assets/screen1_app.jpg'),
    },
    {
      title: i18n.t('onboarding.slide2Title'),
      subtitle: i18n.t('onboarding.slide2Subtitle'),
      image: require('../../assets/screen2_app.jpg'),
    },
    {
      title: i18n.t('onboarding.slide3Title'),
      subtitle: i18n.t('onboarding.slide3Subtitle'),
      image: require('../../assets/screen3_app.jpg'),
    },
    {
      title: i18n.t('onboarding.slide4Title'),
      subtitle: i18n.t('onboarding.slide4Subtitle'),
      // TODO: two candidate images exist for this slide (screen4_app.jpg / screen4_alternativ_app.jpg) -
      // pending a decision on which to use.
      image: require('../../assets/screen4_app.jpg'),
    }
  ];

  const handleLanguageSelect = (language) => {
    setLocale(language);
    setLanguageModalVisible(false);
  };

  // Appending a duplicate of slide 1 after the real last slide lets both auto-advance and a
  // manual swipe-past-the-end land somewhere - handleMomentumScrollEnd below then snaps that
  // duplicate back to the real slide 0 instantly (no animation), so the loop looks seamless
  // instead of just stopping dead at the last slide.
  const slidesForList = [...slides, slides[0]];

  // Mirrors the FlatList's real, current scroll position on every scroll event (not just once a
  // swipe settles) - the auto-advance timer below reads from this instead of the `currentSlide`
  // state directly, because that state only updates via onViewableItemsChanged, which can lag
  // behind an in-flight manual swipe. Computing "next index" from a stale currentSlide caused the
  // timer to occasionally fire against the wrong slide when a manual swipe and the timer landed
  // close together.
  const scrollPositionRef = useRef(0);

  const handleScroll = (e) => {
    scrollPositionRef.current = e.nativeEvent.contentOffset.x;
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index < slides.length) {
      setCurrentSlide(viewableItems[0].index);
    }
  }).current;

  const handleMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index === slides.length) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      scrollPositionRef.current = 0;
      setCurrentSlide(0);
    }
  };

  // Restarts on every slide change, whichever triggered it (this timer, or a manual swipe via
  // onViewableItemsChanged) - so a manual swipe doesn't fight with the next auto-advance tick.
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentIndex = Math.round(scrollPositionRef.current / width);
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }, AUTO_ADVANCE_INTERVAL);
    return () => clearTimeout(timer);
  }, [currentSlide]);

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <Text style={[styles.welcomeTitle, { color: theme.text }]}>
        {item.title}
      </Text>

      <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
        {item.subtitle}
      </Text>

      <Image source={item.image} style={styles.slideImage} resizeMode="cover" />
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
          <Text style={styles.languageButtonText}>{locale === 'en' ? '🇺🇸' : '🇩🇪'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={slidesForList}
          keyExtractor={(_, index) => index.toString()}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
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
          title={i18n.t('onboarding.continueButton')}
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>{i18n.t('language.modalTitle')}</Text>

            <TouchableOpacity
              style={[styles.languageOption, { borderBottomColor: theme.border }]}
              onPress={() => handleLanguageSelect('de')}
            >
              <Text style={styles.languageOptionFlag}>🇩🇪</Text>
              <Text style={[styles.languageOptionText, { color: theme.text }]}>{i18n.t('language.german')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.languageOption, { borderBottomColor: theme.border }]}
              onPress={() => handleLanguageSelect('en')}
            >
              <Text style={styles.languageOptionFlag}>🇺🇸</Text>
              <Text style={[styles.languageOptionText, { color: theme.text }]}>{i18n.t('language.english')}</Text>
            </TouchableOpacity>

            <Button
              style={styles.cancelButton}
              variant="secondary"
              onPress={() => setLanguageModalVisible(false)}
              title={i18n.t('language.cancel')}
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
  slideImage: {
    width: SLIDE_IMAGE_WIDTH,
    height: SLIDE_IMAGE_HEIGHT,
    borderRadius: RADIUS.card,
    marginBottom: isTablet ? 30 : (isSmallScreen ? 15 : 20),
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  languageOptionFlag: {
    fontSize: isTablet ? 18 : 16,
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
