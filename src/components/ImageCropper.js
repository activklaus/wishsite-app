import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Image, PanResponder, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const MAX_USER_SCALE = 4;

const getDistance = (touches) => {
  const [a, b] = touches;
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

// Lets the user position/zoom an image within a fixed frame (pan + two-finger pinch),
// mirroring the outcome of wishsite3's jcrop-based crop tools but with a touch-native gesture
// instead of a draggable rectangle + width/height sliders.
const ImageCropper = forwardRef(({ imageUri, frameWidth, frameHeight, shape = 'rect', initialCrop }, ref) => {
  const { theme } = useTheme();
  const [naturalSize, setNaturalSize] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, userScale: 1 });
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const gestureStart = useRef({ x: 0, y: 0, userScale: 1, touchCount: 0, distance: 0 });
  // The PanResponder below is created once via useRef and never recreated, so its handlers
  // close over whatever `naturalSize` was at mount time (null). Reading it from a ref instead
  // of the state closure keeps clamp() working once the image size actually loads.
  const naturalSizeRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (cancelled) return;
        naturalSizeRef.current = { width, height };
        setNaturalSize({ width, height });

        // Restore the previously saved crop position/zoom instead of always re-centering.
        if (initialCrop && initialCrop.w && initialCrop.h) {
          const baseScaleNow = Math.max(frameWidth / width, frameHeight / height);
          const effectiveScale = frameWidth / initialCrop.w;
          const userScale = Math.min(MAX_USER_SCALE, Math.max(1, effectiveScale / baseScaleNow));
          const resolvedScale = baseScaleNow * userScale;
          const displayedW = width * resolvedScale;
          const displayedH = height * resolvedScale;
          const x = (displayedW - frameWidth) / 2 - initialCrop.x * resolvedScale;
          const y = (displayedH - frameHeight) / 2 - initialCrop.y * resolvedScale;
          const next = { ...clamp(x, y, userScale), userScale };
          transformRef.current = next;
          setTransform(next);
        }
      },
      () => {}
    );
    return () => { cancelled = true; };
  }, [imageUri]);

  const getBaseScale = () => {
    const n = naturalSizeRef.current;
    return n ? Math.max(frameWidth / n.width, frameHeight / n.height) : 1;
  };

  const clamp = (x, y, userScale) => {
    const n = naturalSizeRef.current;
    if (!n) return { x, y };
    const effectiveScale = getBaseScale() * userScale;
    const displayedW = n.width * effectiveScale;
    const displayedH = n.height * effectiveScale;
    const maxX = Math.max(0, (displayedW - frameWidth) / 2);
    const maxY = Math.max(0, (displayedH - frameHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const baseScale = getBaseScale();

  const captureGestureStart = (touches) => {
    gestureStart.current = {
      x: transformRef.current.x,
      y: transformRef.current.y,
      userScale: transformRef.current.userScale,
      touchCount: touches.length,
      distance: touches.length === 2 ? getDistance(touches) : 0,
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => captureGestureStart(evt.nativeEvent.touches),
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length !== gestureStart.current.touchCount) {
          // Finger count changed mid-gesture (e.g. second finger added/removed) - rebase to avoid a jump
          captureGestureStart(touches);
          return;
        }
        if (touches.length === 2) {
          const distance = getDistance(touches);
          const ratio = gestureStart.current.distance > 0 ? distance / gestureStart.current.distance : 1;
          const newUserScale = Math.min(MAX_USER_SCALE, Math.max(1, gestureStart.current.userScale * ratio));
          setTransform({ ...clamp(transformRef.current.x, transformRef.current.y, newUserScale), userScale: newUserScale });
        } else {
          const next = clamp(
            gestureStart.current.x + gestureState.dx,
            gestureStart.current.y + gestureState.dy,
            transformRef.current.userScale
          );
          setTransform({ ...next, userScale: transformRef.current.userScale });
        }
      },
    })
  ).current;

  useImperativeHandle(ref, () => ({
    getCropRect: () => {
      if (!naturalSize) return null;
      const effectiveScale = baseScale * transformRef.current.userScale;
      const displayedW = naturalSize.width * effectiveScale;
      const displayedH = naturalSize.height * effectiveScale;
      const frameLeftInImage = (displayedW - frameWidth) / 2 - transformRef.current.x;
      const frameTopInImage = (displayedH - frameHeight) / 2 - transformRef.current.y;
      return {
        x: Math.round(frameLeftInImage / effectiveScale),
        y: Math.round(frameTopInImage / effectiveScale),
        w: Math.round(frameWidth / effectiveScale),
        h: Math.round(frameHeight / effectiveScale),
        ratio: effectiveScale,
      };
    },
  }));

  const effectiveScale = baseScale * transform.userScale;
  const displayedW = naturalSize ? naturalSize.width * effectiveScale : 0;
  const displayedH = naturalSize ? naturalSize.height * effectiveScale : 0;

  return (
    <View
      style={[
        styles.frame,
        {
          width: frameWidth,
          height: frameHeight,
          borderRadius: shape === 'circle' ? frameWidth / 2 : 0,
          backgroundColor: theme.border,
          borderColor: theme.surface,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {naturalSize && (
        <Image
          source={{ uri: imageUri }}
          resizeMode="cover"
          style={{
            position: 'absolute',
            width: displayedW,
            height: displayedH,
            left: frameWidth / 2 - displayedW / 2 + transform.x,
            top: frameHeight / 2 - displayedH / 2 + transform.y,
          }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: 3,
    alignSelf: 'center',
  },
});

export default ImageCropper;
