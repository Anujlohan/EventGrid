import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

export const CompetitionImage = ({ uri }) => {
  const [loading, setLoading] = useState(true);

  if (!uri || !uri.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
  },
});
