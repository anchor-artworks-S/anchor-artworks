/**
 * Vercel Functions: お問い合わせフォーム送信エンドポイント
 *
 * フロントから fetch('/api/contact', { method: 'POST', body: ... }) で呼ぶ。
 * Resend 経由でメール送信する。
 *
 * 環境変数(Vercel):
 *   RESEND_API_KEY  … Resend の API キー (必須)
 *   CONTACT_FROM    … 差出人 (任意, 既定: AAW <info@anchor-artworks.com>)
 *   CONTACT_TO      … 受信先 (任意, 既定: aawaisample@gmail.com)
 *
 * ※ CONTACT_FROM のドメインは Resend で認証済みである必要があります。
 *   認証前は onboarding@resend.dev を CONTACT_FROM に設定すれば動作確認できます。
 */

import { Resend } from 'resend';

interface ContactRequest {
  inquiryType?: string;
  message?: string;
  company?: string;
  name?: string;
  kana?: string;
  phone?: string;
  email?: string;
  website?: string;
  agreed?: boolean;
  // honeypot (bot が埋めると弾く隠しフィールド)
  _hp?: string;
}

// ────────────────────────────────────────
// Rate limit (best-effort, in-memory)
// ────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3; // 同一IP / 1分 / 最大3送信
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
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000);
    return { allowed: false, retryAfterSec };
  }
  recent.push(now);
  rateLimitStore.set(ip, recent);
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      const f = v.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (f.length === 0) rateLimitStore.delete(k);
      else rateLimitStore.set(k, f);
    }
  }
  return { allowed: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec ?? 60));
    return res.status(429).json({ error: '送信回数が多すぎます。しばらくお待ちください。' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY is not configured');
    return res.status(500).json({ error: 'メール送信サービスが設定されていません。' });
  }

  try {
    const body: ContactRequest =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const {
      inquiryType = '',
      message = '',
      company = '',
      name = '',
      kana = '',
      phone = '',
      email = '',
      website = '',
      agreed = false,
      _hp = '',
    } = body || {};

    // Honeypot: bot が隠しフィールドを埋めたら、成功を装って破棄
    if (_hp && _hp.trim() !== '') {
      console.warn('[contact] honeypot triggered from', ip);
      return res.status(200).json({ ok: true });
    }

    // Validation
    const errors: string[] = [];
    if (!message.trim()) errors.push('お問い合わせ内容');
    if (!company.trim()) errors.push('会社名');
    if (!name.trim()) errors.push('お名前');
    if (!kana.trim()) errors.push('フリガナ');
    if (!phone.trim()) errors.push('電話番号');
    if (!email.trim() || !EMAIL_RE.test(email)) errors.push('メールアドレス');
    if (!agreed) errors.push('プライバシーポリシーへの同意');

    if (errors.length > 0) {
      return res.status(400).json({ error: `入力内容をご確認ください：${errors.join(' / ')}` });
    }

    // Length guard
    if (message.length > 5000) {
      return res.status(400).json({ error: 'お問い合わせ内容が長すぎます。' });
    }

    const from = process.env.CONTACT_FROM || 'Anchor Art Works <info@anchor-artworks.com>';
    const to = process.env.CONTACT_TO || 'aawaisample@gmail.com';

    const subjectName = name || '名称未設定';
    const subjectCompany = company ? `${company} / ` : '';
    const subject = `【AAW お問い合わせ】${subjectCompany}${subjectName} 様`;

    const textBody = [
      'Anchor Art Works サイトよりお問い合わせがありました。',
      '',
      '──────────────────────',
      `■ お問い合わせ項目: ${inquiryType || '（未選択）'}`,
      '',
      '■ お問い合わせ内容:',
      message,
      '──────────────────────',
      '【お客様情報】',
      `会社名      : ${company}`,
      `お名前      : ${name}`,
      `フリガナ    : ${kana}`,
      `電話番号    : ${phone}`,
      `メール      : ${email}`,
      `Webサイト   : ${website || '（未入力）'}`,
      '──────────────────────',
      '',
      'このメールに「返信」すると、お客様（上記メールアドレス）へ直接届きます。',
    ].join('\n');

    const htmlBody = `
      <div style="font-family: -apple-system, 'Segoe UI', sans-serif; color:#111; line-height:1.7; max-width:640px;">
        <p style="font-size:13px;color:#666;">Anchor Art Works サイトよりお問い合わせがありました。</p>
        <div style="background:#f6f6f8;border-radius:10px;padding:20px;margin:16px 0;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#888;letter-spacing:1px;">お問い合わせ項目</p>
          <p style="margin:0 0 18px;font-size:15px;">${escapeHtml(inquiryType) || '（未選択）'}</p>
          <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#888;letter-spacing:1px;">お問い合わせ内容</p>
          <p style="margin:0;font-size:15px;white-space:pre-wrap;">${escapeHtml(message)}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            <tr><td style="padding:6px 0;color:#888;width:110px;">会社名</td><td style="padding:6px 0;">${escapeHtml(company)}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">お名前</td><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">フリガナ</td><td style="padding:6px 0;">${escapeHtml(kana)}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">電話番号</td><td style="padding:6px 0;">${escapeHtml(phone)}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">メール</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#888;">Webサイト</td><td style="padding:6px 0;">${escapeHtml(website) || '（未入力）'}</td></tr>
          </tbody>
        </table>
        <p style="font-size:12px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:12px;">
          このメールに「返信」すると、お客様へ直接届きます。
        </p>
      </div>
    `;

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo: email, // ← 客のメール。返信すると客に届く
      subject,
      text: textBody,
      html: htmlBody,
    });

    if (error) {
      console.error('[contact] resend error:', error);
      return res.status(502).json({ error: 'メール送信に失敗しました。時間をおいて再度お試しください。' });
    }

    console.log('[contact] sent', { id: data?.id, to, ip });
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e: any) {
    console.error('[contact] error:', e?.message || e);
    return res.status(500).json({ error: '送信処理でエラーが発生しました。' });
  }
}
