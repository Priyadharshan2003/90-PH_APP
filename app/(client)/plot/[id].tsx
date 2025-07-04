import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getPlotById, PlotType } from '../../../lib/api';

// Add Land type interface
interface Land {
  id: string;
  number: string;
  size: string;
  price: number;
  status: 'AVAILABLE' | 'SOLD';
  imageUrl: string;
  plotId: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  totalArea: string;
}

// Update PlotType to include lands
interface ExtendedPlotType extends PlotType {
  lands?: Land[];
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: width,
    height: 320,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  headerControls: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 48,
    right: 80,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  contentCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  contentPadding: {
    padding: 24,
  },
  priceBadge: {
    backgroundColor: '#F97316',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  priceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'manrope',
  },
  title: {
    fontSize: 24,
    fontWeight: 'medium',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'manrope',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationText: {
    color: '#4B5563',
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'manrope',
  },
  detailsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'manrope',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'manrope',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValue: {
    color: '#111827',
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'manrope',
  },
  aboutText: {
    color: '#4B5563',
    lineHeight: 24,
    fontFamily: 'manrope',
  },
  amenitiesContainer: {
    marginBottom: 24,
  },
  amenityTag: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 2,
    marginBottom: 8,
    shadowColor: '#FDBA74',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  amenityText: {
    color: '#C2410C',
    fontWeight: '500',
    fontFamily: 'manrope',
  },
  mapContainer: {
    marginBottom: 24,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'manrope',
  },
  mapView: {
    height: 192,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bottomButton: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  bookButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'manrope',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    color: '#4B5563',
    fontSize: 16,
    fontFamily: 'manrope',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorCard: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'manrope',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'manrope',
  },
  aboutContainer: {
    marginBottom: 24,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    color: '#6B7280',
    marginTop: 8,
    fontSize: 14,
  },
  landImageContainer: {
    marginBottom: 24,
  },
  landImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginTop: 12,
  },
  availableLandsContainer: {
    marginBottom: 24,
  },
  landsList: {
    marginTop: 12,
  },
  landCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  landCardContent: {
    padding: 16,
  },
  landHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  landNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'manrope',
  },
  landDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  landDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  landSize: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'manrope',
  },
  landPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
    fontFamily: 'manrope',
  },
  landStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  landStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'manrope',
  },
  detailItemColumn: {
    width: '48%',
    marginBottom: 16,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
});

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [plot, setPlot] = useState<ExtendedPlotType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) {
      setError('Plot ID is missing');
      setLoading(false);
      return;
    }
    fetchPlotDetails();
  }, [id]);

  useEffect(() => {
    if (plot?.imageUrls && plot.imageUrls.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % (plot?.imageUrls?.length || 1);
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [plot]);

  const fetchPlotDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Plot ID is required');
      }

      const plotId = Array.isArray(id) ? id[0] : id;

      // Fetch plot details
      const plotData = await getPlotById(plotId);
      if (!plotData) {
        throw new Error('Plot not found');
      }

      // Fetch lands data
      const landsResponse = await fetch(`https://90-dph.vercel.app/api/lands?plotId=${plotId}`);
      const landsData = await landsResponse.json();

      if (!landsResponse.ok) {
        throw new Error('Failed to fetch lands data');
      }

      // Combine plot and lands data
      setPlot({
        ...plotData,
        lands: landsData,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plot details';
      setError(errorMessage);
      console.error('Error fetching plot details:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderImageItem = ({ item }: { item: string }) => (
    <View style={{ width }}>
      <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
    </View>
  );

  const renderPaginationDots = () => {
    if (!plot?.imageUrls || plot.imageUrls.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {plot.imageUrls.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === currentImageIndex ? 'white' : 'white/50',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const onScrollEnd = (event: any) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(newIndex);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    const plotIdValue = Array.isArray(plotId) ? plotId[0] : plotId;
    const userIdValue = typeof userId === 'string' ? userId : String(userId);

    try {
      const payload = {
        plotId: plotIdValue,
        userId: userIdValue,
        message: message.trim(),
      };
      console.log('Submitting buy request:', payload);

      const response = await fetch('https://90-dph.vercel.app/api/buy-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit buy request.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) errorMessage = errorData.error;
        } catch (e) {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading plot details...</Text>
      </View>
    );
  }

  if (error || !plot) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B35" />
          <Text style={styles.errorText}>{error || 'Plot not found'}</Text>
          <TouchableOpacity onPress={fetchPlotDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <FlatList
            ref={flatListRef}
            data={plot.imageUrls || []}
            renderItem={renderImageItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            keyExtractor={(item, index) => index.toString()}
          />
          {renderPaginationDots()}

          <View style={styles.headerControls}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setLiked((prev) => !prev)}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#FF6B35' : '#1F2937'}
              />
            </TouchableOpacity>
          </View>

          {plot.status.toLowerCase() === 'available' && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Available</Text>
            </View>
          )}
        </View>

        <View style={styles.contentCard}>
          <View style={styles.contentPadding}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>₹{(plot.price / 100000).toFixed(2)} Lac</Text>
            </View>

            <Text style={styles.title}>{plot.title}</Text>

            <View style={styles.locationContainer}>
              <Ionicons name="location" size={18} color="#FF6B35" />
              <Text style={styles.locationText}>{plot.location}</Text>
            </View>
            {/* 
            Land Image Section
            <View style={styles.landImageContainer}>
              <Text style={styles.sectionTitle}>Land Image</Text>
              <Image
                source={{ uri: plot.imageUrls?.[0] }}
                style={styles.landImage}
                resizeMode="cover"
              />
            </View> */}

            {/* Available Land Image Section */}
            {plot.lands?.find((land) => land.status === 'AVAILABLE' && land.imageUrl) && (
              <View style={styles.landImageContainer}>
                <Text style={styles.sectionTitle}>Available Lands</Text>
                <Image
                  source={{
                    uri: plot.lands.find((land) => land.status === 'AVAILABLE' && land.imageUrl)
                      ?.imageUrl,
                  }}
                  style={styles.landImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Available Lands Section */}
            <View style={styles.availableLandsContainer}>
              <Text style={styles.sectionTitle}>All Lands</Text>
              <View style={styles.landsList}>
                {plot.lands?.map((land: Land) => {
                  const isOwnedByUser = userId && land.ownerId === userId;
                  let badgeColor = '#EF4444'; // Default: Sold (red)
                  let badgeText = 'Sold';
                  if (isOwnedByUser) {
                    badgeColor = '#2563EB'; // Registered (blue)
                    badgeText = 'Registered';
                  } else if (land.status === 'AVAILABLE') {
                    badgeColor = '#22C55E'; // Available (green)
                    badgeText = 'Available';
                  }
                  return (
                    <View key={land.id} style={styles.landCard}>
                      <View style={styles.landCardContent}>
                        <View style={styles.landHeader}>
                          <Text style={styles.landNumber}>Land {land.number}</Text>
                          <View style={[styles.landStatus, { backgroundColor: badgeColor }]}>
                            <Text style={[styles.landStatusText, { fontFamily: 'manrope' }]}>
                              {badgeText}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.landDetails}>
                          <View style={styles.landDetailItem}>
                            <Ionicons name="resize-outline" size={16} color="#6B7280" />
                            <Text style={styles.landSize}>{land.size}</Text>
                          </View>
                          <View style={styles.landDetailItem}>
                            <Ionicons name="cash-outline" size={16} color="#6B7280" />
                            <Text style={styles.landPrice}>
                              ₹{(land.price / 100000).toFixed(2)} Lac
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Property Details</Text>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItemColumn}>
                  <View style={styles.detailLabelRow}>
                    <Ionicons
                      name="resize-outline"
                      size={16}
                      color="#6B7280"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.detailLabel}>Plot Area</Text>
                  </View>
                  <Text style={styles.detailValue}>{plot.dimension}</Text>
                </View>
                <View style={styles.detailItemColumn}>
                  <View style={styles.detailLabelRow}>
                    <Ionicons
                      name="compass-outline"
                      size={16}
                      color="#6B7280"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.detailLabel}>Facing</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {plot.facing.charAt(0).toUpperCase() + plot.facing.slice(1)}
                  </Text>
                </View>
                <View style={styles.detailItemColumn}>
                  <View style={styles.detailLabelRow}>
                    <Ionicons
                      name="pricetag-outline"
                      size={16}
                      color="#6B7280"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.detailLabel}>Price</Text>
                  </View>
                  <Text style={styles.detailValue}>{plot.priceLabel}</Text>
                </View>
                <View style={styles.detailItemColumn}>
                  <View style={styles.detailLabelRow}>
                    <Ionicons
                      name="golf-outline"
                      size={16}
                      color="#6B7280"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.detailLabel}>Total Area</Text>
                  </View>
                  <Text style={styles.detailValue}>{plot.totalArea} m/Km</Text>
                </View>
              </View>
            </View>

            <View style={styles.aboutContainer}>
              <Text style={styles.aboutTitle}>About Property</Text>
              <Text style={styles.aboutText}>
                This agriculture/farm plot is available for sale at {plot.location}. It is a
                licensed plot in a very good area, the plot is measuring {plot.dimension} and priced{' '}
                {plot.priceLabel}.
              </Text>
            </View>

            {plot.amenities && plot.amenities.length > 0 && (
              <View style={styles.amenitiesContainer}>
                <Text style={styles.aboutTitle}>Amenities</Text>
                <View style={styles.detailsGrid}>
                  {plot.amenities.map((amenity, index) => (
                    <View key={index} style={styles.amenityTag}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Location</Text>
              <View style={styles.mapView}>
                {plot.mapEmbedUrl ? (
                  <WebView
                    source={{
                      html: `
                        <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                            <style>
                              body { margin: 0; padding: 0; }
                              iframe { width: 100%; height: 100%; border: none; }
                            </style>
                          </head>
                          <body>
                            <iframe
                              src="${plot.mapEmbedUrl}"
                              width="100%"
                              height="100%"
                              style="border:0;"
                              allowfullscreen=""
                              loading="lazy"
                              referrerpolicy="no-referrer-when-downgrade"
                            ></iframe>
                          </body>
                        </html>
                      `,
                    }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.mapPlaceholder}>
                        <Ionicons name="location-outline" size={48} color="#9CA3AF" />
                        <Text style={styles.mapPlaceholderText}>Map not available</Text>
                      </View>
                    )}
                  />
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Ionicons name="location-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.mapPlaceholderText}>Map not available</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {plot.status.toLowerCase() === 'available' && (
        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              const availableLand = plot.lands?.find((land) => land.status === 'AVAILABLE');
              if (availableLand) {
                router.push(`/buy-request/${plot.id}`);
              } else {
                Alert.alert('No available land to buy');
              }
            }}>
            <Text style={styles.bookButtonText}>Buy Request</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
