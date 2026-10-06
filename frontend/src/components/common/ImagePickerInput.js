import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const ImagePickerInput = ({
  value,
  onChange,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [localError, setLocalError] = useState('');

  const reportError = (msg) => {
    setLocalError(msg);
    if (onError) onError(msg);
  };

  const handlePickImage = async () => {
    setLocalError('');
    setLoading(true);

    try {
      // 1. Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        const errorText = 'Permission to access your photo library is required to select a banner image.';
        reportError(errorText);
        Alert.alert('Permission Denied', errorText);
        setLoading(false);
        return;
      }

      // 2. Launch Image Library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      // 3. Handle Cancellation gracefully
      if (result.canceled) {
        setLoading(false);
        return;
      }

      // 4. Update with chosen asset URI
      if (result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.uri) {
          onChange(selectedAsset.uri);
        }
      }
    } catch (err) {
      reportError(err.message || 'Failed to select image from media library.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    setManualUrl('');
    setLocalError('');
  };

  const handleApplyManualUrl = () => {
    if (manualUrl && manualUrl.trim()) {
      onChange(manualUrl.trim());
      setShowUrlInput(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Banner Image (Optional)</Text>

      {/* Selected Image Preview Box */}
      {value ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: value }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={handlePickImage}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.changeButtonText}>🔄 Change Image</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemoveImage}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.removeButtonText}>🗑️ Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Empty / Pick state */
        <View style={styles.pickerBox}>
          <TouchableOpacity
            style={styles.pickButton}
            onPress={handlePickImage}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.pickButtonIcon}>🖼️</Text>
                <Text style={styles.pickButtonText}>Select Image from Gallery</Text>
                <Text style={styles.pickSubText}>Aspect ratio 16:9 recommended</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleUrlBtn}
            onPress={() => setShowUrlInput(!showUrlInput)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleUrlText}>
              {showUrlInput ? 'Hide URL input' : '— or enter image URL directly —'}
            </Text>
          </TouchableOpacity>

          {showUrlInput && (
            <View style={styles.urlInputRow}>
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/banner.jpg"
                placeholderTextColor="#94A3B8"
                value={manualUrl}
                onChangeText={setManualUrl}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.applyUrlBtn}
                onPress={handleApplyManualUrl}
                activeOpacity={0.8}
              >
                <Text style={styles.applyUrlBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#E2E8F0',
    marginBottom: 8,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#1E293B',
    gap: 10,
  },
  changeButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButtonText: {
    color: '#F8FAFC',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#F87171',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  pickerBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#475569',
    padding: 18,
    alignItems: 'center',
  },
  pickButton: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  pickButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  pickButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  pickSubText: {
    color: '#64748B',
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 4,
  },
  toggleUrlBtn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleUrlText: {
    color: '#94A3B8',
    fontSize: TYPOGRAPHY.size.xs,
  },
  urlInputRow: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: TYPOGRAPHY.size.xs,
  },
  applyUrlBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyUrlBtnText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontSize: TYPOGRAPHY.size.xs,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 6,
  },
});
