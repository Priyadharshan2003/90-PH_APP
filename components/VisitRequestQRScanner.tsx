import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ORANGE = '#FF6B00';

const VisitRequestQRScanner = ({ apiBaseUrl }: { apiBaseUrl: string }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    // If your QR is a JSON string, extract the id
    let visitRequestId = data;
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.id) {
        visitRequestId = parsed.id;
      }
    } catch {
      // If not JSON, use as is
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/visit-requests/${visitRequestId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const text = await res.text();
      if (!res.ok) {
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.message || text;
        } catch {}
        throw new Error(message || 'Failed to mark visit as completed');
      }
      Alert.alert('Success', 'Visit marked as completed!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update visit status');
    }
  };

  if (!permission) {
    return <Text style={styles.orangeText}>Requesting camera permission...</Text>;
  }
  if (!permission.granted) {
    return <Text style={styles.orangeText}>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Guest Visit QR</Text>
      <CameraView
        style={styles.scanner}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      {scanned && (
        <TouchableOpacity style={styles.orangeButton} onPress={() => setScanned(false)}>
          <Text style={styles.orangeButtonText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: ORANGE,
    letterSpacing: 0.5,
  },
  scanner: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: ORANGE,
    marginBottom: 24,
  },
  orangeButton: {
    backgroundColor: ORANGE,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  orangeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  orangeText: {
    color: ORANGE,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
    fontWeight: '600',
  },
});

export default VisitRequestQRScanner;
