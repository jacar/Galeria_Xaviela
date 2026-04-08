import React from 'react';

export const PostSkeleton = () => (
  <div className="bg-white border border-gray-200 sm:rounded-sm mb-4 animate-pulse">
    <div className="flex items-center p-3 gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="h-4 w-24 bg-gray-200 rounded" />
    </div>
    <div className="aspect-square bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
      <div className="h-4 w-1/2 bg-gray-200 rounded" />
    </div>
  </div>
);

export const GridSkeleton = () => (
  <div className="grid grid-cols-3 gap-[1px] sm:gap-1 lg:gap-7 animate-pulse">
    {[...Array(9)].map((_, i) => (
      <div key={i} className="aspect-square bg-gray-200" />
    ))}
  </div>
);

export const StorySkeleton = () => (
  <div className="flex items-center gap-4 p-4 overflow-x-auto no-scrollbar bg-white border-b border-gray-200 sm:border sm:rounded-sm mb-0 sm:mb-4 max-w-[470px] mx-auto w-full animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-14 h-14 rounded-full bg-gray-200" />
        <div className="h-2 w-10 bg-gray-200 rounded mt-1" />
      </div>
    ))}
  </div>
);
