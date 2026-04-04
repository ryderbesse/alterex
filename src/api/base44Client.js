import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Table name mapping: Base44 entity name → Supabase table name
// ---------------------------------------------------------------------------
const TABLE_MAP = {
  UserProfile:                 'user_profiles',
  UserProgress:                'user_progress',
  Class:                       'classes',
  Document:                    'documents',
  LearningGame:                'learning_games',
  GameSession:                 'game_sessions',
  ConceptMastery:              'concept_mastery',
  Assignment:                  'assignments',
  SyncedAssignment:            'synced_assignments',
  Badge:                       'badges',
  DailyXP:                     'daily_xp',
  Classroom:                   'classrooms',
  ClassroomAssignment:         'classroom_assignments',
  GoogleClassroomConnection:   'google_classroom_connections',
  // TeacherClassDetail uses base44.entities.User – map to a read-only view
  User:                        'user_profiles',
};

// ---------------------------------------------------------------------------
// Query builder – mirrors Base44's filter(filters, sort, limit) signature
// ---------------------------------------------------------------------------
function buildSelectQuery(tableName, filters, sort, limit) {
  let query = supabase.from(tableName).select('*');

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      query = query.eq(key, value);
    });
  }

  if (sort) {
    const ascending = !sort.startsWith('-');
    const column = sort.replace(/^-/, '');
    query = query.order(column, { ascending });
  }

  if (limit) {
    query = query.limit(limit);
  }

  return query;
}

// ---------------------------------------------------------------------------
// Entity client factory – one per entity name
// ---------------------------------------------------------------------------
function createEntityClient(entityName) {
  const tableName = TABLE_MAP[entityName];
  if (!tableName) throw new Error(`Unknown entity: ${entityName}`);

  return {
    // filter(filters, sort?, limit?) → array
    async filter(filters = {}, sort = null, limit = null) {
      const { data, error } = await buildSelectQuery(tableName, filters, sort, limit);
      if (error) throw error;
      return data || [];
    },

    // list(sort?) → array scoped to current user via created_by
    async list(sort = null) {
      const { data: { user } } = await supabase.auth.getUser();
      const filters = user?.email ? { created_by: user.email } : {};
      const { data, error } = await buildSelectQuery(tableName, filters, sort);
      if (error) throw error;
      return data || [];
    },

    // create(record) → created record
    async create(record) {
      // Auto-inject created_by if not already set
      let enriched = record;
      if (!record.created_by) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) enriched = { ...record, created_by: user.email };
      }
      const { data, error } = await supabase
        .from(tableName)
        .insert(enriched)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // update(id, updates) → updated record
    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // delete(id) → void
    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

// Proxy so base44.entities.AnyName works without pre-registering every name
const entities = new Proxy({}, {
  get(_, entityName) {
    return createEntityClient(String(entityName));
  },
});

// ---------------------------------------------------------------------------
// Auth – mirrors base44.auth.me() / logout() / redirectToLogin()
// ---------------------------------------------------------------------------
const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error || new Error('Not authenticated');
    // Normalize shape to match what Base44 returned
    return {
      ...user,
      full_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email,
    };
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    window.location.href = redirectUrl || '/';
  },

  redirectToLogin(_returnUrl) {
    window.location.href = '/login';
  },
};

// ---------------------------------------------------------------------------
// File upload via Supabase Storage
// ---------------------------------------------------------------------------
async function uploadFile({ file }) {
  const ext = file.name.split('.').pop();
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path);
  return { file_url: publicUrl };
}

// ---------------------------------------------------------------------------
// Helper – build headers including the current user's JWT for authenticated calls
// ---------------------------------------------------------------------------
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

// ---------------------------------------------------------------------------
// Integrations – LLM calls proxied to /api/llm (Vercel function)
// File upload goes directly to Supabase Storage.
// ---------------------------------------------------------------------------
const integrations = {
  Core: {
    async InvokeLLM(params) {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`LLM call failed: ${res.status} ${res.statusText}`);
      return res.json();
    },

    async UploadFile(params) {
      return uploadFile(params);
    },

    async ExtractDataFromUploadedFile(params) {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'extract', ...params }),
      });
      if (!res.ok) throw new Error(`Extract call failed: ${res.status} ${res.statusText}`);
      return res.json();
    },

    async SendEmail(params) {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Email send failed: ${res.status} ${res.statusText}`);
      return res.json();
    },
  },
};

// ---------------------------------------------------------------------------
// Custom functions – proxied to /api/functions/:name (Vercel)
// Covers: googleClassroom, checkBadges, getUserCount, syncAllClassrooms, createAssignment
// ---------------------------------------------------------------------------
const functions = {
  async invoke(name, params = {}) {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/functions/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Function "${name}" failed: ${res.status} ${res.statusText}`);
    return res.json();
  },
};

// ---------------------------------------------------------------------------
// Drop-in replacement export – all 26 files keep their existing imports
// ---------------------------------------------------------------------------
export const base44 = {
  entities,
  auth,
  integrations,
  functions,
};
