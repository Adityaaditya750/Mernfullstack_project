const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000/api';

const getErrorMessage = (data) => {
  const message = typeof data === 'object' && data?.message
    ? data.message
    : 'The request could not be completed.';

  if (typeof message !== 'string') return 'The request could not be completed.';

  try {
    const parsed = JSON.parse(message);
    if (
      parsed?.error?.status === 'UNAUTHENTICATED'
      || Number(parsed?.error?.code) === 401
    ) {
      return 'Gemini rejected the server credentials. Set a valid Gemini API key as GEMINI_API_KEY in server/.env, then restart the backend.';
    }
    return parsed?.error?.message || parsed?.message || message;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return message;
  }
};

export const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Unable to connect to the server. Check your connection and try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('quizarena:unauthorized'));
    }
    throw new Error(getErrorMessage(data));
  }

  return data;
};

export const jsonBody = (value) => JSON.stringify(value);
