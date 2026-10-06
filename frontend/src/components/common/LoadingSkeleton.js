import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const LoadingSkeleton = ({ message = 'Loading competitions...' }) => {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {message ? (
        <View style={styles.headerInfo}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.cardsGrid}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.skeletonCard}>
            {/* Image / Header placeholder */}
            <Animated.View style={[styles.skeletonBanner, { opacity: pulseAnim }]} />

            <View style={styles.cardContent}>
              {/* Badges row */}
              <View style={styles.badgeRow}>
                <Animated.View style={[styles.skeletonBadge, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.skeletonStatus, { opacity: pulseAnim }]} />
              </View>

              {/* Title & subtitle */}
              <Animated.View style={[styles.skeletonTitle, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonSubtitle, { opacity: pulseAnim }]} />

              {/* Details pills */}
              <View style={styles.detailsRow}>
                <Animated.View style={[styles.skeletonPill, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.skeletonPill, { opacity: pulseAnim }]} />
              </View>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <Animated.View style={[styles.skeletonProgress, { opacity: pulseAnim }]} />
              </View>

              {/* Footer row */}
              <View style={styles.footerRow}>
                <Animated.View style={[styles.skeletonPrice, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.skeletonButton, { opacity: pulseAnim }]} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  headerInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  messageText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  cardsGrid: {
    width: '100%',
    maxWidth: 960,
    gap: 16,
  },
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  skeletonBanner: {
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
  },
  cardContent: {
    padding: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonBadge: {
    width: 80,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonStatus: {
    width: 60,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonTitle: {
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '75%',
    marginBottom: 10,
  },
  skeletonSubtitle: {
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    width: '45%',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  skeletonPill: {
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    width: 110,
  },
  progressSection: {
    marginBottom: 16,
  },
  skeletonProgress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  skeletonPrice: {
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 70,
  },
  skeletonButton: {
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 95,
  },
});
