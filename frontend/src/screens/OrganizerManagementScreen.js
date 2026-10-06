import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { formatDateShort } from '../utils/dateUtils';
import { competitionService } from '../services/competitionService';
import { generateRosterCsv, downloadCsvFile } from '../utils/csvExport';

const PAGE_SIZE = 15;

const STATUS_FILTERS = ['All', 'CONFIRMED', 'WAITLISTED', 'CANCELLED'];

/**
 * Checks if a user is an authorized organizer (creator or Admin)
 */
export const isAuthorizedOrganizer = (competition, user) => {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (!competition) return false;

  const creatorId =
    competition.createdBy?._id ||
    competition.createdBy?.id ||
    competition.createdBy;
  const userId = user._id || user.id || user.userId;

  return Boolean(creatorId && userId && String(creatorId) === String(userId));
};

export const OrganizerManagementScreen = ({
  competitionId,
  activeUser,
  onBack,
}) => {
  // Competition & Authorization State
  const [competition, setCompetition] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null); // null = checking, true/false
  const [authErrorStatus, setAuthErrorStatus] = useState(null); // 403 | 404 | null

  // Roster & Pagination State
  const [participants, setParticipants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // UI & Loading States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Fetch Competition Details & Validate Initial Authorization
  const initScreen = useCallback(async () => {
    setLoadingInitial(true);
    setErrorMessage(null);
    setAuthErrorStatus(null);

    try {
      const compData = await competitionService.getCompetitionById(competitionId);
      const comp = compData?.competition || compData;
      setCompetition(comp);

      // Verify client-side authorization
      const authorized = isAuthorizedOrganizer(comp, activeUser);
      setIsAuthorized(authorized);

      if (!authorized) {
        setAuthErrorStatus(403);
        setLoadingInitial(false);
        return;
      }

      // Load initial roster page
      await loadRoster(1, statusFilter);
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 404) {
        setAuthErrorStatus(404);
      } else if (status === 403) {
        setAuthErrorStatus(403);
      } else {
        setErrorMessage(err?.message || 'Failed to initialize organizer management.');
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [competitionId, activeUser]);

  // Load Paginated Participant Roster from API
  const loadRoster = async (pageToLoad = 1, currentStatus = statusFilter) => {
    setLoadingRoster(true);
    setErrorMessage(null);

    try {
      const params = {
        page: pageToLoad,
        limit: PAGE_SIZE,
      };

      if (currentStatus !== 'All') {
        params.status = currentStatus;
      }

      const res = await competitionService.getCompetitionParticipants(competitionId, params);

      const items = Array.isArray(res?.participants) ? res.participants : [];
      setParticipants(items);
      setPage(res?.page || pageToLoad);
      setTotalPages(res?.totalPages || (items.length > 0 ? 1 : 0));
      setTotalCount(res?.total !== undefined ? res.total : items.length);
      setIsAuthorized(true);
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 403) {
        setIsAuthorized(false);
        setAuthErrorStatus(403);
      } else if (status === 404) {
        setAuthErrorStatus(404);
      } else {
        setErrorMessage(err?.message || 'Failed to load participant roster.');
      }
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    initScreen();
  }, [initScreen]);

  // Handle status filter change
  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
    loadRoster(1, newStatus);
  };

  // Client-side search filtering over current loaded participants
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase().trim();

    return participants.filter((p) => {
      const name = (p.participantDetails?.fullName || p.user?.name || '').toLowerCase();
      const email = (p.participantDetails?.email || p.user?.email || '').toLowerCase();
      const phone = (p.participantDetails?.phone || p.user?.phoneNumber || '').toLowerCase();
      const college = (p.participantDetails?.collegeOrOrg || p.user?.college || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || college.includes(q);
    });
  }, [participants, searchQuery]);

  // Handle CSV Export
  const handleExportCsv = () => {
    if (!filteredParticipants || filteredParticipants.length === 0) {
      Alert.alert('Empty Roster', 'There are no participants to export under the current filter.');
      return;
    }

    try {
      const title = competition?.title || 'Competition';
      const csvContent = generateRosterCsv(filteredParticipants, title);
      const filename = `roster_${competitionId}_${statusFilter.toLowerCase()}.csv`;

      const downloaded = downloadCsvFile(csvContent, filename);

      if (downloaded) {
        setFeedbackMessage('CSV roster exported successfully!');
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        // Fallback for native/mock environments
        Alert.alert('CSV Generated', `Roster CSV generated with ${filteredParticipants.length} entries.`);
      }
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'Failed to export CSV.');
    }
  };

  // 1. Initial Loading State
  if (loadingInitial) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Verifying organizer authorization...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. 403 Access Denied State
  if (authErrorStatus === 403 || isAuthorized === false) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIconLarge}>🔒</Text>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorSubtitle}>
            Only the competition creator or a system administrator has permission to access the participant roster.
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>← Return to Competition</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 3. 404 Not Found State
  if (authErrorStatus === 404) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIconLarge}>🔍</Text>
          <Text style={styles.errorTitle}>Competition Not Found</Text>
          <Text style={styles.errorSubtitle}>
            The requested competition could not be located or has been permanently removed.
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Organizer Portal
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {competition?.title || 'Participant Roster'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExportCsv}
          activeOpacity={0.8}
          accessibilityLabel="Export participant roster as CSV"
        >
          <Text style={styles.exportBtnText}>📥 Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Success Feedback Banner */}
      {feedbackMessage ? (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackBannerText}>✓ {feedbackMessage}</Text>
        </View>
      ) : null}

      {/* Filter and Search Toolbar */}
      <View style={styles.toolbar}>
        {/* Search Input */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, phone, or organization..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipsRow}
        >
          {STATUS_FILTERS.map((st) => {
            const isActive = statusFilter === st;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.statusChip, isActive && styles.statusChipActive]}
                onPress={() => handleStatusChange(st)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                  {st === 'All' ? 'All Statuses' : st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Count & Meta */}
      <View style={styles.metaRow}>
        <Text style={styles.metaCountText}>
          Showing {filteredParticipants.length} of {totalCount} registrations
        </Text>
        <Text style={styles.metaPageText}>
          Page {page} of {Math.max(1, totalPages)}
        </Text>
      </View>

      {/* Main Roster List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error State with Retry Button */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxTitle}>⚠️ Error loading roster</Text>
            <Text style={styles.errorBoxText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadRoster(page, statusFilter)}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>↻ Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Loading Spinner */}
        {loadingRoster ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.inlineLoadingText}>Loading participant roster...</Text>
          </View>
        ) : filteredParticipants.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Participants Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No participants matched "${searchQuery}".`
                : statusFilter !== 'All'
                ? `No participants found with status "${statusFilter}".`
                : 'No participants have registered for this competition yet.'}
            </Text>
            {searchQuery || statusFilter !== 'All' ? (
              <TouchableOpacity
                style={styles.resetFiltersBtn}
                onPress={() => {
                  setSearchQuery('');
                  handleStatusChange('All');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          /* Participant Cards */
          <View style={styles.rosterList}>
            {filteredParticipants.map((p, idx) => {
              const name = p.participantDetails?.fullName || p.user?.name || 'Anonymous Participant';
              const email = p.participantDetails?.email || p.user?.email || 'No email provided';
              const phone = p.participantDetails?.phone || p.user?.phoneNumber || 'No phone';
              const college = p.participantDetails?.collegeOrOrg || p.user?.college || p.user?.organization;
              const exp = p.participantDetails?.experienceLevel || p.user?.experienceLevel;
              const status = p.status || 'CONFIRMED';
              const isConfirmed = status === 'CONFIRMED';
              const isWaitlisted = status === 'WAITLISTED';

              return (
                <View key={p.registrationId || `p-${idx}`} style={styles.participantCard}>
                  {/* Card Header: Avatar, Name, Email & Status Pill */}
                  <View style={styles.cardHeader}>
                    <View style={styles.participantMetaLeft}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {(name.trim().slice(0, 2)).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.participantName}>{name}</Text>
                        <Text style={styles.participantEmail}>✉️ {email}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isConfirmed
                          ? styles.statusPillConfirmed
                          : isWaitlisted
                          ? styles.statusPillWaitlisted
                          : styles.statusPillCancelled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isConfirmed
                            ? styles.statusPillTextConfirmed
                            : isWaitlisted
                            ? styles.statusPillTextWaitlisted
                            : styles.statusPillTextCancelled,
                        ]}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>

                  {/* Contact & Meta Row */}
                  <View style={styles.cardDetailsRow}>
                    <Text style={styles.cardDetailItem}>📞 {phone}</Text>
                    {p.registeredAt ? (
                      <Text style={styles.cardDetailItem}>
                        📅 {formatDateShort(p.registeredAt)}
                      </Text>
                    ) : null}
                  </View>

                  {/* Organization / College details */}
                  {college ? (
                    <View style={styles.customFieldRow}>
                      <Text style={styles.customFieldLabel}>College / Org:</Text>
                      <Text style={styles.customFieldValue}>{college}</Text>
                    </View>
                  ) : null}

                  {/* Experience Level */}
                  {exp ? (
                    <View style={styles.customFieldRow}>
                      <Text style={styles.customFieldLabel}>Experience:</Text>
                      <Text style={styles.customFieldValue}>{exp}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 ? (
          <View style={styles.paginationBar}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => loadRoster(page - 1, statusFilter)}
              disabled={page <= 1 || loadingRoster}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            <Text style={styles.pageIndicator}>
              Page {page} of {totalPages}
            </Text>

            <TouchableOpacity
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
              onPress={() => loadRoster(page + 1, statusFilter)}
              disabled={page >= totalPages || loadingRoster}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>
                Next →
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryLight || '#60A5FA',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  exportBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackBanner: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
  },
  feedbackBannerText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toolbar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1120',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    outlineStyle: 'none',
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  statusChipsRow: {
    gap: 8,
  },
  statusChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metaCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metaPageText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  errorIconLarge: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#991B1B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorBoxTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F87171',
    marginBottom: 4,
  },
  errorBoxText: {
    fontSize: 12,
    color: '#FCA5A5',
    marginBottom: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  inlineLoadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFiltersBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFiltersBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rosterList: {
    gap: 12,
  },
  participantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
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
  participantMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60A5FA',
  },
  participantName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  participantEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillConfirmed: {
    backgroundColor: '#064E3B',
  },
  statusPillWaitlisted: {
    backgroundColor: '#78350F',
  },
  statusPillCancelled: {
    backgroundColor: '#1E293B',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextConfirmed: {
    color: '#34D399',
  },
  statusPillTextWaitlisted: {
    color: '#FBBF24',
  },
  statusPillTextCancelled: {
    color: '#94A3B8',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    marginTop: 4,
  },
  cardDetailItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  customFieldRow: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 6,
  },
  customFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  customFieldValue: {
    fontSize: 11,
    color: COLORS.textPrimary,
    flex: 1,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pageBtnDisabled: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  pageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pageBtnTextDisabled: {
    color: '#64748B',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
