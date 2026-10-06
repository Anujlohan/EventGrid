import React, { useState, useEffect } from 'react';
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
import { adminService } from '../services/adminService';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export const ProfileScreen = ({ user, onProfileUpdated, onLogout, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [college, setCollege] = useState(user?.college || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });

  // Admin Management States
  const isAdmin = user?.role === 'Admin';
  const [adminTab, setAdminTab] = useState('PROFILE'); // 'PROFILE' | 'ADMIN_USERS' | 'ADMIN_STATS'
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);

  // Sync state if user prop changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phoneNumber || '');
      setCollege(user.college || '');
      setOrganization(user.organization || '');
      setExperienceLevel(user.experienceLevel || '');
    }
  }, [user]);

  // Load Admin Data when on Admin Tabs
  useEffect(() => {
    if (isAdmin && (adminTab === 'ADMIN_USERS' || adminTab === 'ADMIN_STATS')) {
      loadAdminData();
    }
  }, [isAdmin, adminTab]);

  const loadAdminData = async () => {
    setLoadingAdmin(true);
    try {
      if (adminTab === 'ADMIN_STATS') {
        const stats = await adminService.getStats();
        setAdminStats(stats);
      } else if (adminTab === 'ADMIN_USERS') {
        const res = await adminService.getUsers({ limit: 50 });
        setAdminUsers(res?.users || []);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to load administrative data.', type: 'error' });
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setUpdatingRoleId(targetUserId);
    try {
      await adminService.updateUserRole(targetUserId, newRole);
      setMessage({ text: `User role updated to ${newRole} successfully!`, type: 'success' });
      // Refresh admin users list
      const res = await adminService.getUsers({ limit: 50 });
      setAdminUsers(res?.users || []);
      // If updating oneself, update active session
      if (targetUserId === (user?._id || user?.id || user?.userId)) {
        const freshUser = await authService.getMe();
        if (onProfileUpdated) onProfileUpdated(freshUser);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update user role.', type: 'error' });
    } finally {
      setUpdatingRoleId(null);
    }
  };

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
        college: college.trim(),
        organization: organization.trim(),
        experienceLevel: experienceLevel.trim(),
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
        <Text style={styles.navTitle}>
          {isAdmin ? 'Admin & User Account' : 'User Profile'}
        </Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Admin Tab Switcher (Visible only for Admin role) */}
      {isAdmin ? (
        <View style={styles.adminTabBar}>
          <TouchableOpacity
            style={[styles.adminTabItem, adminTab === 'PROFILE' && styles.adminTabItemActive]}
            onPress={() => setAdminTab('PROFILE')}
          >
            <Text style={[styles.adminTabText, adminTab === 'PROFILE' && styles.adminTabTextActive]}>
              My Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminTabItem, adminTab === 'ADMIN_USERS' && styles.adminTabItemActive]}
            onPress={() => setAdminTab('ADMIN_USERS')}
          >
            <Text style={[styles.adminTabText, adminTab === 'ADMIN_USERS' && styles.adminTabTextActive]}>
              User & Organizer Management
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminTabItem, adminTab === 'ADMIN_STATS' && styles.adminTabItemActive]}
            onPress={() => setAdminTab('ADMIN_STATS')}
          >
            <Text style={[styles.adminTabText, adminTab === 'ADMIN_STATS' && styles.adminTabTextActive]}>
              Platform Stats
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* TAB 1: USER PROFILE VIEW / EDIT */}
      {adminTab === 'PROFILE' ? (
        <View style={styles.card}>
          {/* Avatar & Identity Header */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <View
              style={[
                styles.roleBadge,
                user?.role === 'Admin'
                  ? { backgroundColor: '#FEE2E2' }
                  : user?.role === 'Organizer'
                  ? { backgroundColor: '#EDE9FE' }
                  : {},
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  user?.role === 'Admin'
                    ? { color: '#DC2626' }
                    : user?.role === 'Organizer'
                    ? { color: '#7C3AED' }
                    : {},
                ]}
              >
                {user?.role || 'Participant'}
              </Text>
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

            {/* Organization / Company */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Organization / Company</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={organization}
                  onChangeText={setOrganization}
                  placeholder="e.g. Acme Corp"
                  editable={!saving}
                />
              ) : (
                <Text style={styles.fieldValue}>{user?.organization || 'Not provided'}</Text>
              )}
            </View>

            {/* College / Institution */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>College / University</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={college}
                  onChangeText={setCollege}
                  placeholder="e.g. Stanford University"
                  editable={!saving}
                />
              ) : (
                <Text style={styles.fieldValue}>{user?.college || 'Not provided'}</Text>
              )}
            </View>

            {/* Experience Level */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Experience Level</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={experienceLevel}
                  onChangeText={setExperienceLevel}
                  placeholder="e.g. Intermediate, Advanced"
                  editable={!saving}
                />
              ) : (
                <Text style={styles.fieldValue}>{user?.experienceLevel || 'Not provided'}</Text>
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
                    setCollege(user?.college || '');
                    setOrganization(user?.organization || '');
                    setExperienceLevel(user?.experienceLevel || '');
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
      ) : null}

      {/* TAB 2: ADMIN USER & ORGANIZER MANAGEMENT */}
      {isAdmin && adminTab === 'ADMIN_USERS' ? (
        <View style={styles.card}>
          <View style={styles.adminHeaderRow}>
            <Text style={styles.adminCardTitle}>All Platform Users ({adminUsers.length})</Text>
            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={loadAdminData}
              disabled={loadingAdmin}
            >
              <Text style={styles.refreshIconBtnText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.adminSubText}>
            Promote participants to organizers or manage administrator roles using real MongoDB database records.
          </Text>

          {loadingAdmin ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
          ) : adminUsers.length === 0 ? (
            <Text style={styles.emptyUsersText}>No registered users found in the database.</Text>
          ) : (
            <View style={styles.usersList}>
              {adminUsers.map((u) => {
                const isCurrent = u._id === (user?._id || user?.id || user?.userId);
                return (
                  <View key={u._id} style={styles.userRowCard}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.userRowName}>{u.name}</Text>
                        {isCurrent ? <Text style={styles.youBadge}>(You)</Text> : null}
                      </View>
                      <Text style={styles.userRowEmail}>{u.email}</Text>
                      <Text style={styles.userRowPhone}>📱 {u.phoneNumber}</Text>
                    </View>

                    {/* Role Management Dropdown / Buttons */}
                    <View style={styles.roleActionContainer}>
                      <Text style={styles.currentRoleText}>Role: <Text style={{ fontWeight: 'bold' }}>{u.role}</Text></Text>
                      {updatingRoleId === u._id ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <View style={styles.roleButtonRow}>
                          {u.role !== 'Participant' && (
                            <TouchableOpacity
                              style={[styles.roleSwitchBtn, { backgroundColor: '#F1F5F9' }]}
                              onPress={() => handleRoleChange(u._id, 'Participant')}
                            >
                              <Text style={styles.roleSwitchText}>Make Participant</Text>
                            </TouchableOpacity>
                          )}
                          {u.role !== 'Organizer' && (
                            <TouchableOpacity
                              style={[styles.roleSwitchBtn, { backgroundColor: '#EDE9FE' }]}
                              onPress={() => handleRoleChange(u._id, 'Organizer')}
                            >
                              <Text style={[styles.roleSwitchText, { color: '#7C3AED' }]}>Make Organizer</Text>
                            </TouchableOpacity>
                          )}
                          {u.role !== 'Admin' && (
                            <TouchableOpacity
                              style={[styles.roleSwitchBtn, { backgroundColor: '#FEE2E2' }]}
                              onPress={() => handleRoleChange(u._id, 'Admin')}
                            >
                              <Text style={[styles.roleSwitchText, { color: '#DC2626' }]}>Make Admin</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {/* TAB 3: ADMIN PLATFORM OVERVIEW & STATS */}
      {isAdmin && adminTab === 'ADMIN_STATS' ? (
        <View style={styles.card}>
          <Text style={styles.adminCardTitle}>Platform Live Statistics</Text>
          <Text style={styles.adminSubText}>
            Real-time aggregate data queried directly from your MongoDB Atlas database.
          </Text>

          {loadingAdmin ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
          ) : adminStats ? (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{adminStats.users?.total || 0}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#7C3AED' }]}>
                  {adminStats.users?.organizers || 0}
                </Text>
                <Text style={styles.statLabel}>Organizers</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#2563EB' }]}>
                  {adminStats.users?.participants || 0}
                </Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#DC2626' }]}>
                  {adminStats.users?.admins || 0}
                </Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#059669' }]}>
                  {adminStats.competitions?.total || 0}
                </Text>
                <Text style={styles.statLabel}>Competitions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#D97706' }]}>
                  {adminStats.registrations?.total || 0}
                </Text>
                <Text style={styles.statLabel}>Registrations</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
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
    maxWidth: 580,
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
  adminTabBar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  adminTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  adminTabItemActive: {
    backgroundColor: COLORS.primary,
  },
  adminTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  adminTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 580,
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.size.base,
    color: '#F8FAFC',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  btnCancelText: {
    color: COLORS.textPrimary,
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
  adminHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminCardTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  adminSubText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  refreshIconBtn: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  refreshIconBtnText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: 'bold',
  },
  usersList: {
    gap: 12,
  },
  userRowCard: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userRowName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  youBadge: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  userRowEmail: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userRowPhone: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roleActionContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  currentRoleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  roleButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  roleSwitchText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyUsersText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginVertical: 24,
    fontSize: TYPOGRAPHY.size.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    width: '30%',
    minWidth: 120,
    flexGrow: 1,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
});
