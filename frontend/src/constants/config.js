import { Platform } from 'react-native';

const getBaseUrl = () => {
  let url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    url = Platform.OS === 'android' ? 'http://10.0.2.2:5001/api' : 'http://localhost:5001/api';
  }
  // Android emulator cannot access host machine via localhost
  if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    url = url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
};

export const CONFIG = {
  API_BASE_URL: getBaseUrl(),
  DEFAULT_TIMEOUT_MS: 12000,
};
