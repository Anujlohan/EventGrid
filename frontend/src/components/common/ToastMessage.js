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
        return {
          bg: '#064E3B',
          border: 'rgba(52, 211, 153, 0.4)',
          text: '#ECFDF5',
          iconBg: 'rgba(52, 211, 153, 0.2)',
          iconText: '#6EE7B7',
          icon: '✓',
        };
      case 'error':
        return {
          bg: '#7F1D1D',
          border: 'rgba(248, 113, 113, 0.4)',
          text: '#FEF2F2',
          iconBg: 'rgba(248, 113, 113, 0.2)',
          iconText: '#FCA5A5',
          icon: '✕',
        };
      default:
        return {
          bg: '#1E293B',
          border: 'rgba(148, 163, 184, 0.3)',
          text: '#F8FAFC',
          iconBg: 'rgba(148, 163, 184, 0.2)',
          iconText: '#93C5FD',
          icon: 'ℹ',
        };
    }
  };

  const s = getStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          backgroundColor: s.bg,
          borderColor: s.border,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: s.iconBg }]}>
        <Text style={[styles.icon, { color: s.iconText }]}>{s.icon}</Text>
      </View>
      <Text style={[styles.text, { color: s.text }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    maxWidth: 540,
    width: '90%',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  text: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    flex: 1,
    lineHeight: 18,
  },
});
