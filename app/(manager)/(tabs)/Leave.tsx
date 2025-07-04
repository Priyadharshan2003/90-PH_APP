import LeaveRequestForm from '@/components/LeaveRequestForm';
import { LeaveRequestHistory } from '@/components/LeaveRequestHistory';
import { useState } from 'react';
import { Dimensions, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Constants ---
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

// Enhanced Color Palette
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  primaryGradientEnd: '#FFB366',
  backgroundLight: '#FAFBFC',
  backgroundDark: '#F4F6F8',
  cardBackground: '#FFFFFF',
  textPrimary: '#1A202C',
  textSecondary: '#4A5568',
  textTertiary: '#718096',
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
  shadowBase: 'rgba(0, 0, 0, 0.08)',
  primaryShadow: 'rgba(255, 107, 53, 0.15)',
  accent: '#2B6CB0',
  success: '#38A169',
  warning: '#D69E2E',
  error: '#E53E3E',
};

// Light shadow styles
const SHADOWS = {
  small: {
    shadowColor: COLORS.shadowBase,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: COLORS.shadowBase,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  primary: {
    shadowColor: COLORS.primaryShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
};

// --- Main Component ---
export default function Leave() {
  const [activeSection, setActiveSection] = useState('request');

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.backgroundLight}
        translucent={false}
      />

      {/* Simple Header */}
      <View style={styles.headerContainerSimple}>
        <Text style={styles.titleSimple}>Leave Management</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainerSimple}>
        <Pressable
          style={[styles.tabButtonSimple, activeSection === 'request' && styles.activeTabSimple]}
          onPress={() => setActiveSection('request')}>
          <Text
            style={[
              styles.tabTextSimple,
              activeSection === 'request' && styles.activeTabTextSimple,
            ]}>
            Request Leave
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButtonSimple, activeSection === 'history' && styles.activeTabSimple]}
          onPress={() => setActiveSection('history')}>
          <Text
            style={[
              styles.tabTextSimple,
              activeSection === 'history' && styles.activeTabTextSimple,
            ]}>
            History
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.contentSimple}>
        {activeSection === 'request' ? (
          <View style={styles.sectionSimple}>
            <LeaveRequestForm />
          </View>
        ) : (
          <View style={styles.sectionSimple}>
            <LeaveRequestHistory />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  headerContainerSimple: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 18,
    paddingBottom: 10,
    backgroundColor: '#FAFBFC',
  },
  titleSimple: {
    fontSize: 22,
    fontWeight: '500',
    color: '#1A202C',
    letterSpacing: 0.2,
    fontFamily:'manrope'
  },
  tabContainerSimple: {
    flexDirection: 'row',
    backgroundColor: '#F4F6F8',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    padding: 2,
  },
  tabButtonSimple: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabSimple: {
    backgroundColor: '#fff',
  },
  tabTextSimple: {
    fontSize: 15,
    color: '#4A5568',
    fontWeight: '500',
  },
  activeTabTextSimple: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  contentSimple: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionSimple: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    flex: 1,
    marginBottom: 12,
  },
});
