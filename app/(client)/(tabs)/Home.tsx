import { getOwnedLands } from '@/lib/api';
import { useAuth } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Modern UI Color and Shadow Constants ---
const ORANGE = '#F97316';
const BLUE = '#2563EB';
const LIGHT_BG = 'white';
const LIGHT_BORDER = '#fff';
const GRAY_TEXT = '#666';
const MODERN_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 6,
};

interface OwnedLand {
  id: string;
  number: string;
  size: string;
  price: number;
  status: 'REGISTERED' | 'PENDING' | 'AVAILABLE';
  imageUrl: string;
  plotId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  plot: {
    title: string;
    dimension: string;
    price: number;
    location: string;
    imageUrls: string[];
    mapEmbedUrl: string | null;
    qrUrl: string | null;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    clerkId: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
}

const Home = () => {
  const { userId } = useAuth();
  const [ownedLands, setOwnedLands] = useState<OwnedLand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'REGISTERED' | 'PENDING' | 'AVAILABLE'>('ALL');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifVisible, setNotifVisible] = useState(false);
  const [qrModalLand, setQrModalLand] = useState<OwnedLand | null>(null);
  const [detailsModalLand, setDetailsModalLand] = useState<OwnedLand | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchOwnedLands = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const data = await getOwnedLands(userId);
        setOwnedLands(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch lands');
        console.error('Failed to fetch owned lands:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnedLands();
  }, [userId]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) {
        setNotifications([]);
        return;
      }
      try {
        const res = await fetch('https://90-dph.vercel.app/api/notifications');
        const data = await res.json();
        // Filter notifications for this user
        const userNotifications = data.notifications.filter(
          (n: Notification) => n.user?.clerkId === userId || n.userId === userId
        );
        setNotifications(userNotifications);
      } catch (err) {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, [userId]);

  useEffect(() => {
    const fetchQr = async () => {
      if (!qrModalLand) {
        setQrUrl(null);
        setQrLoading(false);
        return;
      }
      setQrLoading(true);
      try {
        // Fetch all plots matching the plotId
        const res = await fetch(`https://90-dph.vercel.app/api/plots?plotId=${qrModalLand.plotId}`);
        const data = await res.json();
        // Find the plot with the exact plotId
        const plot = Array.isArray(data) ? data.find((p) => p.id === qrModalLand.plotId) : data;
        setQrUrl(plot?.qrUrl || null);
      } catch (e) {
        setQrUrl(null);
      } finally {
        setQrLoading(false);
      }
    };
    if (qrModalLand) fetchQr();
  }, [qrModalLand]);

  const filteredLands = ownedLands.filter((land) =>
    filter === 'ALL' ? true : land.status === filter
  );

