import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ActionButton } from '../common/ActionButton';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const RegistrationButton = ({
  isRegistered = false,
  lifecycleStatus,
  remainingSpots = 0,
  isSubmitting = false,
  onRegister,
  onCancel,
}) => {
  const getButtonConfig = () => {
    // 1. User is already registered
    if (isRegistered) {
      if (lifecycleStatus === 'LIVE' || lifecycleStatus === 'COMPLETED') {
        return {
          title: 'Registered ✓ (Event Live/Ended)',
          disabled: true,
          variant: 'disabled',
          onPress: null,
          helper: 'Registration cannot be cancelled once event starts.',
        };
      }
      return {
        title: 'Registered ✓ (Tap to Cancel)',
        disabled: false,
        variant: 'danger',
        onPress: onCancel,
        helper: 'You have secured a spot in this competition.',
      };
    }

    // 2. Lifecycle-based state for unregistered users
    switch (lifecycleStatus) {
      case 'UPCOMING':
        return {
          title: 'Registration Opening Soon',
          disabled: true,
          variant: 'disabled',
          onPress: null,
          helper: 'Registration has not opened yet.',
        };

      case 'REGISTRATION_CLOSED':
        return {
          title: 'Registration Closed',
          disabled: true,
          variant: 'disabled',
          onPress: null,
          helper: 'The registration deadline has passed.',
        };

      case 'FULL':
        return {
          title: 'Competition Full',
          disabled: true,
          variant: 'disabled',
          onPress: null,
          helper: 'All spots for this competition have been filled.',
        };

      case 'LIVE':
        return {
          title: 'Competition Live',
          disabled: true,
          variant: 'disabled',
          onPress: null,
          helper: 'This competition is currently underway.',
        };

      case 'COMPLETED':
        return {
          title: 'Competition Ended',
          disabled: true,
          variant: 'disabled',
          onPress: null,
          helper: 'This competition has concluded.',
        };

      case 'REGISTRATION_OPEN':
      default:
        return {
          title: 'Register Now',
          disabled: false,
          variant: 'primary',
          onPress: onRegister,
          helper: `${remainingSpots} spots remaining`,
        };
    }
  };

  const config = getButtonConfig();

  return (
    <View style={styles.bar}>
      <View style={styles.content}>
        <ActionButton
          title={isSubmitting ? 'Processing...' : config.title}
          loading={isSubmitting}
          disabled={config.disabled}
          variant={config.variant}
          onPress={config.onPress}
          style={styles.button}
        />
        {config.helper ? (
          <Text style={styles.helperText}>{config.helper}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  content: {
    width: '100%',
  },
  button: {
    width: '100%',
  },
  helperText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
