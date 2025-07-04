import { getOwnedLands } from '@/lib/api';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RadioButton } from 'react-native-paper';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Color palette consistent with other tabs
const colors = {
  primary: '#0F172A', // Dark blue/black
  secondary: '#1E293B', // Slightly lighter dark blue
  accent: '#FF6B00', // Bright orange for key elements
  accentLight: '#FFA750', // Lighter orange
  success: '#10B981', // Green for available status
  error: '#EF4444', // Red for errors/sold out
  surface: '#FFFFFF', // White for cards/background
  surfaceElevated: '#F8FAFC', // Light gray for elevated surfaces
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
    dark: '#94A3B8',
  },
};

interface Land {
  id: string;
  number: string;
  size: string;
  price: number;
  status: 'SOLD' | 'ADVANCE' | 'AVAILABLE';
  imageUrl?: string;
  plot: {
    id: string;
    title: string;
    dimension: string;
    location: string;
    price: number;
    imageUrls: string[];
  };
}

const SellRequestScreen = () => {
  const { userId } = useAuth();
  const [lands, setLands] = React.useState<Land[]>([]);
  const [selectedLand, setSelectedLand] = React.useState<string | null>(null);
  const [askingPrice, setAskingPrice] = React.useState('');
  const [marketValue, setMarketValue] = React.useState(0);
  const [reason, setReason] = React.useState('');
  const [urgency, setUrgency] = React.useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [agentAssistance, setAgentAssistance] = React.useState(false);
  const [documents, setDocuments] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchingLands, setFetchingLands] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);

  React.useEffect(() => {
    const fetchUserLands = async () => {
      if (!userId) return;

      try {
        setFetchingLands(true);
        // Ensure getOwnedLands is correctly implemented and returning Land[]
        const data = await getOwnedLands(userId);
        setLands(data);
      } catch (error) {
        console.error('Error fetching lands:', error);
        Alert.alert('Error', 'Failed to fetch your properties');
      } finally {
        setFetchingLands(false);
      }
    };

    fetchUserLands();
  }, [userId]);

  React.useEffect(() => {
    if (selectedLand) {
      const land = lands.find((l: Land) => l.id === selectedLand);
      if (land) {
        setMarketValue(land.price);
        // Auto-set asking price to land price initially
        setAskingPrice(land.price.toString());
      }
    }
  }, [selectedLand, lands]);

  const pickDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        // In a real app, you would upload the image to a storage service
        // and get back a URL to store in your database
        setDocuments([...documents, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
  };

  const handleSubmit = async () => {
    if (!selectedLand) {
      Alert.alert('Error', 'Please select a property');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept the terms and conditions');
      return;
    }

    if (!askingPrice || isNaN(parseFloat(askingPrice))) {
      Alert.alert('Error', 'Please enter a valid asking price');
      return;
    }

    const askingPriceNumber = parseFloat(askingPrice);
    if (askingPriceNumber <= 0) {
      Alert.alert('Error', 'Asking price must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`https://90-dph.vercel.app/api/sell-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landId: selectedLand, // Send landId as expected by backend
          clerkId: userId, // Send clerkId as expected by backend
          askingPrice: askingPriceNumber, // Send as number
          reason: reason.trim() || undefined, // Send undefined if empty
          urgency: urgency,
          agentAssistance: agentAssistance,
          documents: documents.length > 0 ? documents : undefined, // Send undefined if empty
          termsAccepted: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit sell request');
      }

      Alert.alert(
        'Success',
        "Sell request submitted successfully! You will be notified once it's reviewed.",
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedLand(null);
              setAskingPrice('');
              setReason('');
              setUrgency('NORMAL');
              setAgentAssistance(false);
              setDocuments([]);
              setTermsAccepted(false);
              setMarketValue(0);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting sell request:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to submit sell request'
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetchingLands) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading your properties...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.content}>
          {/* Hero Banner */}
          <View style={{ marginBottom: 24 }}>
            <LinearGradient
              colors={[colors.accent, colors.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginHorizontal: 0,
                marginTop: 8,
              }}>
              <Ionicons
                name="pricetag"
                size={40}
                color={colors.text.inverse}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  color: colors.text.inverse,
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 4,
                  letterSpacing: 0.5,
                  fontFamily: 'manrope',
                }}>
                Request to Sell Property
              </Text>
              <Text
                style={{
                  color: colors.text.inverse,
                  fontSize: 13,
                  textAlign: 'center',
                  opacity: 0.85,
                  fontFamily: 'manrope',
                }}>
                Create a sell request for your property. Our team will review your request and
                connect you with potential buyers.
              </Text>
            </LinearGradient>
          </View>

          {/* Select Property Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: 'manrope' }]}>Select Property</Text>
            <Text style={[styles.sectionSubtitle, { fontFamily: 'manrope' }]}>
              Choose which property you want to sell
            </Text>

            {/* Animated property card */}
            {lands.length === 0 ? (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                layout={Layout.springify()}
                style={styles.emptyState}>
                <Ionicons name="home-outline" size={48} color={colors.text.tertiary} />
                <Text style={[styles.emptyStateText, { fontFamily: 'manrope' }]}>
                  No properties found
                </Text>
                <Text style={[styles.emptyStateSubtext, { fontFamily: 'manrope' }]}>
                  You don`t have any properties available for sale
                </Text>
              </Animated.View>
            ) : (
              lands.map((land) => (
                <Animated.View
                  key={land.id}
                  entering={FadeIn}
                  exiting={FadeOut}
                  layout={Layout.springify()}
                  style={[
                    styles.propertyCard,
                    selectedLand === land.id && styles.selectedPropertyCard,
                  ]}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedLand(land.id);
                      Haptics.selectionAsync();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select property ${land.plot.title} - Land #${land.number}`}
                    activeOpacity={0.92}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={{
                        uri:
                          land.imageUrl ||
                          (land.plot.imageUrls && land.plot.imageUrls[0]) ||
                          'https://via.placeholder.com/150',
                      }}
                      style={styles.propertyImage}
                    />
                    <View style={styles.propertyInfoRedesigned}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text
                          style={[
                            styles.propertyTitle,
                            { fontSize: 15, fontFamily: 'manrope', flex: 1 },
                          ]}>
                          {land.plot.title} - Land #{land.number}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            land.status === 'SOLD' || land.status === 'ADVANCE'
                              ? styles.statusBadgeRegistered
                              : styles.statusBadgeAvailable,
                          ]}>
                          <Text style={styles.statusBadgeText}>
                            {land.status === 'SOLD' || land.status === 'ADVANCE'
                              ? 'REGISTERED'
                              : 'AVAILABLE'}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[styles.propertyDetails, { fontSize: 12, fontFamily: 'manrope' }]}>
                        {land.plot.dimension}
                      </Text>
                      <Text
                        style={[styles.propertyDetails, { fontSize: 12, fontFamily: 'manrope' }]}>
                        {land.plot.location}
                      </Text>
                      <Text
                        style={[styles.propertyDetails, { fontSize: 12, fontFamily: 'manrope' }]}>
                        Size: {land.size}
                      </Text>
                      <Text
                        style={[
                          styles.propertyPrice,
                          { fontSize: 14, fontFamily: 'manrope', marginTop: 6 },
                        ]}>
                        ₹{land.price.toLocaleString()}
                      </Text>
                    </View>
                    {selectedLand === land.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.success}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </View>

          {selectedLand && (
            <>
              {/* Pricing Details Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontFamily: 'manrope' }]}>
                  Pricing Details
                </Text>
                <Text style={[styles.sectionSubtitle, { fontFamily: 'manrope' }]}>
                  Set your desired selling price
                </Text>

                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { fontFamily: 'manrope' }]}>
                    Current Land Value
                  </Text>
                  <Text style={[styles.priceValue, { fontFamily: 'manrope' }]}>
                    ₹{marketValue.toLocaleString()}
                  </Text>
                </View>

                <Text style={[styles.inputLabel, { fontFamily: 'manrope' }]}>
                  Your Asking Price *
                </Text>
                <TextInput
                  style={[styles.input, { fontSize: 13, fontFamily: 'manrope' }]}
                  placeholder="Enter your asking price"
                  keyboardType="numeric"
                  value={askingPrice}
                  onChangeText={setAskingPrice}
                />

                <Text style={[styles.priceTip, { fontSize: 11, fontFamily: 'manrope' }]}>
                  Setting a price within 10% of the land value typically results in faster sales.
                </Text>
              </View>

              {/* Additional Details Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontFamily: 'manrope' }]}>
                  Additional Details
                </Text>

                <Text style={[styles.inputLabel, { fontFamily: 'manrope' }]}>
                  Reason for Selling (Optional)
                </Text>
                <TextInput
                  style={[styles.input, { height: 80, fontFamily: 'manrope' }]}
                  placeholder="Enter reason for selling"
                  multiline
                  value={reason}
                  onChangeText={setReason}
                />

                <Text style={[styles.inputLabel, { fontFamily: 'manrope' }]}>Urgency Level</Text>
                <View style={styles.urgencyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.urgencyOption,
                      urgency === 'LOW' && styles.selectedUrgencyOption,
                    ]}
                    onPress={() => setUrgency('LOW')}>
                    <RadioButton
                      value="LOW"
                      status={urgency === 'LOW' ? 'checked' : 'unchecked'}
                      onPress={() => setUrgency('LOW')}
                      color={colors.success}
                    />
                    <View>
                      <Text style={[styles.urgencyText, { fontSize: 11, fontFamily: 'manrope' }]}>
                        Low
                      </Text>
                      <Text style={[styles.urgencySubtext, { fontSize: 9, fontFamily: 'manrope' }]}>
                        6+ months
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyOption,
                      urgency === 'NORMAL' && styles.selectedUrgencyOption,
                    ]}
                    onPress={() => setUrgency('NORMAL')}>
                    <RadioButton
                      value="NORMAL"
                      status={urgency === 'NORMAL' ? 'checked' : 'unchecked'}
                      onPress={() => setUrgency('NORMAL')}
                      color={colors.success}
                    />
                    <View>
                      <Text style={[styles.urgencyText, { fontSize: 11, fontFamily: 'manrope' }]}>
                        Normal
                      </Text>
                      <Text style={[styles.urgencySubtext, { fontSize: 9, fontFamily: 'manrope' }]}>
                        3-6 months
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyOption,
                      urgency === 'HIGH' && styles.selectedUrgencyOption,
                    ]}
                    onPress={() => setUrgency('HIGH')}>
                    <RadioButton
                      value="HIGH"
                      status={urgency === 'HIGH' ? 'checked' : 'unchecked'}
                      onPress={() => setUrgency('HIGH')}
                      color={colors.success}
                    />
                    <View>
                      <Text style={[styles.urgencyText, { fontSize: 11, fontFamily: 'manrope' }]}>
                        High
                      </Text>
                      <Text style={[styles.urgencySubtext, { fontSize: 9, fontFamily: 'manrope' }]}>
                        ASAP
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Preferences Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { fontFamily: 'manrope' }]}>Preferences</Text>

                <View style={styles.preferenceContainer}>
                  <View style={styles.preferenceRow}>
                    <Text style={[styles.preferenceText, { fontFamily: 'manrope' }]}>
                      Agent Assistance
                    </Text>
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setAgentAssistance(!agentAssistance)}>
                      <View
                        style={[
                          styles.toggleBackground,
                          agentAssistance && styles.toggleBackgroundActive,
                        ]}>
                        <View
                          style={[
                            styles.toggleCircle,
                            agentAssistance && styles.toggleCircleActive,
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.preferenceSubtext, { fontFamily: 'manrope' }]}>
                    Get help from our real estate agents
                  </Text>
                </View>
                {/* 
                <Text style={[styles.inputLabel, { fontFamily: 'manrope' }]}>Document Upload</Text>
                <Text style={[styles.inputSubtext, { fontFamily: 'manrope' }]}>
                  Upload additional documents for faster processing
                </Text>

                <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
                  <Text style={[styles.uploadButtonText, { fontSize: 12, fontFamily: 'manrope' }]}>
                    Upload Documents
                  </Text>
                </TouchableOpacity> */}

                {/* Animate document chips */}
                {/* {documents.length > 0 && (
                  <View style={styles.documentsContainer}>
                    {documents.map((doc, index) => (
                      <Animated.View
                        key={index}
                        entering={FadeIn}
                        exiting={FadeOut}
                        layout={Layout.springify()}
                        style={styles.documentItem}>
                        <Ionicons name="document-text-outline" size={20} color="#666" />
                        <Text
                          style={[styles.documentName, { fontFamily: 'manrope' }]}
                          numberOfLines={1}>
                          Document {index + 1}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeDocument(index)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove document ${index + 1}`}>
                          <Ionicons name="close-circle" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                )} */}
              </View>

              {/* Terms and Conditions */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setTermsAccepted(!termsAccepted)}>
                  <Ionicons
                    name={termsAccepted ? 'checkbox-outline' : 'square-outline'}
                    size={24}
                    color={termsAccepted ? colors.success : '#666'}
                  />
                </TouchableOpacity>
                <Text style={[styles.termsText, { fontSize: 11, fontFamily: 'manrope' }]}>
                  I agree to the Terms & Conditions of the selling process and understand that a
                  commission fee may apply if I use agent services. *
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleSubmit();
                }}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Submit sell request">
                {loading ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Animated.Text
                    entering={FadeIn}
                    exiting={FadeOut}
                    layout={Layout.springify()}
                    style={[styles.submitButtonText, { fontSize: 14, fontFamily: 'manrope' }]}>
                    Submit Sell Request
                  </Animated.Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80, // Add padding for tab bar
  },
  content: {
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  propertyInfoRedesigned: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  selectedPropertyCard: {
    borderColor: colors.accent,
    borderWidth: 2,
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  propertyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  propertyDetails: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 1,
  },
  propertyPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.text.primary,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 13,
    marginBottom: 16,
    backgroundColor: colors.surface,
    color: colors.text.primary,
  },
  priceTip: {
    fontSize: 11,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  urgencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectedUrgencyOption: {
    backgroundColor: colors.accentLight + '15',
    borderColor: colors.accent,
  },
  urgencyText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  urgencySubtext: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  preferenceContainer: {
    marginBottom: 16,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  preferenceText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '500',
  },
  preferenceSubtext: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  toggleButton: {
    marginLeft: 12,
  },
  toggleBackground: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleBackgroundActive: {
    backgroundColor: colors.accentLight,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }],
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.accentLight + '10',
  },
  uploadButtonText: {
    fontSize: 12,
    color: colors.accent,
    marginLeft: 8,
    fontWeight: '500',
  },
  documentsContainer: {
    marginTop: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    marginBottom: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
    marginRight: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    marginRight: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 11,
    color: colors.text.secondary,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: colors.accentLight,
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  statusBadgeRegistered: {
    backgroundColor: colors.accent,
  },
  statusBadgeAvailable: {
    backgroundColor: colors.success,
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});

export default SellRequestScreen;
