// All HTTP requests live here so screens do not need to know fetch details.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';

export async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request failed');
  return data;
}

export const post = (path, token, body = {}) => request(path, token, {
  method: 'POST', body: JSON.stringify(body),
});
