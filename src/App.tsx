/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import { useState, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";
import { buildSystemPrompt } from "./aiPrompt";
import {
  ExternalLink,
  X,
  Play,
  TrendingUp,
  ArrowRight,
  Send,
  Sparkles,
  ChevronRight,
  Menu,
  ChevronDown,
  Plus,
  Mail,
  Video,
  BookOpen,
  Instagram,
  Facebook,
} from "lucide-react";
import { Analytics } from "@vercel/analytics/react";

// --- Types ---
type Page = 'home' | 'works' | 'whatwedo' | 'about' | 'journal' | 'contact' | 'privacy';

interface NotePost {
  title: string;
  date: string;
  excerpt: string;
  url: string;
  tags: string[];
  image?: string;
}

interface Work {
  id: string;
  title: string;
  category: string;
  tags: string[];
  thumbnail: string;
  videoPreview: string;
  m07_solution: string;
  a01_intent: string;
  m03_results: string[];
  e_id_link: string;
  vimeoId?: string;
  stats?: { views: string; likes: string; };
  viewCount?: number;
  // Sheet metadata (Aisle framework + operational columns)
  isSelected?: boolean;
  displayOrder?: number;
  clientName?: string;
  isPublished?: boolean;
  uploadedAt?: string;
  // Sheet row index — implicit display order (Sheet 行順 = 掲載順)
  sheetRowIndex?: number;
}

// Category sort order
const CATEGORY_ORDER = ['GAME', 'EVENT', 'PR', 'GRAPHIC', 'COAPORATE', 'OTHER'];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// --- Constants ---
const NOTE_RSS_URL = "https://note.com/anchor_art_works/rss";

const NOTE_POSTS: NotePost[] = [
  {
    title: "「消費される映像」と「定着する映像」の構造的差異について",
    date: "2024.03.15",
    excerpt: "なぜ、多額の予算をかけた映像が数日で忘れ去られるのか。認知心理学の観点から、情報の『錨』を下ろす設計手法を解説します。",
    url: "https://note.com/anchor_art_works",
    tags: ["Branding", "Strategy"],
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=800"
  },
  {
    title: "AI時代の映像制作会社が、あえて『人間性』を構造化する理由",
    date: "2024.02.28",
    excerpt: "生成AIが映像を量産する時代。私たちが提唱するAisleフレームワークが、いかにしてブランドの独自性を守り抜くのか。",
    url: "https://note.com/anchor_art_works",
    tags: ["AI", "Aisle"],
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800"
  },
  {
    title: "eスポーツの熱量を、ビジネス映像に転用する『動態設計』の極意",
    date: "2024.01.10",
    excerpt: "0.1秒の攻防が勝敗を分けるeスポーツの世界。その緻密なリズム設計を、企業のブランディング映像にどう落とし込むべきか。",
    url: "https://note.com/anchor_art_works",
    tags: ["eSports", "Motion"],
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800"
  },
  {
    title: "note PRO活用で変わる、法人コンテンツ戦略の新常識",
    date: "2023.12.20",
    excerpt: "法人向け情報発信プラットフォームとして注目されるnote PRO。多くのビジネスパーソンが集まるメディアをどう活かすか。",
    url: "https://note.com/anchor_art_works",
    tags: ["note", "Marketing"],
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800"
  }
];

const FALLBACK_WORKS_DATA: Work[] = [
  {
    id: "work-battlespirits",
    title: "Battle Spirits",
    category: "PR",
    tags: ["Motion", "Creative", "eSports"],
    thumbnail: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop",
    videoPreview: "",
    vimeoId: "823456789",
    stats: { views: "1.8M", likes: "120K" },
    m07_solution: "15年の歴史を凝縮するため、歴代カードの動態設計を再構築。勝田友亮によるロジカルなエフェクト配置により、ファンが瞬時に熱狂する『情報の密度』を極限まで高めました。",
    a01_intent: "単なる懐古ではなく、未来への『進化』を意図。当社は、カードゲーム特有の戦略性を、0.1秒単位のカット割りで表現し、競技シーンの熱量を再現しました。",
    m03_results: ["YouTube急上昇ランク 1位獲得", "関連商品予約数 過去最高を記録"],
    e_id_link: "https://anchor-art.com/works/battle-spirits/"
  },
  {
    id: "work-cucina",
    title: "CUCINA（クチーナ）",
    category: "COAPORATE",
    tags: ["Branding", "Product"],
    thumbnail: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=1974&auto=format&fit=crop",
    videoPreview: "",
    vimeoId: "712345678",
    stats: { views: "2.5M", likes: "85K" },
    m07_solution: "製品の質感と信頼性を証明するため、マクロ撮影による質感表現と、スピード感を強調するモーショングラフィックスを融合。",
    a01_intent: "当社は、データという形のない資産を守る『盾』としての製品を定義。放送品質のクリーンなトーンでブランドの誠実さを表現しました。",
    m03_results: ["グローバル売上目標 150% 達成", "広告想起率 40% 向上"],
    e_id_link: "https://anchor-art.com/works/cucina/"
  },
  {
    id: "work-monsterstrike",
    title: "MONSTER STRIKE PRO TOUR",
    category: "EVENT",
    tags: ["eSports", "Event", "Motion"],
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
    videoPreview: "",
    vimeoId: "934567890",
    stats: { views: "3.2M", likes: "210K" },
    m07_solution: "eスポーツ特有の緊張感を、矢戸光一の編集技術で増幅。プレイヤーの心理状態とシンクロするリズム設計により、会場全体を一体化させる『動態の同期』を実現しました。",
    a01_intent: "競技者の『覚悟』を主軸に。当社は、ドキュメンタリー的なリアリズムと、ド派手なVFXを融合させ、スポーツとしての映像美を追求しました。",
    m03_results: ["同時視聴者数 50万人突破", "SNSトレンド 世界1位獲得"],
    e_id_link: "https://anchor-art.com/works/monsterstrike/"
  },
  {
    id: "work-4",
    title: "CUCINA（クチーナ）",
    category: "COAPORATE",
    tags: ["Branding"],
    thumbnail: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?q=80&w=2070",
    videoPreview: "",
    m07_solution: "",
    a01_intent: "",
    m03_results: [],
    e_id_link: ""
  },
  {
    id: "work-5",
    title: "CUCINA（クチーナ）",
    category: "PR",
    tags: ["Motion"],
    thumbnail: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070",
    videoPreview: "",
    m07_solution: "",
    a01_intent: "",
    m03_results: [],
    e_id_link: ""
  },
  {
    id: "work-6",
    title: "MONSTER STRIKE PRO TOUR",
    category: "EVENT",
    tags: ["eSports"],
    thumbnail: "https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=2070",
    videoPreview: "",
    m07_solution: "",
    a01_intent: "",
    m03_results: [],
    e_id_link: ""
  },
];

// Derive page from URL path
function pathToPage(pathname: string): Page {
  const p = pathname.toLowerCase();
  if (p.startsWith('/works')) return 'works';
  if (p.startsWith('/whatwedo')) return 'whatwedo';
  if (p.startsWith('/about')) return 'about';
  if (p.startsWith('/journal')) return 'journal';
  if (p.startsWith('/contact')) return 'contact';
  if (p.startsWith('/privacy')) return 'privacy';
  return 'home';
}

function pageToPath(page: Page): string {
  return page === 'home' ? '/' : `/${page}`;
}

export default function App() {
  const [currentPage, _setCurrentPage] = useState<Page>(() =>
    typeof window !== 'undefined' ? pathToPage(window.location.pathname) : 'home'
  );
  const [emailToast, setEmailToast] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('info@anchor-artworks.com');
    } catch {
      // older browsers fallback
      const ta = document.createElement('textarea');
      ta.value = 'info@anchor-artworks.com';
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setEmailToast(true);
    setTimeout(() => setEmailToast(false), 2500);
  };

  // Wrapper: update state AND URL (via History API, no page reload)
  const setCurrentPage = (page: Page) => {
    _setCurrentPage(page);
    if (typeof window !== 'undefined') {
      const newPath = pageToPath(page);
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
      }
    }
  };

  // Sync state when user uses browser back/forward
  useEffect(() => {
    const onPopState = () => _setCurrentPage(pathToPage(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Update document.title per page (SPA-friendly, AI/SEO信号にも有効)
  useEffect(() => {
    const SITE_NAME = 'Anchor Art Works';
    const TAGLINE = 'CG・映像制作を、思考の速度で。';
    const titles: Record<Page, string> = {
      home: `${SITE_NAME} | ${TAGLINE}`,
      works: `WORKS — 実績 | ${SITE_NAME}`,
      whatwedo: `WHAT WE DO — 提供領域 | ${SITE_NAME}`,
      about: `ABOUT — チーム・代表・カルチャー | ${SITE_NAME}`,
      journal: `JOURNAL — いま考えていること | ${SITE_NAME}`,
      contact: `CONTACT — お問い合わせ | ${SITE_NAME}`,
      privacy: `プライバシーポリシー | ${SITE_NAME}`,
    };
    document.title = titles[currentPage] || `${SITE_NAME} | ${TAGLINE}`;
  }, [currentPage]);

  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [works, setWorks] = useState<Work[]>(FALLBACK_WORKS_DATA);
  const [journalPosts, setJournalPosts] = useState<NotePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingJournal, setIsLoadingJournal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch all Vimeo videos (up to 300, paginated 100 each)
    const fetchAllVimeoVideos = async (token: string): Promise<Work[]> => {
      try {
        let allVideos: any[] = [];
        for (let page = 1; page <= 3; page++) {
          const response = await fetch(`https://api.vimeo.com/me/videos?per_page=100&page=${page}&fields=uri,name,pictures.base_link,description,stats,metadata,created_time`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) break;
          const data = await response.json();
          if (data.data && data.data.length > 0) allVideos = [...allVideos, ...data.data];
          if (!data.paging || !data.paging.next) break;
        }
        return allVideos.map((v) => {
          const vimeoId = v.uri.split('/').pop() || Math.random().toString();
          const plays = Number(v.stats?.plays) || 0;
          return {
            id: vimeoId,
            title: v.name || "Untitled",
            category: "OTHER",
            tags: [],
            thumbnail: v.pictures?.base_link || "",
            videoPreview: "",
            vimeoId,
            m07_solution: v.description || "",
            a01_intent: "",
            m03_results: [],
            e_id_link: "",
            uploadedAt: v.created_time || "",
            isPublished: true,
            isSelected: false,
            displayOrder: undefined,
            clientName: "",
            viewCount: plays,
            stats: {
              views: plays.toLocaleString(),
              likes: v.metadata?.connections?.likes?.total?.toLocaleString() || "0"
            }
          };
        });
      } catch (error) {
        console.error("Vimeo fetch error:", error);
        return [];
      }
    };

    // Fetch Sheet metadata, return map: vimeoId -> partial Work
    const fetchSheetMetadata = (sheetUrl: string): Promise<Map<string, Partial<Work>>> => {
      return new Promise((resolve) => {
        fetch(sheetUrl)
          .then(r => r.text())
          .then(csvText => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const map = new Map<string, Partial<Work>>();
                (results.data as any[]).forEach((row, rowIdx) => {
                  // Partial-match lookup: find header containing keyword (case-insensitive)
                  // → ヘッダ行に補足文を追記しても、キーワード部分が残っていればOK
                  // 例: "G列:is_selected\nSELECTED WORKSの掲載（3つ）" でも "is_selected" を検出
                  const lookup = (keyword: string) => {
                    const lc = keyword.toLowerCase();
                    const found = Object.keys(row).find(k => k.toLowerCase().includes(lc));
                    return found ? String(row[found] ?? '').trim() : '';
                  };
                  const vimeoId = lookup('vimeoid');
                  if (!vimeoId) return;
                  const titleOverride = lookup('title');
                  const productionNote = lookup('production_note');
                  const strategy = lookup('strategy');
                  const evidenceUrl = lookup('evidence_url');
                  const category = (lookup('category') || 'OTHER').toUpperCase();
                  const isSelected = /^true$/i.test(lookup('is_selected'));
                  const displayOrderStr = lookup('display_order');
                  const displayOrder = displayOrderStr ? Number(displayOrderStr) : undefined;
                  const clientName = lookup('client_name');
                  const publishedStr = lookup('is_published');
                  const isPublished = publishedStr === '' ? true : /^true$/i.test(publishedStr);

                  map.set(vimeoId, {
                    ...(titleOverride && { title: titleOverride }),
                    category: CATEGORY_ORDER.includes(category) ? category : 'OTHER',
                    isSelected,
                    displayOrder,
                    clientName,
                    isPublished,
                    sheetRowIndex: rowIdx,
                    ...(productionNote && { a01_intent: productionNote }),
                    ...(strategy && { m07_solution: strategy }),
                    ...(evidenceUrl && { e_id_link: evidenceUrl }),
                  });
                });
                resolve(map);
              },
              error: () => resolve(new Map()),
            });
          })
          .catch(() => resolve(new Map()));
      });
    };

    const loadWorks = async () => {
      setIsLoading(true);
      const sheetUrl = import.meta.env.VITE_WORKS_SHEET_URL;
      const vimeoToken = import.meta.env.VITE_VIMEO_ACCESS_TOKEN;

      // 1. Fetch Vimeo (base) + Sheet (metadata) in parallel
      const [vimeoWorks, sheetMap] = await Promise.all([
        vimeoToken ? fetchAllVimeoVideos(vimeoToken) : Promise.resolve([] as Work[]),
        sheetUrl ? fetchSheetMetadata(sheetUrl) : Promise.resolve(new Map<string, Partial<Work>>()),
      ]);

      // 2. If both empty, use hardcoded fallback
      if (vimeoWorks.length === 0 && sheetMap.size === 0) {
        setWorks(FALLBACK_WORKS_DATA);
        setIsLoading(false);
        return;
      }

      // 3. Merge: Vimeo base + Sheet metadata overlay by vimeoId
      let merged: Work[] = vimeoWorks.map(v => {
        const meta = sheetMap.get(v.vimeoId || '') || {};
        return { ...v, ...meta };
      });

      // 4. If Sheet has rows for vimeoIds NOT in Vimeo response, include those too (with placeholder)
      sheetMap.forEach((meta, vimeoId) => {
        if (!merged.find(w => w.vimeoId === vimeoId)) {
          merged.push({
            id: vimeoId,
            title: meta.title || 'Untitled',
            category: meta.category || 'OTHER',
            tags: [],
            thumbnail: `https://vumbnail.com/${vimeoId}.jpg`,
            videoPreview: '',
            vimeoId,
            m07_solution: meta.m07_solution || '',
            a01_intent: meta.a01_intent || '',
            m03_results: [],
            e_id_link: meta.e_id_link || '',
            isSelected: meta.isSelected,
            displayOrder: meta.displayOrder,
            clientName: meta.clientName,
            isPublished: meta.isPublished,
          });
        }
      });

      // 5. Filter out is_published === false
      merged = merged.filter(w => w.isPublished !== false);

      // 6. Sort: CATEGORY_ORDER → Sheet row index (掲載順) → uploadedAt desc (fallback)
      merged.sort((a, b) => {
        const ca = CATEGORY_ORDER.indexOf(a.category || 'OTHER');
        const cb = CATEGORY_ORDER.indexOf(b.category || 'OTHER');
        if (ca !== cb) return (ca === -1 ? 999 : ca) - (cb === -1 ? 999 : cb);
        // Within category: Sheet 行順を最優先（小さい行Indexが先）
        const ra = a.sheetRowIndex ?? Infinity;
        const rb = b.sheetRowIndex ?? Infinity;
        if (ra !== rb) return ra - rb;
        // Sheet に無い動画は Vimeo アップロード日 新しい順
        return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
      });

      setWorks(merged);
      setIsLoading(false);
    };

    loadWorks();
  }, []);

  useEffect(() => {
    const MAX_POSTS = 50;

    // Fetch pinned posts from Sheet (if URL env var exists)
    const fetchNotePins = async (): Promise<NotePost[]> => {
      const pinsUrl = import.meta.env.VITE_NOTE_PINS_SHEET_URL;
      if (!pinsUrl) return [];
      try {
        const response = await fetch(pinsUrl);
        if (!response.ok) return [];
        const csvText = await response.text();
        return new Promise((resolve) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const pins: { post: NotePost; order: number }[] = [];
              (results.data as any[]).forEach((row) => {
                // Partial-match lookup, same pattern as Works sheet
                const lookup = (kw: string) => {
                  const lc = kw.toLowerCase();
                  const found = Object.keys(row).find(k => k.toLowerCase().includes(lc));
                  return found ? String(row[found] ?? '').trim() : '';
                };
                const title = lookup('title');
                const url = lookup('url');
                if (!title || !url) return;
                const orderStr = lookup('display_order');
                const order = orderStr ? Number(orderStr) : Infinity;
                pins.push({
                  post: {
                    title,
                    url,
                    excerpt: lookup('excerpt'),
                    date: lookup('date'),
                    tags: [],
                    image: lookup('thumbnail') || undefined,
                  },
                  order,
                });
              });
              pins.sort((a, b) => a.order - b.order);
              resolve(pins.map(p => p.post));
            },
            error: () => resolve([]),
          });
        });
      } catch (e) {
        console.warn("Note pins fetch failed:", e);
        return [];
      }
    };

    // Fetch dynamic posts from note RSS
    // URL正規化: クエリパラメータ・末尾スラッシュ・httpの違いを吸収
    // Sheet の URL (?app_launch=false 等付き) と RSS の URL (素のもの) を一致させる
    const normalizeNoteUrl = (url: string): string => {
      try {
        const u = new URL(url);
        return `${u.origin}${u.pathname.replace(/\/$/, '')}`;
      } catch {
        return url;
      }
    };

    // サムネ取得を強化: thumbnail / enclosure が空でも description HTML から <img> を抽出
    const extractImage = (item: any): string => {
      if (item.thumbnail) return item.thumbnail;
      if (item.enclosure?.link) return item.enclosure.link;
      const match = (item.description || '').match(/<img[^>]+src=["']([^"']+)["']/);
      return match ? match[1] : '';
    };

    // og:image を Vercel Functions 経由で取得 (note RSS が img を返さない場合のフォールバック)
    const fetchOgImage = async (url: string): Promise<string> => {
      try {
        const res = await fetch(`/api/note-og?url=${encodeURIComponent(url)}`);
        if (!res.ok) return '';
        const data = await res.json();
        return data.ogImage || '';
      } catch {
        return '';
      }
    };

    const fetchNoteRss = async (): Promise<NotePost[]> => {
      try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(NOTE_RSS_URL)}`);
        if (!response.ok) return [];
        const data = await response.json();
        if (!data.items || data.items.length === 0) return [];
        const items: NotePost[] = data.items.map((item: any) => ({
          title: item.title,
          date: new Date(item.pubDate).toLocaleDateString('ja-JP').replace(/\//g, '.'),
          excerpt: (item.description || '').replace(/<[^>]*>?/gm, '').substring(0, 100) + "...",
          url: item.link,
          tags: item.categories || [],
          image: extractImage(item),
        }));
        // サムネが取れていない記事だけ、og:image を並列フェッチで補完
        await Promise.all(
          items.map(async (item) => {
            if (!item.image && item.url) {
              item.image = await fetchOgImage(item.url);
            }
          })
        );
        return items;
      } catch (e) {
        console.warn("Note RSS fetch failed:", e);
        return [];
      }
    };

    const loadNotePosts = async () => {
      setIsLoadingJournal(true);
      const [pins, rss] = await Promise.all([fetchNotePins(), fetchNoteRss()]);
      // Combine: pins first, then RSS posts (excluding URLs already in pins, with URL normalization)
      const pinUrls = new Set(pins.map(p => normalizeNoteUrl(p.url)));
      const remaining = rss.filter(p => !pinUrls.has(normalizeNoteUrl(p.url)));
      const combined = [...pins, ...remaining].slice(0, MAX_POSTS);
      setJournalPosts(combined);
      setIsLoadingJournal(false);
    };

    loadNotePosts();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'works', label: 'Works' },
    { id: 'whatwedo', label: 'What We Do' },
    { id: 'about', label: 'About' },
    { id: 'journal', label: 'Journal' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white">
      <Analytics />
      <CustomCursor />
      <FloatingCTA onClick={() => setCurrentPage('contact')} hidden={currentPage === 'contact'} />
      {/* Email-copied toast */}
      <AnimatePresence>
        {emailToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-brand text-black px-6 py-3 rounded-full shadow-2xl text-xs font-bold tracking-widest uppercase whitespace-nowrap flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <Mail size={14} />
            <span>メールアドレスをコピーしました</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/95 backdrop-blur-md border-b border-white/5 h-14 md:h-20' : 'bg-black h-14 md:h-20'}`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
          {/* Logo (AAW + Anchor Art Works 一体型) */}
          <button
            onClick={() => { setCurrentPage('home'); setIsMobileMenuOpen(false); }}
            className="hover:opacity-80 transition-opacity"
            aria-label="Anchor Art Works"
          >
            <img src="/wh_logomark.png" alt="Anchor Art Works" className="h-7 md:h-10 w-auto object-contain" />
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-[11px] font-bold uppercase tracking-[0.18em]">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setCurrentPage(link.id as Page)}
                className={`relative py-1 transition-colors ${
                  currentPage === link.id
                    ? "text-white border-b border-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 left-0 w-full bg-black border-b border-white/5 shadow-lg md:hidden"
            >
              <nav className="flex flex-col p-6 space-y-1">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => { setCurrentPage(link.id as Page); setIsMobileMenuOpen(false); }}
                    className={`text-xs font-bold uppercase tracking-widest text-left py-4 border-b border-white/5 ${
                      currentPage === link.id ? "text-white" : "text-white/40"
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 pt-0">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <HomePage
                works={works}
                isLoading={isLoading}
                isLoadingJournal={isLoadingJournal}
                journalPosts={journalPosts}
                onNavigateToWorks={() => setCurrentPage('works')}
                onNavigateToContact={() => setCurrentPage('contact')}
                onSelectWork={setSelectedWork}
              />
            </motion.div>
          )}
          {currentPage === 'works' && (
            <motion.div key="works" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <WorksPage works={works} isLoading={isLoading} onSelectWork={setSelectedWork} onNavigateToContact={() => setCurrentPage('contact')} />
            </motion.div>
          )}
          {currentPage === 'whatwedo' && (
            <motion.div key="whatwedo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <WhatWeDoPage onNavigateToContact={() => setCurrentPage('contact')} />
            </motion.div>
          )}
          {currentPage === 'about' && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <AboutPage onNavigateToContact={() => setCurrentPage('contact')} />
            </motion.div>
          )}
          {currentPage === 'journal' && (
            <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <JournalPage journalPosts={journalPosts} isLoadingJournal={isLoadingJournal} onNavigateToContact={() => setCurrentPage('contact')} />
            </motion.div>
          )}
          {currentPage === 'contact' && (
            <motion.div key="contact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ContactPage works={works} onNavigateToPrivacy={() => setCurrentPage('privacy')} />
            </motion.div>
          )}
          {currentPage === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <PrivacyPolicyPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedWork && (
          <WorkModal work={selectedWork} onClose={() => setSelectedWork(null)} />
        )}
      </AnimatePresence>

      <footer className="bg-black text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-14 md:py-16">
          {/* Sitemap */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-8 mb-12">
            {[
              { id: 'home', label: 'Home', desc: 'はじまり' },
              { id: 'works', label: 'Works', desc: '映像で語る、これまでの実績' },
              { id: 'whatwedo', label: 'What We Do', desc: '私たちが提供できる領域' },
              { id: 'about', label: 'About', desc: 'チーム・代表・カルチャー' },
              { id: 'journal', label: 'Journal', desc: 'いま考えていること' },
              { id: 'contact', label: 'Contact', desc: '相談・打ち合わせへ' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id as Page)}
                className="text-left group"
              >
                <div className="text-base md:text-lg font-display font-bold tracking-tight text-white group-hover:text-brand transition-colors">
                  {item.label}
                </div>
                <div className="text-[11px] text-white/55 mt-2 leading-relaxed">{item.desc}</div>
              </button>
            ))}
          </div>

          {/* Social / Contact links */}
          <div className="pt-8 border-t border-white/15 mb-6">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3">
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand">FOLLOW &amp; CONTACT</span>
              <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
                <a
                  href="https://note.com/anchor_art_works"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-brand transition-colors"
                  aria-label="note"
                >
                  <BookOpen size={14} />
                  <span>note</span>
                </a>
                <a
                  href="https://www.instagram.com/anchorartworks1981/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-brand transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={14} />
                  <span>Instagram</span>
                </a>
                <a
                  href="https://www.facebook.com/anchorjp1981/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-brand transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook size={14} />
                  <span>Facebook</span>
                </a>
                <a
                  href="https://x.com/AnchorArtWorks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-brand transition-colors"
                  aria-label="X (Twitter)"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>X</span>
                </a>
                <a
                  href="https://vimeo.com/user27201919"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-brand transition-colors"
                  aria-label="Vimeo"
                >
                  <Video size={14} />
                  <span>Vimeo</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-brand transition-colors"
                  aria-label="メールアドレスをコピー: info@anchor-artworks.com"
                  title="クリックでメールアドレスをコピー"
                >
                  <Mail size={14} />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('contact')}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-brand transition-colors"
                  aria-label="お問い合わせフォームへ"
                >
                  <Send size={13} />
                  <span>Form</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="pt-4 flex flex-col md:flex-row justify-between items-center gap-3">
            <button
              onClick={() => setCurrentPage('privacy')}
              className="text-[10px] uppercase font-bold tracking-widest text-white/60 hover:text-brand transition-colors"
            >
              Privacy Policy
            </button>
            <div className="text-white/60 text-[10px] uppercase font-bold tracking-widest">
              © Anchor Art Works Co. Ltd.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────
