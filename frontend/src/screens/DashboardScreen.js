import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyCompetitionsState } from '../components/common/EmptyCompetitionsState';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { formatDateShort } from '../utils/dateUtils';
import { competitionService } from '../services/competitionService';
import { storageService } from '../services/storageService';
import { canCreateCompetition } from '../utils/roleUtils';
import {
  EVENT_CATEGORIES,
  SPORTS_GAMES_EXAMPLES,
  formatCategoryLabel,
  getCategoryMeta,
} from '../constants/eventCategories';

const PAGE_LIMIT = 10;

const CATEGORY_OPTIONS = [
  { label: 'All', icon: '🌐' },
  ...EVENT_CATEGORIES.map((c) => ({
    label: c.name,
    icon: c.icon,
  })),
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Open', value: 'Open' },
  { label: 'Upcoming', value: 'Upcoming' },
  { label: 'Live Now', value: 'Live' },
  { label: 'Full', value: 'Full' },
  { label: 'Closed', value: 'Closed' },
];

const SORT_OPTIONS = [
  { label: 'Soonest Date', sortBy: 'startDate', order: 'asc' },
  { label: 'Furthest Date', sortBy: 'startDate', order: 'desc' },
  { label: 'Newest Added', sortBy: 'createdAt', order: 'desc' },
  { label: 'Registration Deadline', sortBy: 'registrationDeadline', order: 'asc' },
  { label: 'Title (A–Z)', sortBy: 'title', order: 'asc' },
];

