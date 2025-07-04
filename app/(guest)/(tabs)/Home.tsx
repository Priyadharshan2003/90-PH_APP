import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProjectCard from '../../../components/ProjectCard';
import { getProjects, ProjectType } from '../../../lib/api';

const { width } = Dimensions.get('window');
const ORANGE = '#FF8800';

const scaleFont = (size: number) => Math.round((size * width) / 375);
const scale = (size: number) => Math.round((size * width) / 375);

// User metadata for role-based redirection
interface UserMetadata {
  role?: string;
}

// Update the Notification interface to include user information
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
  user: {
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

// Extend ProjectType for local use to include optional location and state
interface ProjectWithLocation extends ProjectType {
  location?: string;
  state?: string;
}

export default function Page() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [projects, setProjects] = useState<ProjectWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifVisible, setNotifVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedProjects, setLikedProjects] = useState<{ [key: string]: boolean }>({});
  const [selectedLocation, setSelectedLocation] = useState('');
  const [banners, setBanners] = useState<
    { id: string; imageUrl: string; title: string; description: string }[]
  >([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const bannerCarouselRef = useRef<FlatList>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projectData = await getProjects();
      setProjects(projectData);
    } catch (err) {
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update the fetchNotifications function
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('https://90-dph.vercel.app/api/notifications');
      const data = await res.json();

      if (user?.id) {
        // user.id contains the clerk ID
        // Filter notifications where either:
        // 1. The notification's user.clerkId matches the current user's ID
        // 2. The notification's user.role matches the current user's role (for role-wide notifications)
        const userNotifications = data.notifications.filter(
          (n: Notification) =>
            n.user.clerkId === user.id ||
            (user.publicMetadata?.role && n.user.role === user.publicMetadata.role)
        );
        setNotifications(userNotifications);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    }
  }, [user]);

  // Fetch banner
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch('https://90-dph.vercel.app/api/banner-ads');
        const data = await res.json();
        const activeBanners = data.filter((b: any) => b.isActive);
        if (activeBanners.length > 0) {
          setBanners(activeBanners);
        }
      } catch (e) {
        setBanners([]);
      }
    };
    fetchBanners();
  }, []);

  // Auto-scroll for banner carousel
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setActiveIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          bannerCarouselRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 7000); // 3 seconds

      return () => clearInterval(interval);
    }
  }, [banners.length]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, [fetchProjects]);

  // Extract unique locations
  const locations = Array.from(
    new Set(projects.map((p) => p.city || p.location || '').filter(Boolean))
  );

  // Filtered projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.state?.toLowerCase?.().includes(searchQuery.toLowerCase()) ||
      project.location?.toLowerCase?.().includes(searchQuery.toLowerCase());
    const matchesLocation = selectedLocation
      ? project.city === selectedLocation || project.location === selectedLocation
      : true;
    return matchesSearch && matchesLocation;
  });

  // Like button handler
  const toggleLike = (projectId: string) => {
    setLikedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  if (!isAuthLoaded || !isUserLoaded) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={{ fontFamily: 'manrope', marginTop: 16, color: ORANGE }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 20,
        }}>
        <View>
          <Text style={{ fontFamily: 'manrope-bold', fontSize: scaleFont(22), color: '#222' }}>
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}
          </Text>
          <Text
            style={{ fontFamily: 'manrope', fontSize: scaleFont(13), color: '#888', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        {/* Notification Bell */}
        <TouchableOpacity onPress={() => setNotifVisible(true)} style={{ position: 'relative' }}>
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
            notifications.map((n: Notification) => (
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
      {/* Search Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F7F7F7',
          borderRadius: 35,
          marginHorizontal: 20,
          marginTop: 5,
          marginBottom: 8,
          paddingHorizontal: 12,
          paddingVertical: 5,
          shadowColor: '#000',
          shadowOpacity: 0.03,
          shadowRadius: 2,
        }}>
        <Ionicons name="search" size={20} color="#bbb" />
        <TextInput
          style={{ flex: 1, marginLeft: 8, fontFamily: 'manrope', fontSize: 15, color: '#222' }}
          placeholder="Search projects..."
          placeholderTextColor="#bbb"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>
      {/* Main ScrollView containing all content */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          // paddingTop:8,
        }}>
        {/* Banner Carousel */}
        {banners.length > 0 && (
          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <FlatList
              ref={bannerCarouselRef}
              data={banners}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{
                    width: width * 0.9,
                    height: Math.ceil((width * 0.9) / 1.6),
                    borderRadius: 18,
                  }}
                  resizeMode="cover"
                />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ width: width * 0.9, borderRadius: 18 }}
              contentContainerStyle={{ alignItems: 'center' }}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width * 0.9));
                setActiveIndex(index);
              }}
              nestedScrollEnabled={true}
            />
            {/* Carousel Dots */}
            <View
              style={{
                flexDirection: 'row',
                position: 'absolute',
                bottom: 10,
              }}>
              {banners.map((_, i) => (
                <View
                  key={i}
                  style={{
                    height: 8,
                    width: 8,
                    borderRadius: 4,
                    backgroundColor: i === activeIndex ? 'orange' : 'white',
                    marginHorizontal: 4,
                    opacity: 0.9,
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {/* Featured Projects Heading */}
        <Text
          style={{
            fontFamily: 'manrope-bold',
            fontSize: 18,
            color: '#333',
            marginTop: 14,
            marginLeft: 20,
            marginBottom: 4,
          }}>
          Featured Projects
        </Text>

        {/* Location Filter - Convert FlatList to ScrollView */}
        {locations.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
            nestedScrollEnabled={true}>
            {locations.map((item) => {
              const selected = selectedLocation === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedLocation(selected ? '' : item)}
                  style={{
                    backgroundColor: selected ? '#FF8800' : '#F3F3F3',
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 20,
                    marginRight: 12,
                    marginBottom: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    elevation: 1,
                  }}>
                  <Text
                    style={{
                      fontFamily: 'manrope',
                      color: selected ? '#fff' : '#444',
                      fontWeight: selected ? 'bold' : '500',
                      fontSize: 14,
                      letterSpacing: 0.2,
                    }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Project List */}
        <View style={{ paddingHorizontal: 20 }}>
          {loading ? (
            <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text
              style={{ fontFamily: 'manrope', color: 'red', textAlign: 'center', marginTop: 40 }}>
              {error}
            </Text>
          ) : filteredProjects.length === 0 ? (
            <Text
              style={{ fontFamily: 'manrope', color: '#888', textAlign: 'center', marginTop: 40 }}>
              No projects found.
            </Text>
          ) : (
            filteredProjects.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={idx}
                liked={!!likedProjects[project.id]}
                onLike={() => toggleLike(project.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(15),
    marginTop: scale(30),
    backgroundColor: '#fff',
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: scaleFont(14),
    color: '#6B7280',
    textAlign: 'center',
    marginTop: scale(10),
    marginBottom: scale(15),
    lineHeight: scale(20),
  },
  exploreButton: {
    backgroundColor: '#3366CC',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3366CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9', // Use a lighter background for the search bar
    borderRadius: scale(50),
    paddingHorizontal: scale(10),
    marginTop: scale(10), // Adjust margin as needed
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    height: scale(40), // Standard height for input fields
    fontSize: scaleFont(14),
    color: '#0F172A', // Primary text color
  },
  clearSearchButton: {
    marginLeft: scale(8),
    padding: scale(4),
  },
});
