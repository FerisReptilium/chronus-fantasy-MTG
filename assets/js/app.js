/**
 * CHRONUS FANTASY RPG - CONTROLADOR DO HUB PRINCIPAL (APP.JS)
 * Gerencia o grid dos 10 slots de fichas, modais de login, configurações do Supabase e importação.
 */

class PortalHub {
  constructor() {
    this.slotsContainer = document.getElementById('slotsGrid');
    this.init();
  }

  async init() {
    this.renderHeaderAuth();
    await this.loadAllSlots();
    this.setupModals();
  }

  renderHeaderAuth() {
    const userContainer = document.getElementById('userNavContainer');
    if (!userContainer) return;
    const profile = window.supabaseService ? window.supabaseService.currentProfile : null;
    const user = window.supabaseService ? window.supabaseService.currentUser : null;

    if (profile || user) {
      const name = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'Usuário';
      const roleLabel = profile?.role === 'gm' || profile?.role === 'admin' ? '👑 Mestre' : '⚔️ Jogador';
      userContainer.innerHTML = `
        <span style="font-size:0.8rem; color:var(--mtg-gold-light); font-family:var(--font-sub); font-weight:bold;">${roleLabel}: ${name}</span>
        <button class="action-btn action-btn-secondary" onclick="portalHub.handleLogout()" style="padding:6px 14px; font-size:0.7rem;">Sair</button>
      `;
    } else {
      userContainer.innerHTML = `
        <button class="action-btn" onclick="portalHub.openModal('loginModal')" style="padding:6px 14px; font-size:0.75rem;">🔑 Entrar / Cadastrar</button>
      `;
    }
  }

  async loadAllSlots() {
    if (!this.slotsContainer) return;
    this.slotsContainer.innerHTML = '<div style="color:var(--mtg-gold-light); text-align:center; grid-column:1/-1; padding:30px;">Carregando os 10 slots de personagens...</div>';

    let defaultSeeds = [];
    try {
      const res = await fetch('data/defaultSheets.json');
      if (res.ok) defaultSeeds = (await res.json()).sheets || [];
    } catch (e) { console.warn('Erro ao carregar seeds:', e); }

    const cloudCharacters = window.supabaseService ? await window.supabaseService.getAllCharacters() : [];
    this.slotsContainer.innerHTML = '';

    for (let slot = 1; slot <= 10; slot++) {
      let charData = cloudCharacters.find(c => c.slot_id === slot);
      if (!charData) {
        const local = localStorage.getItem(`chronus_sheet_slot_${slot}`);
        if (local) { try { charData = JSON.parse(local); } catch (e) {} }
      }
      if (!charData && defaultSeeds[slot - 1]) charData = defaultSeeds[slot - 1];
      this.slotsContainer.appendChild(this.createSlotCard(slot, charData));
    }
  }

