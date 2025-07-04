import {
  VisitRequest as ApiVisitRequest,
  cancelVisitRequest,
  getVisitRequests,
  submitFeedback,
} from '@/lib/api';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, scale, scaleFont } from '../../../components/theme';

interface FeedbackState {
  rating: number;
  experience: string;
  suggestions: string;
  purchaseInterest: 'Yes' | 'No' | 'Maybe' | null;
  submitted: boolean;
}

type IconName = 'person-circle-outline' | 'calendar-outline' | 'alert-circle-outline';

const Booking: React.FC = () => {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [bookings, setBookings] = useState<ApiVisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<Record<string, FeedbackState>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!isSignedIn || !userId) {
      setError('Please sign in to view your bookings.');
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setError('No internet connection. Please try again later.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getVisitRequests(userId);
      const userEmail = user?.primaryEmailAddress?.emailAddress;

      const userBookings = data.filter((booking) => {
        const isOwner = userEmail && booking.email.toLowerCase() === userEmail.toLowerCase();
        const isAssigned = booking.assignedManager?.clerkId === userId;
        const isUser = booking.user?.clerkId === userId;
        return isOwner || isAssigned || isUser;
      });

      setBookings(userBookings);
      setFeedbackData(
        userBookings.reduce(
          (acc, booking) => {
            acc[booking.id] = {
              rating: 0,
              experience: '',
              suggestions: '',
              purchaseInterest: null,
              submitted: !!booking.feedback,
            };
            return acc;
          },
          {} as Record<string, FeedbackState>
        )
      );
      setError(null);
    } catch (err: any) {
      console.error('Error fetching bookings:', err.message);
      setError(err.message || 'Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userId, isOnline, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const handleSubmitFeedback = useCallback(
    async (id: string) => {
      if (!isSignedIn || !userId) {
        Alert.alert('Error', 'Please sign in to submit feedback.');
        return;
      }
      if (!isOnline) {
        Alert.alert('Error', 'No internet connection. Please try again later.');
        return;
      }

      const feedback = feedbackData[id];
      if (
        !feedback ||
        feedback.rating < 1 ||
        !feedback.experience.trim() ||
        !feedback.suggestions.trim() ||
        feedback.purchaseInterest === null
      ) {
        Alert.alert('Incomplete Feedback', 'Please fill all required fields to submit.');
        return;
      }

      setSubmitting((prev) => ({ ...prev, [id]: true }));

      try {
        await submitFeedback({
          visitRequestId: id,
          rating: feedback.rating,
          experience: feedback.experience.trim(),
          suggestions: feedback.suggestions.trim(),
          purchaseInterest:
            feedback.purchaseInterest === 'Yes'
              ? true
              : feedback.purchaseInterest === 'No'
                ? false
                : null,
          clerkId: userId,
        });

        Alert.alert('Thank You!', 'Your feedback has been submitted successfully.');
        setFeedbackData((prev) => ({
          ...prev,
          [id]: { ...prev[id], submitted: true },
        }));
        setExpandedId(null);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
      } finally {
        setSubmitting((prev) => ({ ...prev, [id]: false }));
      }
    },
    [isSignedIn, userId, feedbackData, isOnline]
  );

  const handleCancelVisit = useCallback(
    async (id: string) => {
      if (!isSignedIn || !userId) {
        Alert.alert('Error', 'Please sign in to cancel bookings.');
        return;
      }
      if (!isOnline) {
        Alert.alert('Error', 'No internet connection. Please try again later.');
        return;
      }

      Alert.alert('Cancel Visit', 'Are you sure you want to cancel this visit?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelVisitRequest(id, userId);
              setBookings((prev) => prev.filter((booking) => booking.id !== id));
              Alert.alert('Success', 'Visit request cancelled successfully.');
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel visit. Please try again.');
            }
          },
        },
      ]);
    },
    [isSignedIn, userId, isOnline]
  );

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const content = useMemo(() => {
    if (!isSignedIn) {
      return (
        <EmptyState
          title="Sign In Required"
          message="Please sign in to view and manage your bookings."
          iconName="person-circle-outline"
          buttonText="Sign In"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      );
    }

    if (loading) {
      return <LoadingState message="Fetching your bookings..." />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={fetchBookings} />;
    }

    if (bookings.length === 0) {
      return (
        <EmptyState
          title="No Bookings Yet"
          message="You haven't booked any plot visits. Start by exploring our projects."
          iconName="calendar-outline"
          buttonText="Explore Now"
          onPress={() => router.push('/(guest)/(tabs)/Home')}
        />
      );
    }

    return (
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <BookingItem
            item={item}
            isExpanded={expandedId === item.id}
            toggleExpand={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
            feedbackData={feedbackData[item.id]}
            setFeedbackData={(data) =>
              setFeedbackData((prev) => ({
                ...prev,
                [item.id]: { ...prev[item.id], ...data },
              }))
            }
            submitting={submitting[item.id]}
            handleSubmitFeedback={() => handleSubmitFeedback(item.id)}
            handleCancelVisit={() => handleCancelVisit(item.id)}
          />
        )}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentOrange}
          />
        }
      />
    );
  }, [
    isSignedIn,
    loading,
    error,
    bookings,
    expandedId,
    feedbackData,
    submitting,
    refreshing,
    onRefresh,
    handleSubmitFeedback,
    handleCancelVisit,
    router,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Bookings</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Sub-components ---

const EmptyState: React.FC<{
  title: string;
  message: string;
  iconName: IconName;
  buttonText: string;
  onPress: () => void;
}> = ({ title, message, iconName, buttonText, onPress }) => (
  <View style={styles.stateContainer}>
    <Ionicons
      name={iconName as any}
      size={scale(60)}
      color={colors.text.tertiary}
      style={styles.stateIcon}
    />
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateMessage}>{message}</Text>
    <TouchableOpacity onPress={onPress} style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>{buttonText}</Text>
    </TouchableOpacity>
  </View>
);

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.stateContainer}>
    <ActivityIndicator size="large" color={colors.accentOrange} />
    <Text style={styles.stateMessage}>{message}</Text>
  </View>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <View style={styles.stateContainer}>
    <Ionicons
      name="alert-circle-outline"
      size={scale(60)}
      color={colors.error}
      style={styles.stateIcon}
    />
    <Text style={styles.stateTitle}>An Error Occurred</Text>
    <Text style={styles.stateMessage}>{message}</Text>
    <TouchableOpacity onPress={onRetry} style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

