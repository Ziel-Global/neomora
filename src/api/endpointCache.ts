const CACHE_KEY = 'ems_participant_api_cache';

interface ParticipantApiCache {
    blockedEndpoints: string[];
    invitationsEndpoint?: string;
    registrationsEndpoint?: string;
    profileEndpoint?: string;
    campaignsEndpoint?: string;
}

const readCache = (): ParticipantApiCache => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return { blockedEndpoints: [] };
        const parsed = JSON.parse(raw);
        return {
            blockedEndpoints: Array.isArray(parsed.blockedEndpoints) ? parsed.blockedEndpoints : [],
            invitationsEndpoint: parsed.invitationsEndpoint,
            registrationsEndpoint: parsed.registrationsEndpoint,
            profileEndpoint: parsed.profileEndpoint,
            campaignsEndpoint: parsed.campaignsEndpoint,
        };
    } catch {
        return { blockedEndpoints: [] };
    }
};

const writeCache = (cache: ParticipantApiCache) => {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

export const hasParticipantToken = (): boolean =>
    typeof window !== 'undefined' && !!localStorage.getItem('ems_participant_token');

export const isEndpointBlocked = (endpoint: string): boolean =>
    readCache().blockedEndpoints.includes(endpoint);

export const markEndpointBlocked = (endpoint: string, status?: number): void => {
    if (status && status !== 404 && status !== 403 && status !== 401) return;
    const cache = readCache();
    if (cache.blockedEndpoints.includes(endpoint)) return;
    cache.blockedEndpoints = [...cache.blockedEndpoints, endpoint];
    writeCache(cache);
};

export const getCachedEndpoint = (
    key: 'invitationsEndpoint' | 'registrationsEndpoint' | 'profileEndpoint' | 'campaignsEndpoint',
): string | undefined => readCache()[key];

export const setCachedEndpoint = (
    key: 'invitationsEndpoint' | 'registrationsEndpoint' | 'profileEndpoint' | 'campaignsEndpoint',
    endpoint: string,
): void => {
    const cache = readCache();
    cache[key] = endpoint;
    writeCache(cache);
};

export const orderEndpoints = (
    key: 'invitationsEndpoint' | 'registrationsEndpoint' | 'profileEndpoint' | 'campaignsEndpoint',
    endpoints: string[],
): string[] => {
    const blocked = new Set(readCache().blockedEndpoints);
    const filtered = endpoints.filter(endpoint => !blocked.has(endpoint));
    const cached = getCachedEndpoint(key);
    if (cached && filtered.includes(cached)) {
        return [cached, ...filtered.filter(endpoint => endpoint !== cached)];
    }
    return filtered;
};
