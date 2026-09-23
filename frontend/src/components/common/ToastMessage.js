import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const ToastMessage = ({
  visible,
  message,
  type = 'info', // 'success' | 'error' | 'info'
  onDismiss,
  duration = 3500,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onDismiss) onDismiss();
      });
    }
  }, [visible, message, duration, onDismiss, opacity]);

  if (!visible || !message) return null;

  const getStyle = () => {
    switch (type) {
      case 'success':
        return { bg: '#065F46', text: '#FFFFFF', icon: '✓' };
      case 'error':
        return { bg: '#991B1B', text: '#FFFFFF', icon: '✕' };
      default:
        return { bg: '#1E293B', text: '#FFFFFF', icon: 'ℹ' };
    }
  };

  const s = getStyle();

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: s.bg }]}>
      <Text style={styles.icon}>{s.icon}</Text>
      <Text style={[styles.text, { color: s.text }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  icon: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  text: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    flex: 1,
  },
});