const BookingItem: React.FC<{
  item: ApiVisitRequest;
  isExpanded: boolean;
  toggleExpand: () => void;
  feedbackData: FeedbackState;
  setFeedbackData: (data: Partial<FeedbackState>) => void;
  submitting: boolean | undefined;
  handleSubmitFeedback: () => void;
  handleCancelVisit: () => void;
}> = React.memo(
  ({
    item,
    isExpanded,
    toggleExpand,
    feedbackData,
    setFeedbackData,
    submitting,
    handleSubmitFeedback,
    handleCancelVisit,
  }) => {
    const { status, plot, date, time } = item;
    let visitDateTime: Date;
    try {
      const dateObj = new Date(date);
      const datePart = dateObj.toISOString().split('T')[0];
      visitDateTime = new Date(`${datePart} ${time}`);
      if (isNaN(visitDateTime.getTime())) visitDateTime = dateObj;
    } catch {
      visitDateTime = new Date(date);
    }
    const formattedDate = visitDateTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = visitDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const statusInfo = getStatusInfo(status);

    return (
      <View style={styles.bookingItemContainer}>
        <TouchableOpacity
          onPress={() => {
            toggleExpand();
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={styles.bookingItemHeader}>
          <View style={styles.bookingItemHeaderInfo}>
            <Text style={styles.bookingTitle} numberOfLines={1}>
              {plot.title}
            </Text>
            <View style={styles.bookingDetailRow}>
              <Ionicons
                name="business-outline"
                size={scale(14)}
                color={colors.text.secondary}
                style={styles.bookingDetailIcon}
              />
              <Text style={styles.bookingDetailText}>{plot.project.name}</Text>
            </View>
            <View style={styles.bookingDetailRow}>
              <Ionicons
                name="location-outline"
                size={scale(14)}
                color={colors.text.secondary}
                style={styles.bookingDetailIcon}
              />
              <Text style={styles.bookingDetailText}>{plot.location}</Text>
            </View>
            <View style={styles.bookingDetailRow}>
              <Ionicons
                name="calendar-outline"
                size={scale(14)}
                color={colors.text.secondary}
                style={styles.bookingDetailIcon}
              />
              <Text style={styles.bookingDetailText}>
                {formattedDate} at {formattedTime}
              </Text>
            </View>
          </View>
          <View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Ionicons
                name={statusInfo.icon as any}
                size={scale(12)}
                color="#FFF"
                style={{ marginRight: scale(4) }}
              />
              <Text style={styles.statusBadgeText}>{status}</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={scale(24)}
              color={colors.text.secondary}
              style={{ alignSelf: 'center', marginTop: scale(12) }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContainer}>
            {status === 'APPROVED' && <VisitPassSection item={item} />}
            {status === 'PENDING' && (
              <>
                <PendingApprovalSection />
                <TouchableOpacity
                  onPress={() => {
                    handleCancelVisit();
                    if (Platform.OS !== 'web')
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={styles.cancelButton}>
                  <Ionicons name="close-circle-outline" size={scale(16)} color="#FFF" />
                  <Text style={styles.cancelButtonText}>Cancel Visit Request</Text>
                </TouchableOpacity>
              </>
            )}
            {status === 'APPROVED' && (
              <FeedbackForm
                feedbackData={feedbackData}
                setFeedbackData={setFeedbackData}
                submitting={submitting}
                handleSubmitFeedback={handleSubmitFeedback}
              />
            )}
          </View>
        )}
      </View>
    );
  }
);

const VisitPassSection: React.FC<{ item: ApiVisitRequest }> = ({ item }) => {
  const expiresAtDate = item.expiresAt ? new Date(item.expiresAt) : null;
  const isQrCodeExpired = expiresAtDate ? expiresAtDate < new Date() : false;

  return (
    <View style={styles.qrSection}>
      <Text style={styles.sectionTitle}>Your Visit Pass</Text>
      <View style={styles.qrCodeWrapper}>
        <QRCode
          value={item.id}
          size={scale(150)}
          backgroundColor="#FFFFFF"
          color={colors.text.primary}
        />
      </View>
      <Text style={styles.qrInstruction}>
        Show this QR code at the site office for verification.
      </Text>
      {expiresAtDate && (
        <Text style={[styles.qrExpiry, isQrCodeExpired && styles.qrExpiredText]}>
          {isQrCodeExpired ? 'Expired on ' : 'Expires on '}
          {expiresAtDate.toLocaleString()}
        </Text>
      )}
    </View>
  );
};

const PendingApprovalSection: React.FC = () => (
  <View style={styles.pendingSection}>
    <Ionicons name="hourglass-outline" size={scale(24)} color={colors.warning} />
    <Text style={styles.sectionTitle}>Approval Pending</Text>
    <Text style={styles.pendingText}>
      Your visit request is awaiting approval. A visit pass (QR code) will be generated once
      it&apos;s approved.
    </Text>
  </View>
);

const FeedbackForm: React.FC<{
  feedbackData: FeedbackState;
  setFeedbackData: (data: Partial<FeedbackState>) => void;
  submitting: boolean | undefined;
  handleSubmitFeedback: () => void;
}> = ({ feedbackData, setFeedbackData, submitting, handleSubmitFeedback }) => {
  const { rating, experience, suggestions, purchaseInterest, submitted } = feedbackData;

  if (submitted) {
    return (
      <View style={styles.feedbackSubmitted}>
        <Ionicons name="checkmark-circle" size={scale(24)} color={colors.success} />
        <Text style={styles.feedbackSubmittedText}>Thank you for your feedback!</Text>
      </View>
    );
  }

  return (
    <View style={styles.feedbackContainer}>
      <Text style={styles.sectionTitle}>Share Your Experience</Text>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>How was your visit?</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => {
                setFeedbackData({ rating: star });
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityLabel={`Rate ${star} stars`}>
              <Ionicons
                name={rating >= star ? 'star' : 'star-outline'}
                size={scale(32)}
                color={rating >= star ? '#FFC107' : colors.text.tertiary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Your Experience</Text>
        <TextInput
          style={[styles.textInput, { minHeight: scale(60), maxHeight: scale(120) }]}
          placeholder="Tell us about the highlights or any issues..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          value={experience}
          onChangeText={(text) => setFeedbackData({ experience: text })}
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Suggestions for Improvement</Text>
        <TextInput
          style={[styles.textInput, { minHeight: scale(60), maxHeight: scale(120) }]}
          placeholder="How can we make things better?"
          placeholderTextColor={colors.text.tertiary}
          multiline
          value={suggestions}
          onChangeText={(text) => setFeedbackData({ suggestions: text })}
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Interested in purchasing?</Text>
        <View style={styles.purchaseInterestContainer}>
          {(['Yes', 'No', 'Maybe'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => {
                setFeedbackData({ purchaseInterest: option });
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.purchaseOption,
                purchaseInterest === option && styles.activePurchaseOption,
              ]}>
              <Text
                style={[
                  styles.purchaseOptionText,
                  purchaseInterest === option && styles.activePurchaseOptionText,
                ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          handleSubmitFeedback();
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        disabled={submitting}
        style={[
          styles.primaryButton,
          styles.submitFeedbackButton,
          submitting && styles.disabledButton,
        ]}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Submit Feedback</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: scaleFont(28),
    fontFamily: 'manrope',
    color: colors.text.primary,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  stateIcon: {
    marginBottom: scale(16),
  },
  stateTitle: {
    fontSize: scaleFont(20),
    fontFamily: 'manrope',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  stateMessage: {
    fontSize: scaleFont(16),
    fontFamily: 'manrope',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: scale(24),
    lineHeight: scaleFont(24),
  },
  primaryButton: {
    backgroundColor: colors.accentOrange,
    paddingVertical: scale(14),
    paddingHorizontal: scale(32),
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(16),
    fontFamily: 'manrope',
  },
  listContentContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(20),
  },
  bookingItemContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: scale(16),
    marginBottom: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  bookingItemHeader: {
    padding: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingItemHeaderInfo: {
    flex: 1,
    marginRight: scale(12),
  },
  bookingTitle: {
    fontSize: scaleFont(18),
    fontFamily: 'manrope',
    color: colors.text.primary,
    marginBottom: scale(12),
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  bookingDetailIcon: {
    marginRight: scale(8),
  },
  bookingDetailText: {
    fontSize: scaleFont(14),
    fontFamily: 'manrope',
    color: colors.text.secondary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
  },
  statusBadgeText: {
    fontSize: scaleFont(12),
    fontFamily: 'manrope',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  expandedContainer: {
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontFamily: 'manrope',
    color: colors.text.primary,
    marginBottom: scale(12),
    textAlign: 'center',
    marginTop: 10,
  },
  qrSection: {
    alignItems: 'center',
    padding: scale(16),
    backgroundColor: colors.surface,
    borderRadius: scale(12),
  },
  qrCodeWrapper: {
    padding: scale(10),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(8),
    marginBottom: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrInstruction: {
    fontSize: scaleFont(14),
    fontFamily: 'manrope',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  qrExpiry: {
    fontSize: scaleFont(12),
    fontFamily: 'Manrope-Medium',
    color: colors.text.tertiary,
  },
  qrExpiredText: {
    color: colors.error,
    fontFamily: 'manrope',
  },
  pendingSection: {
    alignItems: 'center',
    paddingVertical: scale(20),
    paddingHorizontal: scale(16),
    backgroundColor: colors.warning + '15',
    borderRadius: scale(12),
    marginBottom: scale(16),
  },
  pendingText: {
    fontSize: scaleFont(14),
    fontFamily: 'manrope',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
  cancelButton: {
    backgroundColor: colors.error,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    fontFamily: 'manrope',
    marginLeft: scale(8),
  },
  feedbackContainer: {
    // No extra styles needed, expandedContainer provides padding
  },
  feedbackSection: {
    marginBottom: scale(20),
    marginTop: 10,
  },
  feedbackLabel: {
    fontSize: scaleFont(14),
    fontFamily: 'manrope',
     fontWeight:'medium',
    color: colors.text.secondary,
    marginBottom: scale(10),
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    padding: scale(12),
    fontSize: scaleFont(14),
    fontFamily: 'manrope',
    color: colors.text.primary,
    minHeight: scale(80),
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  purchaseInterestContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  purchaseOption: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.surface,
    alignItems: 'center',
    marginHorizontal: scale(4),
  },
  activePurchaseOption: {
    backgroundColor: colors.accentOrange,
    borderColor: colors.accentOrange,
  },
  purchaseOptionText: {
    fontSize: scaleFont(14),
    fontFamily: 'manrope',
    color: colors.text.secondary,
  },
  activePurchaseOptionText: {
    color: '#FFFFFF',
  },
  submitFeedbackButton: {
    marginTop: scale(12),
     fontWeight:'medium'
  },
  disabledButton: {
    opacity: 0.6,
  },
  feedbackSubmitted: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(24),
    backgroundColor: colors.success + '15',
    borderRadius: scale(12),
  },
  feedbackSubmittedText: {
    fontFamily: 'manrope',
    color: colors.success,
    marginLeft: scale(8),
    fontSize: scaleFont(16),
    fontWeight:'medium'
  },
});

// --- Utility Functions ---

const getStatusInfo = (status: ApiVisitRequest['status']) => {
  const infoMap = {
    APPROVED: { color: colors.success, icon: 'checkmark-circle-outline' },
    PENDING: { color: colors.warning, icon: 'hourglass-outline' },
    REJECTED: { color: colors.error, icon: 'close-circle-outline' },
    COMPLETED: { color: colors.accent, icon: 'flag-outline' },
  };
  return (
    infoMap[status] || {
      color: colors.text.tertiary,
      icon: 'help-circle-outline',
    }
  );
};

export default Booking;
