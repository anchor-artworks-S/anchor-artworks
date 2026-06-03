/**
 * Vercel Functions: note 記事の og:image を取得するエンドポイント
 *
 * 使い方: GET /api/note-og?url=https://note.com/anchor_art_works/n/xxxxx
 *
 * note RSS は記事本文を含まないため、サムネが取れない記事が多い。
 * このエンドポイントが note ページを取得して og:image を抽出する。
 *
 * セキュリティ:
 * - note.com 以外の URL は弾く (オープンリダイレクト/SSRF対策)
 *
 * パフォーマンス:
 * - Cache-Control: s-maxage=3600 (Vercel Edge Cache で1時間キャッシュ)
 *   → 同じ記事へのリクエストはキャッシュから返るため高速
 */

export default async function handler(req: any, res: any) {
  const url = typeof req.query?.url === 'string' ? req.query.url : '';

  if (!url) {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  // セキュリティ: note.com ドメインに限定
  let target: URL;
  try {
    target = new URL(url);
    if (!target.hostname.endsWith('note.com')) {
      return res.status(400).json({ error: 'Only note.com URLs are allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AAW-Site/1.0; +https://anchor-artworks.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Failed to fetch note page: ${response.status}` });
    }

    const html = await response.text();

    // og:image を抽出 (content と property の順序が逆になる場合も両方試す)
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    const ogImage = match ? match[1] : '';

    // 1時間キャッシュ (サムネはほぼ変わらない) + 1日間 stale-while-revalidate
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json({ ogImage });
  } catch (e: any) {
    console.error('[note-og] error:', e?.message || e);
    return res.status(500).json({ error: 'Failed to extract og:image' });
  }
}
