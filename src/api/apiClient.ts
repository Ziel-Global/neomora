import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token based on the portal context
apiClient.interceptors.request.use((config) => {
  const path = window.location.pathname;
  const isManager = path.startsWith('/manager');
  const isParticipant = path.startsWith('/portal') || path.startsWith('/participant') || path.startsWith('/register');
  const isSubadmin = path.startsWith('/subadmin');

  let token = null;
  if (isManager) {
    token = localStorage.getItem('ems_manager_token');
  } else if (isParticipant) {
    token = localStorage.getItem('ems_participant_token');
  } else if (isSubadmin) {
    token = localStorage.getItem('ems_token');
  }

  // Fallback to any available token if the specific one is missing
  if (!token) {
    token = localStorage.getItem('ems_token') ||
      localStorage.getItem('ems_manager_token') ||
      localStorage.getItem('ems_participant_token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isManager = path.startsWith('/manager');
      const isParticipant = path.startsWith('/portal') || path.startsWith('/participant') || path.startsWith('/register');
      const isSubadmin = path.startsWith('/subadmin');
      const isAdmin = path.startsWith('/admin') || path.startsWith('/login/admin');

      if (isManager) {
        localStorage.removeItem('ems_manager_token');
        localStorage.removeItem('ems_manager_session');
        if (!path.startsWith('/login')) {
          window.location.href = '/login/manager';
        }
      } else if (isParticipant) {
        localStorage.removeItem('ems_participant_token');
        localStorage.removeItem('ems_participant_session');
        if (!path.startsWith('/login')) {
          window.location.href = '/login/participant';
        }
      } else if (isSubadmin) {
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_user');
        if (!path.startsWith('/login')) {
          window.location.href = '/login/staff';
        }
      } else if (isAdmin) {
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_user');
        if (!path.startsWith('/login')) {
          window.location.href = '/login/admin';
        }
      } else {
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_user');
        localStorage.removeItem('ems_manager_token');
        localStorage.removeItem('ems_manager_session');
        localStorage.removeItem('ems_participant_token');
        localStorage.removeItem('ems_participant_session');

        if (!path.startsWith('/login')) {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
