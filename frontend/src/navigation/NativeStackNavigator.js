import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ROUTES } from './routes';
import { NavigationContext } from './NavigationContext';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CompetitionDetailsScreen } from '../screens/CompetitionDetailsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OrganizerManagementScreen } from '../screens/OrganizerManagementScreen';

/**
 * Native Stack Navigator Component
 * Renders the top screen of the stack inside the NavigationContext.
 */
export const NativeStackNavigator = ({
  navigation,
  currentRoute,
  activeUser,
  competitions,
  userRegistrations,
  loadingData,
  refreshing,
  onRefresh,
  onLoginSuccess,
  onSignupSuccess,
  onLogout,
  onProfileUpdated,
  onCancelRegistration,
  onCreateCompetitionPress,
  onRegistrationUpdated,
}) => {
  const renderScreen = () => {
    switch (currentRoute.name) {
      case ROUTES.SIGNUP:
        return (
          <SignupScreen
            onSignupSuccess={onSignupSuccess}
            onNavigateToLogin={() => navigation.navigate(ROUTES.LOGIN)}
          />
        );

      case ROUTES.ORGANIZER:
        return (
          <OrganizerManagementScreen
            competitionId={currentRoute.params?.competitionId}
            activeUser={activeUser}
            onBack={() => navigation.goBack()}
          />
        );

      case ROUTES.DETAILS:
        return (
          <CompetitionDetailsScreen
            competitionId={currentRoute.params?.competitionId}
            activeUser={activeUser}
            onBack={() => navigation.goBack()}
            onRegistrationUpdated={onRegistrationUpdated}
            onNavigateToLogin={() => navigation.navigate(ROUTES.LOGIN)}
            onOpenOrganizerPortal={(compId) =>
              navigation.navigate(ROUTES.ORGANIZER, { competitionId: compId })
            }
          />
        );

      case ROUTES.PROFILE:
        return (
          <ProfileScreen
            user={activeUser}
            onProfileUpdated={onProfileUpdated}
            onLogout={onLogout}
            onBack={() => navigation.goBack()}
          />
        );

      case ROUTES.DASHBOARD:
        return (
          <DashboardScreen
            competitions={competitions}
            userRegistrations={userRegistrations}
            activeUser={activeUser}
            loading={loadingData}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onSelectCompetition={(compId) =>
              navigation.navigate(ROUTES.DETAILS, { competitionId: compId })
            }
            onCreateCompetitionPress={onCreateCompetitionPress}
            onOpenProfile={() => navigation.navigate(ROUTES.PROFILE)}
            onLogout={onLogout}
            onNavigateToLogin={() => navigation.navigate(ROUTES.LOGIN)}
            onNavigateToSignup={() => navigation.navigate(ROUTES.SIGNUP)}
            onCancelRegistration={onCancelRegistration}
          />
        );

      case ROUTES.LOGIN:
      default:
        return (
          <LoginScreen
            onLoginSuccess={onLoginSuccess}
            onNavigateToSignup={() => navigation.navigate(ROUTES.SIGNUP)}
          />
        );
    }
  };

  return (
    <NavigationContext.Provider value={navigation}>
      <View style={styles.container}>{renderScreen()}</View>
    </NavigationContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
});
