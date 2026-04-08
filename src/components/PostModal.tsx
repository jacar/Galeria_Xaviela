import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Post } from '../types';
import { PostCard } from './PostCard';

interface PostModalProps {
  post: Post | null;
  onClose: () => void;
  currentUserId: string;
  onDelete?: (id: string) => void;
}

export default function PostModal({ post, onClose, currentUserId, onDelete }: PostModalProps) {
  return (
    <AnimatePresence>
      {post && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-[470px] bg-white sm:rounded-sm overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 text-white sm:text-gray-900 bg-black/20 sm:bg-transparent rounded-full p-1"
            >
              <X size={24} />
            </button>
            
            <div className="max-h-[90vh] overflow-y-auto no-scrollbar">
              <PostCard 
                post={post} 
                currentUserId={currentUserId} 
                onDelete={(id) => {
                  if (onDelete) onDelete(id);
                  onClose();
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
