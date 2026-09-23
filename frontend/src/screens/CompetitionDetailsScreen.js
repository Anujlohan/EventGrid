import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { CompetitionHeader } from '../components/details/CompetitionHeader';
import { CompetitionImage } from '../components/details/CompetitionImage';
import { CompetitionTitle } from '../components/details/CompetitionTitle';
import { CompetitionAvailability } from '../components/details/CompetitionAvailability';
import { CompetitionDateInfo } from '../components/details/CompetitionDateInfo';
import { CompetitionLocation } from '../components/details/CompetitionLocation';
import { CompetitionDescription } from '../components/details/CompetitionDescription';
import { RegistrationInformation } from '../components/details/RegistrationInformation';
import { RegistrationButton } from '../components/details/RegistrationButton';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { NotFoundState } from '../components/common/NotFoundState';
import { ToastMessage } from '../components/common/ToastMessage';
import { useCompetition } from '../hooks/useCompetition';
import { useRegistration } from '../hooks/useRegistration';
import { COLORS } from '../constants/colors';

import { ParticipantRegistrationModal } from '../components/modals/ParticipantRegistrationModal';
import { Alert } from 'react-native';

export const CompetitionDetailsScreen = ({
  competitionId,
  activeUser,
  onBack,
  onRegistrationUpdated,
}) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [registrationModalVisible, setRegistrationModalVisible] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handleRegistrationSuccess = (updatedComp, userReg, successMsg) => {
    setCompetition({
      ...updatedComp,
      userRegistration: userReg,
    });
    showToast(successMsg, 'success');
    if (onRegistrationUpdated) {
      onRegistrationUpdated();
    }
  };

  const {
    competition,
    loading,
    refreshing,
    error,
    refresh,
    setCompetition,
  } = useCompetition(competitionId, activeUser?._id);

  const { isSubmitting, register, cancel } = useRegistration(handleRegistrationSuccess);

  const handleRegisterPress = () => {
    if (!activeUser) {
      showToast('Please sign in to register for competitions.', 'error');
      return;
    }
    setRegistrationModalVisible(true);
  };

  const handleModalSubmitRegistration = async (participantDetails) => {
    try {
      await register(competitionId, participantDetails);
    } catch (err) {
      // Error handled by modal / toast
      throw err;
    }
  };

  const handleCancelPress = () => {
    if (!activeUser) {
      showToast('Please sign in to manage your registrations.', 'error');
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to cancel your registration? Your spot will be released immediately.');
      if (confirmed) {
        cancel(competitionId)
          .then(() => {
            showToast('Registration cancelled and spot released.', 'info');
            refresh();
          })
          .catch((err) => {
            showToast(err.message || 'Cancellation failed.', 'error');
            refresh();
          });
      }
      return;
    }

    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel your registration? Your spot will be released immediately.',
      [
        { text: 'Keep Registration', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancel(competitionId);
            } catch (err) {
              showToast(err.message || 'Cancellation failed.', 'error');
              refresh();
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingSkeleton message="Loading competition details..." />;
  }

  if (error) {
    if (error.status === 404) {
      return <NotFoundState onBack={onBack} />;
    }
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  if (!competition) {
    return <NotFoundState onBack={onBack} />;
  }

  const isUserRegistered =
    competition.userRegistration && competition.userRegistration.isRegistered;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ visible: false, message: '', type: 'info' })}
      />

      <CompetitionHeader
        title="Competition Details"
        onBack={onBack}
        onShare={() => showToast('Share link copied to clipboard!', 'info')}
      />

      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          <CompetitionImage uri={competition.image} />

          <CompetitionTitle
            title={competition.title}
            organizer={competition.organizer}
            category={competition.category}
            lifecycleStatus={competition.lifecycleStatus}
          />

          <View style={styles.contentBody}>
            <CompetitionAvailability
              registeredCount={competition.registeredCount}
              totalSpots={competition.totalSpots}
              remainingSpots={competition.remainingSpots}
              lifecycleStatus={competition.lifecycleStatus}
            />

            <CompetitionDateInfo
              registrationDeadline={competition.registrationDeadline}
              startDate={competition.startDate}
              endDate={competition.endDate}
              timeRemainingToDeadline={competition.timeRemainingToDeadline}
            />

            <RegistrationInformation
              entryFee={competition.entryFee}
              prizePool={competition.prizePool}
            />

            <CompetitionLocation location={competition.location} />

            <CompetitionDescription
              description={competition.description}
              rules={competition.rules}
              eligibility={competition.eligibility}
            />
          </View>
        </ScrollView>

        <RegistrationButton
          isRegistered={isUserRegistered}
          lifecycleStatus={competition.lifecycleStatus}
          remainingSpots={competition.remainingSpots}
          isSubmitting={isSubmitting}
          onRegister={handleRegisterPress}
          onCancel={handleCancelPress}
        />

        <ParticipantRegistrationModal
          visible={registrationModalVisible}
          onClose={() => setRegistrationModalVisible(false)}
          competition={competition}
          activeUser={activeUser}
          onSubmitRegistration={handleModalSubmitRegistration}
          isSubmitting={isSubmitting}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  contentBody: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
