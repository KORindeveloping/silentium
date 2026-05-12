const rawApiUrl = import.meta.env.VITE_API_URL || '';

if (import.meta.env.PROD && rawApiUrl.startsWith('http://')) {
  console.error('❌ SECURITY ALERT: Insecure HTTP backend detected on production. Mixed Content will be blocked.');
  throw new Error('Insecure API Configuration: Use HTTPS for production backend.');
}

// Global Protocol Shield: Automatically upgrade HTTP to HTTPS to prevent Mixed Content errors
export const API_BASE_URL = rawApiUrl.startsWith('http://') 
  ? rawApiUrl.replace('http://', 'https://') 
  : rawApiUrl;
if (import.meta.env.PROD) {
  console.log('Production API Base URL:', API_BASE_URL);
}
