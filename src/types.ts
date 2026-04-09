export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Post {
  id: string;
  uid: string;
  authorName: string;
  authorPhoto?: string;
  imageUrl: string;
  caption?: string;
  createdAt: any;
  likesCount: number;
  isLiked?: boolean;
  isHighlight?: boolean;
  aspectRatio?: number;
  images?: string[];
}

export interface Story {
  id: string;
  uid: string;
  authorName: string;
  authorPhoto?: string;
  imageUrl: string;
  createdAt: any;
}
