import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="sign-in"
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Role"
        options={{
          title: 'Select Role',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