  const totalLands = ownedLands.length;
  const estimatedValue = ownedLands.reduce((sum, land) => sum + land.price, 0);
  const formattedValue =
    estimatedValue >= 10000000
      ? `₹${(estimatedValue / 10000000).toFixed(2)} Cr`
      : `₹${(estimatedValue / 100000).toFixed(2)} L`;
  const registeredLands = ownedLands.filter((land) => land.status === 'REGISTERED').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { fontFamily: 'manrope' }]}>My Lands</Text>
            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => setNotifVisible(true)}
              style={{ position: 'relative', marginLeft: 12 }}>
              <Ionicons name="notifications-outline" size={28} color={'#888'} />
              {notifications.some((n) => !n.isRead) && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    backgroundColor: ORANGE,
                    borderRadius: 8,
                    width: 12,
                    height: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Notification Modal */}
          <Modal
            visible={notifVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setNotifVisible(false)}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
              onPress={() => setNotifVisible(false)}
              activeOpacity={1}
            />
            <View
              style={{
                position: 'absolute',
                top: 60,
                right: 20,
                left: 20,
                backgroundColor: '#fff',
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 10,
              }}>
              <Text style={{ fontFamily: 'manrope-bold', fontSize: 18, marginBottom: 10 }}>
                Notifications
              </Text>
              {notifications.length === 0 ? (
                <Text style={{ fontFamily: 'manrope', color: '#888' }}>No notifications</Text>
              ) : (
                notifications.map((n) => (
                  <View key={n.id} style={{ marginBottom: 12 }}>
                    <Text style={{ fontFamily: 'manrope-bold', color: ORANGE }}>{n.title}</Text>
                    <Text style={{ fontFamily: 'manrope', color: '#444' }}>{n.message}</Text>
                    <Text style={{ fontFamily: 'manrope', color: '#bbb', fontSize: 12 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Modal>

          {/* Modern Summary Cards */}
          <View style={styles.statsRow}>
            <View style={styles.statsCard}>
              {/* <View style={styles.statsIconCircle}>
                <Ionicons name="layers-outline" size={22} color={ORANGE} />
              </View> */}
              <View>
                <Text style={[styles.statsLabel, { fontFamily: 'manrope' }]}>Total Lands</Text>
                <Text style={[styles.statsValue, { fontFamily: 'manrope' }]}>{totalLands}</Text>
              </View>
            </View>
            <View style={styles.statsCard}>
              {/* <View style={styles.statsIconCircle}>
                <Ionicons name="cash-outline" size={22} color={ORANGE} />
              </View> */}
              <View>
                <Text style={[styles.statsLabel, { fontFamily: 'manrope' }]}>Est. Value</Text>
                <Text style={[styles.statsValue, { fontFamily: 'manrope' }]}>{formattedValue}</Text>
              </View>
            </View>
            <View style={styles.statsCard}>
              {/* <View style={styles.statsIconCircle}>
                <Ionicons name="checkmark-done-circle-outline" size={22} color={ORANGE} />
              </View> */}
              <View>
                <Text style={[styles.statsLabel, { fontFamily: 'manrope' }]}>Registered</Text>
                <Text style={[styles.statsValue, { fontFamily: 'manrope' }]}>
                  {registeredLands}
                </Text>
              </View>
            </View>
          </View>

          {/* Filter Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}>
            {['ALL', 'REGISTERED', 'PENDING', 'AVAILABLE'].map((item) => {
              const isActive = filter === item;
              return (
                <Animated.View
                  key={item}
                  entering={FadeIn}
                  exiting={FadeOut}
                  layout={Layout.springify()}
                  style={{
                    marginRight: 10,
                    borderRadius: 20,
                    overflow: 'hidden',
                  }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Filter ${item}`}
                    activeOpacity={0.9}
                    style={[styles.filterButton, isActive && styles.activeFilterButton]}
                    onPress={() => {
                      setFilter(item as typeof filter);
                      Haptics.selectionAsync();
                    }}>
                    <Animated.Text
                      style={[
                        styles.filterButtonText,
                        isActive && styles.activeFilterButtonText,
                        {
                          fontFamily: 'manrope',
                          fontWeight: isActive ? 'bold' : '500',
                          fontSize: isActive ? 15 : 13,
                        },
                      ]}
                      entering={FadeIn}
                      exiting={FadeOut}>
                      {item.charAt(0) + item.slice(1).toLowerCase()}
                    </Animated.Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* Lands List */}
          {filteredLands.length > 0 ? (
            filteredLands.map((land) => (
              <Animated.View
                key={land.id}
                entering={FadeIn}
                exiting={FadeOut}
                layout={Layout.springify()}
                style={styles.landCard}>
                <View style={styles.landImageContainer}>
                  <Image
                    source={{
                      uri:
                        land.plot.imageUrls?.[0] ||
                        'https://via.placeholder.com/400x200?text=Land+Plot',
                    }}
                    style={styles.landImage}
                    resizeMode="cover"
                  />
                  {/* Modern Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      land.status === 'REGISTERED' && styles.statusRegistered,
                      land.status === 'PENDING' && styles.statusPending,
                      land.status === 'AVAILABLE' && styles.statusAvailable,
                    ]}>
                    <Text style={[styles.statusBadgeText, { fontFamily: 'manrope' }]}>
                      {land.status === 'REGISTERED'
                        ? 'Registered'
                        : land.status.charAt(0) + land.status.slice(1).toLowerCase()}
                    </Text>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={[styles.priceTagText, { fontFamily: 'manrope' }]}>
                      {land.price >= 10000000
                        ? `₹${(land.price / 10000000).toFixed(2)} Cr`
                        : `₹${(land.price / 100000).toFixed(2)} L`}
                    </Text>
                  </View>
                </View>

                <View style={styles.landInfo}>
                  <Text style={[styles.landTitle, { fontFamily: 'manrope' }]} numberOfLines={1}>
                    {land.plot.title}
                  </Text>
                  <Text style={[styles.landLocation, { fontFamily: 'manrope' }]} numberOfLines={1}>
                    <Ionicons name="location-sharp" size={16} color={ORANGE} /> {land.plot.location}
                  </Text>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="resize-outline" size={16} color={ORANGE} />
                      <Text style={[styles.detailText, { fontFamily: 'manrope' }]}>
                        {land.size} sq ft
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="document-text-outline" size={16} color={ORANGE} />
                      <Text style={[styles.detailText, { fontFamily: 'manrope' }]}>
                        Deed #{land.id.slice(0, 6)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={ORANGE} />
                      <Text style={[styles.metaText, { fontFamily: 'manrope' }]}>
                        {new Date(land.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={ORANGE} />
                      <Text style={[styles.metaText, { fontFamily: 'manrope' }]}>
                        {new Date(land.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', marginTop: 18, gap: 12 }}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setQrModalLand(land)}>
                      <Ionicons name="qr-code-outline" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>View QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setDetailsModalLand(land)}>
                      <Ionicons name="information-circle-outline" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))
          ) : (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              layout={Layout.springify()}
              style={styles.emptyState}>
              <Ionicons name="earth-outline" size={48} color={ORANGE} />
              <Text style={[styles.emptyStateText, { fontFamily: 'manrope' }]}>No lands found</Text>
              <Text style={[styles.emptyStateSubtext, { fontFamily: 'manrope' }]}>
                {filter === 'ALL'
                  ? "You don't own any lands yet"
                  : `No ${filter.toLowerCase()} lands`}
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* QR Modal */}
      <Modal
        visible={!!qrModalLand}
        animationType="slide"
        transparent
        onRequestClose={() => setQrModalLand(null)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
          onPress={() => setQrModalLand(null)}
          activeOpacity={1}
        />
        <View
          style={{
            position: 'absolute',
            top: 100,
            right: 24,
            left: 24,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 10,
          }}>
          <Text style={{ fontFamily: 'manrope-bold', fontSize: 18, marginBottom: 16 }}>
            Plot QR Code
          </Text>
          {qrLoading ? (
            <ActivityIndicator size="large" color={ORANGE} style={{ marginBottom: 16 }} />
          ) : qrUrl ? (
            <Image
              source={{ uri: qrUrl }}
              style={{ width: 220, height: 220, marginBottom: 16 }}
              resizeMode="contain"
            />
          ) : (
            <Text style={{ fontFamily: 'manrope', color: '#888', marginBottom: 16 }}>
              No QR code available
            </Text>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { alignSelf: 'center', marginTop: 8 }]}
            onPress={() => setQrModalLand(null)}>
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={!!detailsModalLand}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsModalLand(null)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
          onPress={() => setDetailsModalLand(null)}
          activeOpacity={1}
        />
        <View
          style={{
            position: 'absolute',
            top: 80,
            right: 18,
            left: 18,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 22,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 10,
          }}>
          <Text style={{ fontFamily: 'manrope-bold', fontSize: 18, marginBottom: 10 }}>
            Land & Plot Details
          </Text>
          {detailsModalLand && (
            <View>
              <Text style={styles.detailsLabel}>
                Land Number: <Text style={styles.detailsValue}>{detailsModalLand.number}</Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Size: <Text style={styles.detailsValue}>{detailsModalLand.size} sq ft</Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Price:{' '}
                <Text style={styles.detailsValue}>
                  {detailsModalLand.price >= 10000000
                    ? `₹${(detailsModalLand.price / 10000000).toFixed(2)} Cr`
                    : `₹${(detailsModalLand.price / 100000).toFixed(2)} L`}
                </Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Status: <Text style={styles.detailsValue}>{detailsModalLand.status}</Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Plot Title: <Text style={styles.detailsValue}>{detailsModalLand.plot.title}</Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Location: <Text style={styles.detailsValue}>{detailsModalLand.plot.location}</Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Dimension:{' '}
                <Text style={styles.detailsValue}>{detailsModalLand.plot.dimension}</Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Plot Price:{' '}
                <Text style={styles.detailsValue}>
                  {detailsModalLand.plot.price >= 10000000
                    ? `₹${(detailsModalLand.plot.price / 10000000).toFixed(2)} Cr`
                    : `₹${(detailsModalLand.plot.price / 100000).toFixed(2)} L`}
                </Text>
              </Text>
              <Text style={styles.detailsLabel}>
                Created At:{' '}
                <Text style={styles.detailsValue}>
                  {new Date(detailsModalLand.createdAt).toLocaleString()}
                </Text>
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { alignSelf: 'center', marginTop: 16 }]}
            onPress={() => setDetailsModalLand(null)}>
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    color: ORANGE,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'manrope',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'medium',

    fontFamily: 'manrope',
  },
  // Modern stats cards
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    ...MODERN_CARD_SHADOW,
  },
  statsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
  },
  statsLabel: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginBottom: 2,
    fontFamily: 'manrope',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#888',
    fontFamily: 'manrope',
    textAlign: 'center',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: LIGHT_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
  },
  activeFilterButton: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  filterButtonText: {
    color: GRAY_TEXT,
    fontWeight: '500',
    fontFamily: 'manrope',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontFamily: 'manrope',
  },
  landCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    ...MODERN_CARD_SHADOW,
  },
  landImageContainer: {
    height: 200,
    position: 'relative',
  },
  landImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: ORANGE,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    zIndex: 2,
  },
  statusRegistered: {
    backgroundColor: '#22C55E',
    borderColor: '22C55E',
  },
  statusPending: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  statusAvailable: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'medium',
    textTransform: 'capitalize',
    fontFamily: 'manrope',
  },
  priceTag: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(249,115,22,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 2,
  },
  priceTagText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'manrope',
  },
  landInfo: {
    padding: 18,
  },
  landTitle: {
    fontSize: 20,
    fontWeight: 'medium',

    marginBottom: 4,
    fontFamily: 'manrope',
  },
  landLocation: {
    fontSize: 14,
    color: GRAY_TEXT,
    marginBottom: 12,
    fontFamily: 'manrope',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BG,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
  },
  detailText: {
    fontSize: 14,
    color: GRAY_TEXT,
    marginLeft: 6,
    fontFamily: 'manrope',
  },
  divider: {
    height: 1,
    backgroundColor: LIGHT_BORDER,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: GRAY_TEXT,
    marginLeft: 6,
    fontFamily: 'manrope',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: GRAY_TEXT,
    marginTop: 16,
    fontWeight: '500',
    fontFamily: 'manrope',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    fontFamily: 'manrope',
  },
  actionButton: {
    padding: 12,
    backgroundColor: ORANGE,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'manrope',
  },
  detailsLabel: {
    fontSize: 14,
    color: GRAY_TEXT,
    fontFamily: 'manrope',
  },
  detailsValue: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'manrope',
  },
});

export default Home;
