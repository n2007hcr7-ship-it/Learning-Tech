-- Combined Supabase Schema (Users, Teachers, Students, Lessons, Chats, Messages)
-- Updated: 2026-04-12

-- 1. Users Table (Core Profile)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  wilaya TEXT,
  role TEXT,
  balance NUMERIC DEFAULT 0,
  iq_coins INTEGER DEFAULT 0,
  iq_coins_monthly INTEGER DEFAULT 0,
  avatar_url TEXT,
  unlocked_lessons UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  wilaya TEXT,
  is_verified BOOLEAN DEFAULT false,
  balance NUMERIC DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 5,
  ccp TEXT,
  edahabia TEXT
);

-- 3. Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  wilaya TEXT,
  balance NUMERIC DEFAULT 0,
  iq_coins INTEGER DEFAULT 0,
  is_subscribed BOOLEAN DEFAULT false
);

-- 4. Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  month TEXT,
  level TEXT,
  thumbnail TEXT,
  "videoUrl" TEXT,
  "teacherId" UUID REFERENCES public.users(id),
  "teacherName" TEXT,
  price NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'video',
  videos JSONB DEFAULT '[]',
  views INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Chats Table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participants UUID[] NOT NULL,
  "studentId" UUID REFERENCES public.users(id),
  "teacherId" UUID REFERENCES public.users(id),
  "studentName" TEXT,
  "teacherName" TEXT,
  type TEXT DEFAULT 'normal',
  "lastMessage" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "chatId" UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "senderId" UUID REFERENCES public.users(id),
  "senderName" TEXT,
  "teacherId" UUID,
  "studentId" UUID,
  "isPremium" BOOLEAN DEFAULT false,
  "isAI" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 8. Policies
CREATE POLICY "Users can insert self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update self" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can see self" ON public.users FOR SELECT USING (true);
CREATE POLICY "Teachers can insert self" ON public.teachers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Teachers can update self" ON public.teachers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Everyone see teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Students can insert self" ON public.students FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Students can update self" ON public.students FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Everyone see students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Everyone see lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Teachers manage lessons" ON public.lessons FOR ALL USING (auth.uid() = "teacherId");
CREATE POLICY "Users see own chats" ON public.chats FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "Users start chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = ANY(participants));
CREATE POLICY "Users update own chats" ON public.chats FOR UPDATE USING (auth.uid() = ANY(participants));
CREATE POLICY "Users see messages" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.chats WHERE id = "chatId" AND auth.uid() = ANY(participants)));
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = "senderId");
