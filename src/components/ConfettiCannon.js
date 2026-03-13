import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_COLORS = ['#f80f6f', '#ff3d8f', '#FFFFFF', '#E0F7FF', '#87CEEB', '#4A90E2'];

function Particle({ origin, color, fallSpeed, explosionSpeed, fadeOut, index, total }) {
  const x = useRef(new Animated.Value(origin.x)).current;
  const y = useRef(new Animated.Value(origin.y)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const angle = (Math.PI * 2 * index) / total + (Math.random() - 0.5) * 0.5;
    const speed = explosionSpeed * (0.5 + Math.random() * 0.5);
    const targetX = origin.x + Math.cos(angle) * speed * (SCREEN_WIDTH / 400);
    const targetY = origin.y + SCREEN_HEIGHT * (0.6 + Math.random() * 0.5);
    const delay = Math.random() * 300;

    const animations = [
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(x, { toValue: targetX, duration: fallSpeed, useNativeDriver: true }),
          Animated.timing(y, { toValue: targetY, duration: fallSpeed, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 720 * (Math.random() > 0.5 ? 1 : -1), duration: fallSpeed, useNativeDriver: true }),
        ]),
      ]),
    ];

    if (fadeOut) {
      animations.push(
        Animated.sequence([
          Animated.delay(delay + fallSpeed * 0.5),
          Animated.timing(opacity, { toValue: 0, duration: fallSpeed * 0.5, useNativeDriver: true }),
        ])
      );
    }

    Animated.parallel(animations).start();
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] });
  const size = 6 + Math.random() * 6;
  const isRect = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        isRect ? styles.rect : styles.circle,
        {
          width: size,
          height: isRect ? size * 0.5 : size,
          backgroundColor: color,
          opacity,
          transform: [{ translateX: x }, { translateY: y }, { rotate: rotateStr }],
        },
      ]}
    />
  );
}

export default function ConfettiCannon({
  count = 100,
  origin = { x: SCREEN_WIDTH / 2, y: -20 },
  autoStart = true,
  fadeOut = true,
  fallSpeed = 3000,
  explosionSpeed = 350,
  colors = DEFAULT_COLORS,
}) {
  if (!autoStart) return null;

  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Particle
          key={p.id}
          index={p.id}
          total={count}
          origin={origin}
          color={p.color}
          fallSpeed={fallSpeed}
          explosionSpeed={explosionSpeed}
          fadeOut={fadeOut}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rect: { position: 'absolute', borderRadius: 1 },
  circle: { position: 'absolute', borderRadius: 99 },
});
