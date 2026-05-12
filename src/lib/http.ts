export class HttpError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

const toSnippet = (text: string) =>
  text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    headers,
  });
  
  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();

  let parsed: unknown = null;
  if (raw) {
    if (contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new HttpError(`Invalid JSON response from server (${res.status}).`, res.status, raw);
      }
    } else {
      parsed = raw;
    }
  }

  if (res.status === 401) {
    // Optional: Auto-logout on 401
    // localStorage.removeItem('token');
    // localStorage.removeItem('user');
    // window.location.href = '/login';
  }

  if (!res.ok) {
    const messageFromJson =
      parsed && typeof parsed === 'object' && 'message' in parsed
        ? String((parsed as { message?: unknown }).message || '')
        : '';
    const messageFromText = typeof parsed === 'string' ? toSnippet(parsed) : '';
    const message =
      messageFromJson ||
      messageFromText ||
      `Request failed with status ${res.status}.`;
    throw new HttpError(message, res.status, parsed);
  }

  if (parsed === null) {
    return {} as T;
  }

  if (typeof parsed === 'string') {
    throw new HttpError('Expected JSON but received text from server.', res.status, parsed);
  }

  return parsed as T;
}
