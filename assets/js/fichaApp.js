/**
 * CHRONUS FANTASY RPG - CONTROLADOR DA FICHA MTG MASTERPIECE (FICHAAPP.JS)
 * Gerencia abas, interações com matriz de feridas, mana, retrato e rolagens.
 */

const MANA_TYPES = [
  { id: 'white', name: 'Branco', letter: 'W', color: '#fef08a' },
  { id: 'blue', name: 'Azul', letter: 'U', color: '#38bdf8' },
  { id: 'black', name: 'Preto', letter: 'B', color: '#a855f7' },
  { id: 'red', name: 'Vermelho', letter: 'R', color: '#ef4444' },
  { id: 'green', name: 'Verde', letter: 'G', color: '#22c55e' },
  { id: 'colorless', name: 'Incolor', letter: 'C', color: '#d6d3d1' }
];

// Troca de Abas
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  if (btnElement) btnElement.classList.add('active');
}

// Troca de Tema MTG
function setTheme(themeName) {
  const card = document.getElementById('card');
  if (card) {
    card.className = `mtg-card theme-${themeName}`;
    if (window.sheetStateManager) window.sheetStateManager.autoSave();
  }
}

// Ciclo de Feridas (Vazio -> / -> X -> *)
function cycleWound(element) {
  const states = ['', '/', 'X', '*'];
  let currentState = element.innerText;
  let nextIndex = (states.indexOf(currentState) + 1) % states.length;
  element.innerText = states[nextIndex];
  element.style.color = (states[nextIndex] === '*') ? '#facc15' : '#ef4444';
  
  if (window.sheetStateManager) window.sheetStateManager.autoSave();
  atualizarCondicoesDano();
}

// Alternar Rombo de Determinação
function toggleRhombus(element) {
  element.classList.toggle('active');
  if (window.sheetStateManager) window.sheetStateManager.autoSave();
}

// Ajuste rápido de Recursos (+ / -)
function adjResource(id, amount) {
  const input = document.querySelector(`input[data-id="${id}"]`);
  if (!input) return;
  let val = parseInt(input.value, 10) || 0;
  val += amount;
  if (val < 0) val = 0;
  input.value = val;
  if (window.sheetStateManager) window.sheetStateManager.autoSave();
}

// Processamento de XP e Nível
function processXP() {
  const xpInput = document.querySelector('input[data-id="xpCurrent"]');
  const displayLevel = document.getElementById('displayLevel');
  if (xpInput && displayLevel && window.GameEngine) {
    const lvl = window.GameEngine.calcularNivel(xpInput.value);
    displayLevel.innerText = lvl;
  }
  if (window.sheetStateManager) window.sheetStateManager.autoSave();
}

// Atualiza cálculos de HP Máximo (10 + Vigor) e condições de dano
function atualizarCondicoesDano() {
  const vigorSelect = document.querySelector('select[data-attr="vigor"]');
  let vigorVal = 0;
  if (vigorSelect && vigorSelect.value !== '-') {
    vigorVal = parseInt(vigorSelect.value.replace('d', ''), 10) || 0;
  }
  
  const maxHP = 10 + vigorVal;
  const maxHpDisplay = document.getElementById('maxHpDisplay');
  if (maxHpDisplay) maxHpDisplay.innerText = maxHP;

  let totalDanos = 0;
  document.querySelectorAll('.wound-box').forEach((el, index) => {
    if (index < maxHP) {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      if (el.innerText && el.innerText.trim() !== '') totalDanos++;
    } else {
      el.style.opacity = '0.12';
      el.style.pointerEvents = 'none';
      el.innerText = '';
    }
  });

  const chkFerido = document.querySelector('input[data-id="condFerido"]');
  const chkGrave = document.querySelector('input[data-id="condGrave"]');
  const chkIncap = document.querySelector('input[data-id="condIncap"]');
  
  const uiFerido = document.getElementById('uiCondFerido');
  const uiGrave = document.getElementById('uiCondGrave');
  const uiIncap = document.getElementById('uiCondIncap');

  if (chkFerido) chkFerido.checked = false;
  if (chkGrave) chkGrave.checked = false;
  if (chkIncap) chkIncap.checked = false;

  if (uiFerido) uiFerido.style.background = 'rgba(0,0,0,0.45)';
  if (uiGrave) uiGrave.style.background = 'rgba(0,0,0,0.45)';
  if (uiIncap) uiIncap.style.background = 'rgba(0,0,0,0.45)';

  if (totalDanos >= maxHP) {
    if (chkIncap) chkIncap.checked = true;
    if (uiIncap) uiIncap.style.background = 'rgba(239, 68, 68, 0.25)';
  } else if (totalDanos >= Math.ceil(maxHP * (2/3))) {
    if (chkGrave) chkGrave.checked = true;
    if (uiGrave) uiGrave.style.background = 'rgba(249, 115, 22, 0.25)';
  } else if (totalDanos >= Math.floor(maxHP / 2)) {
    if (chkFerido) chkFerido.checked = true;
    if (uiFerido) uiFerido.style.background = 'rgba(250, 204, 21, 0.25)';
  }
}

