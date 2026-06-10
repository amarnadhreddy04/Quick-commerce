import { useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { isImageUri } from '@/lib/imageUtils';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type Props = {
  uri: string;
  fallbackEmoji?: string;
  height: number;
};

export default function ZoomableImage({ uri, fallbackEmoji = '📦', height }: Props) {
  const frameRef = useRef<View>(null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetTransform = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        resetTransform();
        return;
      }
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (savedScale.value <= 1) return;
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        resetTransform();
        return;
      }
      scale.value = withSpring(2.5);
      savedScale.value = 2.5;
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const node = frameRef.current as unknown as { addEventListener?: (type: string, fn: (e: WheelEvent) => void) => void };
    const element = node as unknown as HTMLElement | null;
    if (!element?.addEventListener) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.15 : -0.15;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value + delta));
      scale.value = next;
      savedScale.value = next;
      if (next <= 1) {
        resetTransform();
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  if (!isImageUri(uri)) {
    return (
      <View style={[styles.frame, { height }]}>
        <Text style={styles.emoji}>{uri || fallbackEmoji}</Text>
      </View>
    );
  }

  return (
    <View ref={frameRef} style={[styles.frame, { height }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.zoomLayer, animatedStyle]}>
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        </Animated.View>
      </GestureDetector>
      {Platform.OS === 'web' ? (
        <Text style={styles.hint}>Scroll to zoom · Double-click to reset</Text>
      ) : (
        <Text style={styles.hint}>Pinch to zoom · Double-tap to reset</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoomLayer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 72,
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 8,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