export const DashboardScreen = ({
  competitions: initialCompetitions = [],
  userRegistrations = [],
  activeUser,
  loading: parentLoading = false,
  refreshing: parentRefreshing = false,
  onRefresh,
  onSelectCompetition,
  onCreateCompetitionPress,
  onOpenProfile,
  onLogout,
  onNavigateToLogin,
  onNavigateToSignup,
  onCancelRegistration,
}) => {
  // Tab State: 'EXPLORE' | 'SAVED' | 'MY_REGISTRATIONS'
  const [activeTab, setActiveTab] = useState('EXPLORE');

  // Bookmarked / Saved Event IDs
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  // Search & Filter States
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSortIndex, setSelectedSortIndex] = useState(0);

  // Paginated List State
  const [competitionsList, setCompetitionsList] = useState(
    Array.isArray(initialCompetitions) ? initialCompetitions : []
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(
    Array.isArray(initialCompetitions) ? initialCompetitions.length : 0
  );

  // Loading & Error States
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search Focus State for interactive glow
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Concurrency & Stale Response Prevention
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);

  // Load Bookmarks on Mount
  useEffect(() => {
    storageService.getBookmarks().then((ids) => {
      setBookmarkedIds(Array.isArray(ids) ? ids : []);
    });
  }, []);

  const handleToggleBookmark = async (compId, e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const isSaved = await storageService.toggleBookmark(compId);
    setBookmarkedIds((prev) =>
      isSaved ? [...prev, String(compId)] : prev.filter((id) => id !== String(compId))
    );
  };

  // Registrations extraction
  const safeRegistrations = Array.isArray(userRegistrations) ? userRegistrations : [];

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync competitionsList when parent initialCompetitions changes
  useEffect(() => {
    if (Array.isArray(initialCompetitions)) {
      setCompetitionsList(initialCompetitions);
      setTotalCount(initialCompetitions.length);
    }
  }, [initialCompetitions]);

  // Fetch paginated competitions
  const fetchPage = useCallback(
    async ({ pageToLoad = 1, append = false, isRefresh = false } = {}) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const currentReqId = ++requestIdRef.current;

      if (append) {
        setLoadingMore(true);
      } else if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoadingInitial(true);
      }
      setError(null);

      try {
        const activeSort = SORT_OPTIONS[selectedSortIndex] || SORT_OPTIONS[0];
        const params = {
          page: pageToLoad,
          limit: PAGE_LIMIT,
          search: debouncedSearch,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          sportType:
            selectedCategory === 'Sports & Games' && selectedSport !== 'All'
              ? selectedSport
              : undefined,
          status: selectedStatus !== 'All' ? selectedStatus : undefined,
          sortBy: activeSort.sortBy,
          order: activeSort.order,
        };

        const res = await competitionService.getCompetitions(params);

        if (currentReqId !== requestIdRef.current) {
          return;
        }

        const newItems = Array.isArray(res?.competitions) ? res.competitions : [];
        const resPage = res?.page || pageToLoad;
        const resTotalPages = typeof res?.totalPages === 'number' ? res.totalPages : 1;
        const resTotal = typeof res?.total === 'number' ? res.total : newItems.length;

        setCompetitionsList((prev) => (append ? [...prev, ...newItems] : newItems));
        setPage(resPage);
        setTotalPages(resTotalPages);
        setTotalCount(resTotal);
      } catch (err) {
        if (currentReqId !== requestIdRef.current) return;
        setError(err?.message || 'Failed to load competitions. Please check your connection.');
      } finally {
        if (currentReqId === requestIdRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
          setIsRefreshing(false);
        }
        isFetchingRef.current = false;
      }
    },
    [debouncedSearch, selectedCategory, selectedSport, selectedStatus, selectedSortIndex]
  );

  // Trigger page 1 fetch when debounced search or filters change
  useEffect(() => {
    fetchPage({ pageToLoad: 1, append: false });
  }, [fetchPage]);

  // Refresh handler
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    await fetchPage({ pageToLoad: 1, isRefresh: true });
  };

  // Load next page
  const handleLoadMore = () => {
    if (loadingInitial || loadingMore || isRefreshing) return;
    if (page >= totalPages) return;
    fetchPage({ pageToLoad: page + 1, append: true });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedSport('All');
    setSelectedStatus('All');
    setSelectedSortIndex(0);
  };

  // Check if active user is registered for a competition ID
  const isUserRegisteredFor = (compId) => {
    return safeRegistrations.some(
      (r) =>
        r &&
        (r.competitionId?._id === compId || r.competitionId === compId) &&
        r.status === 'CONFIRMED'
    );
  };

  // Cancellation handler
  const handleCancelPress = (reg) => {
    const compTitle = reg.competitionTitle || reg.competition?.title || 'this competition';
    const compId = reg.competitionId?._id || reg.competitionId;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Are you sure you want to cancel your registration for "${compTitle}"? Your spot will be restored to the available capacity.`
      );
      if (confirmed && onCancelRegistration) {
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
            if (onCancelRegistration) {
              onCancelRegistration(compId);
            }
          },
        },
      ]
    );
  };

  // Dynamic categories list
  const allCategories = useMemo(() => {
    const defaultLabels = CATEGORY_OPTIONS.map((c) => c.label);
    const fromComps = competitionsList.map((c) => c?.category).filter(Boolean);
    return [...new Set([...defaultLabels, ...fromComps])];
  }, [competitionsList]);  // Render Skeleton Placeholders during initial load
  const renderSkeletons = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonBar} />
        </View>
      ))}
    </View>
  );

  // Render Individual Practical Competition Card
  const renderCompetitionCard = ({ item: comp }) => {
    if (!comp) return null;

    const isRegistered = isUserRegisteredFor(comp._id);
    const isBookmarked = bookmarkedIds.includes(String(comp._id));
    const spotsRemaining =
      comp.remainingSpots !== undefined
        ? comp.remainingSpots
        : Math.max(0, comp.totalSpots - (comp.registeredCount || 0));
    const percentFilled = Math.min(
      100,
      Math.round(((comp.registeredCount || 0) / (comp.totalSpots || 1)) * 100)
    );
    const catMeta = getCategoryMeta(comp.category);

    return (
      <TouchableOpacity
        testID={`competition-card-${comp._id}`}
        style={styles.compCard}
        onPress={() => onSelectCompetition && onSelectCompetition(comp._id)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`View ${comp.title}`}
      >
        {/* Banner with Image or Category Visual Fallback */}
        <View style={styles.cardImageContainer}>
          {comp.image ? (
            <Image source={{ uri: comp.image }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.cardFallbackBanner}>
              <Text style={styles.cardFallbackIcon}>{catMeta?.icon || '🏆'}</Text>
              <Text style={styles.cardFallbackCategory}>
                {formatCategoryLabel(comp.category, comp.sportType || comp.subcategory)}
              </Text>
            </View>
          )}

          {/* Interactive Bookmark Star Button */}
          <TouchableOpacity
            style={[styles.cardBookmarkBtn, isBookmarked && styles.cardBookmarkBtnActive]}
            onPress={(e) => handleToggleBookmark(comp._id, e)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark competition'}
          >
            <Text style={[styles.cardBookmarkIcon, isBookmarked && styles.cardBookmarkIconActive]}>
              {isBookmarked ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>
                {formatCategoryLabel(comp.category, comp.sportType || comp.subcategory)}
              </Text>
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

          <Text style={styles.compTitle} numberOfLines={2}>
            {comp.title}
          </Text>
          {comp.organizer ? (
            <View style={styles.organizerRow}>
              <View style={styles.hostAvatarSmall}>
                <Text style={styles.hostAvatarText}>{comp.organizer.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.compOrganizer} numberOfLines={1}>
                Hosted by <Text style={styles.compOrganizerName}>{comp.organizer}</Text>
              </Text>
            </View>
          ) : null}

          {/* Key Details: Dates & Location */}
          <View style={styles.metricsRow}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>
                📅 {formatDateShort(comp.startDate)}
                {comp.endDate ? ` – ${formatDateShort(comp.endDate)}` : ''}
              </Text>
            </View>

            {comp.location ? (
              <View style={styles.infoBadge}>
                <Text style={styles.infoText}>
                  📍 {comp.location?.mode || comp.location?.type || 'Online'}
                  {comp.location?.city ? ` • ${comp.location.city}` : ''}
                </Text>
              </View>
            ) : null}

            {comp.prizePool && comp.prizePool.trim() ? (
              <View style={styles.prizeBadge}>
                <Text style={styles.prizeText}>🏆 {comp.prizePool}</Text>
              </View>
            ) : null}
          </View>

          {/* Capacity Progress Bar */}
          <View style={styles.capacitySection}>
            <View style={styles.capacityLabelRow}>
              <Text style={styles.capacityText}>
                {comp.registeredCount || 0} / {comp.totalSpots} registered
              </Text>
              <Text
                style={[
                  styles.capacityRemainingText,
                  spotsRemaining === 0
                    ? styles.capacityFullText
                    : spotsRemaining <= 5
                    ? styles.capacityWarningText
                    : null,
                ]}
              >
                {spotsRemaining === 0 ? 'Full Capacity' : `${spotsRemaining} spots left`}
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${percentFilled}%` },
                  spotsRemaining === 0
                    ? styles.progressBarFillFull
                    : percentFilled > 80
                    ? styles.progressBarFillWarning
                    : null,
                ]}
              />
            </View>
          </View>

          {/* Footer Action Strip */}
          <View style={styles.cardFooter}>
            <Text style={styles.feeText}>
              {comp.entryFee && comp.entryFee !== 'Free' ? `Fee: ${comp.entryFee}` : 'Free Entry'}
            </Text>
            <View style={styles.viewDetailsCta}>
              <Text style={styles.viewDetailsText}>View Details →</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Header: Clean Discovery Header, Search, Categories, Filters
  const renderListHeader = () => (
    <View style={styles.headerControls}>
      {/* Clean Hero Discovery Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Find Your Next Challenge</Text>
        <Text style={styles.heroSubtitle}>
          Discover and participate in coding contests, hackathons, and technical competitions.
        </Text>

        {/* Interactive Search Bar */}
        <View
          style={[
            styles.heroSearchContainer,
            isSearchFocused && styles.heroSearchContainerFocused,
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            testID="dashboard-search-input"
            style={styles.heroSearchInput}
            placeholder="Search by title, category, sport, or organizer..."
            placeholderTextColor="#64748B"
            value={searchInput}
            onChangeText={setSearchInput}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search competitions"
          />
          {searchInput ? (
            <TouchableOpacity
              testID="search-clear-btn"
              style={styles.searchClearBtn}
              onPress={() => setSearchInput('')}
              accessibilityLabel="Clear search text"
            >
              <Text style={styles.searchClearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories Filter Strip */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {allCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const meta = getCategoryMeta(cat);
            const icon = meta?.icon || (cat === 'All' ? '🌐' : '📌');
            return (
              <TouchableOpacity
                key={cat}
                testID={`category-chip-${cat}`}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => {
                  setSelectedCategory(cat);
                  if (cat !== 'Sports & Games') setSelectedSport('All');
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {icon} {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sports & Games Subcategory Filter Strip */}
      {selectedCategory === 'Sports & Games' ? (
        <View style={styles.sportsSubFilterSection}>
          <Text style={styles.sportsSubFilterLabel}>SPORT:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportsScrollContent}
          >
            {['All', ...SPORTS_GAMES_EXAMPLES].map((sport) => {
              const isSportSelected = selectedSport === sport;
              const sportIcons = {
                All: '🏆',
                Cricket: '🏏',
                Football: '⚽',
                Basketball: '🏀',
                Badminton: '🏸',
                Chess: '♟️',
                Esports: '🎮',
              };
              const icon = sportIcons[sport] || '🏅';
              return (
                <TouchableOpacity
                  key={sport}
                  testID={`sport-chip-${sport}`}
                  style={[styles.sportChip, isSportSelected && styles.sportChipActive]}
                  onPress={() => setSelectedSport(sport)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.sportChipText,
                      isSportSelected && styles.sportChipTextActive,
                    ]}
                  >
                    {icon} {sport}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Status & Sort Toolbar */}
      <View style={styles.toolbarSection}>
        <View style={styles.filterRow}>
          <Text style={styles.toolbarLabel}>STATUS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusScrollContent}
          >
            {STATUS_OPTIONS.map((st) => {
              const isSelected = selectedStatus === st.value;
              return (
                <TouchableOpacity
                  key={st.value}
                  testID={`status-chip-${st.value}`}
                  style={[styles.statusChip, isSelected && styles.statusChipActive]}
                  onPress={() => setSelectedStatus(st.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.toolbarLabel}>SORT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusScrollContent}
          >
            {SORT_OPTIONS.map((opt, idx) => {
              const isSelected = selectedSortIndex === idx;
              return (
                <TouchableOpacity
                  key={opt.label}
                  testID={`sort-chip-${idx}`}
                  style={[styles.sortChip, isSelected && styles.sortChipActive]}
                  onPress={() => setSelectedSortIndex(idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortChipText, isSelected && styles.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Results Count & Reset Filter Indicator */}
      <View style={styles.resultsMetaRow}>
        <Text style={styles.resultsCountText}>
          Showing <Text style={styles.resultsCountNumber}>{totalCount}</Text>{' '}
          {totalCount === 1 ? 'competition' : 'competitions'}
        </Text>
        {debouncedSearch || selectedCategory !== 'All' || selectedStatus !== 'All' ? (
          <TouchableOpacity onPress={handleClearFilters} style={styles.resetFiltersBtn}>
            <Text style={styles.resetFiltersBtnText}>Reset Filters ✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  // Render Footer: Loading More Spinner or End of Feed
  const renderListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={styles.footerLoaderText}>Loading more competitions...</Text>
        </View>
      );
    }

    if (page >= totalPages && competitionsList.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>All competitions loaded • {totalCount} total</Text>
        </View>
      );
    }

    return <View style={{ height: 32 }} />;
  };

  // Render Empty or Error States
  const renderListEmpty = () => {
    if (loadingInitial) {
      return renderSkeletons();
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.stateErrorTitle}>Unable to Load Competitions</Text>
          <Text style={styles.stateErrorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchPage({ pageToLoad: 1, append: false })}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (debouncedSearch || selectedCategory !== 'All' || selectedStatus !== 'All') {
      return (
        <View style={styles.emptyFilteredBox}>
          <Text style={styles.emptyTitle}>No competitions found</Text>
          <Text style={styles.emptySubtitle}>
            No competitions matched your search or selected filters. Try changing your search query or resetting filters.
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersActionBtn}
            onPress={handleClearFilters}
            activeOpacity={0.8}
          >
            <Text style={styles.clearFiltersActionBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Global Empty Platform State
    const userCanCreate = canCreateCompetition(activeUser);
    return (
      <EmptyCompetitionsState
        onCreateCompetition={userCanCreate ? onCreateCompetitionPress : null}
        onRefresh={handleRefresh}
        canCreate={userCanCreate}
      />
    );
  };

  return (
    <View style={styles.root}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          {/* Logo Brand */}
          <View style={styles.brandGroup}>
            <Text style={styles.brandTitle}>EventGrid</Text>
            <Text style={styles.brandSubtitle}>Competitions</Text>
          </View>

          {/* Header Action Controls */}
          <View style={styles.headerActions}>
            {/* Create Competition Action - Strictly for Organizer or Admin */}
            {canCreateCompetition(activeUser) ? (
              <TouchableOpacity
                testID="dashboard-add-event-btn"
                style={styles.createBtn}
                onPress={onCreateCompetitionPress}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.createBtnText}>+ Add Event</Text>
              </TouchableOpacity>
            ) : null}

            {/* User Profile Pill & Sign Out (When Authenticated) */}
            {activeUser ? (
              <View style={styles.authRow}>
                <TouchableOpacity
                  style={styles.userPill}
                  onPress={onOpenProfile}
                  activeOpacity={0.8}
                >
                  <View style={styles.userRoleTag}>
                    <Text style={styles.userRoleTagText}>{activeUser.role || 'Participant'}</Text>
                  </View>
                  <Text style={styles.userPillText}>{activeUser.name?.split(' ')[0]}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={onLogout}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out of account"
                >
                  <Text style={styles.logoutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Public / Logged Out: Sign In & Register Buttons */
              <View style={styles.authRow}>
                <TouchableOpacity
                  style={styles.loginHeaderBtn}
                  onPress={onNavigateToLogin}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={styles.loginHeaderBtnText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.signupHeaderBtn}
                  onPress={onNavigateToSignup}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={styles.signupHeaderBtnText}>Register</Text>
                </TouchableOpacity>
              </View>
            )}
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
              Competitions
            </Text>
            {totalCount > 0 ? (
              <View style={[styles.badge, activeTab === 'EXPLORE' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'EXPLORE' && styles.badgeTextActive]}>
                  {totalCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'SAVED' && styles.tabItemActive]}
            onPress={() => setActiveTab('SAVED')}
            activeOpacity={0.7}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabText, activeTab === 'SAVED' && styles.tabTextActive]}>
              ★ Saved
            </Text>
            {bookmarkedIds.length > 0 ? (
              <View style={[styles.badge, activeTab === 'SAVED' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'SAVED' && styles.badgeTextActive]}>
                  {bookmarkedIds.length}
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

      {/* Main Discovery Feed */}
      {activeTab === 'EXPLORE' ? (
        <FlatList
          data={competitionsList}
          keyExtractor={(item, index) => item?._id || `comp-${index}`}
          renderItem={renderCompetitionCard}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderListEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || Boolean(parentRefreshing)}
              onRefresh={handleRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : activeTab === 'SAVED' ? (
        /* SAVED COMPETITIONS TAB */
        <ScrollView
          style={styles.registrationsScroll}
          contentContainerStyle={styles.registrationsScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || Boolean(parentRefreshing)}
              onRefresh={handleRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
            />
          }
        >
          {competitionsList.filter((c) => bookmarkedIds.includes(String(c?._id))).length === 0 ? (
            <View style={styles.emptyRegistrationsBox}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIconText}>★</Text>
              </View>
              <Text style={styles.emptyTitle}>No Saved Competitions</Text>
              <Text style={styles.emptySubtitle}>
                You haven't bookmarked any competitions yet. Tap the star icon on any competition card to save it for quick access!
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setActiveTab('EXPLORE')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionText}>Explore Competitions →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.savedCompetitionsList}>
              <Text style={styles.sectionHeader}>
                YOUR BOOKMARKED COMPETITIONS (
                {competitionsList.filter((c) => bookmarkedIds.includes(String(c?._id))).length})
              </Text>
              {competitionsList
                .filter((c) => bookmarkedIds.includes(String(c?._id)))
                .map((comp) => (
                  <View key={comp._id} style={{ marginBottom: 4 }}>
                    {renderCompetitionCard({ item: comp })}
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      ) : (
        /* MY REGISTRATIONS TAB */
        <ScrollView
          style={styles.registrationsScroll}
          contentContainerStyle={styles.registrationsScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={Boolean(parentRefreshing)}
              onRefresh={onRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
            />
          }
        >
          {!activeUser ? (
            <View style={styles.emptyRegistrationsBox}>
              <Text style={styles.emptyTitle}>Public Browsing Mode</Text>
              <Text style={styles.emptySubtitle}>
                You are currently exploring competitions in public mode. Sign in to track your event registrations.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={onNavigateToLogin}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.emptyActionText, { color: '#FFFFFF' }]}>Sign In to Account →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setActiveTab('EXPLORE')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionText}>Browse Competitions</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : safeRegistrations.length === 0 ? (
            <View style={styles.emptyRegistrationsBox}>
              <Text style={styles.emptyTitle}>No Registrations</Text>
              <Text style={styles.emptySubtitle}>
                You have not registered for any competitions yet. Browse available events and reserve your spot.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setActiveTab('EXPLORE')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionText}>Browse Competitions →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.registrationsList}>
              <Text style={styles.sectionHeader}>
                YOUR REGISTRATIONS ({safeRegistrations.length})
              </Text>

              {safeRegistrations.map((reg) => {
                const compId = reg.competitionId?._id || reg.competitionId;
                const isConfirmed = reg.status === 'CONFIRMED';

                return (
                  <View key={reg._id || `reg-${compId}`} style={styles.regCard}>
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
                          {reg.participantDetails.fullName}
                          {reg.participantDetails.email ? ` • ${reg.participantDetails.email}` : ''}
                        </Text>
                        {reg.participantDetails.collegeOrOrg ? (
                          <Text style={styles.participantDetail}>
                            {reg.participantDetails.collegeOrOrg}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Actions */}
                    <View style={styles.regCardActions}>
                      <TouchableOpacity
                        style={styles.regViewBtn}
                        onPress={() => onSelectCompetition && onSelectCompetition(compId)}
                      >
                        <Text style={styles.regViewBtnText}>View Details →</Text>
                      </TouchableOpacity>

                      {isConfirmed && onCancelRegistration ? (
                        <TouchableOpacity
                          style={styles.regCancelBtn}
                          onPress={() => handleCancelPress(reg)}
                        >
                          <Text style={styles.regCancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    backgroundColor: '#121A2D',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingTop: 12,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.size.xs,
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  loginHeaderBtnText: {
    color: '#E2E8F0',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
  },
  signupHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },
  signupHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  userRoleTag: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userRoleTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userPillText: {
    color: '#CBD5E1',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
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
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  badgeTextActive: {
    color: '#C4B5FD',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerControls: {
    paddingBottom: 8,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#0E1526',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#94A3B8',
    lineHeight: 20,
    maxWidth: 600,
    marginBottom: 16,
  },
  heroSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A2D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 7,
    maxWidth: 640,
  },
  heroSearchContainerFocused: {
    borderColor: '#8B5CF6',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: '#F8FAFC',
    outlineStyle: 'none',
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearBtnText: {
    color: '#64748B',
    fontSize: 14,
  },
  filterSection: {
    marginTop: 14,
    paddingHorizontal: 20,
  },
  filterScrollContent: {
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#121A2D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderColor: '#8B5CF6',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#C4B5FD',
    fontWeight: '600',
  },
  sportsSubFilterSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sportsSubFilterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  sportsScrollContent: {
    gap: 6,
  },
  sportChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sportChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: '#F59E0B',
  },
  sportChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  sportChipTextActive: {
    color: '#FDE68A',
    fontWeight: '600',
  },
  toolbarSection: {
    marginTop: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarLabel: {
    width: 56,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statusScrollContent: {
    gap: 6,
  },
  statusChip: {
    backgroundColor: '#121A2D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statusChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderColor: '#8B5CF6',
  },
  statusChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: '#C4B5FD',
    fontWeight: '600',
  },
  sortChip: {
    backgroundColor: '#121A2D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sortChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderColor: '#8B5CF6',
  },
  sortChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: '#C4B5FD',
    fontWeight: '600',
  },
  resultsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  resultsCountText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#64748B',
  },
  resultsCountNumber: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  resetFiltersBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  resetFiltersBtnText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  compCard: {
    backgroundColor: '#121A2D',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
    backgroundColor: '#162036',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFallbackBanner: {
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardFallbackIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  cardFallbackCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardBookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(9, 13, 22, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardBookmarkBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  cardBookmarkIcon: {
    fontSize: 18,
    color: '#94A3B8',
  },
  cardBookmarkIconActive: {
    color: '#F59E0B',
  },
  cardBody: {
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  categoryPillText: {
    fontSize: 10,
    color: '#C4B5FD',
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  registeredBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  registeredBadgeText: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '700',
  },
  compTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 24,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hostAvatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  hostAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#A78BFA',
  },
  compOrganizer: {
    fontSize: 12,
    color: '#64748B',
  },
  compOrganizerName: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  infoBadge: {
    backgroundColor: '#0E1526',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  infoText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  prizeBadge: {
    backgroundColor: 'rgba(163, 230, 53, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(163, 230, 53, 0.25)',
  },
  prizeText: {
    color: '#A3E635',
    fontWeight: '700',
    fontSize: 11,
  },
  capacitySection: {
    backgroundColor: '#0E1526',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  capacityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  capacityText: {
    fontSize: 11,
    color: '#64748B',
  },
  capacityRemainingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A3E635',
  },
  capacityWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  capacityFullText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F43F5E',
  },
  progressBarBackground: {
    height: 5,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  progressBarFillWarning: {
    backgroundColor: '#F59E0B',
  },
  progressBarFillFull: {
    backgroundColor: '#F43F5E',
  },
  savedCompetitionsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  feeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  viewDetailsCta: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C4B5FD',
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    gap: 14,
    marginTop: 10,
  },
  skeletonCard: {
    backgroundColor: '#121A2D',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  skeletonHeader: {
    height: 18,
    width: '40%',
    backgroundColor: '#1E293B',
    borderRadius: 6,
  },
  skeletonTitle: {
    height: 24,
    width: '80%',
    backgroundColor: '#1E293B',
    borderRadius: 6,
  },
  skeletonSubtitle: {
    height: 14,
    width: '60%',
    backgroundColor: '#16223B',
    borderRadius: 6,
  },
  skeletonBar: {
    height: 10,
    width: '100%',
    backgroundColor: '#16223B',
    borderRadius: 6,
    marginTop: 6,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    marginHorizontal: 20,
  },
  stateErrorIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  stateErrorTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateErrorSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: TYPOGRAPHY.size.sm,
  },
  emptyFilteredBox: {
    backgroundColor: '#121A2D',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 360,
  },
  clearFiltersActionBtn: {
    backgroundColor: 'rgba(163, 230, 53, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A3E635',
  },
  clearFiltersActionBtnText: {
    color: '#A3E635',
    fontWeight: '700',
    fontSize: TYPOGRAPHY.size.xs,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  footerLoaderText: {
    color: '#94A3B8',
    fontSize: TYPOGRAPHY.size.xs,
  },
  footerEnd: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerEndText: {
    color: '#64748B',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '500',
  },
  registrationsScroll: {
    flex: 1,
  },
  registrationsScrollContent: {
    padding: 20,
  },
  emptyRegistrationsBox: {
    backgroundColor: '#121A2D',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 26,
  },
  emptyActionBtn: {
    backgroundColor: '#A3E635',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyActionText: {
    color: '#090D16',
    fontWeight: '700',
    fontSize: TYPOGRAPHY.size.sm,
  },
  registrationsList: {
    gap: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  regCard: {
    backgroundColor: '#121A2D',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  regCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  regCompTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  regCategory: {
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '600',
  },
  regStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regStatusConfirmed: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  regStatusCancelled: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  regStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  regStatusTextConfirmed: {
    color: '#86EFAC',
  },
  regStatusTextCancelled: {
    color: '#FDA4AF',
  },
  participantBox: {
    backgroundColor: '#090D16',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  participantBoxTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  participantName: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  participantDetail: {
    fontSize: 11,
    color: '#94A3B8',
  },
  regCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  regViewBtn: {
    paddingVertical: 4,
  },
  regViewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A3E635',
  },
  regCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  regCancelBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FDA4AF',
  },
});

export { canCreateCompetition };
