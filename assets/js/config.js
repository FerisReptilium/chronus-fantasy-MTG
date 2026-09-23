/**
 * CHRONUS FANTASY RPG - CONFIGURAÇÃO DO PORTAL
 * Gerencia as credenciais do Supabase e o modo de operação (Online / Offline).
 */

const CONFIG_STORAGE_KEY = 'chronus_supabase_config_v1';

const DEFAULT_CONFIG = {
  supabaseUrl: 'https://drsdohivbrmlmvrgklol.supabase.co',
  supabaseAnonKey: 'sb_publishable_Y9FfzMibUT5KsM13z9DM_A_YBOGBd2Z',
  isConfigured: true,
  offlineMode: false,
  autoSyncDelay: 1500,  // Debounce para auto-salvamento em ms
  soundEnabled: true
};

class AppConfig {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...this.config, ...parsed };
      }
      // Verifica se as credenciais mínimas foram preenchidas
      this.config.isConfigured = !!(this.config.supabaseUrl && this.config.supabaseAnonKey);
      this.config.offlineMode = !this.config.isConfigured;
    } catch (e) {
      console.warn('Erro ao carregar configurações locais:', e);
    }
  }

  saveConfig(url, key) {
    this.config.supabaseUrl = (url || '').trim();
    this.config.supabaseAnonKey = (key || '').trim();
    this.config.isConfigured = !!(this.config.supabaseUrl && this.config.supabaseAnonKey);
    this.config.offlineMode = !this.config.isConfigured;

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      supabaseUrl: this.config.supabaseUrl,
      supabaseAnonKey: this.config.supabaseAnonKey,
      soundEnabled: this.config.soundEnabled
    }));
  }

  toggleSound(enabled) {
    this.config.soundEnabled = enabled !== undefined ? enabled : !this.config.soundEnabled;
    this.saveConfig(this.config.supabaseUrl, this.config.supabaseAnonKey);
  }

  get isOnline() {
    return this.config.isConfigured && !this.config.offlineMode;
  }
}

window.appConfig = new AppConfig();
