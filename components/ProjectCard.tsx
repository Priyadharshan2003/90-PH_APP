import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.92;
const ORANGE = '#FF8800';
const DEFAULT_IMAGE = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';

interface Plot {
  id: string;
  title: string;
  dimension: string;
  totalArea: number;
  price: number;
  priceLabel: string;
  status: string;
  imageUrls: string[];
  location: string;
  latitude: number;
  longitude: number;
  facing: string;
  amenities: string[];
  mapEmbedUrl?: string;
  qrUrl?: string;
  description: string;
  projectId: string;
  ownerId?: string;
  createdAt: string;
}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    location: string;
    description: string;
    imageUrl: string;
    createdAt: string;
    plots: Plot[];
  };
  index: number;
  style?: object;
  liked: boolean;
  onLike: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, style, liked, onLike }) => {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePress = () => {
    router.push(`/(guest)/(tabs)/Explore`);
    if (Platform.OS !== 'web' && AccessibilityInfo.announceForAccessibility) {
      AccessibilityInfo.announceForAccessibility(
        `Navigating to ${project.name || 'project details'}`
      );
    }
  };

  const availablePlots = project.plots?.filter((p) => p.status === 'AVAILABLE') || [];
  const firstPlot = availablePlots[0];
  const availableCount = availablePlots.length;

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: CARD_WIDTH },
        style,
      ]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: project.imageUrl || DEFAULT_IMAGE }}
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.gradient} />

          <View style={styles.absoluteTitleContainer}>
            <Text style={styles.absoluteTitle}>{project.name}</Text>
          </View>

          <TouchableOpacity style={[styles.favoriteButton, liked]} onPress={onLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? ORANGE : '#bbb'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.priceLocationWrapper}>
            {firstPlot && (
              <View style={styles.priceLabel}>
                <Text style={styles.priceText}>{firstPlot.priceLabel} Onwards</Text>
              </View>
            )}
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#bbb" />
              <Text style={styles.locationText} numberOfLines={1}>
                {project.location}
              </Text>
            </View>
          </View>

          {/* {firstPlot?.amenities?.length > 0 && (
            <View style={styles.amenitiesContainer}>
              {firstPlot.amenities.slice(0, 2).map((amenity, idx) => (
                <View key={idx} style={styles.amenityTag}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
              {firstPlot.amenities.length > 2 && (
                <View style={styles.amenityTag}>
                  <Text style={styles.amenityText}>+{firstPlot.amenities.length - 2} more</Text>
                </View>
              )}
            </View>
          )} */}

          <View style={styles.footer}>
            <View style={styles.availabilityContainer}>
              <Animated.View
                style={[styles.availabilityDot, { transform: [{ scale: pulseAnim }] }]}
              />
              <Text style={styles.availabilityText}>{availableCount} Available</Text>
            </View>
            <TouchableOpacity style={styles.viewDetailsButton} onPress={handlePress}>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 18,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    height: 160,
    width: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  absoluteTitleContainer: {
    position: 'absolute',
    bottom: 12,
    left: 14,
  },
  absoluteTitle: {
    fontFamily: 'manrope-bold',
    fontSize: 18,
    color: '#fff',
   
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    padding: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    padding: 14,
    gap: 8,
  },
  priceLocationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceLabel: {
    backgroundColor: '#FFEEDA',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceText: {
    fontFamily: 'manrope-bold',
    fontSize: 13,
    color: '#BF5500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: 'manrope',
    fontSize: 14,
    color: '#888',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  amenityTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amenityText: {
    fontFamily: 'manrope',
    fontSize: 11,
    color: '#334155',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 50,
    backgroundColor: '#50c878',
    marginRight: 6,
  },
  availabilityText: {
    fontFamily: 'manrope',
    fontSize: 13,
    color: '#666',
  },
  viewDetailsButton: {
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 2,
  },
  viewDetailsText: {
    fontFamily: 'manrope-bold',
    fontSize: 12,
    color: '#fff',
  },
});

export default ProjectCard;
