'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GuestGallery() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const locale = params.locale as string;
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (code) {
      // Changed to use the new public endpoint to avoid auth requirement for guests
      api.getPublicGalleryByCode(code)
        .then(data => {
          setGallery(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Gallery not found');
          setLoading(false);
        });
    }
  }, [code]);

  const toggleSelection = (photoId: number) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleCheckout = () => {
    alert(`Checkout with ${selectedPhotos.size} photos selected.`);
  };

  const changeLanguage = (newLocale: string) => {
    // Basic navigation to switch locale
    router.push(`/${newLocale}/g/${code}`);
  };

  const locales = [
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' },
    { code: 'zh', label: 'ZH' },
    { code: 'ja', label: 'JA' },
    { code: 'ko', label: 'KO' },
  ];

  if (loading) return (
     <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
     </div>
  );
  if (error) return (
     <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium flex items-center gap-2">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           {error}
        </div>
     </div>
  );
  if (!gallery) return <div className="p-12 text-center">No gallery data</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b sticky top-0 z-20 shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Your Photos</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-mono mt-0.5">Code: {gallery.short_code}</p>
          </div>
          {/* Language Switcher Pills */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg">
             {locales.map(l => (
                <button
                  key={l.code}
                  onClick={() => changeLanguage(l.code)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${locale === l.code ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                   {l.label}
                </button>
             ))}
          </div>
        </div>
      </div>

      {/* Masonry Grid (Mobile First 2-Col) */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
          {gallery.photos?.map((photo: any) => (
            <div
              key={photo.id}
              className="relative break-inside-avoid cursor-pointer group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-gray-200"
              onClick={() => toggleSelection(photo.id)}
            >
              <img
                src={photo.watermark_url || photo.preview_url || 'https://via.placeholder.com/300x400?text=Watermarked'}
                alt="Street Photo"
                className="w-full h-auto object-cover"
                loading="lazy"
              />

              <div className={`absolute inset-0 transition-opacity duration-200 ${selectedPhotos.has(photo.id) ? 'bg-indigo-900/20 opacity-100 ring-4 ring-inset ring-indigo-600' : 'bg-black/30 opacity-0 group-hover:opacity-100'}`}>
                <div className="absolute top-3 right-3">
                  {selectedPhotos.has(photo.id) ? (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg transform scale-110 transition-transform">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110">
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(!gallery.photos || gallery.photos.length === 0) && (
            <div className="text-gray-500 col-span-full text-center py-20 bg-white rounded-xl border border-dashed">
               <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
              <p>No photos have been uploaded to this gallery yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Checkout Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_20px_-1px_rgba(0,0,0,0.08)] p-4 sm:px-6 z-30 transform transition-transform">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
             <div className="flex flex-col">
                <p className="text-xs sm:text-sm text-gray-500 font-medium uppercase tracking-wider">Selected</p>
                <p className="text-xl sm:text-2xl font-black text-gray-900">{selectedPhotos.size}</p>
             </div>
             <div className="h-8 sm:h-10 w-px bg-gray-200"></div>
             <div className="flex flex-col">
                <p className="text-xs sm:text-sm text-gray-500 font-medium uppercase tracking-wider">Total</p>
                {/* Calculate total based on a sample price if real logic doesn't exist */}
                <p className="text-xl sm:text-2xl font-black text-gray-900">${(selectedPhotos.size * 5).toFixed(2)}</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Payment Logos (CSS Mock) */}
             <div className="hidden md:flex gap-1.5 opacity-40 grayscale">
                <div className="w-9 h-6 bg-blue-600 rounded flex items-center justify-center text-[8px] text-white font-bold">VISA</div>
                <div className="w-9 h-6 bg-red-500 rounded flex items-center justify-center text-[8px] text-white font-bold italic">MC</div>
                <div className="w-9 h-6 bg-black rounded flex items-center justify-center text-[8px] text-white font-bold">PAY</div>
             </div>
            <button
              onClick={handleCheckout}
              disabled={selectedPhotos.size === 0}
              className="bg-indigo-600 text-white px-6 sm:px-10 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
            >
              Buy High-Res
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