// Execução de Rolagem de Teste (Até 3 Dados de Ação + Determinação d12)
function executePoolRoll(actionType = 'Simples', sourceId = null) {
  const rollAttrSel = document.getElementById('rollAttrSel');
  if (!rollAttrSel) return;

  const attrKey = rollAttrSel.value;
  const attrSelect = document.querySelector(`select[data-attr="${attrKey}"]`);
  const tipoDado = attrSelect ? attrSelect.value : '-';
  const attrName = rollAttrSel.options[rollAttrSel.selectedIndex].text;

  if (tipoDado === '-') {
    window.showRollToast(attrName, '-', 'A abordagem selecionada não possui dado configurado.', true);
    return;
  }

  const cond = window.GameEngine.getDamagePenalty();
  if (!cond.canRoll) {
    window.showRollToast(attrName, 'X', '❌ INCAPACITADO (Sem ações possíveis)', true);
    return;
  }

  let title = attrName;
  let extraLog = '';

  // Tratamento para Ataque com Arma
  if (actionType === 'Ataque') {
    const wName = document.querySelector(`input[data-id="${sourceId}Name"]`)?.value || 'Arma';
    const wDmg = document.querySelector(`input[data-id="${sourceId}Dmg"]`)?.value || '0';
    title = `Ataque: ${wName}`;
    extraLog = `⚔️ Dano Base da Arma: ${wDmg}`;
    if (window.audioEngine) window.audioEngine.playWeaponStrike();
  }
  // Tratamento para Conjuração de Magia
  else if (actionType === 'Magia') {
    const sName = document.querySelector(`input[data-id="${sourceId}Name"]`)?.value || 'Magia';
    const sCost = parseInt(document.querySelector(`input[data-id="${sourceId}Cost"]`)?.value, 10) || 0;
    
    const manaInput = document.querySelector('input[data-id="manaCurrent"]');
    let cMana = parseInt(manaInput?.value, 10) || 0;
    
    if (cMana < sCost) {
      window.showRollToast("Magia Falhou", "⚠️", "❌ Mana Insuficiente no Tracker de Recursos!", true);
      return;
    }
    
    if (manaInput) manaInput.value = cMana - sCost;
    if (window.sheetStateManager) window.sheetStateManager.autoSave();
    
    title = `Magia: ${sName}`;
    extraLog = `🔮 Custo Debitado: ${sCost} Mana`;
    if (window.audioEngine) window.audioEngine.playSpellCast();
  }

  const chkPers = document.getElementById('chkPers');
  const chkHab = document.getElementById('chkHab');
  const chkDet = document.getElementById('chkDet');

  const usePers = chkPers ? chkPers.checked : false;
  const useHab = chkHab ? chkHab.checked : false;
  const useDet = chkDet ? chkDet.checked : false;

  // Soma até 3 dados (Abordagem + Personalidade + Habilidade)
  let qtdBase = 1 + (usePers ? 1 : 0) + (useHab ? 1 : 0);
  let dadosParaRolar = qtdBase - cond.penalty;
  if (dadosParaRolar < 0) dadosParaRolar = 0;

  let resultadosAttr = [];
  let maiorAttr = 0;
  for (let i = 0; i < dadosParaRolar; i++) {
    let r = window.GameEngine.rolarDado(tipoDado);
    resultadosAttr.push(r);
    if (r > maiorAttr) maiorAttr = r;
  }

  let resDet = 0;
  if (useDet) resDet = window.GameEngine.rolarDado('d12');

  let finalResult = Math.max(maiorAttr, resDet);

  let log = `Reserva: ${qtdBase}${tipoDado}`;
  if (cond.penalty > 0) log += ` - ${cond.penalty} (${cond.status}) = ${dadosParaRolar}${tipoDado}`;
  
  let detalhes = [];
  if (dadosParaRolar > 0) detalhes.push(`Dados Ação: [${resultadosAttr.join(', ')}]`);
  if (useDet) detalhes.push(`Determinação (d12): [${resDet}]`);

  if (dadosParaRolar === 0 && !useDet) {
    window.showRollToast(title, 'Falha', log + '<br>Sem dados suficientes para agir!', true);
    return;
  }

  const faces = parseInt(tipoDado.replace('d', ''), 10) || 6;
  const isCritical = (maiorAttr === faces && faces >= 8) || (resDet === 12);

  const breakdownFull = log + '<br>' + detalhes.join(' | ') + (extraLog ? '<br>' + extraLog : '');
  window.showRollToast(title, finalResult, breakdownFull, cond.penalty > 0, isCritical);

  // Registra no Supabase VTT Log se disponível
  if (window.supabaseService) {
    const charName = document.querySelector('input[data-id="name"]')?.value || 'Herói';
    const playerName = document.querySelector('input[data-id="player"]')?.value || '';
    window.supabaseService.insertDiceLog(
      window.sheetStateManager ? window.sheetStateManager.currentSlot : 1,
      charName,
      playerName,
      title,
      `${dadosParaRolar}${tipoDado}${useDet ? ' + 1d12' : ''}`,
      finalResult,
      breakdownFull.replace(/<br>/g, ' | ')
    );
  }

  // Adiciona ao Log local da sessão
  addVttLogEntry(title, finalResult, breakdownFull);

  // Reseta checkboxes de bônus após a rolagem
  if (chkPers) chkPers.checked = false;
  if (chkHab) chkHab.checked = false;
  if (chkDet) chkDet.checked = false;
}