function HomePage({ works, isLoading, isLoadingJournal, journalPosts, onNavigateToWorks, onNavigateToContact, onSelectWork }: {
  works: Work[];
  isLoading: boolean;
  isLoadingJournal: boolean;
  journalPosts: NotePost[];
  onNavigateToWorks: () => void;
  onNavigateToContact: () => void;
  onSelectWork: (work: Work) => void;
}) {
  return (
    <div className="bg-white">
      {/* Hero — compact black band (映像が主役、ブランドピンクは下流に温存) */}
      <section className="bg-black text-white flex flex-col items-center justify-center text-center px-6 pt-24 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto space-y-4"
        >
          {/* ③ h1サイズを一段抑えて上品さUP (md:6xl → md:5xl lg:6xl) */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tighter leading-[1.1] text-white">
            CG・映像制作を、<br />
            <span className="text-brand">思考の速度で。</span>
          </h1>
          <p className="text-sm md:text-base text-white/70 leading-relaxed font-medium tracking-wide">
            企画から納品まで。最速でカタチに。
          </p>
        </motion.div>
      </section>

      {/* SHOWREEL — full-width video with overlay text */}
      <section className="relative w-full bg-black overflow-hidden">
        <div className="relative w-full aspect-video">
          {/* Background video (Vimeo) */}
          <iframe
            src="https://player.vimeo.com/video/819715322?autoplay=1&loop=1&muted=1&background=1&title=0&byline=0&portrait=0&dnt=1"
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="eager"
            title="Anchor Art Works Showreel"
            aria-hidden="true"
          />
          {/* ① Top fade: ヒーロー(黒)から動画への自然な繋ぎ */}
          <div className="absolute top-0 inset-x-0 h-32 md:h-40 bg-gradient-to-b from-black to-transparent pointer-events-none z-[5]" />
          {/* Base dark gradient for general legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/75 pointer-events-none" />
          {/* ② Radial dark spotlight: テキスト周辺だけさらに暗くして可読性を鉄壁に */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0) 65%)',
            }}
          />
          {/* Text overlay (DOM上に普通のテキストとして存在 = SEO/AI フレンドリー) */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="space-y-4 max-w-2xl"
            >
              <div className="flex items-center justify-center gap-4 max-w-xs mx-auto">
                <div className="h-px bg-brand flex-1" />
                <span className="text-[10px] md:text-xs font-bold tracking-[0.35em] uppercase text-white/80 whitespace-nowrap">SHOWREEL</span>
                <div className="h-px bg-brand flex-1" />
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white tracking-tight drop-shadow-lg">
                アイデアが、動き出す。
              </h2>
              <p className="text-white/85 text-sm md:text-base max-w-xl mx-auto leading-relaxed drop-shadow">
                Anchor Art Worksのクリエイティブを、約60秒で。
              </p>
              <div className="pt-4">
                <button
                  onClick={onNavigateToWorks}
                  className="px-10 md:px-12 py-3 md:py-3.5 bg-brand text-black font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-white transition-all inline-flex items-center gap-3 group shadow-lg"
                >
                  <span>VIEW ALL WORKS</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Selected Works */}
      <section className="py-20 px-6 max-w-[1200px] mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl md:text-3xl font-display font-bold tracking-tight text-center mb-12"
        >SELECTED WORKS.</motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-black/5 animate-pulse" />
                <div className="h-3 w-3/4 bg-black/5 animate-pulse mx-auto" />
              </div>
            ))
          ) : (
            (() => {
              const selected = works.filter(w => w.isSelected);
              const featured = selected.length > 0
                ? [...selected].sort((a, b) => {
                    const da = a.displayOrder ?? Infinity;
                    const db = b.displayOrder ?? Infinity;
                    if (da !== db) return da - db;
                    return (a.sheetRowIndex ?? Infinity) - (b.sheetRowIndex ?? Infinity);
                  }).slice(0, 3)
                : works.slice(0, 3);
              return featured.map((work, idx) => (
                <Fragment key={work.id}>
                  <SelectedWorkCard
                    work={work}
                    idx={idx}
                    onClick={() => onSelectWork(work)}
                  />
                </Fragment>
              ));
            })()
          )}
        </div>
        <div className="flex justify-center">
          <button
            onClick={onNavigateToWorks}
            className="px-10 py-3 bg-black text-white font-bold text-[10px] uppercase tracking-widest hover:bg-black/80 transition-all flex items-center gap-3 group"
          >
            <span>EXPLORE ALL LIBRARY</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* WE DELIVER — Brand promise */}
      <section className="bg-brand py-24 md:py-32 px-6">
        <div className="max-w-[900px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <div className="h-px bg-black/30 flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/40 whitespace-nowrap">WE DELIVER</span>
              <div className="h-px bg-black/30 flex-1" />
            </div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[1.15] mb-10"
          >
            速いだけでは、<br />終わらせない。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-xl text-black/70 leading-relaxed mb-8"
          >
            企画、CG、編集まで。<br />
            <span className="font-bold text-black">"思考の速度"</span>で、最後まで着地させる。
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-sm md:text-base font-bold text-black/80 tracking-wide"
          >
            急ぎ案件も、解像度を落とさない。
          </motion.p>

          {/* Footnote bar — larger credibility markers */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 pt-10 border-t border-black/15"
          >
            <div className="flex flex-wrap items-baseline justify-center gap-x-8 md:gap-x-14 gap-y-4">
              <span className="flex items-baseline gap-2">
                <span className="font-display font-bold text-3xl md:text-4xl text-black tracking-tight">500+</span>
                <span className="font-bold tracking-widest uppercase text-xs md:text-sm text-black/60">Projects</span>
              </span>
              <span className="hidden md:inline-block w-2 h-2 rounded-full bg-black/25" />
              <span className="font-bold tracking-widest uppercase text-xs md:text-sm text-black/70">ワンストップ制作</span>
              <span className="hidden md:inline-block w-2 h-2 rounded-full bg-black/25" />
              <span className="font-bold tracking-widest uppercase text-xs md:text-sm text-black/70">最短対応</span>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}

