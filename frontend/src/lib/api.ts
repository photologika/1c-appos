export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch (e) {
      // no-op
    }
    throw new Error(errorData?.detail || `API error: ${response.status}`);
  }

  // Handle blob responses specifically for PDF generation
  if (options.headers && (options.headers as Record<string, string>)['Accept'] === 'application/pdf') {
     return response.blob();
  }

  return response.json();
}

export const api = {
  register: (data: any) => fetchAPI('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  login: (data: any) => {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);

    return fetchAPI('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
  },

  getGalleries: () => fetchAPI('/galleries/', {
    method: 'GET',
  }),
  createGalleryBatch: (count: number = 1) => fetchAPI('/galleries/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count })
  }),
  getPublicGalleryByCode: (code: string) => fetchAPI(`/galleries/public/${code}`, {
    method: 'GET',
  }),
  generatePdfBatch: (galleryIds: string[]) => fetchAPI(`/galleries/batch-print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/pdf'
    },
    body: JSON.stringify({ gallery_ids: galleryIds })
  }),

  uploadPhotos: (galleryId: string, formData: FormData) => fetchAPI(`/photos/${galleryId}/upload`, {
    method: 'POST',
    // Do not set Content-Type header when sending FormData; browser will do it automatically
    body: formData,
  }),
};
