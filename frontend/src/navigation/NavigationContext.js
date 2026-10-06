import React, { createContext, useContext } from 'react';

export const NavigationContext = createContext(null);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider or NativeStackNavigator');
  }
  return context;
};
