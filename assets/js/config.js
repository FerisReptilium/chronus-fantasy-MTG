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
  autoSyncDelay: 1500,
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

        // Só aceita credenciais locais quando ambas são válidas.
        // Assim, uma configuração vazia/antiga não desativa o Supabase padrão.
        const savedUrl = typeof parsed.supabaseUrl === 'string' ? parsed.supabaseUrl.trim() : '';
        const savedKey = typeof parsed.supabaseAnonKey === 'string' ? parsed.supabaseAnonKey.trim() : '';

        if (savedUrl && savedKey) {
          this.config.supabaseUrl = savedUrl;
          this.config.supabaseAnonKey = savedKey;
        }

        if (typeof parsed.soundEnabled === 'boolean') {
          this.config.soundEnabled = parsed.soundEnabled;
        }

        if (Number.isFinite(parsed.autoSyncDelay)) {
          this.config.autoSyncDelay = parsed.autoSyncDelay;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações locais:', e);
    }

    this.config.isConfigured = Boolean(
      this.config.supabaseUrl &&
      this.config.supabaseAnonKey
    );
    this.config.offlineMode = !this.config.isConfigured;
  }

  saveConfig(url, key) {
    const nextUrl = (url || '').trim();
    const nextKey = (key || '').trim();

    // Se o usuário deixar os campos vazios, mantém a configuração padrão
    // em vez de gravar uma configuração inválida.
    if (!nextUrl || !nextKey) {
      this.config = {
        ...this.config,
        ...DEFAULT_CONFIG,
        soundEnabled: this.config.soundEnabled
      };
    } else {
      this.config.supabaseUrl = nextUrl;
      this.config.supabaseAnonKey = nextKey;
      this.config.isConfigured = true;
      this.config.offlineMode = false;
    }

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      supabaseUrl: this.config.supabaseUrl,
      supabaseAnonKey: this.config.supabaseAnonKey,
      soundEnabled: this.config.soundEnabled,
      autoSyncDelay: this.config.autoSyncDelay
    }));
  }

  resetConfig() {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    this.config = { ...DEFAULT_CONFIG };
  }

  toggleSound(enabled) {
    this.config.soundEnabled = enabled !== undefined
      ? enabled
      : !this.config.soundEnabled;

    this.saveConfig(this.config.supabaseUrl, this.config.supabaseAnonKey);
  }

  get isOnline() {
    return this.config.isConfigured && !this.config.offlineMode;
  }
}

window.appConfig = new AppConfig();
