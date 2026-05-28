/**
 * Vercel Functions: AI Concierge endpoint
 *
 * フロントエンドからは fetch('/api/concierge', { method: 'POST', body: ... }) で呼ぶ。
 * GEMINI_API_KEY はサーバー専用環境変数(VITE_ 接頭辞なし)としてVercelに設定済み。
 * ブラウザにはAPIキーが露出しない。
 */

import { GoogleGenAI } from '@google/genai';

type Msg = { role: 'user' | 'assistant'; content: string };

interface ConciergeRequest {
  history: Msg[];
  message: string;
  systemPrompt: string;
}

// ────────────────────────────────────────
// In-memory rate limit (best-effort, Vercel may reuse instances)
// 完全ではないが、Vercel Functions の instance 再利用により大半のスパムは抑止できる
// ────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1分間のウィンドウ
const RATE_LIMIT_MAX = 5; // 同一IPあたり1分間に最大5リクエスト
const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: any): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length > 0) return xff[0];
  return (req.headers['x-real-ip'] as string) || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const arr = rateLimitStore.get(ip) || [];
  const recent = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  rateLimitStore.set(ip, recent);

  // Occasional cleanup to avoid unbounded growth
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      const filtered = v.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (filtered.length === 0) rateLimitStore.delete(k);
      else rateLimitStore.set(k, filtered);
    }
  }

  return { allowed: true };
}

// Vercel Functions(Node runtime) のリクエスト/レスポンス型は any でも動く
// 厳密にやるなら @vercel/node を入れて VercelRequest/VercelResponse を使う
export default async function handler(req: any, res: any) {
  // Method check
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit by client IP (5 requests / minute / IP)
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    console.warn('[concierge] rate limit exceeded for', ip);
    res.setHeader('Retry-After', String(rl.retryAfterSec ?? 60));
    return res.status(429).json({
      error: 'リクエストが多すぎます。しばらくお待ちください。',
      retryAfterSec: rl.retryAfterSec,
    });
  }

  // API key check
  const apiKey = process.env.GEMINI_API_KEY;

  // Diagnostic log (no key contents — only metadata)
  console.log('[concierge] env check', {
    hasKey: !!apiKey,
    length: apiKey?.length ?? 0,
    trimmedLength: apiKey?.trim().length ?? 0,
    runtime: process.env.VERCEL ? 'vercel' : 'local',
    region: process.env.VERCEL_REGION ?? 'unknown',
    // どのキー名がセットされているかも確認(タイポ検知)
    envKeysPrefixedGEMINI: Object.keys(process.env).filter(k => k.toUpperCase().includes('GEMINI')),
  });

  if (!apiKey) {
    console.error('[concierge] GEMINI_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service is not configured' });
  }

  try {
    // Parse body (Vercel parses JSON automatically when content-type is application/json)
    const body: ConciergeRequest =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const { history = [], message, systemPrompt = '' } = body || ({} as ConciergeRequest);

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Light guardrails
    if (message.length > 2000) {
      return res.status(400).json({ error: 'message too long (max 2000 chars)' });
    }
    if (history.length > 30) {
      // クライアント側で持っている履歴が長くなりすぎないように
      history.splice(0, history.length - 30);
    }

    const ai = new GoogleGenAI({ apiKey });

    // Frontend history shape -> Gemini shape
    const geminiHistory = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
      history: geminiHistory as any,
    });

    const response = await chat.sendMessage({ message });
    const text =
      response.text || '申し訳ございません。応答の生成に失敗しました。';

    return res.status(200).json({ text });
  } catch (e: any) {
    console.error('[concierge] error:', e?.message || e);
    return res.status(500).json({
      error: 'AI request failed',
      detail: e?.message ?? String(e),
    });
  }
}
