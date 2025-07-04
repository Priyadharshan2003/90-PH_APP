import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useUser } from "@clerk/clerk-expo";
import { useState, useCallback } from 'react';
import { Ionicons } from "@expo/vector-icons";
import { getVisitRequests } from '@/lib/api';

// Types
interface VisitRequest {
  id: string;
  date: string;
  time: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  plot: {
    title: string;
    project: {
      name: string;
    };
    location: string;
  };
  visitor: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function ManagerVisitRequests() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const response = await getVisitRequests(user?.id);
      setRequests(response);
    } catch (err) {
      setError('Failed to load visit requests');
      console.error('Error fetching visit requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    // TODO: Implement approve functionality
    console.log('Approve request:', requestId);
  };

  const handleReject = async (requestId: string) => {
    // TODO: Implement reject functionality
    console.log('Reject request:', requestId);
  };

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
      COMPLETED: {
        backgroundColor: '#E0F2FE',
        borderColor: '#3B82F6',
        textColor: '#1E40AF',
      },
    };
    return colors[status as keyof typeof colors] || {
      backgroundColor: '#F3F4F6',
      borderColor: '#D1D5DB',
      textColor: '#374151',
    };
  };

  const renderItem = ({ item }: { item: VisitRequest }) => {
    const statusColors = getStatusColor(item.status);
    const visitDateTime = new Date(`${item.date}T${item.time}`);
    const formattedDate = visitDateTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = visitDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.plotInfo}>
            <Text style={styles.plotTitle}>{item.plot.title}</Text>
            <Text style={styles.projectName}>{item.plot.project.name}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: statusColors.backgroundColor,
            borderColor: statusColors.borderColor 
          }]}>
            <Text style={[styles.statusText, { color: statusColors.textColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>
              {item.visitor.firstName} {item.visitor.lastName}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>{item.visitor.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>
              {formattedDate} at {formattedTime}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>{item.plot.location}</Text>
          </View>
        </View>

        {item.status === 'PENDING' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item.id)}
            >
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item.id)}
            >
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <Text>Loading visit requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyStateText}>No visit requests found</Text>
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
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  plotInfo: {
    flex: 1,
  },
  plotTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Manrope-SemiBold',
  },
  projectName: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  requestDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#22C55E',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
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