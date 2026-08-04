import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface PortalContext {
  tokenKey: string;
  refreshTokenKey: string;
  sessionKeys: string[];
  loginPath: string;
}

const getPortalContext = (path: string): PortalContext | null => {
  if (path.startsWith('/manager')) {
    return {
      tokenKey: 'ems_manager_token',
      refreshTokenKey: 'ems_manager_refresh_token',
      sessionKeys: ['ems_manager_session'],
      loginPath: '/login/manager',
    };
  }
  if (path.startsWith('/portal') || path.startsWith('/participant') || path.startsWith('/register')) {
    return {
      tokenKey: 'ems_participant_token',
      refreshTokenKey: 'ems_participant_refresh_token',
      sessionKeys: ['ems_participant_session'],
      loginPath: '/login/participant',
    };
  }
  if (path.startsWith('/subadmin')) {
    return {
      tokenKey: 'ems_token',
      refreshTokenKey: 'ems_refresh_token',
      sessionKeys: ['ems_user'],
      loginPath: '/login/staff',
    };
  }
  if (path.startsWith('/admin') || path.startsWith('/login/admin')) {
    return {
      tokenKey: 'ems_token',
      refreshTokenKey: 'ems_refresh_token',
      sessionKeys: ['ems_user'],
      loginPath: '/login/admin',
    };
  }
  return null;
};

const clearAllAuthStorage = () => {
  localStorage.removeItem('ems_token');
  localStorage.removeItem('ems_user');
  localStorage.removeItem('ems_refresh_token');
  localStorage.removeItem('ems_manager_token');
  localStorage.removeItem('ems_manager_session');
  localStorage.removeItem('ems_manager_refresh_token');
  localStorage.removeItem('ems_participant_token');
  localStorage.removeItem('ems_participant_session');
  localStorage.removeItem('ems_participant_refresh_token');
};

const clearAndRedirect = (context: PortalContext | null, path: string) => {
  if (context) {
    localStorage.removeItem(context.tokenKey);
    localStorage.removeItem(context.refreshTokenKey);
    context.sessionKeys.forEach((key) => localStorage.removeItem(key));
    if (!path.startsWith('/login')) {
      window.location.href = context.loginPath;
    }
  } else {
    clearAllAuthStorage();
    if (!path.startsWith('/login')) {
      window.location.href = '/';
    }
  }
};

// Request interceptor: attach Bearer token based on the portal context
apiClient.interceptors.request.use((config) => {
  const path = window.location.pathname;
  const context = getPortalContext(path);

  let token = context ? localStorage.getItem(context.tokenKey) : null;

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

// Silent token refresh: a single in-flight refresh call is shared by every
// request that hits a 401 at the same time, so concurrent requests don't
// each fire their own /auth/refresh call.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (context: PortalContext): Promise<string> => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem(context.refreshTokenKey);
    if (!refreshToken) {
      refreshPromise = Promise.reject(new Error('No refresh token available'));
    } else {
      refreshPromise = axios
        .post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, { refreshToken })
        .then(({ data }) => {
          localStorage.setItem(context.tokenKey, data.token);
          localStorage.setItem(context.refreshTokenKey, data.refreshToken);
          return data.token as string;
        });
    }
    refreshPromise.finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// Response interceptor: handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const path = window.location.pathname;
    const context = getPortalContext(path);

    if (error.response?.status === 401 && context && !path.startsWith('/login') && !originalRequest?._retriedAfterRefresh) {
      const hasRefreshToken = !!localStorage.getItem(context.refreshTokenKey);

      if (hasRefreshToken) {
        try {
          const newToken = await refreshAccessToken(context);
          originalRequest._retriedAfterRefresh = true;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch {
          clearAndRedirect(context, path);
          return Promise.reject(error);
        }
      }

      clearAndRedirect(context, path);
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      clearAndRedirect(context, path);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
