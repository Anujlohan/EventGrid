import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBadge } from '../common/StatusBadge';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

import { formatCategoryLabel } from '../../constants/eventCategories';

export const CompetitionTitle = ({
  title,
  organizer,
  category,
  subcategory,
  sportType,
  lifecycleStatus,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        {category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {formatCategoryLabel(category, sportType || subcategory)}
            </Text>
          </View>
        ) : null}
        <StatusBadge status={lifecycleStatus} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {organizer ? (
        <View style={styles.organizerRow}>
          <View style={styles.organizerAvatar}>
            <Text style={styles.organizerAvatarText}>{organizer.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.organizerName}>{organizer}</Text>
              <Text style={styles.verifiedBadge}>✓</Text>
            </View>
            <Text style={styles.hostedBy}>Event Organizer</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  categoryText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#C4B5FD',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 34,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  organizerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  organizerAvatarText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  hostedBy: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  organizerName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  verifiedBadge: {
    fontSize: 10,
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
