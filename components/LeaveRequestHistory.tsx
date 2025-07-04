import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AnimatedEntrance } from './AnimatedEntrance';

// Types
interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
}

export function LeaveRequestHistory() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const fetchLeaveRequests = useCallback(async () => {
    if (!user?.id) {
      setLeaveRequests([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`https://90-dph.vercel.app/api/leave-requests?clerkId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch leave requests');
      const data = await res.json();
      // Map API response to LeaveRequest type
      const mapped = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        startDate: item.startDate,
        endDate: item.endDate,
        type: item.type || 'Leave',
        status: item.status,
        reason: item.reason,
      }));
      setLeaveRequests(mapped);
    } catch (err) {
      setError('Failed to load leave requests');
      setLeaveRequests([]);
      console.error('Error fetching leave requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const getStatusColor = (status: string) => {
    const colors = {
      APPROVED: {
        backgroundColor: '#DCFCE7',
        borderColor: '#22C55E',
        textColor: '#166534',
      },
      PENDING: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
        textColor: '#92400E',
      },
      REJECTED: {
        backgroundColor: '#FEE2E2',
        borderColor: '#EF4444',
        textColor: '#991B1B',
      },
    };
    return (
      colors[status as keyof typeof colors] || {
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB',
        textColor: '#374151',
      }
    );
  };

  const renderItem = ({ item }: { item: LeaveRequest }) => {
    const statusColors = getStatusColor(item.status);
    const startDate = new Date(item.startDate).toLocaleDateString();
    const endDate = new Date(item.endDate).toLocaleDateString();

    return (
      <View style={styles.leaveCard}>
        <View style={styles.leaveHeader}>
          <View style={styles.leaveTypeContainer}>
            <Ionicons name="calendar-outline" size={20} color="#1e293b" />
            <Text style={[styles.leaveType, { fontFamily: 'manrope' }]}>{item.type}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColors.backgroundColor,
                borderColor: statusColors.borderColor,
              },
            ]}>
            <Text
              style={[styles.statusText, { color: statusColors.textColor, fontFamily: 'manrope' }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.leaveDetails}>
          <Text style={[styles.dateText, { fontFamily: 'manrope' }]}>
            {startDate} - {endDate}
          </Text>
          <Text style={[styles.reasonText, { fontFamily: 'manrope' }]}>{item.reason}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered} accessible accessibilityLabel="Loading leave requests">
        <AnimatedEntrance index={0}>
          <LottieView
            source={require('../assets/loading-animation.json')}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
        </AnimatedEntrance>
        <Text style={{ marginTop: 16, fontFamily: 'manrope' }}>Loading leave requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered} accessible accessibilityLabel="Error loading leave requests">
        <Text style={[styles.errorText, { fontFamily: 'manrope' }]}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={leaveRequests}
      renderItem={({ item, index }) => (
        <AnimatedEntrance index={index}>{renderItem({ item })}</AnimatedEntrance>
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.emptyState} accessible accessibilityLabel="No leave requests found">
          <LottieView
            source={require('../assets/loading-animation.json')}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
          <Text style={[styles.emptyStateText, { fontFamily: 'manrope' }]}>
            No leave requests found
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  leaveCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Manrope-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  leaveDetails: {
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  reasonText: {
    fontSize: 14,
    color: '#334155',
    fontFamily: 'Manrope-Regular',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Manrope-Regular',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: 'Manrope-Regular',
  },
});
