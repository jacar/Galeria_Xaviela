import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Post } from '../types';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { db, doc, deleteDoc, OperationType, handleFirestoreError } from '../lib/firebase';

interface SlideshowProps {
  posts: Post[];
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function Slideshow({ posts, isOpen, onClose, currentUserId }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAutoPlay || posts.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [isOpen, isAutoPlay, posts.length]);

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % posts.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleDelete = async () => {
    const postToDelete = posts[currentIndex];
    try {
      await deleteDoc(doc(db, 'posts', postToDelete.id));
      setShowDeleteConfirm(false);
      // The onSnapshot in App.tsx will update the posts list automatically
      if (posts.length === 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postToDelete.id}`);
    }
  };

  if (!isOpen || posts.length === 0) return null;

  const currentPost = posts[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
            <X size={32} />
          </button>
          <div className="text-white">
            <h2 className="text-xl font-bold">Galería en Vivo - Xaviela</h2>
            <p className="text-sm opacity-80">{currentIndex + 1} de {posts.length} fotos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${isAutoPlay ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
          >
            {isAutoPlay ? 'Auto-reproducción: ON' : 'Auto-reproducción: OFF'}
          </button>
          <button onClick={toggleFullscreen} className="text-white hover:text-gray-300 transition-colors">
            {isFullscreen ? <Minimize2 size={28} /> : <Maximize2 size={28} />}
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPost.id}
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.05, x: -20 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden flex flex-col bg-zinc-900"
          >
            <img 
              src={currentPost.imageUrl} 
              alt="Party Moment" 
              className="max-w-full max-h-[80vh] object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="p-6 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-xs font-bold">
                      {currentPost.authorName[0]}
                    </div>
                  </div>
                  <span className="font-bold text-lg">{currentPost.authorName}</span>
                </div>
                {currentPost.caption && (
                  <p className="text-xl opacity-90 italic">"{currentPost.caption}"</p>
                )}
              </div>

              {(currentUserId === currentPost.uid || currentUserId === 'xaviela_official') && (
                <button 
                  onClick={() => {
                    setIsAutoPlay(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-3 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={24} />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Delete Confirmation Overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-2xl p-6 max-w-xs w-full text-center space-y-4"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <Trash2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">¿Eliminar foto?</h3>
                  <p className="text-sm text-gray-500">Esta acción no se puede deshacer y la foto desaparecerá de la fiesta.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleDelete}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    Sí, eliminar
                  </button>
                  <button 
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setIsAutoPlay(true);
                    }}
                    className="w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button 
          onClick={handlePrev}
          className="absolute left-4 sm:left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft size={40} />
        </button>
        <button 
          onClick={handleNext}
          className="absolute right-4 sm:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight size={40} />
        </button>
      </div>

      {/* Progress Bar */}
      {isAutoPlay && (
        <motion.div 
          key={`progress-${currentIndex}`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="absolute bottom-0 left-0 h-1 bg-fuchsia-600 z-20"
        />
      )}
    </div>
  );
}
