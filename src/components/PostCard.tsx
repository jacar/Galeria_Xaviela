import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Star, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Post } from '../types';
import { db, doc, increment, writeBatch, deleteDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { cn } from '../lib/utils';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onDelete?: (id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = React.memo(({ post, currentUserId, onDelete }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isHighlight, setIsHighlight] = useState(post.isHighlight || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '[]');
    setIsLiked(likedPosts.includes(post.id));
    setLikesCount(post.likesCount);
  }, [post.id, post.likesCount]);

  const handleLike = async () => {
    if (!currentUserId) return;

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

    const likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '[]');
    if (newLikedState) {
      likedPosts.push(post.id);
    } else {
      const index = likedPosts.indexOf(post.id);
      if (index > -1) likedPosts.splice(index, 1);
    }
    localStorage.setItem('liked_posts', JSON.stringify(likedPosts));

    const likeRef = doc(db, `posts/${post.id}/likes/${currentUserId}`);
    const postRef = doc(db, `posts/${post.id}`);

    try {
      const batch = writeBatch(db);
      if (newLikedState) {
        batch.set(likeRef, {
          postId: post.id,
          userId: currentUserId,
          createdAt: new Date()
        });
        batch.update(postRef, { likesCount: increment(1) });
      } else {
        batch.delete(likeRef);
        batch.update(postRef, { likesCount: increment(-1) });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const toggleHighlight = async () => {
    if (currentUserId !== post.uid) return;

    const newHighlightState = !isHighlight;
    setIsHighlight(newHighlightState);

    const postRef = doc(db, `posts/${post.id}`);
    try {
      const batch = writeBatch(db);
      batch.update(postRef, { isHighlight: newHighlightState });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      if (onDelete) onDelete(post.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 1000);
  };

  return (
    <div className="bg-white border-b border-gray-200 sm:border sm:rounded-sm mb-0 sm:mb-4 max-w-[470px] mx-auto w-full overflow-hidden">
      {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600">
              <div className="p-[1.5px] bg-white rounded-full">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {post.authorPhoto ? (
                    <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-[10px] font-bold">
                      {post.authorName[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="font-semibold text-sm text-gray-900">{post.authorName}</span>
          </div>
          <div className="flex items-center gap-2">
            {(currentUserId === post.uid || currentUserId === 'xaviela_official') && (
              <>
                  <button 
                    onClick={toggleHighlight}
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      isHighlight ? "text-pink-500 bg-pink-50" : "text-gray-400 hover:bg-gray-50"
                    )}
                    title={isHighlight ? "Quitar de destacados" : "Añadir a destacados"}
                  >
                    <Star size={18} fill={isHighlight ? "#ec4899" : "none"} />
                  </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-2 py-1 rounded-md text-xs font-bold text-red-500 hover:bg-red-50 transition-colors border border-red-100"
                >
                  Eliminar
                </button>
              </>
            )}
            <div className="relative group">
              <button 
                onClick={() => {
                  if (currentUserId === post.uid || currentUserId === 'xaviela_official') {
                    setShowDeleteConfirm(true);
                  }
                }}
                className={cn(
                  "text-gray-900 p-1 hover:bg-gray-100 rounded-full transition-colors",
                  !(currentUserId === post.uid || currentUserId === 'xaviela_official') && "opacity-0 pointer-events-none"
                )}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-[280px] text-center space-y-4"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900">¿Eliminar publicación?</h3>
                <p className="text-xs text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={handleDelete}
                  className="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-bold active:scale-95 transition-transform"
                >
                  Eliminar
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-2 bg-gray-100 text-gray-900 rounded-lg text-sm font-bold active:scale-95 transition-transform"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image */}
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden select-none cursor-pointer" onDoubleClick={handleDoubleTap}>
        <img 
          src={post.imageUrl} 
          alt="Post content" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
          loading="lazy"
        />
        
        <AnimatePresence>
          {showHeartAnim && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute pointer-events-none"
            >
              <Heart size={80} fill="white" color="white" className="drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-3 pt-3 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className={cn("transition-transform active:scale-125", isLiked ? "text-red-500" : "text-gray-900")}>
              <Heart size={26} fill={isLiked ? "currentColor" : "none"} strokeWidth={2} />
            </button>
            <button className="text-gray-900">
              <MessageCircle size={26} strokeWidth={2} />
            </button>
            <button className="text-gray-900">
              <Send size={26} strokeWidth={2} />
            </button>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i === 1 ? "bg-blue-500" : "bg-gray-300")} />
            ))}
          </div>
          <button className="text-gray-900">
            <Bookmark size={26} strokeWidth={2} />
          </button>
        </div>

        {/* Likes */}
        <div className="font-bold text-sm mb-1 text-gray-900">
          {likesCount.toLocaleString()} likes
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-sm leading-snug mb-1">
            <span className="font-bold mr-2 text-gray-900">{post.authorName}</span>
            <span className="text-gray-800">{post.caption}</span>
          </div>
        )}

        {/* Add Comment */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-400">
            {currentUserId?.charAt(6).toUpperCase()}
          </div>
          <span className="text-xs text-gray-400">Add a comment...</span>
          <div className="ml-auto flex gap-2">
            <span>❤️</span>
            <span>🙌</span>
          </div>
        </div>
      </div>

      {/* Comment Input (Desktop) */}
      <div className="hidden sm:flex items-center px-3 py-3 border-t border-gray-100">
        <button className="text-gray-900 mr-3">
          <svg aria-label="Emoji" color="rgb(38, 38, 38)" fill="rgb(38, 38, 38)" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Emoji</title><path d="M15.83 10.997a1.167 1.167 0 1 1-1.167-1.167 1.167 1.167 0 0 1 1.167 1.167Zm-6.5 1.167a1.167 1.167 0 1 0-1.166-1.167 1.167 1.167 0 0 0 1.166 1.167Zm5.163 3.24a3.406 3.406 0 0 1-4.982 0c-.11-.115-.31-.115-.421 0-.11.115-.11.314 0 .429a4.017 4.017 0 0 0 5.824 0c.11-.115.11-.314 0-.429-.11-.115-.31-.115-.421 0ZM12.003.5a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12.003.5Zm0 21a9.5 9.5 0 1 1 9.5-9.5 9.51 9.51 0 0 1-9.5 9.5Z"></path></svg>
        </button>
        <input 
          type="text" 
          placeholder="Añade un comentario..." 
          className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-gray-400"
        />
        <button className="text-pink-500 font-semibold text-sm opacity-50 cursor-default">
          Publicar
        </button>
      </div>
    </div>
  );
});

