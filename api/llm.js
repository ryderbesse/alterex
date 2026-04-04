// api/llm.js — Anthropic Claude API proxy
//
// Three modes depending on the request body:
//   action === 'chat'    → personalized chat using the user's learning profile
//   action === 'extract' → extract structured study materials from a document
//   (none)               → legacy InvokeLLM path used by existing app components

import { createClient } from '@supabase/supabase-js';

const LEARNING_STYLE_INSTRUCTIONS = {
  visual: `The learner is a VISUAL learner. Use spatial descriptions, suggest diagrams or charts where relevant,
organise information with clear headings and bullet points, and paint mental pictures with vivid examples.`,

  auditory: `The learner is an AUDITORY learner. Explain concepts as if speaking aloud, use rhythm and patterns,
include mnemonic devices, and phrase things conversationally.`,

  kinesthetic: `The learner is a KINESTHETIC learner. Ground every explanation in hands-on examples and real-world
actions. Use step-by-step processes and encourage them to try things out.`,

  reading_writing: `The learner is a READING/WRITING learner. Provide detailed written explanations, use numbered
lists and structured notes, and favour precise vocabulary.`,

  logical: `The learner is a LOGICAL learner. Lead with frameworks and systems, show cause-and-effect relationships,
use numbered steps, and connect new ideas to underlying principles.`,

  social: `The learner is a SOCIAL learner. Use collaborative framing ("imagine you're explaining this to a friend"),
reference real-world group scenarios, and connect ideas to people and communities.`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey() {
  const key = process.env.VITE_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key) throw new Error('CLAUDE_API_KEY is not configured');
  return key;
}

async function callClaude({ system, messages, tools, toolChoice, maxTokens = 2048 }) {
  const body = {
    model: 'claude-opus-4-6',
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;
  if (tools) { body.tools = tools; body.tool_choice = toolChoice || { type: 'auto' }; }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Fetch the Supabase user and their learning profile
async function getUserProfile(authHeader, userId) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );

  let userEmail = null;

  // Prefer JWT from Authorization header
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/, '');
    const { data: { user } } = await supabase.auth.getUser(token);
    userEmail = user?.email || null;
  }

  // Fallback: resolve userId (Supabase UUID) to email via service-role
  if (!userEmail && userId) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const admin = createClient(process.env.VITE_SUPABASE_URL, serviceKey);
      const { data: { user } } = await admin.auth.admin.getUserById(userId);
      userEmail = user?.email || null;
    }
  }

  if (!userEmail) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('learning_style, disabilities, accessibility_mode, user_type')
    .eq('created_by', userEmail)
    .maybeSingle();

  return { email: userEmail, profile };
}

