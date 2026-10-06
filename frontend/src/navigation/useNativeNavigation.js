import { useState, useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { NavigationState } from './navigationState';
import { parseUrlToRoute } from './deepLinking';

/**
 * React hook connecting NavigationState to React lifecycle, Android BackHandler, and Web history
 */
export const useNativeNavigation = ({
  isAuthenticated,
  authChecking,
  initialRoute,
  onUnauthorizedAttempt,
}) => {
  const [, setTick] = useState(0);

  const navStateRef = useRef(null);
  if (!navStateRef.current) {
    navStateRef.current = new NavigationState({
      isAuthenticated,
      initialRoute,
      onUnauthorizedAttempt,
      onStateChange: () => setTick((t) => t + 1),
    });
  }

  const navState = navStateRef.current;

  // Sync auth state changes
  useEffect(() => {
    if (authChecking) return;
    navState.handleAuthChange(isAuthenticated);
  }, [isAuthenticated, authChecking]);

  // Android Hardware Back Button Handling
  useEffect(() => {
    const handleHardwareBack = () => {
      return navState.handleHardwareBack();
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => {
      subscription.remove();
    };
  }, []);

  // Web Browser Back/Forward (popstate) Handling
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const handlePopState = () => {
      const parsed = parseUrlToRoute();
      if (!parsed) return;
      navState.navigate(parsed.name, parsed.params);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  return {
    navigation: navState,
    currentRoute: navState.getCurrentRoute(),
    stack: navState.getStack(),
  };
};
