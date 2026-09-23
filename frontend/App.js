import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CompetitionDetailsScreen } from './src/screens/CompetitionDetailsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreateCompetitionModal } from './src/components/modals/CreateCompetitionModal';
import { ToastMessage } from './src/components/common/ToastMessage';
import { competitionService } from './src/services/competitionService';
import { authService } from './src/services/authService';
import { COLORS } from './src/constants/colors';
import { TYPOGRAPHY } from './src/constants/typography';

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
  // Navigation State: 'LOGIN' | 'SIGNUP' | 'DASHBOARD' | 'DETAILS' | 'PROFILE'
  const [currentScreen, setCurrentScreen] = useState('LOGIN');
  const [selectedCompId, setSelectedCompId] = useState(null);

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

  // Bootstrap user session from local storage on launch
  const bootstrapSession = async () => {
    try {
      const session = await authService.loadStoredSession();
      if (session && session.token) {
        try {
          const freshUser = await authService.getMe();
          setActiveUser(freshUser);
          await loadAppData(freshUser);
          setCurrentScreen('DASHBOARD');
        } catch (e) {
          // Token expired or invalid
          await authService.logout();
          setActiveUser(null);
          setCurrentScreen('LOGIN');
        }
      } else {
        setCurrentScreen('LOGIN');
      }
    } catch {
      setCurrentScreen('LOGIN');
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    bootstrapSession();
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
        setSelectedCompId(selectCompId);
        setCurrentScreen('DETAILS');
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
    setCurrentScreen('DASHBOARD');
  };

  const handleSignupSuccess = async (user) => {
    setActiveUser(user);
    showToast(`Account created! Welcome, ${user.name}!`, 'success');
    await loadAppData(user);
    setCurrentScreen('DASHBOARD');
  };

  const handleLogout = async () => {
    await authService.logout();
    setActiveUser(null);
    setUserRegistrations([]);
    setCurrentScreen('LOGIN');
    showToast('You have been signed out.', 'info');
  };

  const handleProfileUpdated = (updatedUser) => {
    setActiveUser(updatedUser);
    showToast('Profile updated successfully!', 'success');
  };

  const handleSelectCompetition = (compId) => {
    setSelectedCompId(compId);
    setCurrentScreen('DETAILS');
  };

  const handleCompetitionCreated = (newComp) => {
    showToast('Competition created successfully!', 'success');
    loadAppData(activeUser, newComp._id);
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

  // Initial App Session Loading State
  if (authChecking) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initializing Platform...</Text>
      </SafeAreaView>
    );
  }

  // Render Root Screen based on navigation and authentication state
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ visible: false, message: '', type: 'info' })}
      />

      {/* Unauthenticated Flows */}
      {!activeUser ? (
        currentScreen === 'SIGNUP' ? (
          <SignupScreen
            onSignupSuccess={handleSignupSuccess}
            onNavigateToLogin={() => setCurrentScreen('LOGIN')}
          />
        ) : (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToSignup={() => setCurrentScreen('SIGNUP')}
          />
        )
      ) : (
        /* Authenticated Flows */
        <>
          {currentScreen === 'PROFILE' && (
            <ProfileScreen
              user={activeUser}
              onProfileUpdated={handleProfileUpdated}
              onLogout={handleLogout}
              onBack={() => setCurrentScreen('DASHBOARD')}
            />
          )}

          {currentScreen === 'DETAILS' && (
            <CompetitionDetailsScreen
              competitionId={selectedCompId}
              activeUser={activeUser}
              onBack={() => {
                setCurrentScreen('DASHBOARD');
                loadAppData(activeUser);
              }}
              onRegistrationUpdated={() => loadAppData(activeUser)}
            />
          )}

          {currentScreen === 'DASHBOARD' && (
            <DashboardScreen
              competitions={competitions}
              userRegistrations={userRegistrations}
              activeUser={activeUser}
              loading={loadingData}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onSelectCompetition={handleSelectCompetition}
              onCreateCompetitionPress={() => setCreateModalVisible(true)}
              onOpenProfile={() => setCurrentScreen('PROFILE')}
              onLogout={handleLogout}
              onCancelRegistration={handleCancelRegistrationFromDashboard}
            />
          )}

          {/* Organizer Modal to create genuine competitions */}
          <CreateCompetitionModal
            visible={createModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onSuccess={handleCompetitionCreated}
          />
        </>
      )}
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
    backgroundColor: COLORS.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 460,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorBoundaryIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorBoundaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorBoundaryMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBoundaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorBoundaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