// Rolagem de Iluminação
function rollIllumination() {
  const selectedRadio = document.querySelector('input[name="ilum"]:checked');
  if (!selectedRadio) {
    window.showRollToast("Iluminação", '-', 'Selecione um dado de Iluminação (d4..d10).', true);
    return;
  }
  const cond = window.GameEngine.getDamagePenalty();
  if (!cond.canRoll) {
    window.showRollToast("Iluminação", 'X', '❌ INCAPACITADO', true);
    return;
  }
  const tipoDado = selectedRadio.value;
  const rolagem = window.GameEngine.rolarDado(tipoDado);
  window.showRollToast(`ILUMINAÇÃO`, rolagem, `Rolado: 1${tipoDado}`);

  if (window.supabaseService) {
    const charName = document.querySelector('input[data-id="name"]')?.value || 'Herói';
    window.supabaseService.insertDiceLog(
      window.sheetStateManager ? window.sheetStateManager.currentSlot : 1,
      charName,
      '',
      'Iluminação',
      `1${tipoDado}`,
      rolagem,
      `Rolado: 1${tipoDado}`
    );
  }

  addVttLogEntry('Iluminação', rolagem, `Rolado: 1${tipoDado}`);
}

// Histórico de Rolagens da Sessão
function addVttLogEntry(title, result, breakdown) {
  const logContainer = document.getElementById('vttSessionLogs');
  if (!logContainer) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement('div');
  entry.className = 'section-box';
  entry.style.marginBottom = '8px';
  entry.style.padding = '8px 12px';
  entry.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <strong style="color:var(--mtg-gold-light); font-family:var(--font-sub);">${title}</strong>
      <span style="color:var(--mtg-gold-mid); font-family:var(--font-title); font-size:1.4rem;">${result}</span>
    </div>
    <div style="font-size:0.75rem; color:var(--card-text-muted); margin-top:4px;">
      ${breakdown} <span style="float:right; opacity:0.6;">${time}</span>
    </div>
  `;

  logContainer.prepend(entry);
}

// Inicialização da Página
window.addEventListener('DOMContentLoaded', async () => {
  // 1. Gera as 20 caixas de feridas
  const woundContainer = document.getElementById('woundContainer');
  if (woundContainer) {
    for (let i = 0; i < 20; i++) {
      const box = document.createElement('div');
      box.className = 'wound-box';
      box.dataset.index = i;
      box.onclick = () => cycleWound(box);
      woundContainer.appendChild(box);
    }
  }

  // 2. Gera a tabela de Cores de Mana MTG
  const table = document.getElementById('manaTable');
  if (table) {
    MANA_TYPES.forEach(mana => {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.className = 'mana-name';
      tdName.innerHTML = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${mana.color}; box-shadow:0 0 6px ${mana.color};"></span> ${mana.name}`;
      tr.appendChild(tdName);

      for (let lvl = 1; lvl <= 5; lvl++) {
        const td = document.createElement('td');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.dataset.mana = `${mana.id}_${lvl}`;
        chk.onchange = () => {
          if (window.sheetStateManager) window.sheetStateManager.autoSave();
        };
        td.appendChild(chk);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    });
  }

  // 3. Atualiza seletor de slots na barra superior
  const slotSelector = document.getElementById('slotSelector');
  if (slotSelector && window.sheetStateManager) {
    slotSelector.value = window.sheetStateManager.currentSlot;
    slotSelector.onchange = (e) => window.sheetStateManager.setSlot(e.target.value);
  }

  // 4. Carrega estado inicial do personagem
  if (window.sheetStateManager) {
    await window.sheetStateManager.loadCurrentSlot();
  }

  // 5. Escutadores de input e upload de foto
  document.body.addEventListener('input', () => {
    if (window.sheetStateManager) window.sheetStateManager.autoSave();
  });
  
  document.body.addEventListener('change', () => {
    if (window.sheetStateManager) window.sheetStateManager.autoSave();
    atualizarCondicoesDano();
  });

  const portraitInput = document.getElementById('portraitInput');
  const portraitBox = document.getElementById('portraitBox');
  if (portraitInput && portraitBox) {
    portraitInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          portraitBox.style.backgroundImage = `url('${event.target.result}')`;
          if (window.sheetStateManager) window.sheetStateManager.autoSave();
          if (window.showSimpleToast) window.showSimpleToast('Arte do personagem carregada!');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  atualizarCondicoesDano();
});

// Funções expostas globalmente
window.switchTab = switchTab;
window.setTheme = setTheme;
window.cycleWound = cycleWound;
window.toggleRhombus = toggleRhombus;
window.adjResource = adjResource;
window.processXP = processXP;
window.atualizarCondicoesDano = atualizarCondicoesDano;
window.executePoolRoll = executePoolRoll;
window.rollIllumination = rollIllumination;
window.manualSave = () => { if (window.sheetStateManager) window.sheetStateManager.manualSave(); };
window.resetSheet = () => { if (window.sheetStateManager) window.sheetStateManager.resetSheet(); };
window.exportJSON = () => { if (window.sheetStateManager) window.sheetStateManager.exportJSON(); };
window.loadFromFile = (e) => { if (window.sheetStateManager) window.sheetStateManager.loadFromFile(e); };
