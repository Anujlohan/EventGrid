import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { formatDate, formatDateTime, formatTimeRemaining } from '../../utils/dateUtils';

export const CompetitionDateInfo = ({
  registrationDeadline,
  startDate,
  endDate,
  timeRemainingToDeadline,
}) => {
  return (
    <InfoCard title="Important Dates & Timeline">
      <View style={styles.grid}>
        <View style={styles.dateBoxHighlight}>
          <Text style={styles.boxLabel}>Registration Deadline</Text>
          <Text style={styles.boxValueHighlight}>{formatDateTime(registrationDeadline)}</Text>
          {timeRemainingToDeadline > 0 ? (
            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>⏱ {formatTimeRemaining(timeRemainingToDeadline)}</Text>
            </View>
          ) : (
            <Text style={styles.closedText}>Registration has ended</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.dateBoxHalf}>
            <Text style={styles.boxLabel}>Event Starts</Text>
            <Text style={styles.boxValue}>{formatDate(startDate)}</Text>
          </View>
          <View style={styles.dateBoxHalf}>
            <Text style={styles.boxLabel}>Event Concludes</Text>
            <Text style={styles.boxValue}>{formatDate(endDate)}</Text>
          </View>
        </View>
      </View>
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  dateBoxHighlight: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  dateBoxHalf: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boxLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  boxValueHighlight: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  boxValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  countdownPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  countdownText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#92400E',
  },
  closedText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.danger,
    marginTop: 2,
  },
});
