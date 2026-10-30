// Thin client for the CloudLearn API. Same-origin: the httpOnly session cookie is sent automatically.
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) { super(message); this.status = status; this.data = data; }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

async function request<T = any>(method: string, path: string, body?: unknown, opts: { quiet401?: boolean } = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!res.ok) {
    if (res.status === 401 && !opts.quiet401 && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status})`, data);
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string, opts?: { quiet401?: boolean }) => request<T>('GET', p, undefined, opts),
  post: <T = any>(p: string, b: unknown = {}, opts?: { quiet401?: boolean }) => request<T>('POST', p, b, opts),
  put: <T = any>(p: string, b: unknown) => request<T>('PUT', p, b),
  patch: <T = any>(p: string, b: unknown) => request<T>('PATCH', p, b),
  del: <T = any>(p: string) => request<T>('DELETE', p),
  upload: <T = any>(p: string, file: File, fields: Record<string, string> = {}) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    fd.append('file', file);
    return request<T>('POST', p, fd);
  },
};

export const errorMessage = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Something went wrong');
