import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { fetchNotificationsByRole } from '../lib/notifications';
import { useAuth } from '../lib/api'; // Assuming you have a hook to get user info/role
import tw from 'twrnc';

// Notification type (adjust as needed)
type Notification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

const NotificationsScreen = () => {
  const { user } = useAuth(); // user.role should be available
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.role) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotificationsByRole(user.role);
      setNotifications(data || []);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={tw`bg-white dark:bg-gray-900 rounded-lg p-4 mb-3 shadow`}>
      <Text style={tw`text-base font-bold text-gray-900 dark:text-white`}>{item.title}</Text>
      <Text style={tw`text-sm text-gray-700 dark:text-gray-300 mt-1`}>{item.message}</Text>
      <Text style={tw`text-xs text-gray-400 mt-2`}>{new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50 dark:bg-gray-950`}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={tw`mt-4 text-gray-500 dark:text-gray-300`}>Loading notifications...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50 dark:bg-gray-950`}>
        <Text style={tw`text-red-500 mb-4`}>{error}</Text>
        <TouchableOpacity onPress={loadNotifications} style={tw`bg-indigo-600 px-4 py-2 rounded`}>
          <Text style={tw`text-white font-bold`}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950 px-4 pt-4`}>
      <Text style={tw`text-2xl font-bold mb-4 text-gray-900 dark:text-white`}>Notifications</Text>
      {notifications.length === 0 ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`text-gray-400 text-lg`}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={tw`pb-8`}
        />
      )}
    </View>
  );
};

export default NotificationsScreen;