import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const LoadingSkeleton = ({ message = 'Loading competition details...' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.spinnerCard}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>{message}</Text>
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
  spinnerCard: {
    backgroundColor: COLORS.surface,
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  message: {
    marginTop: 16,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
