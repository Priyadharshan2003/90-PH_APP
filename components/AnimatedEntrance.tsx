import React, { useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

interface AnimatedEntranceProps {
  children: React.ReactNode;
  index: number;
}

export const AnimatedEntrance = ({ children, index }: AnimatedEntranceProps) => {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View style={[styles.animated, { opacity, transform: [{ translateY }] }]}> 
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animated: {
    width: '100%',
  },
});