// ─────────────────────────────────────────
// WORKS PAGE
// ─────────────────────────────────────────
function WorksPage({ works, isLoading, onSelectWork, onNavigateToContact }: {
  works: Work[];
  isLoading: boolean;
  onSelectWork: (work: Work) => void;
  onNavigateToContact: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const categories = ['ALL', 'GAME', 'EVENT', 'PR', 'GRAPHIC', 'COAPORATE', 'OTHER'];
  const PER_PAGE = 15;

  const filteredWorks = activeCategory === 'ALL'
    ? works
    : works.filter(work => (work.category || 'OTHER').toUpperCase() === activeCategory.toUpperCase());

  const totalPages = Math.max(1, Math.ceil(filteredWorks.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedWorks = filteredWorks.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Reset to page 1 when category changes
  useEffect(() => { setCurrentPage(1); }, [activeCategory]);

  // Build page number list: 1 2 3 4 ... last (with ellipsis if needed)
  const pageNumbers: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (safePage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages);
    }
    return pages;
  })();

  return (
    <div className="pb-20 bg-white">
      {/* Header */}
      <section className="pt-28 pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-10"
        >
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.95]">WORKS</h1>
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto mt-5">
              <div className="h-2 bg-brand flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">OUR LIBRARY</span>
              <div className="h-2 bg-brand flex-1" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-3xl font-display font-bold tracking-tight leading-snug">
              「やりたい」の直後に、カタチがある。
            </p>
          </div>
        </motion.div>
      </section>

      {/* Category Filter — シンプル中央配置 (セクションヘッダーとは差別化) */}
      <section className="mb-12 px-6 max-w-[1200px] mx-auto">
        <div className="text-center space-y-4">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/40">CATEGORY</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-1.5 text-[10px] font-bold tracking-widest transition-all ${
                  activeCategory === cat
                    ? "bg-black text-white"
                    : "bg-brand text-black/60 hover:bg-brand/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-black/5 animate-pulse" />
                <div className="h-3 w-3/4 bg-black/5 animate-pulse mx-auto" />
              </div>
            ))
          ) : paginatedWorks.length === 0 ? (
            <div className="col-span-full text-center py-20 text-black/40 text-sm">
              該当する作品が見つかりませんでした。
            </div>
          ) : (
            paginatedWorks.map((work, idx) => (
              <Fragment key={work.id}>
                <WorkGridCard work={work} idx={idx} onClick={() => onSelectWork(work)} />
              </Fragment>
            ))
          )}
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <section className="mt-20 flex justify-center items-center gap-4 text-[11px] font-bold tracking-widest text-black/40 px-6">
          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`}>...</span>
            ) : (
              <button
                key={p}
                onClick={() => { setCurrentPage(p as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={p === safePage
                  ? "text-black border-b border-black pb-0.5 px-1"
                  : "hover:text-black transition-colors"
                }
              >
                {p}
              </button>
            )
          )}
          {safePage < totalPages && (
            <button
              onClick={() => { setCurrentPage(safePage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-1.5 hover:text-black transition-colors"
            >
              NEXT <ChevronRight size={11} />
            </button>
          )}
        </section>
      )}

    </div>
  );
}

// ─────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────
function AboutPage({ onNavigateToContact }: { onNavigateToContact: () => void }) {
  const clients = [
    { name: "MIXI", logoSrc: "/MIXI.png" },
    { name: "FuRyu", logoSrc: "/FuRyu.png" },
    { name: "TOW", logoSrc: "/TOW_CO_LTD.png" },
    { name: "TOMOWEL", logoSrc: "/TOMOWEL.png" },
    { name: "GAPRISE", logoSrc: "/GAPRISE.png" },
    { name: "AbemaProduction", logoSrc: "/AbemaProduction.png" },
    { name: "adrea", logoSrc: "/adrea.png" },
    { name: "LINE Digital Frontier", logoSrc: "/LINE_Digital_Frontier.png" },
  ];

  return (
    <div className="bg-white">
      {/* Hero: TRUST IN MOTION. */}
      <section className="pt-28 pb-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-10"
        >
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.95]">ABOUT.</h1>
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto mt-5">
              <div className="h-2 bg-brand flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">WHO WE ARE</span>
              <div className="h-2 bg-brand flex-1" />
            </div>
          </div>
          <div className="text-center space-y-6">
            <p className="text-2xl md:text-4xl font-display font-bold tracking-tight leading-tight">
              TRUST IN MOTION.
            </p>
            <p className="text-base md:text-xl font-display font-bold tracking-tight leading-snug max-w-2xl mx-auto">
              脳内の解像度を、そのままの速度で。<br />
              思考が止まる前に、イメージは動き出す。
            </p>
            <p className="text-black/70 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              CG、モーショングラフィック、映像編集。<br />
              企画段階のラフな発想から実制作まで、スピードと品質を両立しながら伴走します。
            </p>
          </div>
        </motion.div>
      </section>

      {/* Mission / Vision */}
      <section className="py-20 md:py-24 px-6 bg-white">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 space-y-3"
          >
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <div className="h-px bg-brand flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/40 whitespace-nowrap">MISSION & VISION</span>
              <div className="h-px bg-brand flex-1" />
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
              私たちが目指すこと。
            </h2>
          </motion.div>
          <div className="space-y-8 text-base md:text-lg text-black/75 leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Anchor Art Worksのミッションは、企業の本質的な価値を <span className="font-bold text-black">「伝わるカタチ」</span> に変換することです。映像制作業界では、コンセプト設計と実制作が分断されがちです。Anchor Art Worksは、戦略、デザイン、編集、モーショングラフィックス、SNS運用、マーケティングまでを社内一貫体制で担うことで、思考から完成までの距離を限りなく短縮します。
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              私たちが目指すのは、単なる映像制作会社ではなく、ブランドの<span className="font-bold text-black">「伝え方」を再設計するクリエイティブパートナー</span>です。脳内の解像度を、そのままの速度で。思考が止まる前に、イメージは動き出す。この思想を、すべてのプロジェクトに通底させています。
            </motion.p>
          </div>
        </div>
      </section>

      {/* CEO Section */}
      <section className="bg-brand py-20 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="aspect-square bg-gray-200 overflow-hidden max-w-sm w-full mx-auto md:mx-0">
            <img
              src="/katsuda.jpg"
              alt="勝田 康"
              className="w-full h-full object-cover grayscale"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-bold tracking-widest text-black/40 uppercase">
              CEO / Creative Director / Art Director / Designer
            </p>
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold">勝田　康</h2>
              <p className="text-base font-display tracking-[0.2em] text-black/50 uppercase mt-1">KOH KATSUDA</p>
            </div>
            <p className="text-sm leading-relaxed text-black/80 max-w-lg">
              1981年新潟県生まれ、埼玉県育ち。大手広告代理店直下の制作会社にてグラフィックデザイナーとしてキャリアをスタート。スノーボードデザインや雑誌「POPTEEN」など、幅広い媒体のビジュアル制作を担当。2013年に独立後は、グラフィックで培った設計力を軸に映像領域へと展開。コンセプト設計からアウトプットまでを一貫して手がけ、企業の価値を「伝わるかたち」へと再構築するクリエイティブを強みとする。CGや2Dアニメーションなど多様な表現を横断しながら、スピードと精度を両立した制作を実現。
            </p>
          </div>
        </div>
      </section>

      {/* Team: 6 members on black */}
      <section className="bg-black text-white py-20 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-y-16">
          {[
            // 上段: ① ② ③
            {
              role: "Editor / Motion Grapher",
              name: "勝田　友亮",
              enName: "YUSUKE KATSUDA",
              photoSrc: "/YUSUKEKATSUDA.jpg",
              bio: "1989年4月7日生まれ。PRムービー、イベント映像、企業ブランドムービー、VP、CMなどモーショングラフィックスを主軸に幅広く制作。複雑な情報構造を視覚的に整理し、直感的に伝わる動きへと再構築する設計力が強み。クライアントの要望に柔軟に応えるロジカル思考と、視覚的なリズムを両立した映像表現で、ブランドの世界観を多面的に支える。細部の質感までこだわった編集で、視聴者の記憶に残るシーンを生み出す。"
            },
            {
              role: "Editor / Motion Grapher",
              name: "矢戸　光一",
              enName: "KOICHI YATO",
              photoSrc: "/KOICHIYATO.jpg",
              bio: "2003年1月1日生まれ。PRムービー、イベント映像、ゲーム関連コンテンツなどモーショングラフィックスを主軸に制作。eスポーツのプロ選手を目指していた経験から培われた、高い集中力と緻密な観察眼が武器。0.1秒単位での編集精度と、視聴者の注意を逃さないリズム設計に強みを持ち、次世代のクリエイティブを牽引する。SNS時代のテンポ感を熟知し、短尺から長尺まで幅広いフォーマットに対応する柔軟性も備える。"
            },
            {
              role: "Illustrator / Designer",
              name: "内田　理恵",
              enName: "RIE UCHIDA",
              photoSrc: "/RIEUCHIDA.jpg",
              bio: "イラストとデザインの境界を行き来しながら、クライアントの世界観や想いを視覚的に表現する、イラストレーター兼デザイナー。オーダーやコンセプトに合わせた柔軟なイラスト表現を得意とし、エモーショナルなタッチからポップで親しみやすい表現まで、幅広く描き分けます。広告・パッケージ・Webなど、多様な分野で制作を行い、単に“見せる”だけでなく、見る人の感情や空気感まで伝わるクリエイションを大切にしています。一つひとつのプロジェクトに丁寧に向き合いながら、記憶に残るビジュアルを目指して制作しています。"
            },
            // 下段: ④ ⑤ ⑥
            {
              role: "Producer / Director",
              name: "目　学",
              enName: "MANABU SAKKA",
              photoSrc: "/MANABUSAKKA.jpg",
              bio: "1983年10月2日生まれ。映像専門学校卒業後、テレビ業界に就職。報道・バラエティ・ドキュメンタリーなど多様な現場で経験を積み、その後広告業界へ転身。テレビ品質の制作工程と、広告に求められるスピード感を融合させたプロデュース力で、Anchor Art Worksの映像品質を担保する責任者を務める。スタッフィングから予算管理、クライアント折衝までを一貫して統括し、現場とブランドを橋渡しする中核ポジション。"
            },
            {
              role: "SNS / Podcaster",
              name: "森屋　沙耶",
              enName: "SAYA MORIYA",
              photoSrc: "/SAYAMORIYA.jpg",
              bio: "某人気YouTuberとのコラボ経験を持つポッドキャスター。独特の視点と世界観を活かしたトークを得意とし、親しみやすさとテンポ感のある語り口でリスナーを引き込む。明るく自然体なキャラクターと、少し低めで落ち着きのある声質が特徴。長時間でも心地よく聴けるトーンで、日常の何気ない話題からカルチャー、ライフスタイル、社会的なテーマまで幅広く発信している。リスナーとの距離感を大切にしながら、“誰かの日常に自然と馴染む言葉”を届けることをテーマに活動。耳だけで楽しめる空気感や温度感を意識したトークで、多くの共感を集めている。"
            },
            {
              role: "Marketing Specialist",
              name: "沖田　紘亮",
              enName: "KOUSUKE OKITA",
              photoSrc: "/KOUSUKEOKITA.jpg",
              bio: "テレビ局、総合広告代理店を経て独立。AI時代のマーケティング戦略とデータ分析を基盤に、コンテンツの価値最大化を担うスペシャリスト。行動経済学や市場構造を踏まえた戦略設計により、ターゲットへの最適なリーチと継続的な成果創出を実現。映像制作の前段階となる課題設定からKPI設計、効果測定までを一貫して支援する。クリエイティブと数字を繋ぐ視点で、ブランドの長期的な成長を支える。"
            }
          ].map((member: { role: string; name: string; enName: string; bio: string; photoSrc?: string }, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-4"
            >
              {/* Photo (or placeholder) */}
              {member.photoSrc ? (
                <div className="aspect-square w-full overflow-hidden bg-white/10">
                  <img
                    src={member.photoSrc}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-white/10 w-full" />
              )}
              <div className="space-y-1">
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{member.role}</p>
                <h3 className="text-2xl font-display font-bold">{member.name}</h3>
                <p className="text-xs font-bold tracking-[0.15em] text-white/30 uppercase">{member.enName}</p>
              </div>
              <p className="text-xs text-white/55 leading-relaxed">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Company Profile */}
      <section className="py-20 px-6 bg-gray-100">
        <div className="max-w-[900px] mx-auto space-y-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center tracking-tight">COMPANY PROFILE</h2>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-5 text-sm">
            {[
              ["商号", "株式会社Anchor Art Works"],
              ["所在地", "153-0053東京都目黒区五本木2丁目44番2号"],
              ["設立年月", "2025年11月"],
              ["業務内容", "映像制作 / デザイン / 企画"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 border-b border-black/8 pb-4">
                <span className="w-24 shrink-0 font-bold text-black/40 text-xs">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clients - infinite horizontal scroll */}
      <section className="py-16 bg-white border-t border-black/5">
        <div className="max-w-[1100px] mx-auto px-6 mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center tracking-tight uppercase">CLIENTS</h2>
        </div>
        <div className="relative overflow-hidden">
          {/* Edge fade masks */}
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <motion.div
            className="flex items-center w-fit"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 35, ease: 'linear', repeat: Infinity }}
          >
            {[...clients, ...clients].map((client, idx) => (
              <div key={idx} className="flex-shrink-0 flex items-center justify-center h-20 md:h-24 px-12 md:px-16">
                <ClientLogo client={client} />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

    </div>
  );
}

function ClientLogo({ client }: { client: { name: string; logoSrc: string } }) {
  const [error, setError] = useState(false);
  if (client.logoSrc && !error) {
    return (
      <img
        src={client.logoSrc}
        alt={client.name}
        className="h-14 md:h-16 w-auto object-contain"
        onError={() => setError(true)}
      />
    );
  }
  return <span className="font-display font-bold text-lg md:text-xl tracking-tight">{client.name}</span>;
}

// ─────────────────────────────────────────
// CONTACT PAGE
// ─────────────────────────────────────────
function ContactPage({ works, onNavigateToPrivacy }: { works: Work[]; onNavigateToPrivacy: () => void }) {
  const [showAI, setShowAI] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [quickInput, setQuickInput] = useState('');

  const presetQuestions = [
    '1分のCG動画の納期と費用感は？',
    '実績の中でゲーム系の事例は？',
    '企画から相談できますか？',
    'AIを使った制作プロセスとは？',
  ];

  const openAIWithPrompt = (q: string) => {
    setInitialPrompt(q);
    setShowAI(true);
  };

  const handleQuickSubmit = () => {
    if (!quickInput.trim()) return;
    openAIWithPrompt(quickInput.trim());
    setQuickInput('');
  };

  // ── Contact form state ──
  const [form, setForm] = useState({
    inquiryType: '',
    message: '',
    company: '',
    name: '',
    kana: '',
    phone: '',
    email: '',
    website: '',
    agreed: false,
  });
  const [hp, setHp] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  const updateField = (key: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleContactSubmit = async () => {
    // client-side validation
    const missing: string[] = [];
    if (!form.message.trim()) missing.push('お問い合わせ内容');
    if (!form.company.trim()) missing.push('会社名');
    if (!form.name.trim()) missing.push('お名前');
    if (!form.kana.trim()) missing.push('フリガナ');
    if (!form.phone.trim()) missing.push('電話番号');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) missing.push('メールアドレス');
    if (!form.agreed) missing.push('プライバシーポリシーへの同意');
    if (missing.length > 0) {
      setSubmitError(`ご確認ください：${missing.join(' / ')}`);
      setSubmitStatus('error');
      return;
    }

    setSubmitting(true);
    setSubmitStatus('idle');
    setSubmitError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _hp: hp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `送信に失敗しました（${res.status}）`);
      }
      setSubmitStatus('success');
      setForm({ inquiryType: '', message: '', company: '', name: '', kana: '', phone: '', email: '', website: '', agreed: false });
    } catch (e: any) {
      setSubmitError(e?.message || '送信に失敗しました。時間をおいて再度お試しください。');
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white pb-0">
      {/* Header */}
      <section className="pt-28 pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-10"
        >
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.95]">CONTACT.</h1>
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto mt-5">
              <div className="h-2 bg-brand flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">GET IN TOUCH</span>
              <div className="h-2 bg-brand flex-1" />
            </div>
          </div>
          <div className="text-center space-y-6">
            <p className="text-2xl md:text-4xl font-display font-bold tracking-tight leading-tight">
              LET'S TALK.
            </p>
            <p className="text-lg md:text-2xl font-display font-bold tracking-tight leading-snug">
              ひらめきを、待たせない。<br />
              <span className="text-black/60 text-sm md:text-base font-medium">思考の速度で、カタチにする。</span>
            </p>
            <p className="text-black/70 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
              伝え方に迷ったら、まずはご相談ください。課題の整理から制作まで一貫して対応します。<br />
              アイデアがまとまっていなくても大丈夫です。スピードとクオリティを大切に、最適な形をご提案します。
            </p>
          </div>
        </motion.div>
      </section>

      {/* AI Concierge */}
      <section className="px-6 mb-20 max-w-[820px] mx-auto">
        <div className="relative pt-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-brand text-black px-10 py-1.5 text-center">
              <span className="text-[10px] font-bold tracking-[0.35em] uppercase">ACTION</span>
            </div>
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-brand mx-auto" />
          </div>
          <div className="bg-black text-white p-8 md:p-12 space-y-7">
            {/* Header with live indicator */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
                <p className="text-white/50 font-bold tracking-[0.3em] text-[10px] uppercase">AI Concierge — Online</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-brand tracking-tight">
                まずは、AIに聞いてみる。
              </h2>
              <p className="text-xs md:text-sm text-white/60 leading-relaxed max-w-md mx-auto">
                納期・費用・実績・ワークフローまで。<br />
                AAWのAIコンシェルジュが、Anchor Art Worksの知識ベースから即座にお答えします。
              </p>
            </div>

            {/* Quick input field */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2 focus-within:border-brand transition-colors">
              <Sparkles size={16} className="text-brand ml-2 shrink-0" />
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickSubmit()}
                placeholder="例：1分のCG動画、最短どれくらいで作れる？"
                className="flex-grow bg-transparent text-sm text-white placeholder:text-white/30 outline-none py-2"
              />
              <button
                onClick={handleQuickSubmit}
                disabled={!quickInput.trim()}
                className="bg-brand text-black w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-90 disabled:opacity-20 transition-opacity shrink-0"
                aria-label="送信"
              >
                <Send size={15} />
              </button>
            </div>

            {/* Preset chips */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 text-center">よくある質問</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {presetQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => openAIWithPrompt(q)}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-xs text-white/80 rounded-full hover:bg-brand hover:text-black hover:border-brand transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-white/30 text-center leading-relaxed">
              回答はAIにより生成されます。重要な内容は担当者へお問い合わせください。
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-gray-100 py-20 px-6">
        <div className="max-w-[700px] mx-auto space-y-16">
          {submitStatus === 'success' ? (
            /* Success state */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 py-16"
            >
              <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center mx-auto">
                <Mail size={28} className="text-black" />
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold">送信しました。</h2>
              <p className="text-black/70 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                お問い合わせありがとうございます。<br />
                内容を確認のうえ、担当者より折り返しご連絡いたします。<br />
                通常2〜3営業日以内にご返信します。
              </p>
              <button
                onClick={() => setSubmitStatus('idle')}
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/50 hover:text-black underline transition-colors"
              >
                続けて問い合わせる
              </button>
            </motion.div>
          ) : (
            <>
              {/* Inquiry */}
              <div className="space-y-8">
                <h2 className="text-xl md:text-2xl font-display font-bold text-center">お問い合わせ内容</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest">お問い合わせ項目</label>
                    <div className="relative">
                      <select
                        value={form.inquiryType}
                        onChange={(e) => updateField('inquiryType', e.target.value)}
                        className="w-full bg-white px-5 py-4 border-none shadow-sm focus:ring-2 focus:ring-brand outline-none appearance-none cursor-pointer text-sm"
                      >
                        <option value="">選択してください</option>
                        <option value="映像制作のご相談">映像制作のご相談</option>
                        <option value="CG・デザインのご依頼">CG・デザインのご依頼</option>
                        <option value="企画・戦略の策定">企画・戦略の策定</option>
                        <option value="ポッドキャストのご相談">ポッドキャストのご相談</option>
                        <option value="VTuber MV・ライブ演出">VTuber MV・ライブ演出</option>
                        <option value="その他">その他</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" size={18} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest">お問い合わせ内容 *</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => updateField('message', e.target.value)}
                      className="w-full bg-white px-5 py-4 border-none shadow-sm focus:ring-2 focus:ring-brand outline-none h-48 resize-none text-sm"
                      placeholder="例）動画撮影に関してご相談したい。"
                    />
                  </div>
                </div>
              </div>

              {/* Customer info */}
              <div className="space-y-8">
                <h2 className="text-xl md:text-2xl font-display font-bold text-center">お客様情報</h2>
                <div className="space-y-5">
                  {([
                    { key: 'company', label: "会社名 *", type: "text", placeholder: "株式会社○○" },
                    { key: 'name', label: "お名前 *", type: "text", placeholder: "山田 太郎" },
                    { key: 'kana', label: "フリガナ *", type: "text", placeholder: "ヤマダ タロウ" },
                    { key: 'phone', label: "電話番号 *", type: "tel", placeholder: "090-1234-5678" },
                    { key: 'email', label: "メールアドレス *", type: "email", placeholder: "you@example.com" },
                    { key: 'website', label: "Web サイト URL", type: "url", placeholder: "https://example.com" },
                  ] as const).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-xs font-bold tracking-widest">{field.label}</label>
                      <input
                        type={field.type}
                        value={form[field.key] as string}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full bg-white px-5 py-4 border-none shadow-sm focus:ring-2 focus:ring-brand outline-none text-sm"
                      />
                    </div>
                  ))}
                  {/* Honeypot (hidden from users, bots fill it) */}
                  <input
                    type="text"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="space-y-6 text-center">
                {submitStatus === 'error' && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{submitError}</p>
                )}
                <label className="flex items-center justify-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => updateField('agreed', e.target.checked)}
                    className="w-4 h-4 border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span className="text-[11px] font-bold tracking-widest text-black/60">
                    <button type="button" onClick={onNavigateToPrivacy} className="underline hover:text-black transition-colors">
                      プライバシーポリシー
                    </button>に同意する
                  </span>
                </label>
                <button
                  onClick={handleContactSubmit}
                  disabled={submitting}
                  className="w-full md:w-auto px-14 py-4 bg-black text-white font-bold text-[11px] uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-3 mx-auto group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>送信中...</span>
                    </>
                  ) : (
                    <>
                      <span>この内容で送信する</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* AI Modal */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-10"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-3xl w-full h-full md:h-[85vh] bg-white flex flex-col relative shadow-2xl overflow-hidden md:rounded-2xl"
            >
              <div className="p-6 bg-black text-white flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand text-black rounded-full flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold tracking-tight">AI CONCIERGE</h3>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Anchor Art Works</p>
                  </div>
                </div>
                <button onClick={() => setShowAI(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={22} className="text-white/60 hover:text-white" />
                </button>
              </div>
              <div className="flex-grow overflow-hidden bg-gray-50">
                <ChatConcierge works={works} initialPrompt={initialPrompt} />
              </div>
              <div className="p-2 bg-white border-t border-black/5 text-[9px] text-black/30 font-bold uppercase tracking-widest text-center">
                Replies are generated by AI. Please confirm important details with our team.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatConcierge({ works, initialPrompt }: { works: Work[]; initialPrompt?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'こんにちは。Anchor Art Works のAIコンシェルジュです。CG・映像制作からポッドキャスト企画、VTuber MV まで、「思考の速度」で貴社の課題に最適なアプローチをご提案します。どのような課題をお持ちですか？' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitialRef = useRef<string>('');

  // Auto-send when initialPrompt is provided (once per prompt value)
  useEffect(() => {
    if (initialPrompt && initialPrompt !== sentInitialRef.current) {
      sentInitialRef.current = initialPrompt;
      const t = setTimeout(() => {
        handleSend(initialPrompt);
      }, 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isTyping) return;
    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInput('');
    setIsTyping(true);

    try {
      const systemPrompt = buildSystemPrompt(works.map(w => w.title));

      // Call Vercel Function (server-side). API key stays on the server.
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          message: textToSend,
          systemPrompt,
        }),
      });

      if (res.status === 429) {
        const errBody = await res.json().catch(() => ({}));
        const wait = errBody.retryAfterSec ? `${errBody.retryAfterSec}秒ほどお待ちください。` : 'しばらくお待ちください。';
        setMessages(prev => [...prev, { role: 'assistant', content: `恐れ入ります、短時間でのご質問が集中しています。${wait}お急ぎの場合はお問い合わせフォームより直接ご相談ください。` }]);
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || "申し訳ございません。応答の生成に失敗しました。" }]);
    } catch (error) {
      console.error('[AI Concierge] fetch error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "現在、AIコンシェルジュが混み合っているようです。しばらくしてから再度お試しいただくか、お問い合わせフォームより直接お問い合わせください。" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = ["強みについて教えて", "代表 勝田の実績は？", "3DCG制作の相談ができる？", "ポッドキャストの相談は？"];

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-white text-black/80 rounded-tl-none border border-black/5'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-black/5 flex gap-1.5 opacity-50">
              {[0, 150, 300].map(d => (
                <span key={d} className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-black/5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button key={s} onClick={() => handleSend(s)} disabled={isTyping}
              className="px-3 py-1.5 bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-black/40 hover:bg-black hover:text-white transition-all disabled:opacity-50 rounded-full">
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="コンシェルジュに相談する..."
            className="flex-grow bg-gray-100 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand outline-none text-sm transition-all"
          />
          <button onClick={() => handleSend()} disabled={isTyping || !input.trim()}
            className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-20">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SELECTED WORK CARD (HOME) — with Netflix-style hover preview
// ─────────────────────────────────────────
interface SelectedWorkCardProps {
  work: Work;
  idx: number;
  onClick: () => void;
}

function SelectedWorkCard({ work, idx, onClick }: SelectedWorkCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    setIsHovered(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowPreview(true), 700);
  };

  const handleLeave = () => {
    setIsHovered(false);
    setShowPreview(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.15, duration: 0.7, ease: 'easeOut' }}
      className="group cursor-pointer text-center space-y-3"
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="aspect-video overflow-hidden relative bg-black">
        <img
          src={work.thumbnail}
          alt={work.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            showPreview ? 'opacity-0' : 'opacity-100'
          }`}
          referrerPolicy="no-referrer"
        />
        {showPreview && work.vimeoId && (
          <iframe
            src={`https://player.vimeo.com/video/${work.vimeoId}?autoplay=1&loop=1&muted=1&background=1&dnt=1`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            loading="lazy"
            title={work.title}
          />
        )}
        {/* Hover overlay + Play icon (shows during hover, before iframe kicks in) */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
          isHovered && !showPreview ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
            <Play size={20} className="fill-black text-black ml-1" />
          </div>
        </div>
      </div>
      <p className="text-[11px] font-bold text-black/70">
        『{work.title}』ブランド映像
      </p>
      <p className="text-[10px] text-black/40">{work.clientName || '共同印刷 株式会社'}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// FLOATING CTA — right-edge vertical label, designer style
// ─────────────────────────────────────────
function FloatingCTA({ onClick, hidden }: { onClick: () => void; hidden: boolean }) {
  if (hidden) return null;
  return (
    <>
      {/* Desktop: right-edge vertical label */}
      <button
        onClick={onClick}
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-brand text-black px-3 py-8 hover:bg-black hover:text-white transition-all duration-300 shadow-lg group items-center"
        aria-label="START A PROJECT"
      >
        <div className="flex flex-col items-center gap-3">
          <span
            className="text-[11px] font-bold tracking-[0.35em] uppercase"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            START A PROJECT
          </span>
          <ArrowRight size={14} className="rotate-90 group-hover:translate-y-1 transition-transform" />
        </div>
      </button>
      {/* Mobile: bottom-right FAB */}
      <button
        onClick={onClick}
        className="md:hidden fixed right-4 bottom-5 z-40 bg-brand text-black w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="お問い合わせ"
      >
        <Mail size={22} strokeWidth={2.2} />
      </button>
    </>
  );
}

// ─────────────────────────────────────────
// CUSTOM CURSOR — desktop only, light implementation
// ─────────────────────────────────────────
function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Skip on touch devices
    if (typeof window === 'undefined') return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
      // Detect interactive element
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('a, button, [role="button"], input, textarea, select, label') !== null;
      setIsPointer(interactive);
    };
    const onLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`hidden md:block fixed top-0 left-0 z-[200] pointer-events-none transition-[width,height,background-color,opacity] duration-200 ease-out mix-blend-difference rounded-full ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${
        isPointer ? 'w-10 h-10 bg-brand' : 'w-3 h-3 bg-white'
      }`}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`,
      }}
    />
  );
}

// ─────────────────────────────────────────
// WORKS GRID CARD — compact card with Netflix-style hover preview
// ─────────────────────────────────────────
interface WorkGridCardProps {
  work: Work;
  idx: number;
  onClick: () => void;
}

function WorkGridCard({ work, idx, onClick }: WorkGridCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    setIsHovered(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowPreview(true), 800);
  };
  const handleLeave = () => {
    setIsHovered(false);
    setShowPreview(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.05 }}
      className="group cursor-pointer"
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="aspect-video overflow-hidden mb-3 bg-black relative">
        <img
          src={work.thumbnail}
          alt={work.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            showPreview ? 'opacity-0' : 'opacity-100'
          }`}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {showPreview && work.vimeoId && (
          <iframe
            src={`https://player.vimeo.com/video/${work.vimeoId}?autoplay=1&loop=1&muted=1&background=1&dnt=1`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            loading="lazy"
            title={work.title}
          />
        )}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
          isHovered && !showPreview ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
            <Play size={16} className="fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>
      <div className="text-center space-y-1 px-2">
        <p className="text-[11px] font-bold text-black/80 group-hover:text-black/50 transition-colors line-clamp-2">
          {work.title}
        </p>
        {work.clientName && (
          <p className="text-[10px] text-black/40">{work.clientName}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// FAQ SECTION (HOME)
// ─────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "制作期間はどのくらいですか？",
    a: "案件規模により2週間から3ヶ月程度が目安です。緊急対応も可能ですので、まずはご相談ください。スピードを重視する案件には、社内一貫体制ならではの最短納期でお応えします。"
  },
  {
    q: "予算が決まっていなくても相談できますか？",
    a: "もちろんです。ご予算とご要望を踏まえ、最適な構成・規模をご提案します。「何から始めればいいかわからない」段階でも、課題の整理からサポートします。"
  },
  {
    q: "SNS用ショート動画にも対応していますか？",
    a: "TikTok、Instagram Reels、YouTube Shorts など、各プラットフォームに最適化されたショート動画制作に特化したメンバーが在籍しています。長尺映像との連動運用や、複数バリエーション展開も得意です。"
  },
  {
    q: "CGや3Dアニメーションの相談は可能ですか？",
    a: "可能です。3DCG・2DCG、モーショングラフィックスを社内で制作する体制を持っています。製品3Dモデルからのレンダリング、キャラクターアニメーション、テクニカルビジュアライゼーションまで対応可能です。"
  },
  {
    q: "テレビCMやブランドムービーの制作実績はありますか？",
    a: "はい、テレビ局や広告代理店出身のプロデューサー・ディレクターが在籍しており、放送基準の品質を担保した制作が可能です。共同印刷（TOMOWEL）、MIXI、LINE Digital Frontier などの実績があります。"
  },
  {
    q: "マーケティング戦略から相談できますか？",
    a: "はい、テレビ局・総合広告代理店出身のマーケティングスペシャリストが、課題設定、ターゲット定義、KPI設計、配信戦略、効果測定までトータルでサポートします。映像とマーケティングを統合した提案が可能です。"
  },
];

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="py-20 px-6 max-w-[900px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 space-y-3"
      >
        <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
          <div className="h-px bg-brand flex-1" />
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/40 whitespace-nowrap">FAQ</span>
          <div className="h-px bg-brand flex-1" />
        </div>
        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">よくあるご質問</h2>
      </motion.div>
      <div className="divide-y divide-black/10 border-t border-b border-black/10">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-6 py-6 text-left hover:bg-black/[0.02] transition-colors px-2"
                aria-expanded={isOpen}
              >
                <span className="text-sm md:text-base font-bold text-black/80 leading-snug flex-1">
                  Q. {item.q}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 w-7 h-7 rounded-full bg-brand flex items-center justify-center text-black"
                >
                  <Plus size={14} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-black/65 leading-relaxed px-2 pb-6">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// CTA SECTION
// ─────────────────────────────────────────
function CTASection({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="relative pt-8">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-black text-white px-10 py-1.5 text-center">
          <span className="text-[9px] font-bold tracking-[0.35em] uppercase">Next Action</span>
        </div>
        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black mx-auto" />
      </div>
      <div className="bg-brand p-10 md:p-16 text-center space-y-8 border border-black/5">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <p className="text-black/40 font-bold tracking-[0.3em] text-[11px] uppercase">PLEASE CONSULT</p>
            <img src="/wh_logomark.png" alt="Anchor Art Works" className="h-16 md:h-24 w-auto mx-auto object-contain" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-black leading-tight">
              ひらめきを、待たせない
            </h2>
            <p className="text-base md:text-xl text-black/70 font-medium leading-relaxed">
              思考の速度で、カタチにする。
            </p>
          </div>
          <button
            onClick={onNavigate}
            className="px-12 py-3.5 bg-black text-white font-bold text-[11px] uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center gap-3 mx-auto group"
          >
            <span>START A PROJECT</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// WORK MODAL
// ─────────────────────────────────────────
function WorkModal({ work, onClose }: { work: Work; onClose: () => void }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/95 backdrop-blur-xl"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="relative w-full max-w-5xl max-h-[88vh] bg-white overflow-hidden shadow-2xl flex flex-col border border-black/5"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-black/80"
        >
          <X size={18} />
        </button>
        <div className="overflow-y-auto">
          {/* Vimeo Player with thumbnail placeholder */}
          <div className="relative aspect-video w-full bg-black">
            {work.vimeoId ? (
              <>
                {/* Thumbnail placeholder — visible until iframe loads */}
                {work.thumbnail && (
                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      iframeLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                )}
                <iframe
                  src={`https://player.vimeo.com/video/${work.vimeoId}?title=0&byline=0&portrait=0&dnt=1`}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                    iframeLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  title={work.title}
                  onLoad={() => setIframeLoaded(true)}
                />
              </>
            ) : (
              <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            )}
          </div>

          {/* Title & Meta */}
          <div className="px-6 md:px-12 pt-8 pb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-2">
              <span className="px-2 py-0.5 bg-black text-[9px] text-white uppercase tracking-widest font-bold inline-block">{work.category || 'OTHER'}</span>
              <h2 className="text-2xl md:text-4xl font-display font-bold text-black tracking-tighter leading-tight">{work.title}</h2>
              {work.clientName && (
                <p className="text-xs text-black/50 font-medium">{work.clientName}</p>
              )}
            </div>
            {work.e_id_link && (
              <a href={work.e_id_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-black/15 text-[11px] font-bold tracking-widest text-black hover:bg-black hover:text-white transition-all whitespace-nowrap">
                <ExternalLink size={12} />
                外部リンク
              </a>
            )}
          </div>

          <div className="p-6 md:p-12 grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-8 space-y-10">
              {work.a01_intent && (
                <section className="space-y-3">
                  <span className="text-black/30 font-bold text-[10px] tracking-[0.3em] block">制作意図</span>
                  <p className="text-base text-black/70 leading-relaxed">{work.a01_intent}</p>
                </section>
              )}
              {work.m07_solution && (
                <section className="space-y-3">
                  <span className="text-black/30 font-bold text-[10px] tracking-[0.3em] block">解決アプローチ</span>
                  <p className="text-base text-black/70 leading-relaxed">{work.m07_solution}</p>
                </section>
              )}
              {work.m03_results && work.m03_results.length > 0 && (
                <section className="space-y-6">
                  <span className="text-black/30 font-bold text-[9px] uppercase tracking-[0.4em] block">M-03: Evidence</span>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {work.m03_results.map((result, i) => (
                      <div key={i} className="flex items-center gap-3 bg-black/3 p-4 border border-black/5">
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
                          <TrendingUp className="text-white" size={14} />
                        </div>
                        <span className="font-bold text-sm">{result}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="md:col-span-4">
              {work.tags && work.tags.length > 0 && (
                <div className="space-y-4">
                  <span className="text-black/30 font-bold text-[9px] uppercase tracking-widest block">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {work.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-black/5 text-[10px] font-bold uppercase tracking-widest text-black/40">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────
// WHAT WE DO PAGE — 依頼範囲
// ─────────────────────────────────────────
function WhatWeDoPage({ onNavigateToContact }: { onNavigateToContact: () => void }) {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="pt-28 pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-10"
        >
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tighter leading-[0.95]">WHAT WE DO.</h1>
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto mt-5">
              <div className="h-2 bg-brand flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">SCOPE OF WORK</span>
              <div className="h-2 bg-brand flex-1" />
            </div>
          </div>
          <div className="text-center space-y-6">
            <p className="text-xl md:text-3xl font-display font-bold tracking-tight leading-snug">
              企画から、CG、編集、運用まで。<br />
              ワンストップで、最後まで。
            </p>
            <p className="text-black/70 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              Anchor Art Worksが提供できる領域、得意とする業界、制作プロセス、よくあるご質問までを一枚で。
            </p>
          </div>
        </motion.div>
      </section>

      {/* Services */}
      <section className="py-20 px-6 max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-3"
        >
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            <div className="h-px bg-brand flex-1" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/40 whitespace-nowrap">SERVICES</span>
            <div className="h-px bg-brand flex-1" />
          </div>
          <h2 className="text-2xl md:text-4xl font-display font-bold tracking-tight">提供サービス</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'CGデザイン制作', desc: '3DCG・2DCGアニメーション、モーションキャプチャ、リアルタイムレンダリングを駆使し、複雑な情報や抽象概念を、視聴者が直感的に理解できるビジュアルへ変換します。' },
            { title: 'モーショングラフィックス', desc: 'タイポグラフィ、インフォグラフィック、アニメーションロゴ、トランジション設計まで。視聴者の認知負荷を最小化する「動く図解」を構築します。' },
            { title: '映像編集', desc: 'テレビ業界標準の制作フローとブランドセーフティを適用。長尺、PR、CM、VP、イベント、SNSショート — 各納品形態に最適な編集を提供します。' },
            { title: '企画・コンセプト設計', desc: 'デザイン思考と行動経済学を用いた認知構造の設計から、戦略的ストーリーテリング、KPI連動の構成設計まで、制作の前段階を一貫支援します。' },
            { title: 'SNS / ショート動画運用', desc: 'TikTok、Instagram Reels、YouTube Shorts、X等、各プラットフォームの特性を活かした短尺展開。長尺映像との連動運用も。' },
            { title: 'マーケティング戦略', desc: '課題設定、ターゲット定義、KPI設計、配信戦略、効果測定まで。テレビ局・総合広告代理店出身のスペシャリストが、投資対効果を最大化します。' },
          ].map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="p-6 border border-black/30 space-y-3"
            >
              <h3 className="text-base md:text-lg font-display font-bold tracking-tight">{s.title}</h3>
              <p className="text-xs text-black/65 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Strengths */}
      <section className="bg-black text-white py-24 px-6">
        <div className="max-w-[900px] mx-auto space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-brand">OUR STRENGTHS.</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              社内一貫体制により、戦略設計から最終的なアウトプットまで、<br />
              ブレのないクオリティを提供します。
            </p>
          </motion.div>
          <div className="border border-white/20 divide-y divide-white/20">
            {[
              { title: "Marketing & Design", subtitle: "認知構造の設計", desc: "デザイン思考を用い、視聴者の脳内に情報を定着させるための「情報の重み付け」を映像化。戦略なき映像制作を打破します。", expert: "勝田 康 (CEO)" },
              { title: "Motion & Creative", subtitle: "論理的動態デザイン", desc: "3DCGとモーショングラフィックスを駆使し、複雑な概念を直感的に理解させる「動く図解」を構築。視覚的ノイズを排除します。", expert: "勝田 友亮 / 矢戸 光一" },
              { title: "Production & Quality", subtitle: "放送基準の品質担保", desc: "テレビ業界標準の制作フローとブランドセーフティを適用。企業の社会的信頼を保護し、高める映像を提供します。", expert: "目 学" }
            ].map((item, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-8 md:p-10 space-y-4">
                <h3 className="text-xl md:text-2xl font-display font-bold text-brand">{item.title}</h3>
                <p className="text-[10px] text-white/30 tracking-[0.2em] font-bold uppercase">{item.subtitle}</p>
                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[9px] text-white/30 uppercase tracking-widest">Expert in Charge</p>
                  <p className="text-xs font-medium text-white/50 mt-1">{item.expert}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 space-y-3"
          >
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <div className="h-px bg-brand flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/40 whitespace-nowrap">PROCESS</span>
              <div className="h-px bg-brand flex-1" />
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
              アイデアが、カタチに変わるまで。
            </h2>
            <p className="text-black/60 text-sm max-w-xl mx-auto leading-relaxed">
              Anchor Art Works の制作は、5つの工程を通じて進みます。
            </p>
          </motion.div>
          <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-5 md:gap-4">
            {[
              { step: '01', title: 'Discovery', subtitle: '課題の整理', desc: 'ヒアリングを通じて、伝えたい価値の核と想定する受け手を明確化。事業課題と本質要件を定義します。' },
              { step: '02', title: 'Concept', subtitle: 'コンセプト設計', desc: '戦略仮説とビジュアル方向性、ストーリーテリングを設計。デザイン思考で「伝わる構成」を組み立てます。' },
              { step: '03', title: 'Storyboard', subtitle: '構成設計', desc: '映像の流れとシーンごとの意図、視覚的リズムを文書化。制作前に方向性を固め、手戻りを最小化します。' },
              { step: '04', title: 'Production', subtitle: '制作', desc: 'CG・撮影・編集・モーション・サウンドまで内製チームで一貫実行。思考の速度に追従するスピードで進めます。' },
              { step: '05', title: 'Delivery', subtitle: '納品と継続支援', desc: '納品後の効果測定、SNS用ショート展開、別言語版まで、長期的なブランド運用を支援します。' },
            ].map((p, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="relative md:p-4">
                <div className="flex md:flex-col gap-4 md:gap-3 items-start">
                  <div className="font-display font-bold text-3xl md:text-4xl text-brand leading-none shrink-0">{p.step}</div>
                  <div className="flex-1 space-y-1.5">
                    <h3 className="text-base md:text-lg font-display font-bold tracking-tight">{p.title}</h3>
                    <p className="text-[10px] text-black/40 font-bold tracking-widest uppercase">{p.subtitle}</p>
                    <p className="text-xs text-black/60 leading-relaxed pt-2">{p.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI × Human Workflow */}
      <section className="bg-gradient-to-b from-black via-black to-zinc-900 text-white py-24 px-6 relative overflow-hidden">
        {/* subtle dot grid background */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #edc8d7 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="max-w-[1100px] mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14 space-y-3"
          >
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <div className="h-px bg-brand flex-1" />
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50 whitespace-nowrap">AI × HUMAN WORKFLOW</span>
              </div>
              <div className="h-px bg-brand flex-1" />
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-brand">
              最速の理由は、<br className="md:hidden" />分業にある。
            </h2>
            <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              AIが「速さ」を、人が「品質」を担う。<br />
              生成AIを制作の各工程に組み込み、思考の速度でアウトプットへつなげます。
            </p>
          </motion.div>

          {/* Workflow grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { step: '01', name: 'Discovery', ai: 'リサーチ・要件整理の高速化', human: 'クライアントの本質要件を引き出す', tools: 'ChatGPT / Claude' },
              { step: '02', name: 'Concept', ai: 'ビジュアル方向性の量的探索', human: '戦略的なコンセプト判断', tools: 'Midjourney / Sora' },
              { step: '03', name: 'Storyboard', ai: 'コンテ案・代替案の自動生成', human: '演出意図とストーリー設計', tools: 'Gemini / Runway' },
              { step: '04', name: 'Production', ai: 'テクスチャ生成・編集補助', human: 'CG・モーション・編集の品質磨き', tools: 'Runway / Topaz / Custom' },
              { step: '05', name: 'Delivery', ai: '多言語版・短尺展開の自動化', human: '最終納品のブランドチェック', tools: 'ElevenLabs / 内製' },
            ].map((w, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="bg-white/5 border border-brand/40 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-2xl text-brand">{w.step}</span>
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Phase</span>
                </div>
                <h3 className="text-base font-display font-bold tracking-tight">{w.name}</h3>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={10} className="text-brand" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-brand">AI</span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">{w.ai}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-white/60" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">Human</span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">{w.human}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-[9px] text-white/30 uppercase tracking-widest">Tools</p>
                  <p className="text-[10px] text-white/50 mt-1">{w.tools}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Closing line */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center text-sm md:text-base text-white/70 mt-12 leading-relaxed max-w-2xl mx-auto"
          >
            <span className="text-brand font-bold">AIで時間を、人で品質を守る。</span><br />
            <span className="text-white/50 text-xs md:text-sm">これが、Anchor Art Worksが「思考の速度」を実現する理由です。</span>
          </motion.p>
        </div>
      </section>

      {/* Industries */}
      <section className="py-24 px-6 bg-brand text-black">
        <div className="max-w-[1100px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12 space-y-3">
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <div className="h-px bg-black/30 flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">INDUSTRIES</span>
              <div className="h-px bg-black/30 flex-1" />
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-black">対応領域。</h2>
            <p className="text-black/70 text-sm max-w-xl mx-auto leading-relaxed">業界横断のクリエイティブで、多様なブランドを支えてきました。</p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-3xl mx-auto">
            {['エンターテインメント', 'ゲーム', '放送', '広告', 'テクノロジー', 'SaaS', '製造業', '教育', 'ヘルスケア', 'コンシューマー製品'].map((industry, idx) => (
              <motion.span key={idx} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.04 }} className="px-5 py-2.5 border border-black bg-black text-xs md:text-sm font-bold tracking-wide text-white">
                {industry}
              </motion.span>
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }} className="text-center text-[11px] text-black/60 mt-10 leading-relaxed max-w-2xl mx-auto">
            特に、ゲームIP・eスポーツ・テレビ局・配信プラットフォーム・企業VP・テクノロジー製品のサービス紹介・SNS連動キャンペーンに強みを持ちます。
          </motion.p>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CTA */}
    </div>
  );
}

// ─────────────────────────────────────────
// JOURNAL PAGE — 現在地
// ─────────────────────────────────────────
function JournalPage({ journalPosts, isLoadingJournal, onNavigateToContact }: {
  journalPosts: NotePost[];
  isLoadingJournal: boolean;
  onNavigateToContact: () => void;
}) {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="pt-28 pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-10"
        >
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.95]">JOURNAL</h1>
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto mt-5">
              <div className="h-2 bg-brand flex-1" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">CURRENT THOUGHTS</span>
              <div className="h-2 bg-brand flex-1" />
            </div>
          </div>
          <div className="text-center space-y-6">
            <p className="text-xl md:text-3xl font-display font-bold tracking-tight leading-snug">
              いま、Anchorが考えていること。
            </p>
            <p className="text-black/70 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              制作の裏側、業界の動向、ブランディングの考察まで。<br />
              note を通じて発信する Anchor Art Works の現在地。
            </p>
          </div>
        </motion.div>
      </section>

      {/* Posts */}
      <section className="py-12 px-6 max-w-[1200px] mx-auto">
        {isLoadingJournal ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" />
          </div>
        ) : journalPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {journalPosts.map((post, idx) => (
              <motion.a
                key={idx}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06 }}
                className="group flex flex-col border border-black/8 hover:border-black/20 transition-colors"
              >
                <div className="aspect-[16/9] overflow-hidden bg-gray-100 relative">
                  <div className="absolute top-4 left-4 z-10 bg-white px-3 py-1.5 shadow-sm">
                    <span className="font-bold text-base leading-none flex items-baseline gap-0.5">
                      <span className="text-black">no</span>
                      <span className="text-emerald-500 text-lg leading-none">+</span>
                      <span className="text-black">e</span>
                    </span>
                  </div>
                  {post.image ? (
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  )}
                </div>
                <div className="p-6 space-y-3 flex-1 flex flex-col">
                  {post.date && <p className="text-[10px] text-black/40 font-bold tracking-wider">{post.date}</p>}
                  <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-black/60 transition-colors flex-1">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-[11px] text-black/60 leading-relaxed line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-black/60 group-hover:text-black transition-colors">
                      READ ON NOTE <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        ) : (
          // Fallback: note / note PRO promo cards (when no RSS posts yet)
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                type: 'note' as const,
                desc: 'noteはクリエイターが文章や画像、音声、動画を投稿して、ユーザーがそのコンテンツを楽しんで応援できるメディアプラットフォームです。だれもが創作を楽しんで続けられるよう、安心できる雰囲気や、多様性を大切にしています。',
                url: 'https://note.com/anchor_art_works',
                image: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?q=80&w=1000',
              },
              {
                type: 'note_pro' as const,
                desc: '法人向け情報発信プラットフォーム。多くのひとが集まるnoteの街でメディアをかんたんにつくり、情報を届けることができます。届ける仕組みと充実したサポートで、企業がポジティブなユーザーとつながって関係を深めるお手伝いをします。',
                url: 'https://note.jp/n/n4fe51c391a36',
                image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=1000',
              },
              {
                type: 'note' as const,
                desc: 'noteはクリエイターが文章や画像、音声、動画を投稿して、ユーザーがそのコンテンツを楽しんで応援できるメディアプラットフォームです。だれもが創作を楽しんで続けられるよう、安心できる雰囲気や、多様性を大切にしています。',
                url: 'https://note.com/anchor_art_works',
                image: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?q=80&w=1000',
              },
              {
                type: 'note_pro' as const,
                desc: '法人向け情報発信プラットフォーム。多くのひとが集まるnoteの街でメディアをかんたんにつくり、情報を届けることができます。届ける仕組みと充実したサポートで、企業がポジティブなユーザーとつながって関係を深めるお手伝いをします。',
                url: 'https://note.jp/n/n4fe51c391a36',
                image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=1000',
              },
            ].map((card, idx) => (
              <motion.a
                key={idx}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="group flex flex-col border border-black/8 hover:border-black/20 transition-colors"
              >
                <div className="aspect-[16/9] overflow-hidden bg-gray-100 relative">
                  <div className="absolute top-4 left-4 z-10 bg-white px-3 py-1.5 shadow-sm">
                    <span className="font-bold text-base leading-none flex items-baseline gap-0.5">
                      <span className="text-black">no</span>
                      <span className="text-emerald-500 text-lg leading-none">+</span>
                      <span className="text-black">e</span>
                      {card.type === 'note_pro' && (
                        <span className="ml-1.5 text-[10px] text-black/70 font-bold tracking-wider">PRO</span>
                      )}
                    </span>
                  </div>
                  <img
                    src={card.image}
                    alt={card.type === 'note' ? 'note' : 'note PRO'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-6 space-y-4 flex-1 flex flex-col">
                  <p className="text-[11px] text-black/65 leading-relaxed flex-1">
                    {card.desc}
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center justify-center px-6 py-2.5 border border-black/15 text-[10px] font-bold uppercase tracking-widest text-black group-hover:bg-black group-hover:text-white transition-all">
                      {card.type === 'note' ? 'noteについて' : 'note proについて'}
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
    </div>
  );
}

// ─────────────────────────────────────────
// PRIVACY POLICY PAGE
// ─────────────────────────────────────────
function PrivacyPolicyPage() {
  return (
    <div className="pb-20 bg-white">
      <section className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-12">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tighter">Privacy Policy</h1>
            <p className="text-lg font-display font-bold text-black/40 tracking-widest">プライバシーポリシー</p>
          </div>
          <div className="text-black/80 space-y-10 leading-loose text-sm">
            <p className="bg-gray-50 p-5 rounded border-l-4 border-black">
              株式会社Anchor Art Works（以下，「当社」といいます。）は，本ウェブサイト上で提供するサービスにおける，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシーを定めます。
            </p>
            {[
              { title: "第1条（個人情報）", content: "「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，生年月日，住所，電話番号，連絡先その他の記述等により特定の個人を識別できる情報及び個人識別情報を指します。" },
              { title: "第2条（個人情報の収集方法）", content: "当社は，ユーザーが利用登録をする際に氏名，生年月日，住所，電話番号，メールアドレスなどの個人情報をお尋ねすることがあります。また，ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を提携先などから収集することがあります。" },
              { title: "第3条（個人情報を収集・利用する目的）", content: "当社が個人情報を収集・利用する目的は，サービスの提供・運営，お問い合わせへの回答，重要なお知らせの連絡，利用規約に違反したユーザーの特定，および上記の利用目的に付随する目的のためです。" },
              { title: "第9条（プライバシーポリシーの変更）", content: "本ポリシーの内容は，法令その他本ポリシーに別段の定めのある事項を除いて，ユーザーに通知することなく，変更することができるものとします。変更後のプライバシーポリシーは，本ウェブサイトに掲載したときから効力を生じるものとします。" },
              { title: "第13条（お問い合わせ窓口）", content: "本ポリシーに関するお問い合わせ先：株式会社Anchor Art Works、〒153-0053 東京都目黒区五本木2丁目44番2号、代表取締役：勝田 康、Email: info@anchor-artworks.com" },
            ].map((item) => (
              <section key={item.title} className="space-y-3">
                <h2 className="text-base font-display font-bold border-b border-black/10 pb-2">{item.title}</h2>
                <p>{item.content}</p>
              </section>
            ))}
            <p className="text-right text-[10px] text-black/40 font-bold tracking-widest">以上</p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
