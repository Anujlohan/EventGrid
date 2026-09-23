import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyCompetitionsState } from '../components/common/EmptyCompetitionsState';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { formatDateShort } from '../utils/dateUtils';

export const DashboardScreen = ({
  competitions = [],
  userRegistrations = [],
  activeUser,
  loading,
  refreshing,
  onRefresh,
  onSelectCompetition,
  onCreateCompetitionPress,
  onOpenProfile,
  onLogout,
  onCancelRegistration,
}) => {
  // Tab State: 'EXPLORE' | 'MY_REGISTRATIONS'
  const [activeTab, setActiveTab] = useState('EXPLORE');

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Extract unique categories from real competitions safely
  const safeCompetitions = Array.isArray(competitions) ? competitions : [];
  const safeRegistrations = Array.isArray(userRegistrations) ? userRegistrations : [];

  const categories = ['All', ...new Set(safeCompetitions.map((c) => c?.category).filter(Boolean))];

  // Filter competitions
  const filteredCompetitions = safeCompetitions.filter((comp) => {
    if (!comp) return false;
    const matchCategory = selectedCategory === 'All' || comp.category === selectedCategory;
    const matchStatus =
      selectedStatus === 'All' ||
      (selectedStatus === 'Open' && comp.lifecycleStatus === 'REGISTRATION_OPEN') ||
      (selectedStatus === 'Upcoming' && comp.lifecycleStatus === 'UPCOMING') ||
      (selectedStatus === 'Live' && comp.lifecycleStatus === 'LIVE') ||
      (selectedStatus === 'Full' && comp.lifecycleStatus === 'FULL');
    return matchCategory && matchStatus;
  });

  // Check if active user is registered for a competition ID
  const isUserRegisteredFor = (compId) => {
    return safeRegistrations.some(
      (r) => r && (r.competitionId?._id === compId || r.competitionId === compId) && r.status === 'CONFIRMED'
    );
  };

  const handleCancelPress = (reg) => {
    const compTitle = reg.competitionTitle || reg.competition?.title || 'this competition';
    const compId = reg.competitionId?._id || reg.competitionId;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to cancel your registration for "${compTitle}"? Your spot will be restored to the available capacity.`);
      if (confirmed) {
        onCancelRegistration(compId);
      }
      return;
    }

    Alert.alert(
      'Cancel Registration',
      `Are you sure you want to cancel your registration for "${compTitle}"? Your spot will be restored to the available capacity.`,
      [
        { text: 'Keep Registration', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            onCancelRegistration(compId);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Dashboard Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandTitle}>Competitions Dashboard</Text>
          </View>

          <View style={styles.headerActions}>
            {/* Authenticated User Profile Pill */}
            <TouchableOpacity
              style={styles.userPill}
              onPress={onOpenProfile}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.userPillIcon}>👤</Text>
              <Text style={styles.userPillText} numberOfLines={1}>
                {activeUser?.name ? activeUser.name.split(' ')[0] : 'Profile'}
              </Text>
            </TouchableOpacity>

            {/* Create Competition Action */}
            <TouchableOpacity
              style={styles.createBtn}
              onPress={onCreateCompetitionPress}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.createBtnText}>+ Add Event</Text>
            </TouchableOpacity>

            {/* Logout Action */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={onLogout}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'EXPLORE' && styles.tabItemActive]}
            onPress={() => setActiveTab('EXPLORE')}
            activeOpacity={0.7}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabText, activeTab === 'EXPLORE' && styles.tabTextActive]}>
              Explore Competitions
            </Text>
            {safeCompetitions.length > 0 ? (
              <View style={[styles.badge, activeTab === 'EXPLORE' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'EXPLORE' && styles.badgeTextActive]}>
                  {safeCompetitions.length}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'MY_REGISTRATIONS' && styles.tabItemActive]}
            onPress={() => setActiveTab('MY_REGISTRATIONS')}
            activeOpacity={0.7}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabText, activeTab === 'MY_REGISTRATIONS' && styles.tabTextActive]}>
              My Registrations
            </Text>
            {safeRegistrations.filter((r) => r?.status === 'CONFIRMED').length > 0 ? (
              <View style={[styles.badge, activeTab === 'MY_REGISTRATIONS' && styles.badgeActive]}>
                <Text
                  style={[
                    styles.badgeText,
                    activeTab === 'MY_REGISTRATIONS' && styles.badgeTextActive,
                  ]}
                >
                  {safeRegistrations.filter((r) => r?.status === 'CONFIRMED').length}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {activeTab === 'EXPLORE' ? (
          /* ================= EXPLORE COMPETITIONS TAB ================= */
          <View>
            {competitions.length === 0 ? (
              <EmptyCompetitionsState
                onCreateCompetition={onCreateCompetitionPress}
                onRefresh={onRefresh}
              />
            ) : (
              <View>
                {/* Category Filters */}
                {categories.length > 2 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterScrollContent}
                  >
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                        onPress={() => setSelectedCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selectedCategory === cat && styles.filterChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}

                {/* Competition Cards */}
                <View style={styles.cardsList}>
                  {filteredCompetitions.map((comp) => {
                    const isRegistered = isUserRegisteredFor(comp._id);
                    const spotsRemaining =
                      comp.remainingSpots !== undefined
                        ? comp.remainingSpots
                        : Math.max(0, comp.totalSpots - comp.registeredCount);
                    const percentFilled = Math.min(
                      100,
                      Math.round((comp.registeredCount / comp.totalSpots) * 100)
                    );

                    return (
                      <TouchableOpacity
                        key={comp._id}
                        style={styles.compCard}
                        onPress={() => onSelectCompetition(comp._id)}
                        activeOpacity={0.85}
                      >
                        {/* Top Card Row */}
                        <View style={styles.cardHeader}>
                          <View style={styles.categoryPill}>
                            <Text style={styles.categoryPillText}>{comp.category}</Text>
                          </View>
                          <View style={styles.statusRow}>
                            {isRegistered ? (
                              <View style={styles.registeredBadge}>
                                <Text style={styles.registeredBadgeText}>✓ Registered</Text>
                              </View>
                            ) : null}
                            <StatusBadge status={comp.lifecycleStatus} />
                          </View>
                        </View>

                        {/* Title & Organizer */}
                        <Text style={styles.compTitle}>{comp.title}</Text>
                        <Text style={styles.compOrganizer}>Organized by {comp.organizer}</Text>

                        {/* Location & Format */}
                        {comp.location ? (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>
                              {comp.location.type === 'Online' ? '🌐' : '📍'}
                            </Text>
                            <Text style={styles.infoText}>
                              {comp.location.type}
                              {comp.location.venue ? ` • ${comp.location.venue}` : ''}
                              {comp.location.city ? ` (${comp.location.city})` : ''}
                            </Text>
                          </View>
                        ) : null}

                        {/* Dates */}
                        <View style={styles.infoRow}>
                          <Text style={styles.infoIcon}>📅</Text>
                          <Text style={styles.infoText}>
                            Event: {formatDateShort(comp.startDate)}
                            {comp.endDate ? ` – ${formatDateShort(comp.endDate)}` : ''}
                          </Text>
                        </View>

                        {/* Capacity Progress Bar */}
                        <View style={styles.capacitySection}>
                          <View style={styles.capacityLabelRow}>
                            <Text style={styles.capacityText}>
                              {comp.registeredCount} of {comp.totalSpots} spots reserved
                            </Text>
                            <Text style={styles.capacityHighlight}>
                              {spotsRemaining === 0 ? 'Full' : `${spotsRemaining} spots left`}
                            </Text>
                          </View>
                          <View style={styles.progressBarBackground}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${percentFilled}%` },
                                spotsRemaining === 0 && styles.progressBarFillRed,
                              ]}
                            />
                          </View>
                        </View>

                        {/* Card Bottom Action */}
                        <View style={styles.cardFooter}>
                          <Text style={styles.feeText}>
                            {comp.entryFee === 'Free' || !comp.entryFee
                              ? 'Free Entry'
                              : `Fee: ${comp.entryFee}`}
                          </Text>
                          <Text style={styles.viewDetailsText}>View Details & Register →</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : (
          /* ================= MY REGISTRATIONS TAB ================= */
          <View>
            {!activeUser ? (
              <View style={styles.emptyRegistrationsBox}>
                <Text style={styles.emptyIcon}>👤</Text>
                <Text style={styles.emptyTitle}>User Profile Not Set</Text>
                <Text style={styles.emptySubtitle}>
                  Please set or select your user profile to view your registrations.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={onOpenUserProfile}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionText}>Set User Profile</Text>
                </TouchableOpacity>
              </View>
            ) : safeRegistrations.length === 0 ? (
              <View style={styles.emptyRegistrationsBox}>
                <Text style={styles.emptyIcon}>🎫</Text>
                <Text style={styles.emptyTitle}>No Registrations Yet</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't registered for any competitions yet. Browse available events and reserve your spot!
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setActiveTab('EXPLORE')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionText}>Browse Available Competitions</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.registrationsList}>
                <Text style={styles.sectionHeader}>
                  YOUR ACTIVE & PAST REGISTRATIONS ({safeRegistrations.length})
                </Text>

                {safeRegistrations.map((reg) => {
                  const compId = reg.competitionId?._id || reg.competitionId;
                  const isConfirmed = reg.status === 'CONFIRMED';

                  return (
                    <View key={reg._id} style={styles.regCard}>
                      <View style={styles.regCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.regCompTitle}>{reg.competitionTitle}</Text>
                          <Text style={styles.regCategory}>{reg.competitionCategory}</Text>
                        </View>
                        <View
                          style={[
                            styles.regStatusPill,
                            isConfirmed ? styles.regStatusConfirmed : styles.regStatusCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.regStatusText,
                              isConfirmed
                                ? styles.regStatusTextConfirmed
                                : styles.regStatusTextCancelled,
                            ]}
                          >
                            {reg.status}
                          </Text>
                        </View>
                      </View>

                      {/* Participant Details Summary */}
                      {reg.participantDetails ? (
                        <View style={styles.participantBox}>
                          <Text style={styles.participantBoxTitle}>REGISTERED PARTICIPANT</Text>
                          <Text style={styles.participantName}>
                            👤 {reg.participantDetails.fullName}
                          </Text>
                          <Text style={styles.participantMeta}>
                            ✉️ {reg.participantDetails.email} • 📞 {reg.participantDetails.phone}
                          </Text>
                        </View>
                      ) : null}

                      {/* Timeline & Location */}
                      <View style={styles.regInfoRow}>
                        <Text style={styles.regInfoText}>
                          📅 Event: {formatDateShort(reg.startDate)}
                        </Text>
                        {reg.registeredAt ? (
                          <Text style={styles.regDateText}>
                            Registered {formatDateShort(reg.registeredAt)}
                          </Text>
                        ) : null}
                      </View>

                      {/* Registration Actions */}
                      <View style={styles.regCardActions}>
                        <TouchableOpacity
                          style={styles.regViewBtn}
                          onPress={() => onSelectCompetition(compId)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.regViewBtnText}>View Details</Text>
                        </TouchableOpacity>

                        {isConfirmed && reg.isCancellable ? (
                          <TouchableOpacity
                            style={styles.regCancelBtn}
                            onPress={() => handleCancelPress(reg)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.regCancelBtnText}>Cancel Registration</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingTop: 8,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userPillIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  userPillText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 90,
  },
  createBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#38BDF8',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  badgeActive: {
    backgroundColor: '#0284C7',
  },
  badgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cardsList: {
    gap: 14,
  },
  compCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  registeredBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  registeredBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: 'bold',
  },
  compTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  compOrganizer: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  capacitySection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  capacityText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  capacityHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressBarFillRed: {
    backgroundColor: '#EF4444',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  feeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyRegistrationsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  registrationsList: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  regCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  regCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  regCompTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  regCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  regStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  regStatusConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  regStatusCancelled: {
    backgroundColor: '#F1F5F9',
  },
  regStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  regStatusTextConfirmed: {
    color: '#15803D',
  },
  regStatusTextCancelled: {
    color: '#64748B',
  },
  participantBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  participantBoxTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  participantName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  participantMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  regInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  regInfoText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  regDateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  regCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  regViewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  regViewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  regCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  regCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
