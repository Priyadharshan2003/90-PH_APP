import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const triggerHaptic = async (type: 'light' | 'medium' | 'success' | 'error') => {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (type === 'medium') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'error') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch (error) {
    console.warn('Haptics not supported:', error);
  }
};
