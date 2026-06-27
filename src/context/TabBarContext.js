import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

const TAB_BAR_EVENT = 'TAB_BAR_VISIBILITY';

export function hideTabBar() {
  DeviceEventEmitter.emit(TAB_BAR_EVENT, false);
}

export function showTabBar() {
  DeviceEventEmitter.emit(TAB_BAR_EVENT, true);
}

export function useTabBarVisibility() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TAB_BAR_EVENT, setVisible);
    return () => sub.remove();
  }, []);
  return visible;
}
