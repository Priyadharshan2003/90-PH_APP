import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import axios from 'axios';
import { SvgUri } from 'react-native-svg'; // Import SvgUri

export default function QrScreen() {
  const { id } = useLocalSearchParams();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`https://main-admin-dashboard-orpin.vercel.app/api/visit-requests/${id}`)
      .then((res) => {
        console.log('QR Code:', res.data.qrCode); // Debug
        setVisit(res.data);
      })
      .catch((error) => console.error('API Error:', error))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!visit || visit.status !== 'APPROVED') {
    return <Text className="text-center mt-20">QR not available or not approved yet.</Text>;
  }

  return (
    <View className="items-center justify-center p-6">
      <Text className="text-lg font-bold mb-4">Your Visit QR Code</Text>
      <SvgUri
        width={250}
        height={250}
        uri={visit.qrCode} // Use SvgUri for SVG rendering
      />
      <Text className="mt-4 text-gray-500">
        Expires at: {new Date(visit.expiresAt).toLocaleString()}
      </Text>
    </View>
  );
}