import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

// Subtle open animation for dropdown/context menus, mirroring wishsite3's
// `transition: .2s ease-in-out` on menu toggles (controllers/wishlist.scss,
// controllers/users.scss) — a gentle fade + scale-in instead of an abrupt appearance.
const AnimatedMenu = ({ style, children }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedMenu;
