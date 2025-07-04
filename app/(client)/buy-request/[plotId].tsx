import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function BuyRequestScreen() {
  const { plotId } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useAuth();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('plotId:', plotId);
    console.log('userId:', userId);
  }, [plotId, userId]);

  const validateForm = () => {
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please enter your message');
      return false;
    }

    if (!plotId) {
      Alert.alert('Error', 'Plot ID is missing. Please go back and select a valid plot.');
      return false;
    }

    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    // Ensure plotId is a string
    const plotIdValue = Array.isArray(plotId) ? plotId[0] : plotId;

    try {
      console.log('Submitting buy request:', {
        plotId: plotIdValue,
        userId,
        message: message.trim(),
      });
      const response = await fetch('https://90-dph.vercel.app/api/buy-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          plotId: plotIdValue,
          userId: String(userId),
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit buy request.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) errorMessage = errorData.error;
        } catch (e) {
          // fallback to text
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      await response.json();
      Alert.alert('Success!', 'Your buy request has been submitted successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setMessage('');
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Buy request failed:', error);
      let errorMessage = 'Failed to submit buy request. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert('Request Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Buy Request</Text>
            <Text style={styles.headerSubtitle}>Submit your request to purchase this property</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Message</Text>
              <Text style={styles.sectionSubtitle}>
                Tell us why you&apos;re interested in this property
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Message <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  placeholder="Enter your message"
                  value={message}
                  onChangeText={setMessage}
                  style={styles.messageInput}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'manrope',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'manrope',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'manrope',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontFamily: 'manrope',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'manrope',
  },
  required: {
    color: '#EF4444',
  },
  messageInput: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    fontFamily: 'manrope',
  },
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
});
