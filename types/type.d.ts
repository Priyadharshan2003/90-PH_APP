export interface VisitRequest {
  id: string;
  plot: {
    title: string;
    project: { name: string };
    location: string;
  };
  date: string;
  time: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'COMPLETED';
  expiresAt?: string;
  feedback?: {
    rating: number;
    experience: string;
    suggestions: string;
    purchaseInterest: boolean | null;
  };
}

export interface PlotType {
  id: string;
  title: string;
  location: string;
  price: number;
  dimension: string;
  facing: string;
  status: 'available' | 'sold';
  imageUrls?: string[];
  amenities?: string[];
  project?: { name: string };
}

export interface ProjectType {
  id: string;
  name?: string;
  description?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  priceRange?: string;
  rating?: number;
  location?: string;
  amenities?: string[];
  plotsAvailable?: number;
}

export interface UserMetadata {
  role?: 'client' | 'manager' | string;
}
