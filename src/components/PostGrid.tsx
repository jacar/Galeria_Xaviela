import React from 'react';
import { Post } from '../types';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';

interface PostGridProps {
  posts: Post[];
  onPostClick?: (post: Post) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

export default function PostGrid({ posts, onPostClick, onDelete, currentUserId }: PostGridProps) {
  const handleDelete = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!onDelete) return;
    
    if (window.confirm('¿Eliminar esta publicación?')) {
      onDelete(postId);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-[1px] sm:gap-1 lg:gap-7">
      {posts.map((post) => (
        <div 
          key={post.id} 
          className="relative aspect-square group cursor-pointer overflow-hidden bg-gray-100"
          onClick={() => onPostClick?.(post)}
        >
          <img 
            src={post.imageUrl} 
            alt={post.caption || 'Post'} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          
          {/* Owner Badge / Delete Button */}
          {(currentUserId === post.uid || currentUserId === 'xaviela_official') && (
            <button 
              onClick={(e) => handleDelete(e, post.id)}
              className="absolute top-2 right-2 z-10 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
              title="Eliminar publicación"
            >
              <Trash2 size={14} />
            </button>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 sm:gap-6 text-white font-bold">
            <div className="flex items-center gap-1 sm:gap-2">
              <Heart size={20} fill="white" />
              <span className="text-sm sm:text-base">{post.likesCount}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <MessageCircle size={20} fill="white" />
              <span className="text-sm sm:text-base">0</span>
            </div>
          </div>
        </div>
      ))}
      
      {posts.length === 0 && (
        <div className="col-span-3 py-20 text-center text-gray-400">
          No hay fotos todavía.
        </div>
      )}
    </div>
  );
}
