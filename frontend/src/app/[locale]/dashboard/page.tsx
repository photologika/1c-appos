'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function Dashboard() {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGalleries()
      .then((data) => {
        setGalleries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCreateBatch = async () => {
    try {
      // For MVP we generate a batch of 1 or 5. Let's do 5 for demo purposes.
      const newGalleries = await api.createGalleryBatch(5);
      setGalleries((prev) => [...newGalleries, ...prev]);
    } catch (err) {
      console.error("Failed to create gallery batch", err);
    }
  };

  const handleDownloadPdf = async (galleryId: string) => {
    try {
      const blob = await api.generatePdfBatch([galleryId]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr_batch_${galleryId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert('Failed to download PDF');
    }
  };

  if (loading) return <div className="p-10 text-gray-500 font-medium">Loading your galleries...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">QR Card Batches</h1>
            <p className="text-gray-500 mt-2">Manage your generated codes and upload photos.</p>
          </div>
          <button
            onClick={handleCreateBatch}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Generate New Batch
          </button>
        </div>

        {/* Mock Stats Widget */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-2xl shadow-md text-white flex flex-col justify-center">
           <h3 className="text-indigo-100 font-medium mb-1">Total Sales Today</h3>
           <p className="text-4xl font-bold">$125.00</p>
           <p className="text-sm text-indigo-100 mt-3 flex items-center gap-1">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
             +12% from yesterday
           </p>
        </div>
      </div>

      <div className="space-y-6">
        {galleries.map(g => (
          <div key={g.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start md:items-center">

            {/* Gallery Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold font-mono tracking-widest text-gray-900">{g.short_code}</h2>
                <span className={`px-2.5 py-1 text-xs rounded-full font-bold uppercase tracking-wider ${g.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {g.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {new Date(g.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <button
                onClick={() => handleDownloadPdf(g.id)}
                className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-4 py-2 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div className="w-full md:w-96 flex-shrink-0">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group cursor-pointer relative h-32 flex flex-col items-center justify-center">
                 <input
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      const formData = new FormData();
                      Array.from(e.target.files).forEach(f => formData.append('files', f));
                      try {
                        // Mock progress UI state would go here in a real app
                        await api.uploadPhotos(g.id, formData);
                        alert('Photos uploaded and processing in background!');
                        // Simple mock progress update
                        e.target.parentElement?.classList.add("bg-green-50", "border-green-400");
                        const span = e.target.parentElement?.querySelector("span");
                        if(span) span.innerText = "Upload Complete!";
                      } catch(err) {
                        console.error(err);
                        alert('Upload failed');
                      }
                    }}
                  />
                <div className="text-gray-400 group-hover:text-indigo-600 transition-colors flex flex-col items-center">
                  <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-semibold">Drag & Drop Photos Here</span>
                  <span className="text-xs mt-1 font-medium opacity-75">or click to browse</span>
                </div>
              </div>
            </div>

          </div>
        ))}
        {galleries.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">No galleries found</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">Generate your first batch of QR cards to start shooting and uploading.</p>
            <button
               onClick={handleCreateBatch}
               className="mt-6 bg-indigo-50 text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
            >
               Generate Batch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
