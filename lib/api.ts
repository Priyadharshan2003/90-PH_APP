import axios, { isAxiosError } from 'axios';

// Base URL from environment variable
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://90-dph.vercel.app/api';

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for authentication (if Clerk provides tokens)
api.interceptors.request.use(
  (config) => {
    // Add Clerk token if available (example: from Clerk's auth context)
    // const token = getClerkToken(); // Replace with actual token retrieval
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      switch (error.response.status) {
        case 404:
          console.error('Resource not found');
          break;
        case 401:
          console.error('Unauthorized access');
          break;
        case 409:
          console.error('Conflict - duplicate request');
          break;
        case 500:
          console.error('Server error');
          break;
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      if (error.code === 'ECONNABORTED') {
        console.error('Request timed out - please check your connection');
      } else if (error.code === 'ERR_NETWORK') {
        console.error('Network error - please check if the server is running');
      }
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// Types
export type UserType = {
  clerkId: string;
  email: string;
  name: string;
  phone?: string | null;
  role?: 'GUEST' | 'CLIENT' | 'MANAGER';
};

export type ProjectType = {
  id: string;
  name: string;
  city: string;
  description: string;
  imageUrl: string;
  rating: number;
  plotsAvailable: number;
  priceRange: string;
  amenities: string[];
};

export type PlotType = {
  id: string;
  title: string;
  dimension: string;
  price: number;
  priceLabel: string;
  status: 'AVAILABLE' | 'ADVANCE' | 'SOLD';
  imageUrls: string[];
  location: string;
  latitude: number;
  longitude: number;
  facing: string;
  amenities: string[];
  mapEmbedUrl?: string;
  projectId: string;
  createdAt: string;
  totalArea: number;
};

export type VisitRequestType = {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  plotId: string;
  clerkId?: string;
};

export type VisitRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  qrCode?: string | null;
  expiresAt?: string | null;
  plot: {
    id: string;
    title: string;
    location: string;
    project: {
      id: string;
      name: string;
    };
  };
  user?: {
    id: string;
    name: string;
    email: string;
    clerkId: string;
    role: 'GUEST' | 'CLIENT' | 'MANAGER' | string;
  } | null;
  assignedManager?: {
    id: string;
    name: string;
    email: string;
    clerkId: string;
  } | null;
  feedback?: {
    id: string;
    rating: number;
    experience: string;
    suggestions: string;
    purchaseInterest: boolean | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type WebhookUserData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: {
    emailAddress: string;
    verification: {
      status: string;
    };
  }[];
  phoneNumbers: {
    phoneNumber: string;
    verification: {
      status: string;
    };
  }[];
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
  lastSignInAt: number;
  publicMetadata: {
    role?: 'GUEST' | 'CLIENT' | 'MANAGER';
  };
};

export type UpdateUserProfileType = {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: 'GUEST' | 'CLIENT' | 'MANAGER';
};

// Helper function to get error message
const getErrorMessage = (
  error: any,
  statusMessages: Record<number, string>,
  defaultMessage: string
) => {
  if (error.response?.status && typeof error.response.status === 'number') {
    return statusMessages[error.response.status] || error.response?.data?.error || defaultMessage;
  }
  return error.response?.data?.error || defaultMessage;
};

// Create or update user
export const createOrUpdateUser = async (user: UserType) => {
  try {
    if (!user.clerkId?.trim()) throw new Error('User ID is required');
    if (!user.email?.trim()) throw new Error('Email is required');
    if (!user.name?.trim()) throw new Error('Name is required');

    const userData = {
      clerkId: user.clerkId.trim(),
      email: user.email.trim(),
      name: user.name.trim(),
      phone: user.phone?.trim() || null,
      role: user.role || 'GUEST',
    };

    try {
      const res = await api.post('/users', userData);
      return res.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        const updateRes = await api.put(`/users/${user.clerkId}`, userData);
        return updateRes.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to create/update user:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          400: 'Invalid user data',
          404: 'User not found',
          500: 'Server error. Please try again later',
        },
        'Failed to sync user'
      );
      throw new Error(message);
    }
    throw new Error('Failed to sync user');
  }
};

export type FeedbackType = {
  visitRequestId: string;
  rating: number;
  experience: string;
  suggestions: string;
  purchaseInterest: boolean | null;
  clerkId: string;
};

export const submitFeedback = async (data: FeedbackType) => {
  try {
    if (!data.visitRequestId?.trim()) throw new Error('Visit Request ID is required');
    if (!data.clerkId?.trim()) throw new Error('User ID is required');
    if (!data.experience?.trim()) throw new Error('Experience feedback is required');
    if (!data.suggestions?.trim()) throw new Error('Suggestions are required');
    if (data.rating < 1 || data.rating > 5) throw new Error('Rating must be between 1 and 5');

    const feedbackData = {
      visitRequestId: data.visitRequestId.trim(),
      rating: data.rating,
      experience: data.experience.trim(),
      suggestions: data.suggestions.trim(),
      purchaseInterest: data.purchaseInterest,
      clerkId: data.clerkId.trim(),
    };

    console.log('Submitting feedback:', feedbackData);
    const res = await api.post('/feedback', feedbackData);
    console.log('Feedback submission response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Submit feedback error:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          400: 'Invalid feedback data',
          401: 'Please sign in to submit feedback',
          404: 'Visit request not found',
          409: 'Feedback already submitted for this visit',
          500: 'Server error. Please try again later',
        },
        'Failed to submit feedback'
      );
      throw new Error(message);
    }
    throw new Error('Failed to submit feedback. Please check your connection and try again');
  }
};

