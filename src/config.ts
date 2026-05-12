const rawApiUrl = import.meta.env.VITE_API_URL || '';
// Global Protocol Shield: Automatically upgrade HTTP to HTTPS to prevent Mixed Content errors
export const API_BASE_URL = rawApiUrl.startsWith('http://') 
  ? rawApiUrl.replace('http://', 'https://') 
  : rawApiUrl;
if (import.meta.env.PROD) {
  console.log('Production API Base URL:', API_BASE_URL);
}
