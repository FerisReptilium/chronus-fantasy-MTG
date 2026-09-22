# 🛡️ CHRONUS FANTASY RPG — PORTAL VTT & FICHAS MTG MASTERPIECE

Portal completo de fichas e Virtual Tabletop (VTT) para **Chronus Fantasy RPG**, com visual idêntico e fiel às cartas **Magic: The Gathering Masterpiece Edition**, suporte a **10 fichas individuais protegidas por senha**, autenticação com **Supabase**, hospedagem instantânea no **Vercel** e controle de versão no **GitHub**.

---

## 🔑 Credenciais & Links dos 10 Jogadores

Cada jogador tem sua própria URL dedicada e senha individual (todas personalizáveis):

| Slot | Personagem Padrão | Link Direto | Senha Padrão |
| :--- | :--- | :--- | :--- |
| **Slot 1** | Valírio Solardente | `seusite.vercel.app/ficha1` ou `ficha1.html` | `chronus1` |
| **Slot 2** | Kaelen Vex | `seusite.vercel.app/ficha2` ou `ficha2.html` | `chronus2` |
| **Slot 3** | Morwenna Sombra-Noturna | `seusite.vercel.app/ficha3` ou `ficha3.html` | `chronus3` |
| **Slot 4** | Ignis Quebra-Muralhas | `seusite.vercel.app/ficha4` ou `ficha4.html` | `chronus4` |
| **Slot 5** | Sylvana Garra-Verde | `seusite.vercel.app/ficha5` ou `ficha5.html` | `chronus5` |
| **Slot 6** | Autômato MK-VII | `seusite.vercel.app/ficha6` ou `ficha6.html` | `chronus6` |
| **Slot 7** | Aurelius, Campeão de Boros | `seusite.vercel.app/ficha7` ou `ficha7.html` | `chronus7` |
| **Slot 8** | Nereida das Profundezas | `seusite.vercel.app/ficha8` ou `ficha8.html` | `chronus8` |
| **Slot 9** | Brakkor, O Urso | `seusite.vercel.app/ficha9` ou `ficha9.html` | `chronus9` |
| **Slot 10** | Zul'Kiran, O Renegado | `seusite.vercel.app/ficha10` ou `ficha10.html` | `chronus10` |
| **Mestre** | Acesso Global (10 Fichas) | `seusite.vercel.app/mestre.html` | `mestre123` |

> 💡 **Nota**: A senha do Mestre (`mestre123`) abre e desbloqueia **qualquer uma das 10 fichas**.

---

## 🌟 Recursos do Sistema

1. **🏛️ Ficha MTG Masterpiece Fiel ao Código Original**:
   - Layout exato de carta MTG com bordas douradas e texturas metálicas.
   - 7 Temas de Mana: Branco (W), Azul (U), Preto (B), Vermelho (R), Verde (G), Artefato (A) e Dourado (Gold).
   - Retângulo grande horizontal de 360px para arte do personagem (com upload de imagem).
   - Ícones vetoriais de mana SVG corrigidos e incorporados para exibição perfeita.

2. **⚔️ Motor de Testes (Até 3 Dados de Ação + Determinação d12)**:
   - Abordagem Base (d4, d6, d8, d10).
   - Checkboxes de bônus: *Personalidade (+1d)* e *Perícia/Habilidade (+1d)*.
   - Desconto automático de penalidades de dano (*Ferido: -1d*, *Grave: -2d*, *Incapacitado: bloqueia rolagens*).
   - Determinação com 1d12 em separado, escolhendo o maior resultado.
   - Rolagem de Iluminação (d4 a d10).
   - Armas com rolagem ⚔️ e Magias com débito automático de custo de Mana 🔮.

3. **🩸 Matriz de Feridas e Condições Dinâmicas**:
   - Limite de Feridas calculado em tempo real com base em `10 + Vigor`.
   - 20 caixas de feridas com ciclo de estados: `Vazio` -> `/` -> `X` -> `*`.

4. **☁️ Sincronização em Nuvem & Funcionamento Offline**:
   - Salva localmente de forma instantânea em `localStorage` isolado por slot (sem risco de uma ficha sobrescrever a outra).
   - Sincroniza automaticamente com o Supabase PostgreSQL na nuvem quando conectado.

---

## 🚀 Como Subir para o GitHub e Vercel

### 1. Subir para o GitHub
No terminal da pasta raiz, execute:

```bash
git init
git add .
git commit -m "Portal Chronus Fantasy RPG MTG Masterpiece com 10 Fichas e Senhas"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/chronus-fantasy.git
git push -u origin main
```

### 2. Configurar o Supabase (Gratuito)
1. Crie seu projeto no [supabase.com](https://supabase.com).
2. No menu lateral, abra o **SQL Editor**.
3. Copie o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
4. Em **Project Settings -> API**, copie sua **Project URL** e **Anon Key**.
5. No portal web, abra o modal **⚙️ Nuvem** e cole essas duas chaves.

### 3. Deploy no Vercel (1 Clique)
1. Acesse [vercel.com](https://vercel.com) e importe o repositório do GitHub.
2. Clique em **Deploy**.
3. O Vercel gerará a URL do portal pronta para enviar aos seus jogadores!

---

## 📂 Estrutura de Arquivos

```
chronus-fantasy/
├── index.html                   # Portal Principal (Hub com os 10 slots e login)
├── ficha.html                   # Ficha Mestre dinâmica (?slot=1..10)
├── ficha1.html ... ficha10.html # 10 Fichas individuais diretas para cada jogador
├── mestre.html                  # Painel do Mestre (Monitoramento ao vivo dos 10 jogadores)
├── vercel.json                  # Rotas limpas /ficha1 .. /ficha10 e segurança Vercel
├── .gitignore                   # Arquivos ignorados pelo Git
├── README.md                    # Este manual
├── supabase/
│   └── schema.sql               # Banco de dados, RLS e seeds iniciais
└── data/
    └── defaultSheets.json       # Seeds das 10 fichas com dados completos
```