// Get visit requests
export const getVisitRequests = async (clerkId?: string): Promise<VisitRequest[]> => {
  try {
    // The backend endpoint doesn't seem to use the clerkId, so we fetch all.
    // The filtering will be done on the client side.
    const url = `/visit-requests`;
    console.log('Fetching visit requests from:', url);

    const res = await api.get(url);
    console.log('Visit requests response:', res.data);

    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error('Error fetching visit requests:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          401: 'Please sign in to view bookings',
          404: 'No bookings found',
          500: 'Server error. Please try again later',
        },
        'Failed to load bookings'
      );
      throw new Error(message);
    }
    throw new Error('Failed to load bookings');
  }
};

// Cancel visit request
export const cancelVisitRequest = async (visitRequestId: string, clerkId: string) => {
  try {
    if (!visitRequestId?.trim()) throw new Error('Visit Request ID is required');
    if (!clerkId?.trim()) throw new Error('User ID is required');

    const res = await api.delete(`/visit-requests/${visitRequestId}`, {
      params: { clerkId: clerkId.trim() },
    });
    console.log('Visit request cancelled:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error cancelling visit request:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          400: 'Invalid request data',
          401: 'Please sign in to cancel bookings',
          403: 'You are not authorized to cancel this booking',
          404: 'Visit request not found',
          500: 'Server error. Please try again later',
        },
        'Failed to cancel visit request'
      );
      throw new Error(message);
    }
    throw new Error('Failed to cancel visit request. Please check your connection and try again.');
  }
};

// Get user's feedback history
export const getUserFeedback = async (clerkId: string) => {};

// Get projects
export const getProjects = async (): Promise<ProjectType[]> => {
  try {
    const res = await api.get('/projects');
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    if (isAxiosError(error)) {
      const message = error.response?.data?.error || 'Failed to load projects';
      throw new Error(message);
    }
    throw new Error('Failed to load projects');
  }
};

