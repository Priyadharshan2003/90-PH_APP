// app/(auth)/role.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { getUserByClerkId, updateUserProfile, UpdateUserProfileType } from "@/lib/api";
const { width, height } = Dimensions.get("window");
export default function RoleSelectionScreen() {
  const { isSignedIn, isLoaded, userId, getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [animationError, setAnimationError] = useState(false);
  const [currentRole, setCurrentRole] = useState<"GUEST" | "CLIENT" | "MANAGER" | null>(null);
  const [roleFetchError, setRoleFetchError] = useState(false);
  useEffect(() => {
    if (!isLoaded) {
      console.log("[Role] Auth not loaded yet");
      return;
    }
    if (!isSignedIn) {
      console.log("[Role] User not signed in, redirecting to sign-in...");
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);
  const fetchCurrentRole = useCallback(async () => {
    if (!userId) {
      console.log("[Role] No user ID found for role fetch");
      setRoleFetchError(true);
      return;
    }
    try {
      console.log("[Role] Fetching user role for clerkId:", userId);
      const response = await getUserByClerkId(userId);
      console.log("[Role] getUserByClerkId response:", JSON.stringify(response));

      const userData = Array.isArray(response)
        ? response.find((user) => user.clerkId === userId)
        : response;

      if (userData?.role) {
        console.log("[Role] Found user role:", userData.role);
        setCurrentRole(userData.role);
      } else {
        console.log("[Role] No role found for user");
        setCurrentRole(null);
        setRoleFetchError(false); 
      }
    } catch (err) {
      console.error("[Role] Error fetching user role:", err);
      setCurrentRole(null);
      setRoleFetchError(true);
    }
  }, [userId]);
  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchCurrentRole();
    }
  }, [isLoaded, isSignedIn, userId, fetchCurrentRole]);
  useEffect(() => {
    if (currentRole) {
      console.log(`[Role] Current role detected (${currentRole}), redirecting...`);
      setLoading(true);
      switch (currentRole) {
        case "GUEST":
          router.replace("/(guest)/(tabs)/Home");
          break;
        case "CLIENT":
          router.replace("/(client)/(tabs)/Home");
          break;
        case "MANAGER":
          router.replace("/(manager)/(tabs)/Home");
          break;
      }
    }
  }, [currentRole, router]);
  const handleRoleSelect = useCallback(
    async (selectedRole: "GUEST" | "CLIENT" | "MANAGER") => {
      if (!userId) {
        console.log("[Role] No user ID found for role selection");
        Alert.alert("Error", "User ID not found. Please sign in again.");
        return;
      }
      setLoading(true);
      console.log("[Role] Attempting to set role to:", selectedRole);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Authentication token not found.");
        }
        const updateData: UpdateUserProfileType = { role: selectedRole };
        console.log("[Role] Updating user role for clerkId:", userId, "to:", selectedRole);
        await updateUserProfile(userId, updateData, token);
        console.log("[Role] Role updated successfully to:", selectedRole);
        setCurrentRole(selectedRole);
      } catch (err: any) {
        console.error("[Role] Error selecting role:", err.message || err);
        Alert.alert(
          "Error",
          "We couldn't update your role at this moment.",
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
      }
    },
    [userId, getToken]
  );
  const continueAsGuest = useCallback(() => {
    console.log("[Role] Continuing as guest...");
    router.replace("/(guest)/(tabs)/Home");
  }, [router]);
  if (!isLoaded || !isSignedIn) {
    return (
      <View style={styles.fullScreenLoading}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    );
  }
  if (currentRole === null && !roleFetchError) {
    return (
      <View style={styles.fullScreenLoading}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Checking your account...</Text>
      </View>
    );
  }
  let subtitleText;
  if (roleFetchError) {
    subtitleText = "We couldn't verify your account details. Please continue as Guest or try again later.";
  } else {
    subtitleText = "Choose your role to proceed or continue as Guest.";
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {!animationError && (
          <LottieView
            source={require("@/assets/login-anime.json")}
            autoPlay
            loop
            style={styles.lottieAnimation}
            onError={(error) => {
              console.error("[Role] Lottie animation error:", error);
              setAnimationError(true);
            }}
          />
        )}
        {animationError && (
          <View style={styles.lottieAnimation}>
            <Text style={styles.fallbackText}>Welcome</Text>
          </View>
        )}
        <View style={styles.contentCard}>
          <Text style={styles.title}>Select Your Role</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
          {!roleFetchError && (
            <>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  loading && styles.disabledButton,
                  styles.clientButton,
                ]}
                onPress={() => handleRoleSelect("CLIENT")}
                disabled={loading}
              >
                <Text style={styles.roleButtonText}>Client</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  loading && styles.disabledButton,
                  styles.managerButton,
                ]}
                onPress={() => handleRoleSelect("MANAGER")}
                disabled={loading}
              >
                <Text style={styles.roleButtonText}>Manager</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[
              styles.roleButton,
              loading && styles.disabledButton,
              styles.guestButton,
            ]}
            onPress={continueAsGuest}
            disabled={loading}
          >
            <Text style={styles.roleButtonText}>
              {roleFetchError ? "Continue as Guest" : "Guest"}
            </Text>
          </TouchableOpacity>

          {roleFetchError && (
            <TouchableOpacity
              style={[styles.roleButton, styles.retryButton]}
              onPress={fetchCurrentRole}
              disabled={loading}
            >
              <Text style={styles.roleButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF0E6",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 40 : 0,
    justifyContent: "center",
  },
  lottieAnimation: {
    width: width * 0.9,
    height: height * 0.3,
    marginBottom: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  fallbackText: {
    textAlign: "center",
    fontSize: 24,
    color: "#4A5568",
    fontWeight: 'bold',
  },
  contentCard: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: "#E2E8F0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 8,
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    marginBottom: 32,
    textAlign: "center",
  },
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    marginBottom: 16,
  },
  clientButton: {
    backgroundColor: "#4285F4",
  },
  managerButton: {
    backgroundColor: "#34D399",
  },
  guestButton: {
    backgroundColor: "#9CA3AF",
  },
  retryButton: {
    backgroundColor: "#F59E0B",
  },
  roleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.7,
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4A5568",
  },
});
