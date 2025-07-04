// src/screens/VisitRequestsScreen.tsx
import { useUser } from '@clerk/clerk-expo';
import axios from 'axios';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import VisitRequestQRScanner from '../../../components/VisitRequestQRScanner';

interface VisitRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  visitStatus?: 'NOT_STARTED' | 'INITIATED' | 'COMPLETED';
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  qrCode: string | null;
  expiresAt: string | null;
  plot: {
    id: string;
    title: string;
    location: string;
    project: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    clerkId: string;
  } | null;
  assignedManager: {
    id: string;
    name: string;
    email: string;
    clerkId: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  visitInitiatedAt?: string | null;
}

const COLORS = {
  primary: '#3b82f6',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#e2e8f0',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const VisitRequestCard = ({
  request,
  onScanQR,
  onRefresh,
}: {
  request: VisitRequest;
  onScanQR: () => void;
  onRefresh: () => void;
}) => {
  const [updating, setUpdating] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return COLORS.success;
      case 'REJECTED':
        return COLORS.error;
      default:
        return COLORS.warning;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '✅';
      case 'REJECTED':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getVisitStatusInfo = () => {
    switch (request.visitStatus) {
      case 'INITIATED':
        return {
          text: 'Visit In Progress',
          color: COLORS.primary,
          icon: '🚀',
        };
      case 'COMPLETED':
        return {
          text: 'Visit Completed',
          color: COLORS.success,
          icon: '✅',
        };
      default:
        return {
          text: 'Not Started',
          color: COLORS.textSecondary,
          icon: '⏳',
        };
    }
  };

  const handleCallVisitor = async () => {
    try {
      const phoneUrl = `tel:${request.phone}`;
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        // Instead of alert, just do nothing (show as plain text)
      }
    } catch (error) {
      // Instead of alert, just do nothing (show as plain text)
    }
  };

  const handleCompleteVisit = async () => {
    Alert.alert('Complete Visit', 'Are you sure you want to mark this visit as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        style: 'default',
        onPress: async () => {
          setUpdating(true);
          try {
            const response = await axios.patch(
              `https://90-dph.vercel.app/api/visit-requests/${request.id}/complete`,
              {},
              {
                timeout: 15000,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (response.status === 200) {
              Alert.alert('Success', 'Visit marked as completed successfully');
              onRefresh();
            } else {
              throw new Error('Unexpected response status');
            }
          } catch (error: any) {
            console.error('Error completing visit:', error);
            const errorMessage =
              error.response?.data?.message ||
              error.message ||
              'Failed to complete visit. Please try again.';
            Alert.alert('Error', errorMessage);
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return `${dateString} at ${timeString}`;
      }
      return `${format(date, 'MMM dd, yyyy')} at ${timeString}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return `${dateString} at ${timeString}`;
    }
  };

  const isExpired = () => {
    if (!request.expiresAt) return false;
    try {
      return new Date() > new Date(request.expiresAt);
    } catch (error) {
      console.error('Error checking expiration:', error);
      return false;
    }
  };

  const visitStatusInfo = getVisitStatusInfo();

  const handleOpenScanner = (requestId: string) => {
    setQrScannerVisible(true);
  };

  const handleCloseScanner = () => {
    setQrScannerVisible(false);
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.plotInfo}>
            <Text style={styles.plotTitle}>{request.plot.title}</Text>
            <Text style={styles.projectName}>{request.plot.project.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={styles.statusIcon}>{getStatusIcon(request.status)}</Text>
            <Text style={styles.statusText}>{request.status}</Text>
          </View>
        </View>

        {request.status === 'APPROVED' && (
          <View style={styles.visitStatusContainer}>
            <View style={[styles.visitStatusBadge, { backgroundColor: visitStatusInfo.color }]}>
              <Text style={styles.visitStatusIcon}>{visitStatusInfo.icon}</Text>
              <Text style={styles.visitStatusText}>{visitStatusInfo.text}</Text>
            </View>
            {request.visitInitiatedAt && (
              <Text style={styles.visitInitiatedText}>
                Initiated: {format(new Date(request.visitInitiatedAt), 'MMM dd, yyyy HH:mm')}
              </Text>
            )}
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>👤 Visitor Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{request.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{request.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{request.phone}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>📅 Visit Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Date & Time:</Text>
              <Text style={styles.value}>{formatDate(request.date, request.time)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{request.plot.location}</Text>
            </View>
            {request.expiresAt && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Expires:</Text>
                <Text style={[styles.value, isExpired() && styles.expiredText]}>
                  {format(new Date(request.expiresAt), 'MMM dd, yyyy HH:mm')}
                  {isExpired() && ' (Expired)'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {request.status === 'APPROVED' && !isExpired() && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.scanButton} onPress={onScanQR} disabled={updating}>
              <Text style={styles.scanButtonText}>{updating ? 'Processing...' : '📱 Scan QR'}</Text>
            </TouchableOpacity>
            {request.visitStatus === 'INITIATED' && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={handleCompleteVisit}
                disabled={updating}>
                <Text style={styles.completeButtonText}>
                  {updating ? 'Processing...' : '✅ Complete Visit'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            Requested: {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

export default function VisitRequestsScreen() {
  const { user } = useUser();
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [scannerRequestId, setScannerRequestId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user?.id) {
      setError('User not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await axios.get(
        `https://90-dph.vercel.app/api/visit-requests?managerId=${user.id}`,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const sortedRequests = response.data.sort(
          (a: VisitRequest, b: VisitRequest) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRequests(sortedRequests);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error('Error fetching visit requests:', error);

      let errorMessage = 'Failed to fetch visit requests. Please try again.';

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'No visit requests found.';
        setRequests([]);
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenScanner = (requestId: string) => {
    setScannerRequestId(requestId);
    setQrScannerVisible(true);
  };

  const handleCloseScanner = () => {
    setQrScannerVisible(false);
    setScannerRequestId(null);
  };

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    } else {
      setLoading(false);
      setError('Please log in to view visit requests.');
    }
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getStatusCounts = () => {
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const approved = requests.filter((r) => r.status === 'APPROVED').length;
    const rejected = requests.filter((r) => r.status === 'REJECTED').length;
    const initiated = requests.filter((r) => r.visitStatus === 'INITIATED').length;
    const completed = requests.filter((r) => r.visitStatus === 'COMPLETED').length;
    return { pending, approved, rejected, initiated, completed };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading visit requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && requests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRequests}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { pending, approved, rejected, initiated, completed } = getStatusCounts();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>Visit Requests</Text>
          <Text style={styles.subtitle}>Manage assigned property visits</Text>
        </View>

        {requests.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>{approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: COLORS.primary }]}>{initiated}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>{completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Visit Requests</Text>
            <Text style={styles.emptyText}>
              You do not have any visit requests assigned to you yet.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>All Requests ({requests.length})</Text>
            </View>
            {requests.map((request) => (
              <VisitRequestCard
                key={request.id}
                request={request}
                onScanQR={() => handleOpenScanner(request.id)}
                onRefresh={fetchRequests}
              />
            ))}
          </>
        )}
      </ScrollView>

      {qrScannerVisible && (
        <Modal visible={qrScannerVisible} animationType="slide">
          <VisitRequestQRScanner apiBaseUrl="https://90-dph.vercel.app" />
          <Button title="Close" onPress={handleCloseScanner} />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: 'manrope',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'manrope',
    lineHeight: 24,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 14,
    fontFamily: 'manrope',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'medium',
    color: COLORS.textPrimary,
    fontFamily: 'manrope',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: 'manrope',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.warning,
    fontFamily: 'manrope',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'manrope',
    marginTop: 4,
    textAlign: 'center',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'manrope',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  plotInfo: {
    flex: 1,
    marginRight: 12,
  },
  plotTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'manrope',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'manrope',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  visitStatusContainer: {
    marginBottom: 12,
  },
  visitStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  visitStatusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  visitStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  visitInitiatedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'manrope',
  },
  cardContent: {
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'manrope',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  label: {
    width: 90,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'manrope',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: 'manrope',
  },
  phoneLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  expiredText: {
    color: COLORS.error,
  },
  actionButtons: {
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#E67E22',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  completeButton: {
    backgroundColor: COLORS.success,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'manrope',
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontFamily: 'manrope',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: 'manrope',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: 'manrope',
    lineHeight: 24,
  },
});
