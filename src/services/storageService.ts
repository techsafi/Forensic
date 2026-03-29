
export interface UserProfile {
  name: string;
  email: string;
  bio: string;
  avatarUrl: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoOrganize: boolean;
  defaultModel: string;
  customApiKey?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  input: string;
  output: string;
  score: number;
  readingLevel?: string;
}

const STORAGE_KEYS = {
  PROFILE: 'invisify_profile',
  SETTINGS: 'invisify_settings',
  HISTORY: 'invisify_history',
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Anonymous User',
  email: 'user@example.com',
  bio: 'A writer who values human-like expression.',
  avatarUrl: 'https://picsum.photos/seed/user/200/200',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  autoOrganize: true,
  defaultModel: 'gemini-3-flash-preview',
  customApiKey: '',
};

export const storageService = {
  getProfile: (): UserProfile => {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return data ? JSON.parse(data) : DEFAULT_PROFILE;
  },
  
  saveProfile: (profile: UserProfile): void => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },
  
  getSettings: (): AppSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },
  
  saveSettings: (settings: AppSettings): void => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
  
  getHistory: (): HistoryItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },
  
  saveHistory: (history: HistoryItem[]): void => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },
  
  addHistoryItem: (item: HistoryItem): void => {
    const history = storageService.getHistory();
    storageService.saveHistory([item, ...history].slice(0, 50)); // Keep last 50
  },
  
  clearHistory: (): void => {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }
};
