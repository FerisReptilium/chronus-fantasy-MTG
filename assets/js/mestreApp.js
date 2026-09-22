/**
 * CHRONUS FANTASY RPG - PAINEL DE CONTROLE DO MESTRE (MESTREAPP.JS)
 * Monitora os 10 jogadores em tempo real, gerencia rolagens do mestre e exibe o feed da sessão.
 */

class GMControlPanel {
  constructor() {
    this.gridContainer = document.getElementById('gmPlayersGrid');
    this.feedContainer = document.getElementById('gmRollFeed');
    this.init();
  }

  async init() {
    await this.refreshPlayers();
    this.setupRealtime();
    setInterval(() => this.refreshPlayers(), 15000); // Polling suave de segurança
  }

  async refreshPlayers() {
    if (!this.gridContainer) return;

    let defaultSeeds = [];
    try {
      const res = await fetch('data/defaultSheets.json');
      if (res.ok) {
        const data = await res.json();
        defaultSeeds = data.sheets || [];
      }
    } catch (e) {}

    let characters = [];
    if (window.supabaseService) {
      characters = await window.supabaseService.getAllCharacters();
    }

    this.gridContainer.innerHTML = '';

    for (let slot = 1; slot <= 10; slot++) {
      let char = characters.find(c => c.slot_id === slot);
      if (!char) {
        const local = localStorage.getItem(`chronus_sheet_slot_${slot}`);
        if (local) {
          try { char = JSON.parse(local); } catch (e) {}
        }
      }
      if (!char && defaultSeeds[slot - 1]) {
        char = defaultSeeds[slot - 1];
      }

      const playerCard = this.renderGMPlayerCard(slot, char);
      this.gridContainer.appendChild(playerCard);
    }
  }

  renderGMPlayerCard(slotId, charData) {
    const data = charData?.sheet_data || charData || {};
    const inputs = data.inputs || {};
    const name = inputs.name || charData?.name || `Slot #${slotId}`;
    const player = inputs.player || charData?.player_name || `Jogador ${slotId}`;
    const concept = inputs.concept || charData?.concept || '';
    const theme = data.theme ? data.theme.replace('mtg-card ', '').replace('theme-', '') : 'black';
    const manaColor = inputs.manacolor || charData?.mana_color || 'Incolor';
    
    // Calcula HP / Feridas
    const vigorVal = data.selects?.vigor && data.selects.vigor !== '-' ? parseInt(data.selects.vigor.replace('d', ''), 10) : 0;
    const maxHP = 10 + vigorVal;
    
    let totalWounds = 0;
    if (data.wounds && Array.isArray(data.wounds)) {
      totalWounds = data.wounds.filter(w => w && w.text && w.text.trim() !== '').length;
    }

    let condStatus = '<span style="color:#22c55e;">Saudável</span>';
    if (totalWounds >= maxHP) condStatus = '<span style="color:#ef4444; font-weight:bold;">Incapacitado</span>';
    else if (totalWounds >= Math.ceil(maxHP * (2/3))) condStatus = '<span style="color:#f97316; font-weight:bold;">Grave (-2d)</span>';
    else if (totalWounds >= Math.floor(maxHP / 2)) condStatus = '<span style="color:#facc15; font-weight:bold;">Ferido (-1d)</span>';

    const currentMana = inputs.manaCurrent || 0;
    const maxMana = inputs.manaMax || 10;

    const card = document.createElement('div');
    card.className = `slot-card theme-${theme}`;
    card.style.minHeight = 'auto';

    card.innerHTML = `
      <div class="slot-badge-number">#${slotId}</div>
      <div class="slot-card-inner">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-family:var(--font-sub); font-size:1.05rem; font-weight:900; color:var(--mtg-gold-light);">${name}</div>
            <div style="font-size:0.75rem; color:var(--card-text-muted);">${concept} (${player})</div>
          </div>
          <span style="font-size:0.75rem; font-weight:bold; color:var(--mtg-gold-mid);">${manaColor}</span>
        </div>

        <div style="background:rgba(0,0,0,0.5); padding:8px; border-radius:6px; font-size:0.75rem; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between;">
            <span>🩸 Feridas / HP:</span>
            <strong>${totalWounds} / ${maxHP} (${condStatus})</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>🔮 Mana:</span>
            <strong style="color:#38bdf8;">${currentMana} / ${maxMana}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>🛡️ Proteção:</span>
            <strong>${inputs.shield || 0}</strong>
          </div>
        </div>

        <div style="display:flex; gap:6px; margin-top:4px;">
          <a href="ficha.html?slot=${slotId}" target="_blank" class="action-btn" style="flex:1; justify-content:center; padding:6px 8px; font-size:0.7rem;">
            👁️ Inspecionar Ficha
          </a>
        </div>
      </div>
    `;

    return card;
  }

  setupRealtime() {
    if (window.supabaseService && window.supabaseService.client) {
      window.supabaseService.subscribeRealtime(
        (charChange) => {
          this.refreshPlayers();
        },
        (diceLog) => {
          this.addFeedItem(diceLog);
        }
      );
    }
  }

  addFeedItem(log) {
    if (!this.feedContainer) return;
    const time = new Date(log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement('div');
    item.className = 'section-box';
    item.style.marginBottom = '8px';
    item.style.padding = '8px 12px';
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="color:var(--mtg-gold-light); font-family:var(--font-sub);">
          ${log.character_name} <span style="font-size:0.75rem; color:var(--card-text-muted); font-weight:normal;">(${log.action_title})</span>
        </strong>
        <span style="font-family:var(--font-title); font-size:1.3rem; color:var(--mtg-gold-mid);">${log.roll_result}</span>
      </div>
      <div style="font-size:0.72rem; color:var(--card-text-muted); margin-top:2px;">
        ${log.breakdown || log.dice_pool} <span style="float:right; opacity:0.6;">${time}</span>
      </div>
    `;
    this.feedContainer.prepend(item);
  }

  // Rolagem Rápida do Mestre
  rollGmDice(faces, label = '') {
    const isSecret = document.getElementById('chkSecretRoll')?.checked || false;
    const result = Math.floor(Math.random() * faces) + 1;
    const title = label || `Rolagem d${faces}`;
    const breakdown = `Rolado: 1d${faces}${isSecret ? ' (Rolagem Secreta do Mestre)' : ''}`;

    window.showRollToast(title, result, breakdown, false, result === faces);

    if (window.supabaseService) {
      window.supabaseService.insertDiceLog(
        null,
        'Mestre (GM)',
        'Mestre',
        title,
        `1d${faces}`,
        result,
        breakdown,
        true,
        isSecret
      );
    }

    this.addFeedItem({
      character_name: '👑 Mestre',
      action_title: title,
      roll_result: result,
      breakdown: breakdown,
      created_at: new Date().toISOString()
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gmPanel = new GMControlPanel();
});
