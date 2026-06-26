import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  clamp,
  runOnJS,
} from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type ZoomableImageProps = {
  uri: string;
  width: number;
  height: number;
  onZoomChange?: (isZoomed: boolean) => void;
  resetKey?: number;
};

export default function ZoomableImage({
  uri,
  width,
  height,
  onZoomChange,
  resetKey = 0,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (resetKey < 0) return;
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    onZoomChange?.(false);
  }, [resetKey]);

  const notifyZoom = (zoomed: boolean) => {
    onZoomChange?.(zoomed);
  };

  const resetZoom = () => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    notifyZoom(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        runOnJS(resetZoom)();
      } else {
        savedScale.value = scale.value;
        runOnJS(notifyZoom)(true);
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        runOnJS(resetZoom)();
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
        runOnJS(notifyZoom)(true);
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, { width, height }]}>
        <Animated.View style={[animatedStyle, { width, height }]}>
          <Image source={{ uri }} style={{ width, height }} contentFit="contain" transition={200} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
