import { useOAuth, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

export default function OAuthCallback() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const completeSignIn = async () => {
      try {
        await WebBrowser.maybeCompleteAuthSession();
        const token = await SecureStore.getItemAsync("clerk-token");
        
        if (token && isSignedIn) {
          console.log("[OAuthCallback] Session restored successfully");
          router.replace("/(guest)/(tabs)/Home");
        } else {
          console.log("[OAuthCallback] No valid session found");
          router.replace("/(auth)/sign-in");
        }
      } catch (err) {
        console.error("[OAuthCallback] Auth session error:", err);
        router.replace("/(auth)/sign-in");
      }
    };

    completeSignIn();
  }, [isSignedIn]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  );
} 