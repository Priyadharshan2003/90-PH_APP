// Fetch notifications for a given role from the backend API
export async function fetchNotificationsByRole(role: string): Promise<{ id: string; title: string; message: string; createdAt: string; targetRole: string }[]> {
  if (!role) return [];
  try {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/notifications/for-role?role=${role}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const data = await res.json();
    return data.notifications || [];
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}
