import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const RegistrationInformation = ({ entryFee = 'Free', prizePool }) => {
  return (
    <InfoCard title="Registration & Rewards">
      <View style={styles.row}>
        <View style={styles.itemCard}>
          <Text style={styles.label}>Entry Fee</Text>
          <Text style={styles.value}>{entryFee}</Text>
          <Text style={styles.subtext}>Per Participant / Team</Text>
        </View>

        {prizePool ? (
          <View style={[styles.itemCard, styles.prizeCard]}>
            <Text style={styles.prizeLabel}>🏆 Prize Pool</Text>
            <Text style={[styles.value, styles.prizeValue]}>{prizePool}</Text>
            <Text style={styles.prizeSubtext}>Total Rewards</Text>
          </View>
        ) : null}
      </View>
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  itemCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prizeCard: {
    backgroundColor: 'rgba(163, 230, 53, 0.06)',
    borderColor: 'rgba(163, 230, 53, 0.25)',
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  prizeLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.lime,
    fontWeight: TYPOGRAPHY.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  prizeValue: {
    color: COLORS.lime,
  },
  subtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  prizeSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(163, 230, 53, 0.7)',
    marginTop: 3,
  },
});
