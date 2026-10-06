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
        {/* Registration Deadline Card */}
        <View style={styles.dateBoxHighlight}>
          <View style={styles.dateHeaderRow}>
            <View style={styles.dotDeadline} />
            <Text style={styles.boxLabel}>Registration Deadline</Text>
          </View>
          <Text style={styles.boxValueHighlight}>{formatDateTime(registrationDeadline)}</Text>
          {timeRemainingToDeadline > 0 ? (
            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>⏱ {formatTimeRemaining(timeRemainingToDeadline)} remaining</Text>
            </View>
          ) : (
            <View style={styles.closedPill}>
              <Text style={styles.closedText}>Registration has concluded</Text>
            </View>
          )}
        </View>

        {/* Start and End Event Dates */}
        <View style={styles.row}>
          <View style={styles.dateBoxHalf}>
            <View style={styles.dateHeaderRow}>
              <View style={styles.dotStart} />
              <Text style={styles.boxLabel}>Event Starts</Text>
            </View>
            <Text style={styles.boxValue}>{formatDate(startDate)}</Text>
          </View>
          <View style={styles.dateBoxHalf}>
            <View style={styles.dateHeaderRow}>
              <View style={styles.dotEnd} />
              <Text style={styles.boxLabel}>Event Concludes</Text>
            </View>
            <Text style={styles.boxValue}>{formatDate(endDate)}</Text>
          </View>
        </View>
      </View>
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: 12,
  },
  dateBoxHighlight: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dotDeadline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    marginRight: 8,
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lime,
    marginRight: 8,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  dateBoxHalf: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  boxLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  boxValueHighlight: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  boxValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  countdownPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  countdownText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FCD34D',
  },
  closedPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  closedText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: '#FDA4AF',
  },
});
