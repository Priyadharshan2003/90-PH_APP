import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function GuestLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  console.log('[GuestLayout] Auth state:', { isLoaded, isSignedIn });

  if (!isLoaded) {
    console.log('[GuestLayout] Auth not loaded yet');
    return null; // or a loading indicator
  }

  if (!isSignedIn) {
    console.log('[GuestLayout] User not signed in, redirecting to sign in...');
    return <Redirect href="/(auth)/sign-in" />;
  }

  console.log('[GuestLayout] User is signed in, rendering guest layout');
  return <Stack screenOptions={{ headerShown: false }} />;
}