// Fetch a file URL and return a Claude content block (image or document)
async function urlToContentBlock(url) {
  try {
    const fileRes = await fetch(url);
    if (!fileRes.ok) return null;
    const contentType = (fileRes.headers.get('content-type') || '').split(';')[0].trim();
    const buffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    if (contentType === 'application/pdf') {
      return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
    }
    if (contentType.startsWith('image/')) {
      return { type: 'image', source: { type: 'base64', media_type: contentType, data: base64 } };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Action: chat
// Personalises the system prompt using the user's learning profile.
// Body: { action: 'chat', messages: [{role, content}], userId? }
// ---------------------------------------------------------------------------
async function handleChat(req, res) {
  const { messages, userId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required for action=chat' });
  }

  const authHeader = req.headers.authorization || '';
  const userData = await getUserProfile(authHeader, userId);
  const profile = userData?.profile;

  const styleKey = profile?.learning_style;
  const styleInstruction = LEARNING_STYLE_INSTRUCTIONS[styleKey] || '';

  const accessibilityNotes = [];
  if (profile?.disabilities?.includes('dyslexia')) {
    accessibilityNotes.push('Use short sentences and avoid dense paragraphs.');
  }
  if (profile?.disabilities?.includes('adhd')) {
    accessibilityNotes.push('Keep responses concise and break information into short chunks.');
  }
  if (profile?.accessibility_mode) {
    accessibilityNotes.push('Use plain, simple language throughout.');
  }

  const system = [
    'You are Alt, an expert AI learning coach built into the Alterex learning platform.',
    'You help students understand their study materials, answer questions, and build confidence.',
    styleInstruction,
    ...accessibilityNotes,
    'Be encouraging and supportive. If a concept is unclear, offer to explain it a different way.',
  ].filter(Boolean).join('\n\n');

  const data = await callClaude({ system, messages, maxTokens: 2048 });

  const textBlock = data.content?.find(b => b.type === 'text');
  return res.json({ response: textBlock?.text || '' });
}

// ---------------------------------------------------------------------------
// Action: extract
// Extracts structured study materials from a document.
// Body: { action: 'extract', document_content?, file_urls?, title? }
// ---------------------------------------------------------------------------
async function handleExtract(req, res) {
  const { document_content, file_urls, title } = req.body;

  if (!document_content && (!Array.isArray(file_urls) || file_urls.length === 0)) {
    return res.status(400).json({ error: 'document_content or file_urls required for action=extract' });
  }

  // Build content array: attach files first, then the text instruction
  const userContent = [];

  if (Array.isArray(file_urls)) {
    const blocks = await Promise.all(file_urls.map(urlToContentBlock));
    blocks.filter(Boolean).forEach(b => userContent.push(b));
  }

  const docText = document_content
    ? `Document content:\n\n${document_content}`
    : 'Analyse the attached file(s) above.';

  userContent.push({
    type: 'text',
    text: `${docText}\n\nExtract and structure this study material. Use the respond tool.`,
  });

  const extractSchema = {
    type: 'object',
    required: ['extracted_text', 'key_concepts', 'summary_short', 'summary_medium', 'summary_detailed'],
    properties: {
      extracted_text: {
        type: 'string',
        description: 'Full clean text extracted from the document',
      },
      key_concepts: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of the most important concepts, terms, or topics (5–15 items)',
      },
      summary_short: {
        type: 'string',
        description: 'One or two sentence overview',
      },
      summary_medium: {
        type: 'string',
        description: 'A single paragraph summary covering the main points',
      },
      summary_detailed: {
        type: 'string',
        description: 'Comprehensive multi-paragraph summary covering all significant content',
      },
      suggested_questions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Five study/review questions a student could use to test their understanding',
      },
    },
  };

  const data = await callClaude({
    system: 'You are an expert at analysing educational documents and extracting structured study materials.',
    messages: [{ role: 'user', content: userContent }],
    tools: [{ name: 'respond', description: 'Return the structured extraction result.', input_schema: extractSchema }],
    toolChoice: { type: 'tool', name: 'respond' },
    maxTokens: 4096,
  });

  const toolBlock = data.content?.find(b => b.type === 'tool_use' && b.name === 'respond');
  if (toolBlock) return res.json(toolBlock.input);

  // Fallback if tool_use didn't fire
  const textBlock = data.content?.find(b => b.type === 'text');
  return res.json({ extracted_text: textBlock?.text || '', key_concepts: [], summary_short: '', summary_medium: '', summary_detailed: '' });
}

// ---------------------------------------------------------------------------
// Legacy path: raw prompt + optional response_json_schema + optional file_urls
// Used by InvokeLLM and ExtractDataFromUploadedFile calls in existing components
// ---------------------------------------------------------------------------
async function handleLegacy(req, res) {
  const { prompt, response_json_schema, file_urls } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const userContent = [];

  if (Array.isArray(file_urls)) {
    const blocks = await Promise.all(file_urls.map(urlToContentBlock));
    blocks.filter(Boolean).forEach(b => userContent.push(b));
  }

  userContent.push({ type: 'text', text: prompt });

  const tools = response_json_schema
    ? [{ name: 'respond', description: 'Respond with structured output matching the required schema.', input_schema: response_json_schema }]
    : undefined;

  const data = await callClaude({
    messages: [{ role: 'user', content: userContent }],
    tools,
    toolChoice: tools ? { type: 'tool', name: 'respond' } : undefined,
    maxTokens: 4096,
  });

  if (response_json_schema) {
    const toolBlock = data.content?.find(b => b.type === 'tool_use' && b.name === 'respond');
    if (toolBlock) return res.json(toolBlock.input);

    // Fallback: parse JSON from text
    const textBlock = data.content?.find(b => b.type === 'text');
    if (textBlock) {
      try {
        const cleaned = textBlock.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        return res.json(JSON.parse(cleaned));
      } catch {
        return res.status(500).json({ error: 'Failed to parse JSON response', raw: textBlock.text });
      }
    }
  }

  const textBlock = data.content?.find(b => b.type === 'text');
  return res.json({ output: textBlock?.text || '' });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body || {};

    if (action === 'chat') return await handleChat(req, res);
    if (action === 'extract') return await handleExtract(req, res);
    return await handleLegacy(req, res);
  } catch (err) {
    console.error('llm handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
