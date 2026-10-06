import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

import { storageService } from '../services/storageService';

export const CompetitionDetailsScreen = ({
  competitionId,
  activeUser,
  onBack,
  onRegistrationUpdated,
  onNavigateToLogin,
  onOpenOrganizerPortal,
}) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [registrationModalVisible, setRegistrationModalVisible] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
  };

  // Check bookmark status on mount
  useEffect(() => {
    if (competitionId) {
      storageService.isBookmarked(competitionId).then(setIsBookmarked);
    }
  }, [competitionId]);

  const handleToggleBookmark = async () => {
    const isNowSaved = await storageService.toggleBookmark(competitionId);
    setIsBookmarked(isNowSaved);
    showToast(
      isNowSaved ? '★ Competition saved to bookmarks!' : '☆ Removed from bookmarks.',
      'info'
    );
  };

  const handleShare = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      const url = typeof window !== 'undefined' ? window.location.href : `https://eventgrid.com/competitions/${competitionId}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Share link ready to copy.', 'info');
      });
    } else {
      showToast('Event link copied to clipboard!', 'success');
    }
  };

  const handleRegistrationSuccess = (updatedComp, userReg, successMsg) => {
    setCompetition({
      ...updatedComp,
      userRegistration: userReg,
    });
    setRegistrationModalVisible(false);
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
      showToast('Please sign in to register for this competition.', 'info');
      if (onNavigateToLogin) {
        onNavigateToLogin();
      }
      return;
    }
    setRegistrationModalVisible(true);
  };

  const handleModalSubmitRegistration = async (participantDetails) => {
    try {
      await register(competitionId, participantDetails);
      setRegistrationModalVisible(false);
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ visible: false, message: '', type: 'info' })}
      />

      <CompetitionHeader
        title="Competition Details"
        onBack={onBack}
        onShare={handleShare}
        isBookmarked={isBookmarked}
        onToggleBookmark={handleToggleBookmark}
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
            subcategory={competition.subcategory}
            sportType={competition.sportType}
            lifecycleStatus={competition.lifecycleStatus}
          />

          {/* Organizer Access Banner for Creator & Admin */}
          {activeUser &&
          (activeUser.role === 'Admin' ||
            (competition.createdBy &&
              (competition.createdBy === activeUser._id ||
                competition.createdBy._id === activeUser._id ||
                competition.createdBy === activeUser.userId ||
                competition.createdBy === activeUser.id))) &&
          onOpenOrganizerPortal ? (
            <TouchableOpacity
              style={styles.organizerPortalBtn}
              onPress={() => onOpenOrganizerPortal(competitionId)}
              activeOpacity={0.8}
            >
              <Text style={styles.organizerPortalBtnText}>
                ⚙️ Organizer Portal • View Participant Roster & Export CSV →
              </Text>
            </TouchableOpacity>
          ) : null}

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
    backgroundColor: '#090D16',
  },
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  contentBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  organizerPortalBtn: {
    backgroundColor: '#121A2D',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  organizerPortalBtnText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
