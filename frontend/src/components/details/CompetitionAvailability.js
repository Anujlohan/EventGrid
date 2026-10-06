import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { calculatePercentage, formatSpotsRatio } from '../../utils/formatters';

export const CompetitionAvailability = ({
  registeredCount = 0,
  totalSpots = 0,
  remainingSpots = 0,
  lifecycleStatus,
}) => {
  const percentage = calculatePercentage(registeredCount, totalSpots);
  const isFull = remainingSpots === 0;

  const getProgressColor = () => {
    if (isFull) return COLORS.danger;
    if (percentage > 80) return COLORS.warning;
    return COLORS.success;
  };

  return (
    <InfoCard title="Participation & Spot Availability">
      <View style={styles.topRow}>
        <View>
          <Text style={styles.countText}>{formatSpotsRatio(registeredCount, totalSpots)}</Text>
          <Text style={styles.subText}>Spots Claimed</Text>
        </View>
        <View style={styles.remainingTag}>
          <Text
            style={[
              styles.remainingText,
              { color: isFull ? COLORS.danger : remainingSpots <= 3 ? COLORS.warningDark : COLORS.successDark },
            ]}
          >
            {isFull ? 'No Spots Left' : `${remainingSpots} spots remaining`}
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.percentageText}>{percentage}% Capacity Filled</Text>
        {isFull ? (
          <Text style={styles.fullNotice}>⚠️ Registration is currently full</Text>
        ) : null}
      </View>
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  countText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  subText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remainingTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  remainingText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  fullNotice: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.danger,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