  createSlotCard(slotId, charData) {
    const data = charData?.sheet_data || charData || {};
    const inputs = data.inputs || {};
    const name = inputs.name || charData?.name || `Slot ${slotId} - Vazio`;
    const player = inputs.player || charData?.player_name || `Jogador ${slotId}`;
    const concept = inputs.concept || charData?.concept || 'Sem conceito definido';
    const manaColor = inputs.manacolor || charData?.mana_color || 'Incolor';
    const theme = data.theme ? data.theme.replace('mtg-card ', '').replace('theme-', '') : 'black';
    const xp = inputs.xpCurrent || charData?.xp || 0;
    const level = window.GameEngine ? window.GameEngine.calcularNivel(xp) : 1;
    const currentMana = inputs.manaCurrent || charData?.current_mana || 0;
    const maxMana = inputs.manaMax || charData?.max_mana || 10;

    let portraitRaw = data.portrait || charData?.avatar_url || '';
    let portraitSrc = '';
    if (portraitRaw) {
      const match = portraitRaw.match(/url\(["']?(.*?)["']?\)/s);
      portraitSrc = match ? match[1] : portraitRaw;
    }

    const placeholderSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="60" height="75" style="opacity:0.18"><ellipse cx="40" cy="28" rx="18" ry="20" fill="#d4af37"/><path d="M10 100 Q10 65 40 60 Q70 65 70 100Z" fill="#d4af37"/></svg>`;
    const cardDiv = document.createElement('div');
    cardDiv.className = `slot-card theme-${theme}`;

    cardDiv.innerHTML = `
      <div class="slot-badge-number">Slot #${slotId}</div>
      <div class="slot-card-inner">
        <div class="slot-portrait-thumb" style="${portraitSrc ? `background-image:url('${portraitSrc}');` : 'display:flex;align-items:center;justify-content:center;'}">
          ${!portraitSrc ? placeholderSVG : ''}
          <div style="background:rgba(0,0,0,0.72);padding:5px 9px;border-radius:5px;width:100%;position:absolute;bottom:0;left:0;">
            <div class="slot-char-name">${name}</div><div class="slot-char-concept">${concept}</div>
          </div>
        </div>
        <div style="font-size:0.75rem;color:var(--card-text-muted);display:flex;justify-content:space-between;"><span>👤 ${player}</span><span style="color:var(--mtg-gold-light);font-weight:bold;">${manaColor}</span></div>
        <div class="slot-char-stats"><span>Nv. <strong style="color:var(--mtg-gold-light);">${level}</strong></span><span>Mana: <strong style="color:#38bdf8;">${currentMana}/${maxMana}</strong></span><span>XP: <strong style="color:var(--mtg-gold-mid);">${xp}</strong></span></div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <a href="ficha.html?slot=${slotId}" class="action-btn" style="flex:1;justify-content:center;padding:7px 10px;font-size:0.72rem;">📜 Abrir Ficha</a>
          <button class="action-btn action-btn-secondary" onclick="portalHub.openPasteModal(${slotId})" title="Colar / Injetar Código da Ficha" style="padding:7px 10px;font-size:0.72rem;">⚙️ Código</button>
        </div>
      </div>`;
    return cardDiv;
  }

  openModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.classList.add('active'); }
  closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.classList.remove('active'); }

  setupModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); }));
    if (window.appConfig) {
      const urlInput = document.getElementById('supaUrlInput');
      const keyInput = document.getElementById('supaKeyInput');
      if (urlInput) urlInput.value = window.appConfig.config.supabaseUrl || '';
      if (keyInput) keyInput.value = window.appConfig.config.supabaseAnonKey || '';
    }
  }

  saveSupabaseSettings() {
    const url = document.getElementById('supaUrlInput')?.value || '';
    const key = document.getElementById('supaKeyInput')?.value || '';
    if (window.appConfig) window.appConfig.saveConfig(url, key);
    this.closeModal('configModal');
    if (window.showSimpleToast) window.showSimpleToast('Configurações salvas! Recarregando conexão...');
    setTimeout(() => window.location.reload(), 800);
  }

  openPasteModal(slotId) {
    const profile = window.supabaseService?.currentProfile;
    const canEdit = !window.supabaseService?.client || profile?.role === 'gm' || profile?.role === 'admin' || profile?.assigned_slot === slotId;
    if (!canEdit) {
      alert('Este slot está protegido. Entre na conta atribuída a esta ficha ou use a conta do Mestre.');
      return;
    }

    this.activeSlotToPaste = slotId;
    const slotTitle = document.getElementById('pasteModalSlotTitle');
    const textarea = document.getElementById('pasteCodeTextarea');
    if (slotTitle) slotTitle.innerText = `Injetar Código no Slot #${slotId}`;
    const current = localStorage.getItem(`chronus_sheet_slot_${slotId}`);
    if (textarea) textarea.value = current || '';
    this.openModal('pasteCodeModal');
  }

  async savePastedCode() {
    const textarea = document.getElementById('pasteCodeTextarea');
    const code = textarea?.value?.trim();
    if (!code) { alert('Cole o JSON ou objeto da ficha no campo de texto.'); return; }

    try {
      const parsed = JSON.parse(code);
      const slot = this.activeSlotToPaste;
      const result = window.supabaseService
        ? await window.supabaseService.updateCharacter(slot, parsed)
        : { success: false };

      if (!result.success) {
        throw result.error || new Error('A nuvem recusou a alteração. Verifique se sua conta possui este slot.');
      }

      this.closeModal('pasteCodeModal');
      if (window.showSimpleToast) window.showSimpleToast(`Slot #${slot} atualizado com sucesso!`);
      await this.loadAllSlots();
    } catch (e) {
      alert('Não foi possível salvar: ' + (e.message || 'JSON inválido ou acesso negado.'));
    }
  }

  async handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const pass = document.getElementById('loginPass')?.value;
    if (!email || !pass) { alert('Preencha e-mail e senha.'); return; }

    try {
      if (window.supabaseService) {
        await window.supabaseService.login(email, pass);
        this.closeModal('loginModal');
        this.renderHeaderAuth();
        if (window.showSimpleToast) window.showSimpleToast('Login realizado com sucesso!');
        await this.loadAllSlots();
      }
    } catch (e) { alert('Erro no login: ' + (e.message || 'Verifique suas credenciais.')); }
  }

  async handleRegister() {
    const email = document.getElementById('loginEmail')?.value;
    const pass = document.getElementById('loginPass')?.value;
    const user = document.getElementById('loginUsername')?.value || email?.split('@')[0];

    if (!email || !pass) { alert('Preencha e-mail e senha para se cadastrar.'); return; }

    try {
      if (window.supabaseService) {
        await window.supabaseService.register(email, pass, user);
        this.closeModal('loginModal');
        this.renderHeaderAuth();
        if (window.showSimpleToast) window.showSimpleToast('Cadastro realizado! O Mestre poderá atribuir seu slot.');
        await this.loadAllSlots();
      }
    } catch (e) { alert('Erro no cadastro: ' + (e.message || 'Erro ao registrar usuário.')); }
  }

  async handleLogout() {
    if (window.supabaseService) {
      await window.supabaseService.logout();
      this.renderHeaderAuth();
      if (window.showSimpleToast) window.showSimpleToast('Você saiu da sua conta.');
    }
  }

  async exportAllSheets() {
    const backup = { version: '1.0', exported_at: new Date().toISOString(), sheets: [] };
    for (let slot = 1; slot <= 10; slot++) {
      let char = window.supabaseService ? await window.supabaseService.getCharacter(slot) : null;
      if (!char) {
        const local = localStorage.getItem(`chronus_sheet_slot_${slot}`);
        if (local) { try { char = JSON.parse(local); } catch (e) {} }
      }
      backup.sheets.push({ slot_id: slot, data: char || {} });
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `Chronus_Backup_10_Fichas_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    if (window.showSimpleToast) window.showSimpleToast('Backup das 10 fichas exportado!');
  }
}

window.addEventListener('DOMContentLoaded', () => { window.portalHub = new PortalHub(); });
