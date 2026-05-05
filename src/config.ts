export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
if (import.meta.env.PROD) {
  console.log('Production API Base URL:', API_BASE_URL);
}
