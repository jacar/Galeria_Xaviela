import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  handleFirestoreError,
  OperationType,
  auth,
  signInAnonymously,
  onAuthStateChanged,
  startAfter,
  signOut,
  serverTimestamp,
} from './lib/firebase';
import { Post, UserProfile } from './types';
import { seedXavielaData } from './lib/seedData';
import { PostCard } from './components/PostCard';
import PostGrid from './components/PostGrid';
import PostModal from './components/PostModal';
import Slideshow from './components/Slideshow';
import Stories from './components/Stories';
import UploadModal from './components/UploadModal';
import { PostSkeleton, GridSkeleton, StorySkeleton } from './components/Skeletons';
import { Camera, Image as ImageIcon, Instagram, Search, Compass, PlusSquare, Home, Heart, Menu, Film, MessageCircle, Grid, LayoutList, ChevronLeft, Bell, ChevronDown, Plus, Star, Tv, X, Trash2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Simple local ID for tracking likes/posts without login
const getGuestId = () => {
  let id = localStorage.getItem('guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('guest_id', id);
  }
  return id;
};

const getGuestName = () => {
  return localStorage.getItem('guest_name') || '';
};

const getGuestPhoto = () => {
  return localStorage.getItem('guest_photo') || '';
};

export default function App() {
  const [guestId, setGuestId] = useState(getGuestId());
  const [guestName, setGuestName] = useState(getGuestName());
  const [guestPhoto, setGuestPhoto] = useState(getGuestPhoto());
  const [showNameInput, setShowNameInput] = useState(false); // Changed to false by default, we'll check setup in useEffect
  const [isInitializing, setIsInitializing] = useState(true);
  const [tempName, setTempName] = useState('');
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'feed' | 'grid' | 'profile'>('profile');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>('xaviela_official');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('is_admin') === 'true');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [entryStep, setEntryStep] = useState<'selection' | 'guest_setup' | 'admin_login'>('selection');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [following, setFollowing] = useState<string[]>([]);
  const [isUploadingHighlight, setIsUploadingHighlight] = useState(false);
  const [followersCount, setFollowersCount] = useState<Record<string, number>>({});
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const currentViewProfileId = viewMode === 'profile' ? (selectedProfileId || guestId) : null;

  const highlightPosts = useMemo(() => 
    posts.filter(p => p.uid === currentViewProfileId && p.isHighlight),
    [posts, currentViewProfileId]
  );

  const highlightUrls = [
    'https://webcincodev.com/xaviela/galeria/1.png',
    'https://webcincodev.com/xaviela/galeria/5.png',
    'https://webcincodev.com/xaviela/galeria/10.png'
  ];

  const filteredPosts = useMemo(() => 
    viewMode === 'profile' 
      ? (currentViewProfileId === 'xaviela_official' ? posts : posts.filter(p => p.uid === currentViewProfileId))
      : posts,
    [viewMode, currentViewProfileId, posts]
  );

  // Initialize Auth and Profile
  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout: 5 seconds maximum loading screen
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Auth initialization timed out, forcing app start.");
        setIsInitializing(false);
      }
    }, 5000);

    const initAuth = () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;
          console.log("Auth State Changed: ", user ? `User logged in (${user.uid})` : "No user");
          
          try {
            if (user) {
              setGuestId(user.uid);
              localStorage.setItem('guest_id', user.uid);

              // 2. Fetch profile from Firestore
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                setGuestName(data.name);
                setGuestPhoto(data.photo || '');
                localStorage.setItem('guest_name', data.name);
                if (data.photo) localStorage.setItem('guest_photo', data.photo);
                setShowNameInput(false);
              } else {
                const localName = localStorage.getItem('guest_name');
                if (localName) {
                  setGuestName(localName);
                  const localPhoto = localStorage.getItem('guest_photo') || '';
                  setGuestPhoto(localPhoto);
                  setShowNameInput(false);
                  
                  await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    name: localName,
                    photo: localPhoto,
                    createdAt: serverTimestamp()
                  });
                } else {
                  setShowNameInput(true);
                }
              }
            } else {
              console.log("Attempting anonymous sign in...");
              await signInAnonymously(auth);
              console.log("Anonymous sign in requested.");
            }
          } catch (error) {
            console.error("Error in auth session:", error);
          } finally {
            if (isMounted) {
              setIsInitializing(false);
              clearTimeout(safetyTimeout);
            }
          }
        }, (error) => {
          console.error("Auth state change error:", error);
          if (isMounted) {
            setIsInitializing(false);
            clearTimeout(safetyTimeout);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error("Auth initialization failed:", error);
        if (isMounted) {
          setIsInitializing(false);
          clearTimeout(safetyTimeout);
        }
        return () => {};
      }
    };

    const unsubscribe = initAuth();
    
    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        seedXavielaData();
      }
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      setPosts(postsData);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 12);
      setLoading(false);
    }, (error) => {
      console.error("Posts snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadMorePosts = async () => {
    if (!lastDoc || !hasMore) return;
    
    const q = query(
      collection(db, 'posts'), 
      orderBy('createdAt', 'desc'), 
      startAfter(lastDoc), 
      limit(12)
    );
    
    try {
      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      setPosts(prev => [...prev, ...newPosts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 12);
    } catch (error) {
      console.error("Error loading more posts:", error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'follows'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const followingList: string[] = [];
      const counts: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.followerId === guestId) {
          followingList.push(data.followedId);
        }
        counts[data.followedId] = (counts[data.followedId] || 0) + 1;
      });
      
      setFollowing(followingList);
      setFollowersCount(counts);
    }, (error) => {
      console.error("Follows snapshot error:", error);
    });

    return () => unsubscribe();
  }, [guestId]);

  const handleFollow = async (followedId: string) => {
    if (followedId === guestId) return;
    
    const followId = `${guestId}_${followedId}`;
    try {
      await setDoc(doc(db, 'follows', followId), {
        followerId: guestId,
        followedId: followedId,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error following:", error);
    }
  };

  const handleUnfollow = async (followedId: string) => {
    const followId = `${guestId}_${followedId}`;
    try {
      await deleteDoc(doc(db, 'follows', followId));
    } catch (error) {
      console.error("Error unfollowing:", error);
    }
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      const name = tempName.trim();
      const uid = auth.currentUser?.uid || guestId;

      localStorage.setItem('guest_name', name);
      if (tempPhoto) {
        localStorage.setItem('guest_photo', tempPhoto);
        setGuestPhoto(tempPhoto);
      }
      setGuestName(name);
      setShowNameInput(false);

      // Persist in Firestore for robustness
      try {
        await setDoc(doc(db, 'users', uid), {
          uid: uid,
          name: name,
          photo: tempPhoto || '',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error saving user profile to Firestore:', err);
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setTempPhoto(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  const handleAdminLogin = () => {
    // Credenciales universales para el administrador
    if (adminEmail.toLowerCase() === 'xaviela@hotmail.com' && adminPassword === 'Xaviela2026') {
      setIsAdminMode(true);
      localStorage.setItem('is_admin', 'true');
      localStorage.setItem('guest_id', 'xaviela_official');
      localStorage.setItem('guest_name', 'Xaviela (Admin)');
      setGuestId('xaviela_official');
      setGuestName('Xaviela (Admin)');
      setShowAdminLogin(false);
      setAdminEmail('');
      setAdminPassword('');
      alert('Modo Administrador Activado');
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const handleLogout = async () => {
    try {
      if (isAdminMode) {
        setIsAdminMode(false);
        localStorage.removeItem('is_admin');
        alert('Sesión de administrador cerrada');
      }

      // Clear Guest data
      localStorage.removeItem('guest_id');
      localStorage.removeItem('guest_name');
      localStorage.removeItem('guest_photo');
      localStorage.removeItem('liked_posts');

      // Firebase Sign Out
      await signOut(auth);

      // Reset App State
      setGuestId(null);
      setGuestName('');
      setGuestPhoto('');
      setEntryStep('selection');
      setShowNameInput(true);
      
      // Force refresh or just reset UI
      window.location.reload(); 
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('¿ESTÁS SEGURO? Esto eliminará TODAS las fotos de la fiesta permanentemente.')) return;
    
    try {
      const batch = writeBatch(db);
      posts.forEach(post => {
        batch.delete(doc(db, 'posts', post.id));
      });
      await batch.commit();
      alert('Base de datos limpiada. Se recargarán los datos iniciales.');
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    }
  };
  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-16 h-16 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
        <p className="text-pink-600 font-serif italic text-xl animate-pulse">Xaviela's Party...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white sm:bg-gray-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[245px] h-screen sticky top-0 border-r border-gray-200 bg-white p-3 px-5 z-50">
        <div 
          className="py-8 mb-4 cursor-pointer"
          onClick={() => {
            setViewMode('profile');
            setSelectedProfileId('xaviela_official');
          }}
        >
          <span className="text-2xl font-bold tracking-tight text-pink-600 font-serif italic">Xaviela's Party</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => {
              setViewMode('profile');
              setSelectedProfileId('xaviela_official');
            }}
            className={cn(
              "flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors",
              viewMode === 'profile' && selectedProfileId === 'xaviela_official' ? "font-bold text-gray-900" : "text-gray-900"
            )}
          >
            <Home size={24} strokeWidth={viewMode === 'profile' && selectedProfileId === 'xaviela_official' ? 2.5 : 2} />
            <span>Inicio</span>
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors",
              viewMode === 'grid' ? "font-bold text-gray-900" : "text-gray-900"
            )}
          >
            <Search size={24} strokeWidth={viewMode === 'grid' ? 2.5 : 2} />
            <span>Buscar</span>
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-900"
          >
            <Compass size={24} />
            <span>Explorar</span>
          </button>
          <button className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-900">
            <Film size={24} />
            <span>Reels</span>
          </button>
          <button className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-900">
            <MessageCircle size={24} />
            <span>Mensajes</span>
          </button>
          <button className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-900">
            <Heart size={24} />
            <span>Notificaciones</span>
          </button>
          <button 
            onClick={() => {
              setIsUploadingHighlight(false);
              setIsUploadOpen(true);
            }}
            className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-900"
          >
            <PlusSquare size={24} />
            <span>Crear</span>
          </button>
          <button 
            onClick={() => setIsSlideshowOpen(true)}
            className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-fuchsia-50 transition-colors text-fuchsia-600 font-bold"
          >
            <Tv size={24} />
            <span>Proyectar Pantalla</span>
          </button>

          {isAdminMode ? (
            <div className="space-y-2">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-red-50 transition-colors text-red-600 font-bold"
              >
                <X size={24} />
                <span>Cerrar Admin</span>
              </button>
              <button 
                onClick={handleResetDatabase}
                className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-red-100 transition-colors text-red-800 text-xs font-bold border border-red-200"
              >
                <Trash2 size={16} />
                <span>LIMPIAR TODO</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 text-xs mt-10"
            >
              <Star size={16} />
              <span>Acceso Anfitrión</span>
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-red-50 transition-colors text-red-500 mt-4 border-t border-gray-100 pt-4"
          >
            <LogOut size={24} />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>

          <button 
            onClick={() => {
              setSelectedProfileId('xaviela_official');
              setViewMode('profile');
            }}
            className={cn(
              "flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors",
              viewMode === 'profile' && selectedProfileId === 'xaviela_official' ? "font-bold text-gray-900" : "text-gray-900"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-pink-100 border border-pink-200 overflow-hidden flex items-center justify-center">
              <img src="https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png" className="w-full h-full object-cover" />
            </div>
            <span>Xaviela</span>
          </button>
          <button 
            onClick={() => {
              setSelectedProfileId(null);
              setViewMode('profile');
            }}
            className={cn(
              "flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors",
              viewMode === 'profile' && !selectedProfileId ? "font-bold text-gray-900" : "text-gray-900"
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-full bg-gray-200 border overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-500",
              viewMode === 'profile' && !selectedProfileId ? "border-gray-900" : "border-gray-300"
            )}>
              {guestPhoto ? (
                <img src={guestPhoto} className="w-full h-full object-cover" />
              ) : (
                guestId.charAt(6).toUpperCase()
              )}
            </div>
            <span>Mi Perfil</span>
          </button>
        </nav>

        <button 
          onClick={() => {
            localStorage.setItem('guest_id', 'xaviela_official');
            window.location.reload();
          }}
          className="flex items-center gap-4 w-full p-3 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors mt-auto shadow-md shadow-pink-100"
        >
          <Star size={24} fill="white" />
          <span>Modo Anfitrión (Admin)</span>
        </button>

        <button className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-900">
          <Menu size={24} />
          <span>Más</span>
        </button>
      </aside>

      {/* Mobile/Tablet Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-[44px] flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {viewMode === 'profile' ? (
            <>
              <button onClick={() => {
                setViewMode('profile');
                setSelectedProfileId('xaviela_official');
              }} className="text-gray-900">
                <ChevronLeft size={28} />
              </button>
              <span className="text-lg font-bold tracking-tight text-gray-900">
                {currentViewProfileId === 'xaviela_official' ? 'xaviela_oficial' : (guestName || `Invitado_${guestId.slice(-4)}`)}
              </span>
            </>
          ) : (
            <span 
              onClick={() => {
                setViewMode('profile');
                setSelectedProfileId('xaviela_official');
              }}
              className="text-2xl font-bold tracking-tight text-pink-600 font-serif italic cursor-pointer"
            >
              Xaviela's Party
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {viewMode === 'profile' ? (
            <button className="text-gray-900">
              <Bell size={24} />
            </button>
          ) : (
            <>
              <button onClick={() => {
                setIsUploadingHighlight(false);
                setIsUploadOpen(true);
              }} className="text-gray-900 active:opacity-50 transition-opacity">
                <PlusSquare size={24} strokeWidth={2} />
              </button>
              <button className="text-gray-900 active:opacity-50 transition-opacity">
                <Heart size={24} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex justify-center lg:pt-8">
        <div className="flex flex-col lg:flex-row gap-8 max-w-[935px] w-full px-0 sm:px-4">
          
          {/* Feed Section */}
          <main className="flex-1 max-w-[470px] mx-auto lg:mx-0">
            {viewMode === 'feed' && (
              loading ? <StorySkeleton /> : <Stories onHighlightClick={setSelectedHighlight} posts={posts} currentUserId={guestId} />
            )}
            
            {viewMode === 'profile' && (
              <div className="bg-white">
                {/* Profile Header Stats */}
                <div className="px-4 pt-6 pb-4 flex items-center gap-8">
                  <div className="instagram-border shrink-0">
                    <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white p-1 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400 overflow-hidden">
                        {currentViewProfileId === 'xaviela_official' ? (
                          <img src="https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png" className="w-full h-full object-cover" />
                        ) : (
                          guestPhoto ? (
                            <img src={guestPhoto} className="w-full h-full object-cover" />
                          ) : (
                            guestId.charAt(6).toUpperCase()
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 flex justify-around text-center">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{filteredPosts.length}</span>
                      <span className="text-xs text-gray-500">Publicaciones</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">
                        {currentViewProfileId === 'xaviela_official' 
                          ? (336000 + (followersCount['xaviela_official'] || 0)).toLocaleString() 
                          : (followersCount[currentViewProfileId!] || 0)}
                      </span>
                      <span className="text-xs text-gray-500">Seguidores</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">
                        {currentViewProfileId === 'xaviela_official' ? '230' : '0'}
                      </span>
                      <span className="text-xs text-gray-500">Seguidos</span>
                    </div>
                  </div>
                </div>

                {/* Profile Bio */}
                <div className="px-4 pb-4">
                  <h2 className="font-bold text-sm text-gray-900">
                    {currentViewProfileId === 'xaviela_official' ? 'Xaviela' : (guestName || `Invitado_${guestId.slice(-4)}`)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {currentViewProfileId === 'xaviela_official' ? 'Quinceañera' : 'Invitado de la fiesta'}
                  </p>
                  <p className="text-sm text-gray-900">
                    {currentViewProfileId === 'xaviela_official' 
                      ? 'Mis 15 años ✨ | 10 de Abril 2026 | Salón Rumbita Express 🏰' 
                      : 'Celebrando los 15 de Xaviela ✨'}
                  </p>
                  <a href="https://webcincodev.com/xaviela/" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-pink-600">
                    webcincodev.com/xaviela
                  </a>
                </div>

                {/* Profile Actions */}
                <div className="px-4 pb-6 flex gap-2">
                  {currentViewProfileId !== guestId ? (
                    <>
                      {following.includes(currentViewProfileId!) ? (
                        <button 
                          onClick={() => handleUnfollow(currentViewProfileId!)}
                          className="flex-1 bg-pink-50 text-pink-600 py-1.5 rounded-md text-sm font-semibold hover:bg-pink-100 transition-colors"
                        >
                          Siguiendo
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleFollow(currentViewProfileId!)}
                          className="flex-1 bg-pink-500 text-white py-1.5 rounded-md text-sm font-bold hover:bg-pink-600 transition-colors shadow-md shadow-pink-100"
                        >
                          Seguir
                        </button>
                      )}
                      <button className="flex-1 bg-pink-50 text-pink-600 py-1.5 rounded-md text-sm font-semibold hover:bg-pink-100 transition-colors">Mensaje</button>
                    </>
                  ) : (
                    <button 
                    onClick={() => setShowNameInput(true)}
                    className="flex-1 bg-pink-50 text-pink-600 py-1.5 rounded-md text-sm font-semibold hover:bg-pink-100 transition-colors"
                  >
                    Editar perfil
                  </button>
                  )}
                  <button className="flex-1 bg-pink-50 text-pink-600 py-1.5 rounded-md text-sm font-semibold hover:bg-pink-100 transition-colors">Compartir perfil</button>
                  {currentViewProfileId === guestId && !isAdminMode && (
                    <button 
                      onClick={() => setShowAdminLogin(true)}
                      className="flex-1 bg-pink-500 text-white py-1.5 rounded-md text-sm font-bold hover:bg-pink-600 transition-colors shadow-sm"
                    >
                      Acceso Anfitrión
                    </button>
                  )}
                  {isAdminMode && (
                    <button 
                      onClick={handleLogout}
                      className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-md text-sm font-bold border border-red-100"
                    >
                      Cerrar Admin
                    </button>
                  )}
                  {currentViewProfileId === guestId && !isAdminMode && (
                    <button 
                      onClick={handleLogout}
                      className="flex items-center justify-center bg-gray-50 text-gray-500 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
                      title="Cerrar sesión"
                    >
                      <LogOut size={18} />
                    </button>
                  )}
                  <button className="bg-pink-50 text-pink-600 px-2 py-1.5 rounded-md text-sm font-semibold hover:bg-pink-100 transition-colors">
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Highlights */}
                <div className="px-4 pb-6 flex gap-4 overflow-x-auto no-scrollbar">
                  {currentViewProfileId === 'xaviela_official' ? (
                    [
                      { label: 'Nuevo', icon: <Plus size={24} /> },
                      { label: 'Preparativos', img: 'https://webcincodev.com/xaviela/galeria/1.png' },
                      { label: 'Sesión', img: 'https://webcincodev.com/xaviela/galeria/5.png' },
                      { label: 'Fiesta', img: 'https://webcincodev.com/xaviela/galeria/10.png' },
                      ...highlightPosts.map((p, i) => ({ label: `Extra ${i + 1}`, img: p.imageUrl }))
                    ].map((h, i) => (
                      <div 
                        key={`xav-${i}`} 
                        className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                        onClick={() => {
                          if (h.label === 'Nuevo') {
                            setIsUploadingHighlight(true);
                            setIsUploadOpen(true);
                          } else if (h.img) {
                            setSelectedHighlight(h.img);
                          }
                        }}
                      >
                        <div className="w-16 h-16 rounded-full border-2 border-pink-500 p-0.5 flex items-center justify-center overflow-hidden bg-white group-active:scale-95 transition-transform">
                          {h.img ? (
                            <img src={h.img} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="text-pink-500"><Plus size={24} /></div>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-900">{h.label}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div 
                        onClick={() => {
                          setIsUploadingHighlight(true);
                          setIsUploadOpen(true);
                        }}
                        className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                      >
                        <div className="w-16 h-16 rounded-full border-2 border-pink-500 p-0.5 flex items-center justify-center overflow-hidden bg-white group-active:scale-95 transition-transform">
                          <div className="text-pink-500"><Plus size={24} /></div>
                        </div>
                        <span className="text-[10px] text-gray-900">Nuevo</span>
                      </div>
                      {highlightPosts.map((post, i) => (
                        <div 
                          key={post.id} 
                          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                          onClick={() => setSelectedHighlight(post.imageUrl)}
                        >
                          <div className="w-16 h-16 rounded-full border-2 border-pink-500 p-0.5 flex items-center justify-center overflow-hidden bg-white group-active:scale-95 transition-transform">
                            <img src={post.imageUrl} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] text-gray-900 truncate w-16 text-center">Destacada {i+1}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'grid' && (
              <div className="bg-white px-4 py-6 border-b border-gray-200 sm:border-x sm:rounded-t-sm">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Galería de Momentos
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse font-normal">EN VIVO</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">Todas las fotos compartidas por los invitados en tiempo real.</p>
              </div>
            )}

            {/* View Switcher Tabs */}
            <div className="bg-white border-t border-gray-200 flex items-center justify-around h-12 sticky top-[44px] sm:top-14 z-30">
              <button 
                onClick={() => setViewMode('feed')}
                className={cn(
                  "flex-1 h-full flex items-center justify-center transition-colors border-t-2 -mt-[2px]",
                  viewMode === 'feed' ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"
                )}
              >
                <LayoutList size={24} strokeWidth={viewMode === 'feed' ? 2 : 1.5} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "flex-1 h-full flex items-center justify-center transition-colors border-t-2 -mt-[2px]",
                  viewMode === 'grid' || viewMode === 'profile' ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <Grid size={24} strokeWidth={viewMode === 'grid' || viewMode === 'profile' ? 2 : 1.5} />
                  {viewMode === 'grid' && <span className="text-[10px] bg-red-500 text-white px-1 rounded-sm animate-pulse">VIVO</span>}
                </div>
              </button>
            </div>

            <div className="flex flex-col bg-white min-h-[50vh]">
              {loading ? (
                viewMode === 'feed' ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
                  </div>
                ) : (
                  <div className="p-4">
                    <GridSkeleton />
                  </div>
                )
              ) : filteredPosts.length > 0 ? (
                viewMode === 'feed' ? (
                  <>
                    {filteredPosts.map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        currentUserId={guestId} 
                        onDelete={isAdminMode ? handleDeletePost : undefined}
                      />
                    ))}
                    {hasMore && (
                      <button 
                        onClick={loadMorePosts}
                        disabled={isLoadingMore}
                        className="w-full py-4 text-pink-500 font-bold hover:bg-pink-50 transition-colors uppercase tracking-widest text-[10px] border-y border-gray-100 mb-8 disabled:opacity-50"
                      >
                        {isLoadingMore ? 'Cargando...' : 'Ver más publicaciones'}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-[1px]">
                    <PostGrid 
                      posts={filteredPosts} 
                      currentUserId={guestId}
                      onPostClick={(post) => {
                        setSelectedPost(post);
                      }} 
                      onDelete={isAdminMode ? handleDeletePost : undefined}
                    />
                    {hasMore && (
                      <button 
                        onClick={loadMorePosts}
                        disabled={isLoadingMore}
                        className="w-full py-4 text-pink-500 font-bold hover:bg-pink-50 transition-colors uppercase tracking-widest text-[10px] border-y border-gray-100 my-4 disabled:opacity-50"
                      >
                        {isLoadingMore ? 'Cargando...' : 'Ver más publicaciones'}
                      </button>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center py-20 px-10 space-y-4">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto border-2 border-gray-100">
                    <Camera size={48} className="text-gray-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-gray-900">
                      {viewMode === 'profile' ? 'Aún no has compartido nada' : 'Comparte el primer momento'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {viewMode === 'profile' ? 'Tus fotos aparecerán aquí.' : 'Cuando subas una foto, aparecerá aquí en el muro de Xaviela.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsUploadOpen(true)}
                    className="text-pink-500 font-semibold text-sm active:opacity-50"
                  >
                    Subir mi primera foto
                  </button>
                </div>
              )}
            </div>
          </main>

          {/* Desktop Right Sidebar (Suggestions) */}
          <aside className="hidden lg:block w-[320px] pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden">
                  {guestPhoto ? (
                    <img src={guestPhoto} className="w-full h-full object-cover" />
                  ) : (
                    guestId.charAt(6).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">{guestName || `Invitado_${guestId.slice(-4)}`}</span>
                  <span className="text-sm text-gray-500">Invitado de la fiesta</span>
                </div>
              </div>
              <button className="text-xs font-bold text-pink-500 hover:text-pink-700">Cambiar</button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-500">Sugerencias para ti</span>
              <button className="text-xs font-bold text-pink-500">Ver todo</button>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Xaviela', id: 'xaviela_official', photo: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png' },
                { name: 'Mamá', id: 'mama_xaviela' },
                { name: 'Papá', id: 'papa_xaviela' },
                { name: 'Mejor Amiga', id: 'amiga_xaviela' }
              ].map((user, i) => (
                <div key={i} className="flex items-center justify-between">
                  <button 
                    onClick={() => {
                      setSelectedProfileId(user.id);
                      setViewMode('profile');
                    }}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 overflow-hidden">
                      {user.photo ? (
                        <img src={user.photo} className="w-full h-full object-cover" />
                      ) : (
                        <Star size={14} />
                      )}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                      <span className="text-xs text-gray-500">Anfitrión/a</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      if (following.includes(user.id)) {
                        handleUnfollow(user.id);
                      } else {
                        handleFollow(user.id);
                      }
                    }}
                    className={cn(
                      "text-xs font-bold px-3 py-1 rounded-md transition-colors",
                      following.includes(user.id) ? "bg-gray-100 text-gray-400" : "bg-pink-500 text-white hover:bg-pink-600"
                    )}
                  >
                    {following.includes(user.id) ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 text-[11px] text-gray-300 uppercase space-y-4">
              <p>Información · Ayuda · Prensa · API · Empleo · Privacidad · Condiciones · Ubicaciones · Idioma · Meta Verified</p>
              <p>© 2026 MIS 15 - XAVIELA</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-[48px] flex items-center justify-around z-40 w-full px-2">
        <button 
          onClick={() => {
            setViewMode('profile');
            setSelectedProfileId('xaviela_official');
          }} 
          className={cn(viewMode === 'profile' && selectedProfileId === 'xaviela_official' ? "text-gray-900" : "text-gray-400")}
        >
          <Home size={26} strokeWidth={viewMode === 'profile' && selectedProfileId === 'xaviela_official' ? 2.5 : 2} />
        </button>
        <button onClick={() => setViewMode('grid')} className={cn(viewMode === 'grid' ? "text-gray-900" : "text-gray-400")}>
          <Search size={26} strokeWidth={viewMode === 'grid' ? 2.5 : 2} />
        </button>
        <button onClick={() => setIsUploadOpen(true)} className="text-gray-900">
          <PlusSquare size={26} strokeWidth={2} />
        </button>
        <button className="text-gray-400">
          <Heart size={26} strokeWidth={2} />
        </button>
        <button onClick={() => {
          setViewMode('profile');
          setSelectedProfileId(null);
        }} className={cn("w-6 h-6 rounded-full bg-gray-200 border overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-500", viewMode === 'profile' && !selectedProfileId ? "border-gray-900" : "border-gray-300")}>
          {guestPhoto ? (
            <img src={guestPhoto} className="w-full h-full object-cover" />
          ) : (
            guestId.charAt(6).toUpperCase()
          )}
        </button>
      </nav>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-sm text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-pink-500">
                <Star size={32} fill="currentColor" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900 font-serif italic">Acceso Anfitrión</h3>
                <p className="text-sm text-gray-500 px-4">Ingresa el código secreto para gestionar la fiesta.</p>
              </div>
              <div className="space-y-4">
                <input 
                  type="email"
                  placeholder="Correo electrónico"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
                <input 
                  type="password"
                  placeholder="Contraseña"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowAdminLogin(false);
                      setAdminEmail('');
                      setAdminPassword('');
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-xl font-bold active:scale-95 transition-transform"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAdminLogin}
                    className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-transform"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => {
          setIsUploadOpen(false);
          setIsUploadingHighlight(false);
        }}
        initialIsHighlight={isUploadingHighlight}
      />

      {/* Post Detail Modal */}
      <PostModal 
        post={selectedPost} 
        onClose={() => setSelectedPost(null)} 
        currentUserId={guestId} 
        onDelete={handleDeletePost}
      />

      {/* Slideshow / Party Wall */}
      <Slideshow 
        posts={posts} 
        isOpen={isSlideshowOpen} 
        onClose={() => setIsSlideshowOpen(false)} 
        currentUserId={guestId}
      />

      {/* Guest Name Input Overlay */}
      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-xs w-full space-y-6"
            >
              <div className="space-y-4">
                <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mx-auto overflow-hidden border-4 border-pink-100 shadow-lg">
                  <img 
                    src="https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-pink-600 font-serif italic">Xaviela's Party</h1>
              </div>

              {entryStep === 'selection' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <p className="text-gray-900 font-semibold">¡Bienvenido a mis 15 años! ✨</p>
                    <p className="text-gray-500 text-sm italic">Elige cómo quieres participar:</p>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => setEntryStep('guest_setup')}
                      className="w-full py-4 bg-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-pink-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      <Star className="fill-white" size={20} />
                      Soy Invitado
                    </button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-2 text-gray-400">Acceso Privado</span></div>
                    </div>

                    <button 
                      onClick={() => setEntryStep('admin_login')}
                      className="w-full py-2 bg-gray-50 text-gray-500 rounded-lg font-medium text-xs hover:bg-gray-100 transition-colors"
                    >
                      Soy Anfitrión
                    </button>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-1">
                    <p className="text-amber-800 text-[10px] font-bold uppercase tracking-wider">Aviso para Invitados</p>
                    <p className="text-amber-700 text-[11px] leading-relaxed">
                      Si eres un invitado, por favor elige "Soy Invitado". La opción de anfitrión requiere clave.
                    </p>
                  </div>
                </div>
              )}

              {entryStep === 'guest_setup' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3">
                      <div 
                        className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden relative"
                      >
                        {tempPhoto ? (
                          <img src={tempPhoto} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Camera size={24} className="text-gray-400" />
                            <span className="text-[10px] text-gray-400">Tu Foto</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 w-full">
                        <button onClick={() => cameraInputRef.current?.click()} className="flex-1 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
                          <Camera size={12} /> Cámara
                        </button>
                        <button onClick={() => galleryInputRef.current?.click()} className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-900 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
                          <ImageIcon size={12} className="text-pink-500" /> Galería
                        </button>
                      </div>

                      <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handlePhotoChange} />
                      <input type="file" accept="image/*" className="hidden" ref={galleryInputRef} onChange={handlePhotoChange} />
                    </div>

                    <input
                      type="text"
                      placeholder="Tu nombre o apodo"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all text-center font-medium"
                    />
                    
                    <div className="space-y-3">
                      <button
                        onClick={handleSaveName}
                        disabled={!tempName.trim()}
                        className="w-full py-3.5 bg-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                      >
                        Entrar a la fiesta
                      </button>
                      <button onClick={() => setEntryStep('selection')} className="text-gray-400 text-[10px] hover:underline">Volver atrás</button>
                    </div>
                  </div>
                </div>
              )}

              {entryStep === 'admin_login' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="text-left space-y-3">
                    <input
                      type="email"
                      placeholder="Email de anfitrión"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                    />
                    <input
                      type="password"
                      placeholder="Contrasena"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleAdminLogin}
                      className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
                    >
                      Iniciar Sesión
                    </button>
                    <button onClick={() => setEntryStep('selection')} className="text-gray-400 text-[10px] hover:underline">Volver atrás</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlight Viewer Modal */}
      <AnimatePresence>
        {selectedHighlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedHighlight(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-[110]"
              onClick={() => setSelectedHighlight(null)}
            >
              <Plus size={32} className="rotate-45" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedHighlight}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-[-40px] left-0 right-0 text-center text-white font-medium">
                Destacada ✨
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
