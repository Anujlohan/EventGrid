import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  ROUTES,
  useNativeNavigation,
  NativeStackNavigator,
} from './src/navigation';
import { CreateCompetitionModal } from './src/components/modals/CreateCompetitionModal';
import { ToastMessage } from './src/components/common/ToastMessage';
import { competitionService } from './src/services/competitionService';
import { authService } from './src/services/authService';
import { api } from './src/services/api';
import { COLORS } from './src/constants/colors';
import { TYPOGRAPHY } from './src/constants/typography';
import { canCreateCompetition } from './src/utils/roleUtils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorBoundaryContainer}>
          <View style={styles.errorBoundaryCard}>
            <Text style={styles.errorBoundaryIcon}>⚠️</Text>
            <Text style={styles.errorBoundaryTitle}>Application Render Error</Text>
            <Text style={styles.errorBoundaryMessage}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the application.'}
            </Text>
            <TouchableOpacity
              style={styles.errorBoundaryButton}
              onPress={this.handleReload}
              activeOpacity={0.8}
            >
              <Text style={styles.errorBoundaryButtonText}>Reload Application</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  // Authentication State
  const [authChecking, setAuthChecking] = useState(true);
  const [activeUser, setActiveUser] = useState(null);

  // Data States
  const [competitions, setCompetitions] = useState([]);
  const [userRegistrations, setUserRegistrations] = useState([]);

  // Loading & Error States
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
  };

  // Native Stack Navigation Engine with Route Guarding & History
  const { navigation, currentRoute } = useNativeNavigation({
    isAuthenticated: Boolean(activeUser),
    authChecking,
    onUnauthorizedAttempt: () => {
      showToast('Please sign in to access that page.', 'info');
    },
  });

  // Bootstrap user session from local storage on launch
  const bootstrapSession = async () => {
    try {
      const session = await authService.loadStoredSession();
      if (session && session.token) {
        try {
          const freshUser = await authService.getMe();
          setActiveUser(freshUser);
          await loadAppData(freshUser);
        } catch {
          // Token expired or invalid
          await authService.logout();
          setActiveUser(null);
          await loadAppData(null);
        }
      } else {
        setActiveUser(null);
        await loadAppData(null);
      }
    } catch {
      setActiveUser(null);
      await loadAppData(null);
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'EventGrid - Competitions & Hackathons';
    }
    bootstrapSession();

    // Centralized Unauthorized / Session Expired listener
    const unsubscribe = api.onUnauthorized((eventData) => {
      setActiveUser(null);
      setUserRegistrations([]);
      navigation.navigate(ROUTES.DASHBOARD);
      showToast(eventData?.message || 'Browsing in public discovery mode.', 'info');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch real competitions and authenticated user registrations
  const loadAppData = async (currentUser = activeUser, selectCompId = null) => {
    setLoadingData(true);
    try {
      const promises = [competitionService.getCompetitions({ limit: 50 })];

      // If user is authenticated, load their genuine registrations
      if (currentUser) {
        promises.push(competitionService.getMyRegistrations());
      }

      const results = await Promise.allSettled(promises);

      if (results[0].status === 'fulfilled') {
        setCompetitions(results[0].value.competitions || []);
      }

      if (results[1] && results[1].status === 'fulfilled') {
        setUserRegistrations(results[1].value || []);
      } else if (!currentUser) {
        setUserRegistrations([]);
      }

      if (selectCompId) {
        navigation.navigate(ROUTES.DETAILS, { competitionId: selectCompId });
      }
    } catch (err) {
      console.warn('Failed to load application data:', err);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAppData(activeUser);
  };

  const handleLoginSuccess = async (user) => {
    setActiveUser(user);
    showToast(`Welcome back, ${user.name}!`, 'success');
    await loadAppData(user);
    navigation.reset([{ name: ROUTES.DASHBOARD, params: {} }]);
  };

  const handleSignupSuccess = async (user) => {
    setActiveUser(user);
    showToast(`Account created! Welcome, ${user.name}!`, 'success');
    await loadAppData(user);
    navigation.reset([{ name: ROUTES.DASHBOARD, params: {} }]);
  };

  const handleLogout = async () => {
    await authService.logout();
    setActiveUser(null);
    setUserRegistrations([]);
    navigation.reset([{ name: ROUTES.LOGIN, params: {} }]);
    showToast('You have been signed out.', 'info');
  };

  const handleProfileUpdated = (updatedUser) => {
    setActiveUser(updatedUser);
    showToast('Profile updated successfully!', 'success');
  };

  const handleCompetitionCreated = async (newComp) => {
    showToast('Competition created successfully!', 'success');
    await loadAppData(activeUser, newComp?._id);
  };

  const handleCancelRegistrationFromDashboard = async (competitionId) => {
    try {
      await competitionService.cancelRegistration(competitionId);
      showToast('Registration cancelled and spot released.', 'info');
      await loadAppData(activeUser);
    } catch (err) {
      showToast(err.message || 'Failed to cancel registration.', 'error');
    }
  };

  // Initial App Session Loading State during Auth Check
  if (authChecking) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initializing Platform...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ visible: false, message: '', type: 'info' })}
      />

      <NativeStackNavigator
        navigation={navigation}
        currentRoute={currentRoute}
        activeUser={activeUser}
        competitions={competitions}
        userRegistrations={userRegistrations}
        loadingData={loadingData}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onLoginSuccess={handleLoginSuccess}
        onSignupSuccess={handleSignupSuccess}
        onLogout={handleLogout}
        onProfileUpdated={handleProfileUpdated}
        onCancelRegistration={handleCancelRegistrationFromDashboard}
        onCreateCompetitionPress={() => {
          if (canCreateCompetition(activeUser)) {
            setCreateModalVisible(true);
          } else {
            showToast('Only accounts with the Organizer or Admin role can create competitions.', 'error');
          }
        }}
        onRegistrationUpdated={() => loadAppData(activeUser)}
      />

      {/* Organizer Modal to create genuine competitions */}
      <CreateCompetitionModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCompetitionCreated}
        activeUser={activeUser}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: TYPOGRAPHY.size.base,
    color: '#94A3B8',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  errorBoundaryContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorBoundaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  errorBoundaryIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorBoundaryTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorBoundaryMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBoundaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  errorBoundaryButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontSize: TYPOGRAPHY.size.sm,
  },
});
