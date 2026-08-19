const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Standard fetch wrapper with credentials included for httpOnly cookie management.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures httpOnly session cookies are transmitted
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  auth: {
    signup: (payload) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    getMe: () => request('/api/auth/me', { method: 'GET' }),
    updateProfile: (payload) => request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    deleteAccount: () => request('/api/auth/account', { method: 'DELETE' }),
  },
  users: {
    search: (query = '') => request(`/api/users/search?q=${encodeURIComponent(query)}`),
  },
  rooms: {
    list: (search = '') => request(`/api/rooms${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getAll: (search = '') => request(`/api/rooms${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getById: (roomId) => request(`/api/rooms/${roomId}`),
    create: (payload) => request('/api/rooms', { method: 'POST', body: JSON.stringify(payload) }),
    createDM: (targetUserId) => request('/api/users/dm', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
    update: (roomId, payload) => request(`/api/rooms/${roomId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    createSubchannel: (roomId, payload) => request(`/api/rooms/${roomId}/subchannels`, { method: 'POST', body: JSON.stringify(payload) }),
    delete: (roomId) => request(`/api/rooms/${roomId}`, { method: 'DELETE' }),
    join: (roomId) => request(`/api/rooms/${roomId}/join`, { method: 'POST' }),
    leave: (roomId) => request(`/api/rooms/${roomId}/leave`, { method: 'POST' }),
    kickMember: (roomId, targetUserId) => request(`/api/rooms/${roomId}/members/${targetUserId}`, { method: 'DELETE' }),
    updateMemberRole: (roomId, targetUserId, role) =>
      request(`/api/rooms/${roomId}/members/${targetUserId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
  },
  messages: {
    get: (roomId, cursor = null, limit = 50) => {
      let query = `?limit=${limit}`;
      if (cursor) query += `&cursor=${encodeURIComponent(cursor)}`;
      return request(`/api/rooms/${roomId}/messages${query}`);
    },
    sendFallback: (roomId, content) =>
      request(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    sync: (roomId, lastMessageId) =>
      request(`/api/rooms/${roomId}/sync?lastMessageId=${encodeURIComponent(lastMessageId)}`),
  },
};
