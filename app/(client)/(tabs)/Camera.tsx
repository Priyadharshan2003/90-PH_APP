import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

interface Camera {
  id: string;
  type: string;
  title: string;
  location: string;
  size?: string;
  number?: string;
  ipAddress: string;
  label?: string;
  status?: 'online' | 'offline';
  lastActive?: string;
  project?: {
    name: string;
    location: string;
  };
}

const CameraScreen = () => {
  const { userId } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<{ [key: string]: string }>({});
  const [streamLoading, setStreamLoading] = useState<{ [key: string]: boolean }>({});
  const webViewRefs = useRef<{ [key: string]: WebView | null }>({});

  useEffect(() => {
    fetchCameras();
    return () => {
      setSelectedCamera(null);
      setStreamError({});
      setStreamLoading({});
    };
  }, [userId]);

  const fetchCameras = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setStreamError({});
      
      const response = await fetch(`https://90-dph.vercel.app/api/cameras?clerkid=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the data to match our Camera interface
      const cameraData = data.map((item: any) => ({
        id: item.id,
        type: item.type || 'IP',
        title: item.title || item.name || 'Unknown Camera',
        location: item.location || '',
        size: item.size,
        number: item.number,
        ipAddress: item.ipAddress,
        label: item.label,
        status: item.status || 'online',
        lastActive: item.lastActive || new Date().toISOString(),
        project: item.project,
      }));

      setCameras(cameraData);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      Alert.alert(
        'Error',
        'Failed to fetch cameras. Please check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: fetchCameras },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const getStreamUrl = (ipAddress: string) => {
    let streamUrl = ipAddress.trim();
    
    // Handle different IP address formats
    if (!streamUrl.startsWith('http') && !streamUrl.startsWith('rtsp')) {
      streamUrl = `http://${streamUrl}`;
    }
    
    // Handle specific camera types
    if (streamUrl.includes('axis')) {
      return `${streamUrl}/axis-cgi/mjpg/video.cgi?resolution=640x480`;
    }
    
    // Default MJPEG stream endpoint
    return `${streamUrl}/video`;
  };

  const handleWebViewError = (cameraId: string) => {
    setStreamError(prev => ({
      ...prev,
      [cameraId]: 'Failed to load camera stream'
    }));
    setStreamLoading(prev => ({
      ...prev,
      [cameraId]: false
    }));
    
    Alert.alert(
      'Stream Error',
      'Unable to connect to camera stream. Please check the camera connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Retry', 
          onPress: () => {
            setStreamError(prev => {
              const newErrors = { ...prev };
              delete newErrors[cameraId];
              return newErrors;
            });
            setStreamLoading(prev => ({
              ...prev,
              [cameraId]: true
            }));
            webViewRefs.current[cameraId]?.reload();
          }
        },
      ]
    );
  };

  const handleWebViewLoad = (cameraId: string) => {
    setStreamLoading(prev => ({
      ...prev,
      [cameraId]: false
    }));
    setStreamError(prev => {
      const newErrors = { ...prev };
      delete newErrors[cameraId];
      return newErrors;
    });
  };

  const renderCameraStream = (camera: Camera) => {
    const streamUrl = getStreamUrl(camera.ipAddress);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            margin: 0; 
            background: black; 
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
          }
          img { 
            max-width: 100%; 
            max-height: 100%; 
            object-fit: contain;
            border-radius: 8px;
          }
          .loading {
            color: white;
            text-align: center;
            padding: 20px;
          }
          .error {
            color: #ff6b6b;
            text-align: center;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div class="loading" id="loading">Loading camera stream...</div>
        <img id="stream" src="${streamUrl}" 
             onload="document.getElementById('loading').style.display='none'; window.ReactNativeWebView.postMessage('loaded');" 
             onerror="document.getElementById('loading').innerHTML='<div class=error>Failed to load stream</div>'; window.ReactNativeWebView.postMessage('error');">
      </body>
      </html>
    `;

    return (
      <View style={styles.streamContainer}>
        {streamLoading[camera.id] && (
          <View style={styles.streamLoadingOverlay}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.streamLoadingText}>Loading stream...</Text>
          </View>
        )}
        <WebView
          ref={(ref) => {
            webViewRefs.current[camera.id] = ref;
          }}
          source={{ html: htmlContent }}
          style={styles.stream}
          javaScriptEnabled={true}
          onError={() => handleWebViewError(camera.id)}
          onHttpError={() => handleWebViewError(camera.id)}
          onMessage={(event) => {
            const message = event.nativeEvent.data;
            if (message === 'loaded') {
              handleWebViewLoad(camera.id);
            } else if (message === 'error') {
              handleWebViewError(camera.id);
            }
          }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          startInLoadingState={true}
          onLoadStart={() => {
            setStreamLoading(prev => ({
              ...prev,
              [camera.id]: true
            }));
          }}
          onLoadEnd={() => {
            setStreamLoading(prev => ({
              ...prev,
              [camera.id]: false
            }));
          }}
        />
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={() => {
            setStreamError(prev => {
              const newErrors = { ...prev };
              delete newErrors[camera.id];
              return newErrors;
            });
            setStreamLoading(prev => ({
              ...prev,
              [camera.id]: true
            }));
            webViewRefs.current[camera.id]?.reload();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
        {streamError[camera.id] && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{streamError[camera.id]}</Text>
          </View>
        )}
      </View>
    );
  };

  const handleCameraPress = (cameraId: string) => {
    const isCurrentlySelected = selectedCamera === cameraId;
    
    if (isCurrentlySelected) {
      // Collapsing the current stream
      setSelectedCamera(null);
      setStreamError(prev => {
        const newErrors = { ...prev };
        delete newErrors[cameraId];
        return newErrors;
      });
      setStreamLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[cameraId];
        return newLoading;
      });
    } else {
      // Expanding a new stream
      setSelectedCamera(cameraId);
      setStreamError(prev => {
        const newErrors = { ...prev };
        delete newErrors[cameraId];
        return newErrors;
      });
      setStreamLoading(prev => ({
        ...prev,
        [cameraId]: true
      }));
    }
    
    Haptics.selectionAsync();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading cameras...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Hero Banner */}
          <View style={{ marginBottom: 24 }}>
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              layout={Layout.springify()}
              style={styles.heroBanner}>
              <Ionicons name="videocam" size={40} color="#fff" style={{ marginBottom: 8 }} />
              <Text style={styles.heroTitle}>Security Cameras</Text>
              <Text style={styles.heroSubtitle}>
                Monitor your properties in real-time. Tap a camera to view its stream.
              </Text>
            </Animated.View>
          </View>

          {/* Camera Cards */}
          {cameras.length === 0 ? (
            <Animated.View
              entering={FadeIn}
              style={styles.emptyState}>
              <Ionicons name="videocam-off" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateText}>No cameras found</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchCameras}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            cameras.map((camera) => (
              <Animated.View
                key={camera.id}
                entering={FadeIn}
                exiting={FadeOut}
                layout={Layout.springify()}
                style={styles.cameraSection}>
                <View
                  style={[
                    styles.cameraCard,
                    selectedCamera === camera.id && styles.selectedCameraCard,
                  ]}>
                  <TouchableOpacity
                    style={styles.cameraCardContent}
                    onPress={() => handleCameraPress(camera.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select camera ${camera.title}`}
                    activeOpacity={0.92}>
                    <View style={styles.cameraInfo}>
                      <Text style={styles.cameraName}>
                        {camera.label ? `${camera.title} (${camera.label})` : camera.title}
                      </Text>
                      <Text style={styles.cameraDetails}>{camera.ipAddress}</Text>
                      {camera.project && (
                        <Text style={styles.projectDetails}>
                          {camera.project.name}
                          {camera.project.location ? ` - ${camera.project.location}` : ''}
                        </Text>
                      )}
                      <View style={styles.statusContainer}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: camera.status === 'online' ? '#10B981' : '#FF5252' },
                          ]}
                        />
                        <Text style={styles.statusText}>{camera.status || 'online'}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={selectedCamera === camera.id ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color="#FF6B00"
                    />
                  </TouchableOpacity>
                </View>

                {/* Stream Section - Rendered directly under each camera */}
                {selectedCamera === camera.id && (
                  <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    layout={Layout.springify()}
                    style={styles.streamSection}>
                    <Text style={styles.streamTitle}>Live Stream - {camera.title}</Text>
                    {renderCameraStream(camera)}
                  </Animated.View>
                )}
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'manrope',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  heroBanner: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    marginHorizontal: 0,
    marginTop: 8,
    shadowColor: '#FF6B00',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5,
    fontFamily: 'manrope',
  },
  heroSubtitle: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.85,
    fontFamily: 'manrope',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 14,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
    fontFamily: 'manrope',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  cameraSection: {
    marginBottom: 14,
  },
  cameraCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCameraCard: {
    borderWidth: 2,
    borderColor: '#FF6B00',
    backgroundColor: '#FFF7ED',
  },
  cameraCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraInfo: {
    flex: 1,
  },
  cameraName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'manrope',
  },
  cameraDetails: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'manrope',
  },
  projectDetails: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    fontFamily: 'manrope',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
    fontFamily: 'manrope',
  },
  streamSection: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'manrope',
  },
  streamContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stream: {
    width: '100%',
    height: '100%',
  },
  streamLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  streamLoadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
    fontFamily: 'manrope',
  },
  refreshButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
    zIndex: 3,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    padding: 8,
    zIndex: 2,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'manrope',
  },
});
export default CameraScreen;