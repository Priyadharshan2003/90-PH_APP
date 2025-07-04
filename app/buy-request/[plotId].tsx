import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';

export default function BuyRequestScreen() {
  const { plotId } = useLocalSearchParams();
  const router = useRouter();
  const { userId: clerkUserId } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'I would like to buy this property',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }
    if (!form.email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }
    if (!form.phone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (form.phone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }

    if (!plotId) {
      Alert.alert('Error', 'Property ID is missing');
      return false;
    }

    return true;
  };

  const submitBuyRequest = async (data: {
    name: string;
    email: string;
    phone: string;
    message: string;
    plotId: string;
    clerkId?: string;
  }) => {
    const response = await fetch('https://90-dph.vercel.app/api/buy-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        landId: data.plotId,
        userId: data.clerkId,
        message: data.message,
        contactInfo: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit buy request');
    }

    return response.json();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const buyRequestData = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        plotId: Array.isArray(plotId) ? plotId[0] : plotId,
        clerkId: clerkUserId || undefined,
      };

      const response = await submitBuyRequest(buyRequestData);

      Alert.alert(
        'Request Submitted!',
        "Your buy request has been received. Our team will contact you shortly to proceed with the purchase.",
        [
          {
            text: 'OK',
            onPress: () => {
              setForm({ name: '', email: '', phone: '', message: '' });
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Buy request failed:', error);
      Alert.alert(
        'Request Failed',
        error instanceof Error ? error.message : 'Failed to submit buy request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Buy Request
            </Text>
            <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8 }}>
              Submit your request to purchase this property
            </Text>
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                Contact Information
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Full Name <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  placeholder="Enter your full name"
                  value={form.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Email Address <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Phone Number <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  maxLength={15}
                  value={form.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                Purchase Details
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Message <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  placeholder="Tell us about your purchase request"
                  value={form.message}
                  onChangeText={(text) => handleInputChange('message', text)}
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitButton, loading && styles.disabledButton]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Buy Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = {
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
};
