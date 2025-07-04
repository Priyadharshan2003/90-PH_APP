import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const colors = {
  primary: '#0F172A',
  secondary: '#1E293B',
  accent: '#6366F1',
  accentLight: '#8B5CF6',
  accentOrange: '#fb6e14',
  success: '#F97316',
  warning: '#F59E0B',
  error: '#EF4444',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  surfaceHover: '#F1F5F9',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
    dark: '#94A3B8'
  }
};

export const scale = (size: number) => {
  const guidelineBaseWidth = 375;
  return Math.round((size * width) / guidelineBaseWidth);
};

export const scaleFont = (size: number) => {
  const guidelineBaseWidth = 375;
  return Math.round((size * width) / guidelineBaseWidth);
};
