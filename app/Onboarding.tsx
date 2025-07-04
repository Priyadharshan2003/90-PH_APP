import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function Onboarding() {
  const router = useRouter();

  // Animation refs
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoTranslateY = useRef(new Animated.Value(50)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(50)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  // Floating animation
  const floatingAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    startAnimationSequence();
    startFloatingAnimation();
  }, []);

  const startAnimationSequence = () => {
    // Background fade in (optional, can be removed for instant solid bg)
    Animated.timing(backgroundOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Logo animation sequence
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(logoTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Title animation
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtitle animation
    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Button animation
    Animated.sequence([
      Animated.delay(1600),
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const startFloatingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleGetStarted = useCallback(async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    await AsyncStorage.setItem('onboardingComplete', 'true');
    router.replace('/(auth)/sign-in');
  }, [router, buttonScale]);

  const floatingTranslateY = floatingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo with Animation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { translateY: Animated.add(logoTranslateY, floatingTranslateY) },
              ],
            },
          ]}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/adaptive-icon.png')} // Your logo image
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.brandName}>90 Degree</Text>
          <Text style={styles.brandSubName}>Pride Homes</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}>
          <Text style={styles.subtitle}>Find, book, and manage your dream property with ease.</Text>
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonOpacity,
              transform: [{ scale: buttonScale }],
            },
          ]}>
          <TouchableOpacity style={styles.button} onPress={handleGetStarted} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: 'manrope',
    color: '#222',
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  brandName: {
    fontSize: 32,
    fontFamily: 'manrope',
    color: '#222',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 2,
    fontWeight: '700',
  },
  brandSubName: {
    fontSize: 28,
    fontFamily: 'manrope',
    color: '#222',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginTop: 1,
    fontWeight: '700',
  },
  subtitleContainer: {
    marginBottom: 40,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'manrope',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    borderRadius: 18,
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'manrope',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
