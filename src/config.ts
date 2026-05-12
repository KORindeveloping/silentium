const rawApiUrl = import.meta.env.VITE_API_URL || '';

// Force-upgrade HTTP to HTTPS — prevents Mixed Content blocking in production
export const API_BASE_URL = rawApiUrl.replace(/^http:\/\//i, 'https://');

if (import.meta.env.PROD) {
  if (rawApiUrl !== API_BASE_URL) {
    console.warn('⚠️ VITE_API_URL was HTTP — auto-upgraded to HTTPS:', API_BASE_URL);
  }
  console.log('API Base URL:', API_BASE_URL);
}
