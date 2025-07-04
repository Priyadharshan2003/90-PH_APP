import React, { useRef } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleTo?: number;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ children, scaleTo = 0.96, ...props }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        {...props}
        onPressIn={(e) => {
          handlePressIn();
          props.onPressIn && props.onPressIn(e);
        }}
        onPressOut={(e) => {
          handlePressOut();
          props.onPressOut && props.onPressOut(e);
        }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
