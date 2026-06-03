/**
 * Vercel Functions: note RSS を取得・パースして返すエンドポイント
 *
 * 使い方: GET /api/note-rss
 *
 * 旧実装では rss2json.com を経由していたが、同サービスのキャッシュが30分〜数時間程度あり、
 * note 投稿から反映までの遅延が大きかった。本エンドポイントで直接取得することで
 * 自前のキャッシュ制御 (s-maxage=300) に切り替え、反映遅延を最大5分以内に短縮する。
 *
 * パフォーマンス:
 * - Cache-Control: s-maxage=300 (Vercel Edge Cache 5分)
 * - stale-while-revalidate=600 (10分以内なら古いキャッシュを返しつつ裏で更新)
 */

const NOTE_RSS_URL = 'https://note.com/anchor_art_works/rss';

interface NoteRssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  categories: string[];
  thumbnail: string;
  enclosure: { link: string };
}

// CDATA セクション or 通常の XML テキストから値を抽出
function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return plain ? plain[1].trim() : '';
}

// XML エンティティのデコード (& < > " '
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

export default async function handler(req: any, res: any) {
  try {
    const response = await fetch(NOTE_RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AAW-Site/1.0; +https://anchor-artworks.com)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      console.error('[note-rss] fetch failed:', response.status);
      return res.status(502).json({
        error: `Failed to fetch note RSS: ${response.status}`,
        items: [],
      });
    }

    const xml = await response.text();
    const items: NoteRssItem[] = [];

    // <item>…</item> の各ブロックを抽出
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = decodeEntities(extractTag(itemXml, 'title'));
      const link = decodeEntities(extractTag(itemXml, 'link'));
      const pubDate = extractTag(itemXml, 'pubDate');
      const description = decodeEntities(extractTag(itemXml, 'description'));

      // categories は複数あるので個別に抽出
      const catRegex = /<category[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/category>/g;
      const categories: string[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = catRegex.exec(itemXml)) !== null) {
        const cat = (cm[1] || cm[2] || '').trim();
        if (cat) categories.push(decodeEntities(cat));
      }

      // サムネ取得の優先順:
      //   1. <media:thumbnail url="..."> (note RSS でたまに付与される)
      //   2. <enclosure url="..." type="image/...">
      //   3. description 内の最初の <img src="...">
      let thumbnail = '';
      let enclosureLink = '';
      const mediaThumb = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/);
      if (mediaThumb) thumbnail = mediaThumb[1];
      const enclosure = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/);
      if (enclosure) enclosureLink = enclosure[1];
      if (!thumbnail) {
        const descImg = description.match(/<img[^>]+src=["']([^"']+)["']/);
        if (descImg) thumbnail = descImg[1];
      }

      if (title || link) {
        items.push({
          title,
          link,
          pubDate,
          description,
          categories,
          thumbnail,
          enclosure: { link: enclosureLink },
        });
      }
    }

    // Vercel Edge Cache 5分 + 10分間の stale-while-revalidate
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({ items });
  } catch (e: any) {
    console.error('[note-rss] error:', e?.message || e);
    return res.status(500).json({ error: 'Failed to fetch note RSS', items: [] });
  }
}
