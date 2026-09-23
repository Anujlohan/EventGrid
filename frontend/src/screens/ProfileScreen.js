import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { authService } from '../services/authService';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export const ProfileScreen = ({ user, onProfileUpdated, onLogout, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });

  const handleSaveProfile = async () => {
    setMessage({ text: '', type: 'info' });

    if (!name.trim() || name.trim().length < 2) {
      setMessage({ text: 'Name must be at least 2 characters.', type: 'error' });
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 7) {
      setMessage({ text: 'Phone number must be at least 7 digits.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setIsEditing(false);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutPress = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) {
        onLogout();
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: onLogout,
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>User Profile</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.card}>
        {/* Avatar & Identity Header */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'Participant'}</Text>
          </View>
        </View>

        {/* Feedback Message */}
        {message.text ? (
          <View
            style={[
              styles.messageBox,
              message.type === 'error' ? styles.messageError : styles.messageSuccess,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.type === 'error' ? styles.messageTextError : styles.messageTextSuccess,
              ]}
            >
              {message.text}
            </Text>
          </View>
        ) : null}

        {/* Profile Details / Form */}
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                editable={!saving}
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.name}</Text>
            )}
          </View>

          {/* Email Address (Read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <Text style={styles.fieldValueMuted}>{user?.email}</Text>
            <Text style={styles.fieldHint}>Account email cannot be changed</Text>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                editable={!saving}
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.phoneNumber || 'Not provided'}</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {isEditing ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => {
                  setName(user?.name || '');
                  setPhoneNumber(user?.phoneNumber || '');
                  setIsEditing(false);
                  setMessage({ text: '', type: 'info' });
                }}
                disabled={saving}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.btnEdit]}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnEditText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          {/* Secure Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogoutPress}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  navBar: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: TYPOGRAPHY.size.sm,
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  roleBadge: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  roleText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  messageBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  messageError: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  messageSuccess: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  messageText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textAlign: 'center',
  },
  messageTextError: {
    color: COLORS.danger,
  },
  messageTextSuccess: {
    color: COLORS.success,
  },
  formContainer: {
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  fieldValueMuted: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
  },
  fieldHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textPrimary,
  },
  actionContainer: {
    gap: 12,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEdit: {
    backgroundColor: COLORS.primary,
  },
  btnEditText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.size.base,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  btnCancelText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.size.base,
  },
  btnSave: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.size.base,
  },
  logoutButton: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontWeight: 'bold',
    fontSize: TYPOGRAPHY.size.base,
  },
});
