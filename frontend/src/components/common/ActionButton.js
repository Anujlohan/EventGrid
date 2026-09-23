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
        bg: '#E2E8F0',
        text: '#94A3B8',
        border: 'transparent',
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          bg: COLORS.surface,
          text: COLORS.primary,
          border: COLORS.primary,
        };
      case 'danger':
        return {
          bg: '#FEF2F2',
          text: COLORS.danger,
          border: '#FECACA',
        };
      case 'success':
        return {
          bg: COLORS.success,
          text: COLORS.textInverse,
          border: 'transparent',
        };
      case 'primary':
      default:
        return {
          bg: COLORS.primary,
          text: COLORS.textInverse,
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
