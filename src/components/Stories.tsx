import React from 'react';
import { Post } from '../types';

interface StoriesProps {
  onHighlightClick: (url: string) => void;
  posts: Post[];
  currentUserId: string;
}

const XAVIELA_HIGHLIGHTS = [
  { label: 'Preparativos', img: 'https://webcincodev.com/xaviela/galeria/1.png' },
  { label: 'Sesión', img: 'https://webcincodev.com/xaviela/galeria/5.png' },
  { label: 'Fiesta', img: 'https://webcincodev.com/xaviela/galeria/10.png' }
];

export default function Stories({ onHighlightClick, posts, currentUserId }: StoriesProps) {
  const userHighlights = posts.filter(p => p.uid === currentUserId && p.isHighlight);

  return (
    <div className="flex items-center gap-4 p-4 overflow-x-auto no-scrollbar bg-white border-b border-gray-200 sm:border sm:rounded-sm mb-0 sm:mb-4 max-w-[470px] mx-auto w-full">
      {/* Your Story placeholder */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group">
        <div className="relative">
          <div className="w-[62px] h-[62px] rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center group-active:scale-95 transition-transform">
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
              <span className="text-xs font-bold">Tú</span>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs">
            +
          </div>
        </div>
        <span className="text-[11px] text-gray-500 truncate w-16 text-center">Tu historia</span>
      </div>

      {XAVIELA_HIGHLIGHTS.map((h, i) => (
        <div 
          key={`xaviela-${i}`} 
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
          onClick={() => onHighlightClick(h.img)}
        >
          <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600 group-active:scale-95 transition-transform">
            <div className="p-[2px] bg-white rounded-full">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                <img 
                  src={h.img} 
                  alt={h.label} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <span className="text-[11px] text-gray-900 truncate w-16 text-center font-medium">
            {h.label}
          </span>
        </div>
      ))}

      {userHighlights.map((post, i) => (
        <div 
          key={post.id} 
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
          onClick={() => onHighlightClick(post.imageUrl)}
        >
          <div className="p-[2.5px] rounded-full bg-pink-500 group-active:scale-95 transition-transform">
            <div className="p-[2px] bg-white rounded-full">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                <img 
                  src={post.imageUrl} 
                  alt="Tus destacados" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <span className="text-[11px] text-gray-900 truncate w-16 text-center font-medium">
            Tuyo {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
