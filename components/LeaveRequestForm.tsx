import { useAuth } from '@clerk/clerk-expo';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerHaptic } from '../utils/haptics';
import { AnimatedButton } from './AnimatedButton';
import { AnimatedEntrance } from './AnimatedEntrance';

// API Configuration
const API_URL = 'https://90-dph.vercel.app/api';
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
// Rename type to LeaveRequestFormData to avoid conflict
type LeaveRequestFormData = {
  startDate: Date;
  endDate: Date;
  reason: string;
};

const LeaveRequestForm = () => {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LeaveRequestFormData>({
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate: Date | undefined, type: 'start' | 'end') => {
    if (type === 'start') {
      setShowStartDatePicker(false);
      if (selectedDate) {
        setFormData((prev) => ({ ...prev, startDate: selectedDate }));
      }
    } else {
      setShowEndDatePicker(false);
      if (selectedDate) {
        setFormData((prev) => ({ ...prev, endDate: selectedDate }));
      }
    }
  };

  const validateForm = () => {
    if (!formData.reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for leave');
      return false;
    }
    if (formData.startDate > formData.endDate) {
      Alert.alert('Error', 'End date cannot be before start date');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      triggerHaptic('error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/leave-requests', {
        clerkId: userId,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        reason: formData.reason.trim(),
      });

      if (response.status === 201) {
        triggerHaptic('success');
        Alert.alert('Success', 'Leave request submitted successfully');
        // Reset form
        setFormData({
          startDate: new Date(),
          endDate: new Date(),
          reason: '',
        });
      }
    } catch (error: any) {
      triggerHaptic('error');
      console.error('Leave request error:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        Alert.alert('Error', error.response.data?.error || 'Failed to submit leave request');
      } else if (error.request) {
        // The request was made but no response was received
        Alert.alert('Network Error', 'Please check your internet connection and try again');
      } else {
        // Something happened in setting up the request that triggered an Error
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Leave Request',
          headerStyle: {
            backgroundColor: '#f5f5f5',
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <AnimatedEntrance index={1}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontFamily: 'manrope' }]}>Start Date</Text>
              <AnimatedButton
                accessibilityLabel="Select start date"
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}>
                <Text style={[styles.dateButtonText, { fontFamily: 'manrope' }]}>
                  {formData.startDate.toLocaleDateString()}
                </Text>
              </AnimatedButton>
              {showStartDatePicker && (
                <DateTimePicker
                  value={formData.startDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleDateChange(event, date, 'start')}
                  minimumDate={new Date()}
                />
              )}
            </View>
          </AnimatedEntrance>
          <AnimatedEntrance index={2}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontFamily: 'manrope' }]}>End Date</Text>
              <AnimatedButton
                accessibilityLabel="Select end date"
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}>
                <Text style={[styles.dateButtonText, { fontFamily: 'manrope' }]}>
                  {formData.endDate.toLocaleDateString()}
                </Text>
              </AnimatedButton>
              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleDateChange(event, date, 'end')}
                  minimumDate={formData.startDate}
                />
              )}
            </View>
          </AnimatedEntrance>
          <AnimatedEntrance index={3}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { fontFamily: 'manrope' }]}>Reason for Leave</Text>
              <TextInput
                style={[styles.textInput, { fontFamily: 'manrope' }]}
                multiline
                numberOfLines={4}
                placeholder="Enter your reason for leave..."
                value={formData.reason}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, reason: text }))}
                textAlignVertical="top"
                accessibilityLabel="Reason for leave"
              />
            </View>
          </AnimatedEntrance>
          <AnimatedEntrance index={4}>
            <AnimatedButton
              accessibilityLabel="Submit leave request"
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.submitButtonText, { fontFamily: 'manrope' }]}>
                  Submit Request
                </Text>
              )}
            </AnimatedButton>
          </AnimatedEntrance>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#E67E22',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LeaveRequestForm;
