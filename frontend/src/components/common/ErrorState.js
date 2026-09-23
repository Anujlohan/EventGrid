import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActionButton } from './ActionButton';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const ErrorState = ({
  message = 'Unable to load competition details.',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>⚠️</Text>
        </View>
        <Text style={styles.title}>Error Loading Data</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry ? (
          <ActionButton
            title="Retry"
            onPress={onRetry}
            style={styles.button}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 380,
    width: '100%',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  button: {
    width: '100%',
  },
});
