-- =========================================================================
-- CHRONUS FANTASY RPG - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- =========================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS DE USUÁRIOS (Vinculada ao auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'gm', 'admin')),
  assigned_slot INTEGER CHECK (assigned_slot BETWEEN 1 AND 10),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE FICHAS DE PERSONAGENS (10 SLOTS DEDICADOS)
CREATE TABLE IF NOT EXISTS public.characters (
  slot_id INTEGER PRIMARY KEY CHECK (slot_id BETWEEN 1 AND 10),
  name TEXT NOT NULL DEFAULT 'Novo Personagem',
  player_name TEXT DEFAULT '',
  concept TEXT DEFAULT '',
  race TEXT DEFAULT '',
  mana_color TEXT DEFAULT 'Incolor',
  theme TEXT DEFAULT 'black',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  max_hp INTEGER DEFAULT 10,
  current_wounds INTEGER DEFAULT 0,
  current_mana INTEGER DEFAULT 0,
  max_mana INTEGER DEFAULT 10,
  avatar_url TEXT,
  sheet_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_roll JSONB,
  is_locked BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4. TABELA DE LOGS DE ROLAGENS (VTT REALTIME)
CREATE TABLE IF NOT EXISTS public.dice_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id INTEGER REFERENCES public.characters(slot_id) ON DELETE SET NULL,
  character_name TEXT NOT NULL,
  player_name TEXT DEFAULT '',
  action_title TEXT NOT NULL,
  dice_pool TEXT,
  roll_result TEXT NOT NULL,
  breakdown TEXT,
  is_gm_roll BOOLEAN DEFAULT false,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_characters_updated_at ON public.characters (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dice_logs_created_at ON public.dice_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_slot ON public.profiles (assigned_slot);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_logs ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS PARA PROFILES
DROP POLICY IF EXISTS "Perfis públicos para leitura de autenticados" ON public.profiles;
CREATE POLICY "Perfis públicos para leitura de autenticados" 
  ON public.profiles FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seus próprios perfis" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- 8. POLÍTICAS RLS PARA CHARACTERS
DROP POLICY IF EXISTS "Qualquer um pode ler as 10 fichas" ON public.characters;
CREATE POLICY "Qualquer um pode ler as 10 fichas" 
  ON public.characters FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Edição de fichas por jogador autorizado ou mestre" ON public.characters;
CREATE POLICY "Edição de fichas por jogador autorizado ou mestre" 
  ON public.characters FOR UPDATE 
  TO authenticated, anon 
  USING (
    -- Permite se for anon (modo mesa aberta) ou se for o jogador do slot ou GM
    auth.role() = 'anon' OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role IN ('gm', 'admin') OR profiles.assigned_slot = characters.slot_id)
    )
  );

DROP POLICY IF EXISTS "Inserção inicial de fichas" ON public.characters;
CREATE POLICY "Inserção inicial de fichas" 
  ON public.characters FOR INSERT 
  TO authenticated, anon 
  WITH CHECK (true);

-- 9. POLÍTICAS RLS PARA DICE_LOGS
DROP POLICY IF EXISTS "Leitura pública de rolagens públicas" ON public.dice_logs;
CREATE POLICY "Leitura pública de rolagens públicas" 
  ON public.dice_logs FOR SELECT 
  TO authenticated, anon 
  USING (is_secret = false OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('gm', 'admin'));

DROP POLICY IF EXISTS "Inserção de rolagens" ON public.dice_logs;
CREATE POLICY "Inserção de rolagens" 
  ON public.dice_logs FOR INSERT 
  TO authenticated, anon 
  WITH CHECK (true);

-- 10. FUNÇÃO E TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE NO CADASTRO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. POVOAMENTO INICIAL (SEED) DOS 10 SLOTS DE FICHAS
INSERT INTO public.characters (slot_id, name, player_name, concept, race, mana_color, theme, level, xp, max_hp, current_wounds, current_mana, max_mana)
VALUES 
  (1, 'Personagem 1', 'Jogador 1', 'Guerreiro da Luz', 'Humano', 'Branco (W)', 'white', 1, 0, 10, 0, 10, 10),
  (2, 'Personagem 2', 'Jogador 2', 'Arquimago da Mente', 'Élfico', 'Azul (U)', 'blue', 1, 0, 10, 0, 10, 10),
  (3, 'Personagem 3', 'Jogador 3', 'Necromante das Sombras', 'Kor', 'Preto (B)', 'black', 1, 0, 10, 0, 10, 10),
  (4, 'Personagem 4', 'Jogador 4', 'Piromante Furioso', 'Goblin', 'Vermelho (R)', 'red', 1, 0, 10, 0, 10, 10),
  (5, 'Personagem 5', 'Jogador 5', 'Guardião Silvestre', 'Centauro', 'Verde (G)', 'green', 1, 0, 10, 0, 10, 10),
  (6, 'Personagem 6', 'Jogador 6', 'Artífice Mecânico', 'Vedalken', 'Artefato (A)', 'artifact', 1, 0, 10, 0, 10, 10),
  (7, 'Personagem 7', 'Jogador 7', 'Paladino Dourado', 'Humano', 'Dourado (Gold)', 'gold', 1, 0, 10, 0, 10, 10),
  (8, 'Personagem 8', 'Jogador 8', 'Lâmina Espectral', 'Tritão', 'Azul (U)', 'blue', 1, 0, 10, 0, 10, 10),
  (9, 'Personagem 9', 'Jogador 9', 'Xamã das Raízes', 'Leonino', 'Verde (G)', 'green', 1, 0, 10, 0, 10, 10),
  (10, 'Personagem 10', 'Jogador 10', 'Corsário do Vazio', 'Vampiro', 'Preto (B)', 'black', 1, 0, 10, 0, 10, 10)
ON CONFLICT (slot_id) DO NOTHING;

-- 12. HABILITAR REPLICAÇÃO EM TEMPO REAL NO SUPABASE (SEGURO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'characters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dice_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dice_logs;
  END IF;
END $$;

