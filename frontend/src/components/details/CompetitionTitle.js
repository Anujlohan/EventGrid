import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBadge } from '../common/StatusBadge';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const CompetitionTitle = ({
  title,
  organizer,
  category,
  lifecycleStatus,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        {category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        ) : null}
        <StatusBadge status={lifecycleStatus} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {organizer ? (
        <View style={styles.organizerRow}>
          <Text style={styles.hostedBy}>Hosted by </Text>
          <Text style={styles.organizerName}>{organizer}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoryText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.primary,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    lineHeight: TYPOGRAPHY.lineHeight.loose,
    marginBottom: 6,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostedBy: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  organizerName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
  },
});
