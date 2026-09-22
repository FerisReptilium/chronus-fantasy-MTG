/**
 * CHRONUS FANTASY RPG - MOTOR DE REGRAS E DADOS (DICE ENGINE)
 * Lógica matemática de rolagens de atributos, testes com até 3 dados,
 * penalidades de dano, cálculo de nível por XP e Iluminação.
 */

const GameEngine = {
  xpTable: [
    0, 10, 33, 80, 156, 270, 428, 640, 911, 1250, 1663, 2160, 2746, 3426, 4218, 
    5120, 6141, 7280, 8551, 10000, 11500, 13000, 14600, 16200, 18000, 19900, 21800, 
    23800, 25900, 28000, 30600, 33300, 36100, 39000, 42000, 45400, 48900, 52500, 
    56200, 60000, 64200, 68500, 72900, 77400, 82000, 87300, 92800, 98400, 104100, 
    110000, 116300, 122800, 129500, 136400, 143500, 151300, 159400, 167800, 176500, 
    185500, 195100, 205000, 215200, 225700, 236500, 248000, 259900, 272200, 284900, 
    298000, 312000, 326500, 341500, 357000, 373000, 390000, 407500, 425500, 444000, 
    463000, 483000, 503700, 525100, 547200, 570000, 594000, 618800, 644400, 670800, 
    698000, 726500, 756000, 786500, 818000, 850500, 884500, 920000, 957000, 995500, 1035500
  ],

  calcularNivel(xpAtual) {
    const xp = parseInt(xpAtual, 10) || 0;
    let nivel = 1;
    for (let i = 0; i < this.xpTable.length; i++) {
      if (xp >= this.xpTable[i]) nivel = i + 1;
    }
    return nivel > 100 ? 100 : nivel;
  },

  rolarDado(tipoDado) {
    if (!tipoDado || tipoDado === '-') return 0;
    const faces = parseInt(tipoDado.replace('d', ''), 10);
    if (isNaN(faces) || faces <= 0) return 0;
    return Math.floor(Math.random() * faces) + 1;
  },

  getDamagePenalty() {
    const incap = document.querySelector('input[data-id="condIncap"]')?.checked || false;
    const grave = document.querySelector('input[data-id="condGrave"]')?.checked || false;
    const ferido = document.querySelector('input[data-id="condFerido"]')?.checked || false;
    
    if (incap) return { canRoll: false, penalty: 0, status: 'Incapacitado' };
    if (grave) return { canRoll: true, penalty: 2, status: 'Grave' };
    if (ferido) return { canRoll: true, penalty: 1, status: 'Ferido' };
    return { canRoll: true, penalty: 0, status: 'Saudável' };
  }
};

let toastTimeout = null;

function showRollToast(titulo, rolagemFinal, breakdownText, isPenalty = false, isCritical = false) {
  const toast = document.getElementById('rollToast');
  if (!toast) return;

  let extraClass = '';
  if (isPenalty) extraClass = 'penalty';
  if (isCritical) extraClass = 'critical';

  toast.innerHTML = `
    <div class="toast-title">Teste: ${titulo}</div>
    <div class="toast-result">${rolagemFinal}</div>
    <div class="toast-breakdown ${extraClass}">${breakdownText}</div>
  `;
  
  toast.classList.add('show');
  
  if (window.audioEngine) {
    if (isCritical) {
      window.audioEngine.playCritical();
    } else {
      window.audioEngine.playDiceRoll();
    }
  }

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 6000);
}

function showSimpleToast(message, isSuccess = true) {
  let toast = document.getElementById('simpleToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'simpleToast';
    toast.className = 'simple-toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.borderColor = isSuccess ? 'var(--mtg-gold-mid)' : '#ef4444';
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

window.GameEngine = GameEngine;
window.showRollToast = showRollToast;
window.showSimpleToast = showSimpleToast;
