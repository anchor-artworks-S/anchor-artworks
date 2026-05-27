/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import Papa from "papaparse";
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
} from "lucide-react";

// --- Types ---
type Page = 'home' | 'works' | 'about' | 'contact' | 'privacy';

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
}

// Category sort order
const CATEGORY_ORDER = ['COAPORATE', 'PR', 'EVENT', 'GRAPHIC', 'OTHER'];

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
  if (p.startsWith('/about')) return 'about';
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
                const norm = (row: any, key: string) => {
                  // Find key tolerantly (handle trailing/leading spaces)
                  const found = Object.keys(row).find(k => k.trim() === key.trim());
                  return found ? String(row[found] ?? '').trim() : '';
                };
                (results.data as any[]).forEach(row => {
                  // Multi-form lookup: try with "X列:" prefix variants and plain key
                  const lookup = (...keys: string[]) => {
                    for (const k of keys) {
                      const v = norm(row, k);
                      if (v) return v;
                    }
                    return '';
                  };
                  const vimeoId = lookup('A列: vimeoId', 'A列:vimeoId', 'vimeoId');
                  if (!vimeoId) return;
                  const titleOverride = lookup('B列: title', 'B列:title', 'title');
                  const productionNote = lookup('C列: production_note', 'C列:production_note', 'production_note');
                  const strategy = lookup('D列: strategy', 'D列:strategy', 'strategy');
                  const evidenceUrl = lookup('E列: evidence_url', 'E列:evidence_url', 'evidence_url');
                  const category = (lookup('F列: category', 'F列:category', 'category') || 'OTHER').toUpperCase();
                  const isSelected = /^true$/i.test(lookup('G列: is_selected', 'G列:is_selected', 'is_selected'));
                  const displayOrderStr = lookup('H列: display_order', 'H列:display_order', 'display_order');
                  const displayOrder = displayOrderStr ? Number(displayOrderStr) : undefined;
                  const clientName = lookup('I列: client_name', 'I列:client_name', 'client_name');
                  const publishedStr = lookup('J列: is_published', 'J列:is_published', 'is_published');
                  const isPublished = publishedStr === '' ? true : /^true$/i.test(publishedStr);

                  map.set(vimeoId, {
                    ...(titleOverride && { title: titleOverride }),
                    category: CATEGORY_ORDER.includes(category) ? category : 'OTHER',
                    isSelected,
                    displayOrder,
                    clientName,
                    isPublished,
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

      // 6. Sort: CATEGORY_ORDER → displayOrder → uploadedAt desc
      merged.sort((a, b) => {
        const ca = CATEGORY_ORDER.indexOf(a.category || 'OTHER');
        const cb = CATEGORY_ORDER.indexOf(b.category || 'OTHER');
        if (ca !== cb) return (ca === -1 ? 999 : ca) - (cb === -1 ? 999 : cb);
        const da = a.displayOrder ?? Infinity;
        const db = b.displayOrder ?? Infinity;
        if (da !== db) return da - db;
        return (b.uploadedAt || '').localeCompare(a.uploadedAt || '');
      });

      setWorks(merged);
      setIsLoading(false);
    };

    loadWorks();
  }, []);

  useEffect(() => {
    const fetchNoteRSS = async () => {
      setIsLoadingJournal(true);
      try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(NOTE_RSS_URL)}`);
        if (!response.ok) throw new Error("Note RSS fetch failed");
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const fetchedPosts: NotePost[] = data.items.map((item: any) => ({
            title: item.title,
            date: new Date(item.pubDate).toLocaleDateString('ja-JP').replace(/\//g, '.'),
            excerpt: (item.description || '').replace(/<[^>]*>?/gm, '').substring(0, 100) + "...",
            url: item.link,
            tags: item.categories || [],
            image: item.thumbnail || item.enclosure?.link
          }));
          setJournalPosts(fetchedPosts.slice(0, 4));
        }
        // On no items, leave journalPosts as [] → static promo cards will render as fallback
      } catch (e) {
        // RSS fetch failed → leave journalPosts as [] → static promo cards render
        console.warn("Note RSS fetch failed, falling back to static cards:", e);
      } finally {
        setIsLoadingJournal(false);
      }
    };
    fetchNoteRSS();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'works', label: 'Works' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md border-b border-black/5 h-16' : 'bg-white h-16'}`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => { setCurrentPage('home'); setIsMobileMenuOpen(false); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="AAW" style={{ height: 28 }} className="w-auto object-contain" />
            <span className="font-display font-semibold text-sm tracking-wide hidden sm:block">Anchor Art Works</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10 text-[11px] font-bold uppercase tracking-[0.18em]">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setCurrentPage(link.id as Page)}
                className={`relative py-1 transition-colors ${
                  currentPage === link.id
                    ? "text-black border-b border-black"
                    : "text-black/50 hover:text-black"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 text-black" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
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
              className="absolute top-16 left-0 w-full bg-white border-b border-black/5 shadow-lg md:hidden"
            >
              <nav className="flex flex-col p-6 space-y-1">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => { setCurrentPage(link.id as Page); setIsMobileMenuOpen(false); }}
                    className={`text-xs font-bold uppercase tracking-widest text-left py-4 border-b border-black/5 ${
                      currentPage === link.id ? "text-black" : "text-black/40"
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

      <main className="pt-0">
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
              />
            </motion.div>
          )}
          {currentPage === 'works' && (
            <motion.div key="works" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <WorksPage works={works} isLoading={isLoading} onSelectWork={setSelectedWork} onNavigateToContact={() => setCurrentPage('contact')} />
            </motion.div>
          )}
          {currentPage === 'about' && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <AboutPage onNavigateToContact={() => setCurrentPage('contact')} />
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

      <footer className="bg-black text-white py-8 px-6 md:px-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <button
            onClick={() => setCurrentPage('privacy')}
            className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Privacy Policy
          </button>
          <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
            © Anchor Art Works Co. Ltd.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────
function HomePage({ works, isLoading, isLoadingJournal, journalPosts, onNavigateToWorks, onNavigateToContact }: {
  works: Work[];
  isLoading: boolean;
  isLoadingJournal: boolean;
  journalPosts: NotePost[];
  onNavigateToWorks: () => void;
  onNavigateToContact: () => void;
}) {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative bg-brand min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/video/hero-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover z-0"
          aria-hidden="true"
        >
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>

        {/* Pink overlay (brand tint) */}
        <div className="absolute inset-0 bg-brand/40 z-10" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-20 flex flex-col items-center gap-6 max-w-2xl mx-auto"
        >
          <img src="/logo.png" alt="Anchor Art Works" className="h-28 md:h-36 w-auto object-contain" />
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight leading-tight">
              CG・映像制作を、<br />思考の速度で。
            </h1>
            <p className="text-sm md:text-base text-black/70 leading-relaxed">
              企画からCG・編集まで。豊富なアイデアを、最速でカタチに。<br />
              Anchor Art Worksは、スピードとクオリティを両立するクリエイティブパートナーです。
            </p>
          </div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={onNavigateToWorks}
            className="mt-4 px-10 py-3 bg-black text-white font-bold text-[11px] uppercase tracking-widest hover:bg-black/80 transition-all flex items-center gap-3 group"
          >
            <span>VIEW WORKS</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </section>

      {/* Selected Works */}
      <section className="py-20 px-6 max-w-[1200px] mx-auto">
        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-center mb-12">SELECTED WORKS.</h2>
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
                ? [...selected].sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity)).slice(0, 3)
                : works.slice(0, 3);
              return featured.map((work, idx) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group cursor-pointer text-center space-y-3"
                onClick={onNavigateToWorks}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-[11px] font-bold text-black/70">
                  『{work.title}』ブランド映像
                </p>
                <p className="text-[10px] text-black/40">{work.clientName ? `Client_${work.clientName}` : 'Client_共同印刷 株式会社'}</p>
              </motion.div>
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

      {/* CTA */}
      <div className="px-6 pb-20 max-w-[1200px] mx-auto">
        <CTASection onNavigate={onNavigateToContact} />
      </div>

      {/* Strengths */}
      <section className="bg-black text-white py-24 px-6">
        <div className="max-w-[900px] mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-brand">OUR STRENGTHS.</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              社内一貫体制により、戦略設計から最終的なアウトプットまで、<br />
              ブレのないクオリティを提供します。
            </p>
          </div>
          <div className="border border-white/20 divide-y divide-white/20">
            {[
              {
                title: "Marketing & Design",
                subtitle: "認知構造の設計",
                desc: "デザイン思考を用い、視聴者の脳内に情報を定着させるための「情報の重み付け」を映像化。戦略なき映像制作を打破します。",
                expert: "勝田 康 (CEO)"
              },
              {
                title: "Motion & Creative",
                subtitle: "論理的動態デザイン",
                desc: "3DCGとモーショングラフィックスを駆使し、複雑な概念を直感的に理解させる「動く図解」を構築。視覚的ノイズを排除します。",
                expert: "勝田 友亮 / 矢戸 光一"
              },
              {
                title: "Production & Quality",
                subtitle: "放送基準の品質担保",
                desc: "テレビ業界標準の制作フローとブランドセーフティを適用。企業の社会的信頼を保護し、高める映像を提供します。",
                expert: "目 学"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 md:p-10 space-y-4"
              >
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

      {/* INFORMATION — Dynamic note RSS posts (with static promo cards as fallback) */}
      <section className="py-20 px-6 max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">INFORMATION</h2>
        </div>
        {journalPosts.length > 0 ? (
          // Dynamic: latest posts from note RSS
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
                transition={{ delay: idx * 0.08 }}
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
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  )}
                </div>
                <div className="p-6 space-y-3 flex-1 flex flex-col">
                  <p className="text-[10px] text-black/40 font-bold tracking-wider">{post.date}</p>
                  <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-black/60 transition-colors flex-1">
                    {post.title}
                  </h3>
                  <p className="text-[11px] text-black/60 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
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
          // Static fallback: note / note PRO promo cards (Aisle-friendly + RSS失敗時保険)
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
  const [sortBy, setSortBy] = useState<'default' | 'views' | 'recent'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const categories = ['ALL', 'COAPORATE', 'PR', 'EVENT', 'GRAPHIC'];
  const sortOptions: { value: typeof sortBy; label: string }[] = [
    { value: 'default', label: 'おすすめ' },
    { value: 'views', label: '再生数順' },
    { value: 'recent', label: '新着順' },
  ];
  const PER_PAGE = 15;

  const categoryFiltered = activeCategory === 'ALL'
    ? works
    : works.filter(work => (work.category || 'OTHER').toUpperCase() === activeCategory.toUpperCase());

  // Apply sort
  const filteredWorks = (() => {
    if (sortBy === 'views') {
      return [...categoryFiltered].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    }
    if (sortBy === 'recent') {
      return [...categoryFiltered].sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
    }
    return categoryFiltered; // default: already sorted by category+order+date in App
  })();

  const totalPages = Math.max(1, Math.ceil(filteredWorks.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedWorks = filteredWorks.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Reset to page 1 when filter/sort changes
  useEffect(() => { setCurrentPage(1); }, [activeCategory, sortBy]);

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
            <div className="flex items-center gap-4 mt-5">
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

      {/* Category Filter + Sort */}
      <section className="mb-12 px-6 max-w-[1200px] mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex items-center gap-3 sm:w-32 sm:shrink-0">
            <span className="text-sm font-bold tracking-[0.15em] font-display">CATEGORY</span>
            <div className="w-12 h-px bg-black/20" />
          </div>
          <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex items-center gap-3 sm:w-32 sm:shrink-0">
            <span className="text-sm font-bold tracking-[0.15em] font-display">SORT</span>
            <div className="w-12 h-px bg-black/20" />
          </div>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-5 py-1.5 text-[10px] font-bold tracking-widest transition-all ${
                  sortBy === opt.value
                    ? "bg-black text-white"
                    : "bg-brand text-black/60 hover:bg-brand/60"
                }`}
              >
                {opt.label}
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
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group cursor-pointer"
                onClick={() => onSelectWork(work)}
              >
                <div className="aspect-video overflow-hidden mb-3 bg-black/5">
                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <div className="text-center space-y-1 px-2">
                  <p className="text-[11px] font-bold text-black/80 group-hover:text-black/50 transition-colors line-clamp-2">
                    {work.title}
                  </p>
                  {work.clientName && (
                    <p className="text-[10px] text-black/40">Client_{work.clientName}</p>
                  )}
                </div>
              </motion.div>
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

      <div className="mt-24 px-6 max-w-[1200px] mx-auto">
        <CTASection onNavigate={onNavigateToContact} />
      </div>
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
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.95]">
              TRUST<br />IN MOTION.
            </h1>
            <div className="flex items-center gap-4 mt-5">
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">WHO WE ARE</span>
              <div className="h-2 bg-brand flex-1" />
            </div>
          </div>
          <div className="text-center space-y-6">
            <p className="text-xl md:text-3xl font-display font-bold tracking-tight leading-snug">
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
            {
              role: "Editor / Motion Grapher",
              name: "勝田　友亮",
              enName: "YUSUKE KATSUDA",
              bio: "1989年4月7日生まれ。PRムービー、イベント映像、企業ブランドムービー、VPなどモーショングラフィックスを主軸に制作。複雑な情報構造を視覚的に整理し、直感的に伝わる動きへと再構築する設計力が強み。クライアントの要望に柔軟に応えるロジカル思考と、視覚的なリズムを両立した映像表現で、ブランドの世界観を多面的に支える。"
            },
            {
              role: "Editor / Motion Grapher",
              name: "矢戸　光一",
              enName: "KOICHI YATO",
              bio: "2003年1月1日生まれ。PRムービー、イベント映像、ゲーム関連コンテンツなどモーショングラフィックスを主軸に制作。eスポーツのプロ選手を目指していた経験から培われた、高い集中力と緻密な観察眼が武器。0.1秒単位での編集精度と、視聴者の注意を逃さないリズム設計に強みを持ち、次世代のクリエイティブを牽引する。"
            },
            {
              role: "Producer / Director",
              name: "目　学",
              enName: "MANABU SAKKA",
              bio: "1983年10月2日生まれ。映像専門学校卒業後、テレビ業界に就職。報道・バラエティ・ドキュメンタリーなど多様な現場で経験を積み、その後広告業界へ転身。テレビ品質の制作工程と、広告に求められるスピード感を融合させたプロデュース力で、Anchor Art Worksの映像品質を担保する責任者を務める。"
            },
            {
              role: "SNS / Short Video Editor",
              name: "名前差し替え予定",
              enName: "NAMAE SASIKAEYOTEI",
              bio: "SNS運用とショート動画制作に特化した視点を持つエディター。TikTok、Instagram Reels、YouTube Shortsなど主要プラットフォームの仕様とユーザー行動を深く理解し、各メディア特性に最適化したコンテンツ設計を行う。トレンドを瞬時にキャッチするテンポ感と、データに基づく継続的な改善で、ブランドのSNS発信を成果に直結させる。"
            },
            {
              role: "Designer",
              name: "名前差し替え予定",
              enName: "NAMAE SASIKAEYOTEI",
              bio: "視覚的な美しさと情報構造の整理を両立させるデザイナー。映像内のタイポグラフィ、レイアウト、グラフィック要素、カラーパレットまで、ブランドの世界観を支える視覚要素を緻密に設計する。グラフィックデザインの原則を映像表現に応用し、静と動の調和したビジュアル言語を構築。ブランドアイデンティティを深める繊細なデザインを提供する。"
            },
            {
              role: "Marketing Specialist",
              name: "沖田　紘亮",
              enName: "KOUSUKE OKITA",
              bio: "テレビ局、総合広告代理店を経て独立。AI時代のマーケティング戦略とデータ分析を基盤に、コンテンツの価値最大化を担うスペシャリスト。行動経済学や市場構造を踏まえた戦略設計により、ターゲットへの最適なリーチと継続的な成果創出を実現。映像制作の前段階となる課題設定からKPI設計、効果測定までを支援する。"
            }
          ].map((member, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-4"
            >
              {/* Placeholder photo */}
              <div className="aspect-square bg-white/10 w-full" />
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
              <div key={idx} className="flex-shrink-0 flex items-center justify-center h-14 px-10 md:px-14">
                <ClientLogo client={client} />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="px-6 pb-20 max-w-[1200px] mx-auto">
        <CTASection onNavigate={onNavigateToContact} />
      </div>
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
        className="h-10 w-auto object-contain"
        onError={() => setError(true)}
      />
    );
  }
  return <span className="font-display font-bold text-base tracking-tight">{client.name}</span>;
}

// ─────────────────────────────────────────
// CONTACT PAGE
// ─────────────────────────────────────────
function ContactPage({ works, onNavigateToPrivacy }: { works: Work[]; onNavigateToPrivacy: () => void }) {
  const [showAI, setShowAI] = useState(false);

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
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter leading-[0.95]">LET'S TALK.</h1>
            <div className="flex items-center gap-4 mt-5">
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/50 whitespace-nowrap">GET IN TOUCH</span>
              <div className="h-2 bg-brand flex-1" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-black/70 text-sm leading-relaxed max-w-xl mx-auto">
              伝え方に迷ったら、まずはご相談ください。課題の整理から制作まで一貫して対応します。<br />
              アイデアがまとまっていなくても大丈夫です。スピードとクオリティを大切に、最適な形をご提案します。
            </p>
          </div>
        </motion.div>
      </section>

      {/* AI Concierge */}
      <section className="px-6 mb-20 max-w-[800px] mx-auto">
        <div className="relative pt-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-brand text-black px-10 py-1.5 text-center">
              <span className="text-[10px] font-bold tracking-[0.35em] uppercase">ACTION</span>
            </div>
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-brand mx-auto" />
          </div>
          <div className="bg-black text-white p-10 md:p-14 text-center space-y-6">
            <div className="space-y-2">
              <p className="text-white/40 font-bold tracking-[0.3em] text-[11px] uppercase">AI CONCIERGE</p>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-brand">Anchor Art Works</h2>
            </div>
            <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
              お急ぎの場合は、AIコンシェルジュが<br />
              貴社の課題に最適な制作チームや解決アプローチを即座に回答いたします。
            </p>
            <button
              onClick={() => setShowAI(true)}
              className="px-10 py-3 bg-brand text-black font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center gap-3 mx-auto group"
            >
              <span>LAUNCH AI ASSISTANT</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-gray-100 py-20 px-6">
        <div className="max-w-[700px] mx-auto space-y-16">
          {/* Inquiry */}
          <div className="space-y-8">
            <h2 className="text-xl md:text-2xl font-display font-bold text-center">お問い合わせ内容</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest">お問い合わせ項目 *</label>
                <div className="relative">
                  <select className="w-full bg-white px-5 py-4 border-none shadow-sm focus:ring-2 focus:ring-brand outline-none appearance-none cursor-pointer text-sm">
                    <option>選択してください</option>
                    <option>映像制作のご相談</option>
                    <option>デザインのご依頼</option>
                    <option>企画・戦略の策定</option>
                    <option>その他</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest">お問い合わせ内容 *</label>
                <textarea
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
              {[
                { label: "会社名 *", type: "text" },
                { label: "お名前 *", type: "text" },
                { label: "フリガナ *", type: "text" },
                { label: "電話番号 *", type: "tel" },
                { label: "メールアドレス *", type: "email" },
                { label: "Web サイト URL", type: "url" },
              ].map((field, idx) => (
                <div key={idx} className="space-y-2">
                  <label className="text-xs font-bold tracking-widest">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder="選択してください"
                    className="w-full bg-white px-5 py-4 border-none shadow-sm focus:ring-2 focus:ring-brand outline-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-6 text-center">
            <label className="flex items-center justify-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 border-gray-300 text-black focus:ring-black cursor-pointer" />
              <span className="text-[11px] font-bold tracking-widest text-black/60">
                <button type="button" onClick={onNavigateToPrivacy} className="underline hover:text-black transition-colors">
                  プライバシーポリシー
                </button>に同意する
              </span>
            </label>
            <button className="w-full md:w-auto px-14 py-4 bg-black text-white font-bold text-[11px] uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-3 mx-auto group">
              <span>入力内容を確認する</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
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
                <ChatConcierge works={works} />
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

function ChatConcierge({ works }: { works: Work[] }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'こんにちは。Anchor Art WorksのAIコンシェルジュです。代表の勝田が提唱する「デザイン思考」と、プロデューサーの目が管理する「放送品質」を軸に、貴社の課題に最適なアプローチをご提案します。どのような課題をお持ちですか？' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }, []);

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
      if (!aiRef.current) throw new Error("AI not initialized");
      const systemPrompt = `You are the AI Concierge for Anchor Art Works (株式会社Anchor Art Works).
Your mission is to provide professional consultation about the company's services, team, and philosophy.
[Company]: 株式会社Anchor Art Works, CEO: 勝田 康, Tokyo Meguro
[Instructions]: Professional, polite Japanese (Keigo). Concise, evidence-based suggestions.
[Works Context]: ${works.map(w => `- ${w.title}: ${w.m07_solution}`).join('\n')}`;

      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const chat = aiRef.current.chats.create({
        model: 'gemini-2.0-flash',
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
        history: history as any
      });

      const response = await chat.sendMessage({ message: textToSend });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "申し訳ございません。応答の生成に失敗しました。" }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "現在、AIコンシェルジュが混み合っているようです。しばらくしてから再度お試しいただくか、お問い合わせフォームより直接お問い合わせください。" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = ["強みについて教えて", "勝田 康の実績は？", "3DCG制作の相談ができる？", "Aisleフレームワークとは？"];

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
            <img src="/logo.png" alt="Anchor Art Works" className="h-16 md:h-24 w-auto mx-auto object-contain" />
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
          <div className="relative aspect-video w-full bg-black">
            <img src={work.thumbnail} alt={work.title} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-6 left-6 right-14 md:bottom-10 md:left-10">
              <span className="px-2 py-0.5 bg-white/20 text-[9px] text-white uppercase tracking-widest font-bold inline-block mb-3">{work.category}</span>
              <h2 className="text-2xl md:text-4xl font-display font-bold text-white tracking-tighter leading-tight">{work.title}</h2>
              <div className="flex items-center gap-4 mt-4">
                <button className="px-6 py-2 bg-white text-black font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-200 transition-colors">
                  <Play size={12} className="fill-black" />
                  Play Video
                </button>
                {work.e_id_link && (
                  <a href={work.e_id_link} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 md:p-12 grid md:grid-cols-12 gap-8 md:gap-16">
            <div className="md:col-span-8 space-y-10">
              {work.a01_intent && (
                <section className="space-y-3">
                  <span className="text-black/30 font-bold text-[9px] uppercase tracking-[0.4em] block">A-01: Intent</span>
                  <p className="text-xl md:text-3xl font-display font-bold leading-tight tracking-tight">"{work.a01_intent}"</p>
                </section>
              )}
              {work.m07_solution && (
                <section className="space-y-4">
                  <span className="text-black/30 font-bold text-[9px] uppercase tracking-[0.4em] block">M-07: Solution</span>
                  <p className="text-base text-black/60 leading-relaxed">{work.m07_solution}</p>
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
              { title: "第13条（お問い合わせ窓口）", content: "本ポリシーに関するお問い合わせ先：株式会社Anchor Art Works、〒153-0053 東京都目黒区五本木2丁目44番2号、代表取締役：勝田 康、Email: info@anchor-japan.com" },
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