// Get plots by project ID
export const getPlotsByProjectId = async (projectId: string): Promise<PlotType[]> => {
  try {
    if (!projectId?.trim()) throw new Error('Project ID is required');
    const res = await api.get(`/plots?projectId=${projectId.trim()}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error('Error fetching plots:', error);
    if (isAxiosError(error)) {
      const message = error.response?.data?.error || 'Failed to load plots';
      throw new Error(message);
    }
    throw new Error('Failed to load plots');
  }
};

// Get all plots
export const getAllPlots = async (): Promise<PlotType[]> => {
  try {
    const projects = await getProjects();
    const plotPromises = projects.map((p) => getPlotsByProjectId(p.id));
    const allPlots = await Promise.all(plotPromises);
    return allPlots.flat();
  } catch (error) {
    console.error('Error fetching all plots:', error);
    throw new Error('Failed to load all plots');
  }
};

// Get plot by ID

export const getPlotById = async (id: string): Promise<PlotType | null> => {
  try {
    if (!id?.trim()) throw new Error('Plot ID is required');
    
    const res = await api.get(`/plots?plotId=${id.trim()}`);

    // Assuming the API returns a single plot in an array or directly
    const plot = Array.isArray(res.data) ? res.data[0] : res.data;

    return plot || null;
  } catch (error) {
    console.error('Error fetching plot:', error);
    if (isAxiosError(error)) {
      const message = error.response?.data?.error || 'Failed to load plot';
      throw new Error(message);
    }
    throw new Error('Failed to load plot');
  }
};

// Submit visit request
export const submitVisitRequest = async (data: VisitRequestType) => {
  try {
    console.log('Submitting visit request:', data);

    if (!data.name?.trim()) throw new Error('Name is required');
    if (!data.email?.trim()) throw new Error('Email is required');
    if (!data.phone?.trim()) throw new Error('Phone number is required');
    if (!data.date) throw new Error('Date is required');
    if (!data.time?.trim()) throw new Error('Time is required');
    if (!data.plotId?.trim()) throw new Error('Plot ID is required');

    const visitData = {
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      date: data.date,
      time: data.time.trim(),
      plotId: data.plotId.trim(),
      clerkId: data.clerkId?.trim() || null,
    };

    const res = await api.post('/visit-requests', visitData);
    console.log('Visit request rthjen why esponse:', res.data);
    return res.data;
  } catch (error) {
    console.error('Submit visit request error:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          401: 'Please login to book a visit',
          404: 'Plot not found',
          400: 'Invalid request data',
          409: 'You already have a pending visit request for this plot',
          500: 'Server error. Please try again later',
        },
        'Failed to submit visit request'
      );
      throw new Error(message);
    }
    throw new Error('Failed to submit visit request. Please check your connection and try again');
  }
};

// Get user profile
export const getUserProfile = async (clerkId: string): Promise<WebhookUserData> => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');

    const res = await api.get(`/users?clerkId=${clerkId.trim()}`);
    if (!res.data) throw new Error('User not found');

    return {
      id: clerkId,
      firstName: res.data.name?.split(' ')[0] || null,
      lastName: res.data.name?.split(' ').slice(1).join(' ') || null,
      emailAddresses: [
        {
          emailAddress: res.data.email,
          verification: { status: 'verified' },
        },
      ],
      phoneNumbers: res.data.phone
        ? [{ phoneNumber: res.data.phone, verification: { status: 'verified' } }]
        : [],
      imageUrl: res.data.imageUrl || '',
      createdAt: new Date(res.data.createdAt).getTime(),
      updatedAt: new Date(res.data.updatedAt || res.data.createdAt).getTime(),
      lastSignInAt: new Date(res.data.updatedAt || res.data.createdAt).getTime(),
      publicMetadata: { role: res.data.role || 'GUEST' },
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          404: 'User not found',
          500: 'Server error. Please try again later',
        },
        'Failed to load profile'
      );
      throw new Error(message);
    }
    throw new Error('Failed to load profile');
  }
};

// Get lands by plot ID
export const getLandsByPlotId = async (plotId: string) => {
  try {
    if (!plotId?.trim()) throw new Error('Plot ID is required');
    const res = await api.get(`/lands/by-plot?plotId=${plotId.trim()}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching lands:', error);
    if (isAxiosError(error)) {
      const message = error.response?.data?.error || 'Failed to fetch lands';
      throw new Error(message);
    }
    throw new Error('Failed to fetch lands');
  }
};

// Get owned lands
export const getOwnedLands = async (clerkId: string) => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');
    const res = await api.get(`/owned-lands?clerkId=${clerkId.trim()}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching owned lands:', error);
    if (isAxiosError(error)) {
      const message = error.response?.data?.error || 'Failed to fetch owned lands';
      throw new Error(message);
    }
    throw new Error('Failed to fetch owned lands');
  }
};

// Get user by Clerk ID
export const getUserByClerkId = async (clerkId: string) => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');
    const res = await api.get(`/users?clerkId=${clerkId.trim()}`);
    return res.data || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          404: 'User not found',
          500: 'Server error. Please try again later',
        },
        'Failed to fetch user'
      );
      throw new Error(message);
    }
    throw new Error('Failed to fetch user');
  }
};

// Update user profile
export const updateUserProfile = async (clerkId: string, data: UpdateUserProfileType) => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');
    if (data.email && !data.email.trim()) throw new Error('Email is invalid');
    if (data.name && !data.name.trim()) throw new Error('Name is invalid');

    const updateData = {
      clerkId: clerkId.trim(),
      name: data.name?.trim(),
      email: data.email?.trim(),
      phone: data.phone?.trim() || null,
      role: data.role,
    };

    const res = await api.put(`/users/${clerkId.trim()}`, updateData);
    return res.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          400: 'Invalid user data',
          404: 'User not found',
          500: 'Server error. Please try again later',
        },
        'Failed to update profile'
      );
      throw new Error(message);
    }
    throw new Error('Failed to update profile');
  }
};

// Camera types and functions
export type CameraType = {
  id: string;
  landId: string;
  ipAddress: string;
  label: string;
  createdAt: string;
  land?: {
    id: string;
    plot?: {
      title: string;
      location: string;
    };
  };
};

export type CreateCameraType = {
  landId: string;
  ipAddress: string;
  label: string;
};

export type UpdateCameraType = {
  ipAddress?: string;
  label?: string;
};

export const getCameras = async (clerkId: string): Promise<CameraType[]> => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');
    const res = await api.get(`/cameras?clerkId=${clerkId.trim()}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error('Error fetching cameras:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          401: 'Please sign in to view cameras',
          404: 'No cameras found',
          500: 'Server error. Please try again later',
        },
        'Failed to load cameras'
      );
      throw new Error(message);
    }
    throw new Error('Failed to load cameras');
  }
};

