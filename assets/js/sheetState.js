/**
 * CHRONUS FANTASY RPG - GERENCIADOR DE ESTADO DA FICHA (SHEET STATE)
 * Orquestra leitura, escrita, debounced auto-save, sincronização híbrida e import/export.
 */

class SheetStateManager {
  constructor() {
    this.currentSlot = this.getSlotFromUrl();
    this.saveTimeout = null;
    this.isDirty = false;
    this.initialLoading = true;
  }

  getSlotFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const slot = parseInt(params.get('slot'), 10);
    return (slot >= 1 && slot <= 10) ? slot : 1;
  }

  setSlot(slot) {
    const s = parseInt(slot, 10);
    if (s >= 1 && s <= 10) {
      window.location.href = `ficha.html?slot=${s}`;
    }
  }

  updateSyncBadge(status) {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    if (!dot || !text) return;

    dot.className = 'sync-dot';
    if (status === 'saving') {
      dot.classList.add('saving');
      text.innerText = 'Salvando...';
    } else if (status === 'synced') {
      text.innerText = window.supabaseService && window.supabaseService.client ? 'Nuvem Conectada' : 'Salvo Localmente';
    } else if (status === 'offline') {
      dot.classList.add('offline');
      text.innerText = 'Modo Offline';
    }
  }

  // Coleta todo o estado atual da interface
  collectState() {
    const card = document.getElementById('card');
    const portraitBox = document.getElementById('portraitBox');
    
    const state = {
      slot_id: this.currentSlot,
      theme: card ? card.className : 'mtg-card theme-black',
      portrait: portraitBox ? portraitBox.style.backgroundImage : '',
      inputs: {},
      selects: {},
      rhombuses: [],
      radioIlum: null,
      wounds: [],
      manaChecks: {},
      notes: {},
      updated_at: new Date().toISOString()
    };

    // Inputs e Textareas
    document.querySelectorAll('input[data-id], textarea[data-id]').forEach(el => {
      state.inputs[el.dataset.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    // Selects de Atributos
    document.querySelectorAll('select[data-attr]').forEach(el => {
      state.selects[el.dataset.attr] = el.value;
    });

    // Rombos de Determinação
    document.querySelectorAll('.rhombus').forEach((el, idx) => {
      state.rhombuses[idx] = el.classList.contains('active');
    });

    // Rádio de Iluminação
    const selectedRadio = document.querySelector('input[name="ilum"]:checked');
    if (selectedRadio) state.radioIlum = selectedRadio.value;

    // Feridas
    document.querySelectorAll('.wound-box').forEach((el, idx) => {
      state.wounds[idx] = { text: el.innerText, color: el.style.color || '#ef4444' };
    });

    // Checkboxes de Cores de Mana
    document.querySelectorAll('#manaTable input[type="checkbox"]').forEach(el => {
      state.manaChecks[el.dataset.mana] = el.checked;
    });

    return state;
  }

  // Aplica os dados carregados na interface
  applyState(state) {
    if (!state) return;

    // Tema
    if (state.theme) {
      const card = document.getElementById('card');
      if (card) card.className = state.theme;
    }

    // Retângulo de Arte
    if (state.portrait) {
      const pBox = document.getElementById('portraitBox');
      if (pBox) pBox.style.backgroundImage = state.portrait;
    }

    // Inputs e Textareas
    if (state.inputs) {
      for (const [id, val] of Object.entries(state.inputs)) {
        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) {
          if (el.type === 'checkbox') el.checked = Boolean(val);
          else el.value = (val !== null && val !== undefined) ? val : '';
        }
      }
    }

    // Selects de Atributos
    if (state.selects) {
      for (const [attr, val] of Object.entries(state.selects)) {
        const el = document.querySelector(`select[data-attr="${attr}"]`);
        if (el) el.value = val;
      }
    }

    // Rombos de Determinação
    if (state.rhombuses && Array.isArray(state.rhombuses)) {
      document.querySelectorAll('.rhombus').forEach((el, idx) => {
        if (state.rhombuses[idx]) el.classList.add('active');
        else el.classList.remove('active');
      });
    }

    // Iluminação
    if (state.radioIlum) {
      const radio = document.querySelector(`input[name="ilum"][value="${state.radioIlum}"]`);
      if (radio) radio.checked = true;
    }

    // Feridas
    if (state.wounds && Array.isArray(state.wounds)) {
      document.querySelectorAll('.wound-box').forEach((el, idx) => {
        if (state.wounds[idx]) {
          el.innerText = state.wounds[idx].text || '';
          el.style.color = state.wounds[idx].color || '#ef4444';
        }
      });
    }

    // Checkboxes de Mana
    if (state.manaChecks) {
      for (const [key, val] of Object.entries(state.manaChecks)) {
        const chk = document.querySelector(`input[data-mana="${key}"]`);
        if (chk) chk.checked = Boolean(val);
      }
    }

    // Recalcula XP e Condições de Dano
    if (window.processXP) window.processXP();
    if (window.atualizarCondicoesDano) window.atualizarCondicoesDano();
  }

  // Carrega estado (Supabase -> LocalStorage -> Seed JSON)
  async loadCurrentSlot() {
    this.updateSyncBadge('saving');
    
    let loadedData = null;

    // 1. Tenta buscar da nuvem / local pelo SupabaseService
    if (window.supabaseService) {
      const char = await window.supabaseService.getCharacter(this.currentSlot);
      if (char) {
        loadedData = char.sheet_data || char;
      }
    }

    // 2. Se não encontrar, tenta obter do arquivo defaultSheets.json
    if (!loadedData) {
      try {
        const res = await fetch('data/defaultSheets.json');
        if (res.ok) {
          const defaultData = await res.json();
          if (defaultData.sheets && defaultData.sheets[this.currentSlot - 1]) {
            loadedData = defaultData.sheets[this.currentSlot - 1];
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar seeds padrão:', e);
      }
    }

    if (loadedData) {
      this.applyState(loadedData);
      this.updateSyncBadge('synced');
    } else {
      this.updateSyncBadge('offline');
    }

    this.initialLoading = false;
  }

  // Salva o estado com Debounce
  autoSave() {
    if (this.initialLoading) return;
    this.updateSyncBadge('saving');

    clearTimeout(this.saveTimeout);
    const delay = window.appConfig ? window.appConfig.config.autoSyncDelay : 1200;

    this.saveTimeout = setTimeout(async () => {
      const state = this.collectState();
      
      // Salva localmente e na nuvem
      if (window.supabaseService) {
        await window.supabaseService.updateCharacter(this.currentSlot, state);
      } else {
        localStorage.setItem(`chronus_sheet_slot_${this.currentSlot}`, JSON.stringify(state));
      }

      this.updateSyncBadge('synced');
    }, delay);
  }

  // Salvamento Manual Imediato
  async manualSave() {
    const state = this.collectState();
    this.updateSyncBadge('saving');
    
    if (window.supabaseService) {
      await window.supabaseService.updateCharacter(this.currentSlot, state);
    } else {
      localStorage.setItem(`chronus_sheet_slot_${this.currentSlot}`, JSON.stringify(state));
    }

    if (window.audioEngine) window.audioEngine.playSaveSound();
    this.updateSyncBadge('synced');
    if (window.showSimpleToast) window.showSimpleToast(`Ficha ${this.currentSlot} salva com sucesso!`);
  }

  // Exportar Ficha para JSON
  exportJSON() {
    const state = this.collectState();
    const charName = state.inputs?.name ? state.inputs.name.replace(/[^a-zA-Z0-9_-]/g, '_') : `Ficha_${this.currentSlot}`;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Chronus_Slot${this.currentSlot}_${charName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (window.showSimpleToast) window.showSimpleToast(`Ficha exportada como JSON!`);
  }

  // Importar Ficha de um arquivo JSON
  loadFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const sheetData = parsed.sheet_data || parsed;
        this.applyState(sheetData);
        this.autoSave();
        if (window.showSimpleToast) window.showSimpleToast(`Ficha importada com sucesso!`);
      } catch (err) {
        alert('Erro ao importar arquivo JSON: formato inválido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // Resetar Ficha para os valores padrão
  async resetSheet() {
    if (!confirm(`Tem certeza que deseja resetar todos os dados do Slot ${this.currentSlot}?`)) return;

    localStorage.removeItem(`chronus_sheet_slot_${this.currentSlot}`);
    window.location.reload();
  }
}

window.sheetStateManager = new SheetStateManager();
