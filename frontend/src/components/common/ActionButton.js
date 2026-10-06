import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const ActionButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'disabled'
  style,
  textStyle,
}) => {
  const isButtonDisabled = disabled || loading;

  const getVariantStyles = () => {
    if (isButtonDisabled && variant !== 'danger') {
      return {
        bg: 'rgba(255, 255, 255, 0.08)',
        text: '#64748B',
        border: 'transparent',
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          bg: 'rgba(255, 255, 255, 0.06)',
          text: COLORS.textPrimary,
          border: COLORS.borderLight,
        };
      case 'danger':
        return {
          bg: 'rgba(244, 63, 94, 0.15)',
          text: '#FDA4AF',
          border: 'rgba(244, 63, 94, 0.4)',
        };
      case 'success':
        return {
          bg: COLORS.success,
          text: '#090D16',
          border: 'transparent',
        };
      case 'primary':
      default:
        return {
          bg: COLORS.primary,
          text: '#FFFFFF',
          border: 'transparent',
        };
    }
  };

  const v = getVariantStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isButtonDisabled}
      style={[
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border !== 'transparent' ? 1 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
});
