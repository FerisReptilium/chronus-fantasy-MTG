/**
 * CHRONUS FANTASY RPG - CLIENTE SUPABASE & CAMADA DE DADOS
 * Gerencia autenticação, sincronização em nuvem e fallback inteligente para LocalStorage.
 */

class SupabaseService {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.currentProfile = null;
    this.init();
  }

  init() {
    const config = window.appConfig ? window.appConfig.config : {};
    if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
      try {
        this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        this.checkSession();
      } catch (e) {
        console.warn('Falha ao inicializar cliente Supabase:', e);
      }
    }
  }

  async checkSession() {
    if (!this.client) return null;
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error || !session) {
        this.currentUser = null;
        this.currentProfile = null;
        return null;
      }
      this.currentUser = session.user;
      await this.fetchProfile(this.currentUser.id);
      return this.currentUser;
    } catch (e) {
      console.warn('Erro ao verificar sessão Supabase:', e);
      return null;
    }
  }

  async fetchProfile(userId) {
    if (!this.client || !userId) return null;
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        this.currentProfile = data;
        return data;
      }
    } catch (e) {
      console.warn('Erro ao buscar perfil do usuário:', e);
    }
    return null;
  }

  async login(email, password) {
    if (!this.client) {
      // Login offline simulado para mestre ou convidado
      if (password === 'mestre' || email.toLowerCase().includes('mestre')) {
        this.currentProfile = { username: 'Mestre', role: 'gm', assigned_slot: null };
        return { user: { email }, profile: this.currentProfile };
      }
      return { user: { email }, profile: { username: email.split('@')[0], role: 'player', assigned_slot: 1 } };
    }

    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    this.currentUser = data.user;
    await this.fetchProfile(data.user.id);
    return { user: data.user, profile: this.currentProfile };
  }

  async register(email, password, username, role = 'player', assignedSlot = null) {
    if (!this.client) {
      this.currentProfile = { username, role, assigned_slot: assignedSlot };
      return { user: { email }, profile: this.currentProfile };
    }

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          display_name: username,
          role: role || 'player',
          assigned_slot: assignedSlot ? parseInt(assignedSlot, 10) : null
        }
      }
    });

    if (error) throw error;
    this.currentUser = data.user;
    if (data.user) {
      await this.fetchProfile(data.user.id);
    }
    return { user: data.user, profile: this.currentProfile };
  }

  async logout() {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.currentUser = null;
    this.currentProfile = null;
  }

  // Obter uma ficha específica (Slot 1 a 10)
  async getCharacter(slotId) {
    const slot = parseInt(slotId, 10);
    
    // Tenta obter do Supabase se online
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('characters')
          .select('*')
          .eq('slot_id', slot)
          .single();
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn(`Supabase offline ao buscar slot ${slot}:`, e);
      }
    }

    // Fallback: LocalStorage
    const localKey = `chronus_mtg_sheet_slot_${slot}_v10`;
    const legacyLocalKey = `chronus_sheet_slot_${slot}`;
    const localData = localStorage.getItem(localKey) || localStorage.getItem(legacyLocalKey);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {}
    }

    // Fallback 2: Buscar do JSON de seeds padrão
    return null;
  }

  // Obter todos os 10 slots
  async getAllCharacters() {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('characters')
          .select('*')
          .order('slot_id', { ascending: true });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn('Falha ao obter lista do Supabase:', e);
      }
    }

    // Fallback local: Carregar todos os 10 slots do LocalStorage
    const list = [];
    for (let i = 1; i <= 10; i++) {
      const localData = localStorage.getItem(`chronus_sheet_slot_${i}`);
      if (localData) {
        try {
          list.push(JSON.parse(localData));
        } catch (e) {}
      }
    }
    return list;
  }

  // Atualizar Ficha no Supabase e LocalStorage
  async updateCharacter(slotId, payload) {
    const slot = parseInt(slotId, 10);
    
    // Sempre salva no LocalStorage imediatamente
    localStorage.setItem(`chronus_mtg_sheet_slot_${slot}_v10`, JSON.stringify(payload));
    // Mantém compatibilidade com versões anteriores do portal.
    localStorage.setItem(`chronus_sheet_slot_${slot}`, JSON.stringify(payload));

    if (!this.client) return { success: true, offline: true };

    try {
      // Extrai a URL limpa do retrato (remove wrapper url("...") do CSS backgroundImage)
      let avatarUrl = payload.portrait || payload.avatar_url || '';
      if (avatarUrl) {
        const match = avatarUrl.match(/url\(["']?(.*?)["']?\)/s);
        if (match) avatarUrl = match[1];
      }

      const updateData = {
        slot_id: slot,
        name: payload.inputs?.name || payload.name || `Personagem ${slot}`,
        player_name: payload.inputs?.player || payload.player_name || `Jogador ${slot}`,
        concept: payload.inputs?.concept || payload.concept || '',
        race: payload.inputs?.race || payload.race || '',
        mana_color: payload.inputs?.manacolor || payload.mana_color || 'Incolor',
        theme: payload.theme || 'black',
        level: window.GameEngine ? window.GameEngine.calcularNivel(payload.inputs?.xpCurrent || 0) : 1,
        xp: parseInt(payload.inputs?.xpCurrent, 10) || 0,
        max_hp: parseInt(payload.max_hp, 10) || 10,
        current_wounds: parseInt(payload.current_wounds, 10) || 0,
        current_mana: parseInt(payload.inputs?.manaCurrent, 10) || 0,
        max_mana: parseInt(payload.inputs?.manaMax, 10) || 10,
        avatar_url: avatarUrl,
        sheet_data: payload,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('characters')
        .upsert(updateData, { onConflict: 'slot_id' });

      if (error) throw error;
      return { success: true, offline: false, data };
    } catch (e) {
      console.error('Erro ao sincronizar com Supabase:', e);
      return { success: false, offline: true, error: e };
    }
  }

  // Registrar rolagem no feed do VTT
  async insertDiceLog(slotId, characterName, playerName, actionTitle, dicePool, rollResult, breakdown, isGmRoll = false, isSecret = false) {
    if (!this.client) return;
    try {
      await this.client.from('dice_logs').insert({
        slot_id: slotId ? parseInt(slotId, 10) : null,
        character_name: characterName || 'Anônimo',
        player_name: playerName || '',
        action_title: actionTitle,
        dice_pool: dicePool,
        roll_result: String(rollResult),
        breakdown: breakdown,
        is_gm_roll: isGmRoll,
        is_secret: isSecret
      });
    } catch (e) {
      console.warn('Erro ao inserir log de dados:', e);
    }
  }

  // Subscrever canais em tempo real
  subscribeRealtime(onCharacterChange, onDiceLog) {
    if (!this.client) return null;
    
    const channel = this.client.channel('chronus_vtt_realtime');
    
    if (onCharacterChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, (payload) => {
        onCharacterChange(payload);
      });
    }

    if (onDiceLog) {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_logs' }, (payload) => {
        onDiceLog(payload.new);
      });
    }

    channel.subscribe();
    return channel;
  }
}

window.supabaseService = new SupabaseService();
