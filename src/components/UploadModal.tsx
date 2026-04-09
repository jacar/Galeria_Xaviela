import React, { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, serverTimestamp, OperationType, handleFirestoreError } from '../lib/firebase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (imageUrl: string) => void;
  initialIsHighlight?: boolean;
}

export default function UploadModal({ isOpen, onClose, onSuccess, initialIsHighlight = false }: UploadModalProps) {
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [guestName, setGuestName] = useState(localStorage.getItem('guest_name') || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHighlight, setIsHighlight] = useState(initialIsHighlight);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setGuestName(localStorage.getItem('guest_name') || '');
      setIsHighlight(initialIsHighlight);
    }
  }, [isOpen, initialIsHighlight]);

  const resizeImage = (file: File): Promise<{ dataUrl: string; aspectRatio: number }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const aspectRatio = width / height;

          const MAX_DIM = 1080;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve({ 
            dataUrl: canvas.toDataURL('image/jpeg', 0.7),
            aspectRatio
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setError(null);
      setIsUploading(true);
      try {
        const limitedFiles = files.slice(0, 5);
        if (files.length > 5) {
          setError('Máximo 5 fotos permitidas. Se han seleccionado las primeras 5.');
        }

        const processedImages: string[] = [];
        let firstAR: number | null = null;

        for (let i = 0; i < limitedFiles.length; i++) {
          const { dataUrl, aspectRatio: ar } = await resizeImage(limitedFiles[i]);
          processedImages.push(dataUrl);
          if (i === 0) firstAR = ar;
        }

        setImages(processedImages);
        setAspectRatio(firstAR);
        setCurrentImageIndex(0);
      } catch (err) {
        console.error('Error processing images:', err);
        setError('No se pudieron procesar las imágenes. Intenta con otras.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleUpload = async () => {
    if (images.length === 0) return;

    setIsUploading(true);
    setError(null);
    
    // Check total size or just skip if resizing is handled
    const totalSize = images.reduce((acc, img) => acc + img.length, 0);
    if (totalSize > 1048576 * 5) { // 5MB approx
      setError('Las imágenes en conjunto son demasiado grandes. Intenta con menos o reduce su calidad.');
      setIsUploading(false);
      return;
    }

    try {
      const guestId = localStorage.getItem('guest_id') || 'anonymous';
      const guestPhoto = localStorage.getItem('guest_photo') || '';
      await addDoc(collection(db, 'posts'), {
        uid: guestId,
        authorName: guestName.trim() || 'Invitado Especial',
        authorPhoto: guestPhoto,
        imageUrl: images[0],
        images,
        caption,
        isHighlight,
        aspectRatio: aspectRatio || 1,
        createdAt: serverTimestamp(),
        likesCount: 0
      });
      // REMOVED: localStorage.setItem('guest_photo', image); // Don't overwrite profile photo on every post
      if (onSuccess) onSuccess(images[0]);
      onClose();
      setImages([]);
      setCurrentImageIndex(0);
      setAspectRatio(null);
      setCaption('');
      setGuestName('');
    } catch (err: any) {
      console.error('Upload error:', err);
      let message = 'Error al publicar. Inténtalo de nuevo.';
      if (err.message?.includes('quota')) {
        message = 'Se ha alcanzado el límite de publicaciones por hoy.';
      } else if (err.message?.includes('permission-denied')) {
        message = 'No tienes permiso para publicar.';
      }
      setError(message);
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-white h-[100dvh] sm:h-auto w-full max-w-md sm:rounded-xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 shrink-0 bg-white z-10">
              <button onClick={onClose} className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
                <X size={24} />
              </button>
              <h2 className="font-bold text-lg text-gray-900">Nueva publicación</h2>
              <div className="w-10" /> {/* Spacer for symmetry */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 text-sm font-medium text-center border-b border-red-100">
                  {error}
                </div>
              )}
              {images.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 space-y-8">
                  <div className="space-y-2 text-center">
                    <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-pink-500 mb-4">
                      <Camera size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Comparte un momento</h3>
                    <p className="text-sm text-gray-500">Elige cómo quieres subir tu foto</p>
                  </div>

                  <div className="w-full space-y-3">
                    <button 
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full py-4 bg-pink-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg shadow-pink-100"
                    >
                      <Camera size={20} />
                      Tomar foto ahora
                    </button>
                    
                    <button 
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                    >
                      <ImageIcon size={20} className="text-pink-500" />
                      Elegir de la galería
                    </button>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={galleryInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="bg-gray-100 relative group overflow-hidden" 
                       style={{ 
                         aspectRatio: aspectRatio ? (aspectRatio < 0.8 ? '9/16' : aspectRatio < 1 ? '4/5' : '1/1') : '1/1',
                         maxHeight: '60vh',
                         width: '100%'
                       }}>
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={currentImageIndex}
                        src={images[currentImageIndex]} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        alt="Preview" 
                        className="w-full h-full object-contain" 
                      />
                    </AnimatePresence>
                    
                    {images.length > 1 && (
                      <>
                        <div className="absolute inset-y-0 left-0 flex items-center p-2">
                          <button 
                            onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)}
                            className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-900 shadow-md"
                          >
                            <ChevronLeft size={20} />
                          </button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center p-2">
                          <button 
                            onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
                            className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-900 shadow-md"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                        <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                          {currentImageIndex + 1}/{images.length}
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                          {images.map((_, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all",
                                i === currentImageIndex ? "bg-pink-500 scale-125" : "bg-white/60"
                              )} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4 pb-10 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold text-xs shrink-0">
                        {guestName.charAt(0).toUpperCase()}
                      </div>
                      <textarea
                        placeholder="Escribe un pie de foto..."
                        className="w-full py-1 bg-transparent border-none outline-none resize-none min-h-[120px] text-base placeholder:text-gray-400"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        autoFocus
                      />
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Añadir a destacados</span>
                      <button 
                        onClick={() => setIsHighlight(!isHighlight)}
                        className={cn(
                          "w-10 h-6 rounded-full transition-colors relative",
                          isHighlight ? "bg-pink-500" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          isHighlight ? "left-5" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Only visible when images are selected */}
            {images.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <button
                  disabled={isUploading}
                  onClick={handleUpload}
                  className="w-full py-3 bg-pink-500 text-white rounded-xl font-bold shadow-lg shadow-pink-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Compartiendo...
                    </>
                  ) : (
                    'Publicar ahora'
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