export const createCamera = async (
  data: CreateCameraType,
  clerkId: string
): Promise<CameraType> => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');
    if (!data.landId?.trim()) throw new Error('Land ID is required');
    if (!data.ipAddress?.trim()) throw new Error('IP Address is required');
    if (!data.label?.trim()) throw new Error('Camera label is required');

    const cameraData = {
      landId: data.landId.trim(),
      ipAddress: data.ipAddress.trim(),
      label: data.label.trim(),
      clerkId: clerkId.trim(),
    };

    const res = await api.post('/cameras', cameraData);
    return res.data;
  } catch (error) {
    console.error('Error creating camera:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          400: 'Invalid camera data',
          401: 'Please sign in to create cameras',
          403: "You don't have permission to create cameras",
          500: 'Server error. Please try again later',
        },
        'Failed to create camera'
      );
      throw new Error(message);
    }
    throw new Error('Failed to create camera');
  }
};

export const updateCamera = async (
  id: string,
  data: UpdateCameraType,
  clerkId: string
): Promise<CameraType> => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');
    if (!id?.trim()) throw new Error('Camera ID is required');
    if (data.ipAddress && !data.ipAddress.trim()) throw new Error('IP Address is invalid');
    if (data.label && !data.label.trim()) throw new Error('Camera label is invalid');

    const updateData = {
      ipAddress: data.ipAddress?.trim(),
      label: data.label?.trim(),
      clerkId: clerkId.trim(),
    };

    const res = await api.patch(`/cameras/${id.trim()}`, updateData);
    return res.data;
  } catch (error) {
    console.error('Error updating camera:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          400: 'Invalid camera data',
          401: 'Please sign in to update cameras',
          403: "You don't have permission to update this camera",
          404: 'Camera not found',
          500: 'Server error. Please try again later',
        },
        'Failed to update camera'
      );
      throw new Error(message);
    }
    throw new Error('Failed to update camera');
  }
};

export const deleteCamera = async (id: string, clerkId: string): Promise<void> => {
  try {
    if (!clerkId?.trim()) throw new Error('User ID is required');
    if (!id?.trim()) throw new Error('Camera ID is required');

    await api.delete(`/cameras/${id.trim()}`, {
      params: { clerkId: clerkId.trim() },
    });
  } catch (error) {
    console.error('Error deleting camera:', error);
    if (isAxiosError(error)) {
      const message = getErrorMessage(
        error,
        {
          401: 'Please sign in to delete cameras',
          403: "You don't have permission to delete this camera",
          404: 'Camera not found',
          500: 'Server error. Please try again later',
        },
        'Failed to delete camera'
      );
      throw new Error(message);
    }
    throw new Error('Failed to delete camera');
  }
};
