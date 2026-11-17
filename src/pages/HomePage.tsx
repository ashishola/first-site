import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Tag,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Product } from '../types.ts';

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : initialSeconds));
    }, 1000);
    return () => clearInterval(timer);
  }, [initialSeconds]);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return {
    hrs: String(hrs).padStart(2, '0'),
    mins: String(mins).padStart(2, '0'),
    secs: String(secs).padStart(2, '0'),
  };
}

export function HomePage() {
  const { banners, categories, navigate, recentlyViewed } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideIdx, setSlideIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'best-selling' | 'trending' | 'recommended'>(
    'best-selling'
  );

  const countdown = useCountdown(5 * 3600 + 42 * 60 + 18);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<{ products: Product[] }>('/api/products');
        if (active) setProducts(res.products);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [banners.length]);

  const activeBanner = banners[slideIdx % Math.max(1, banners.length)];

  const flashAndTopDeals = useMemo(() => {
    const deals = products.filter((p) => p.isFlashSale || p.isTopDeal);
    return deals.slice(0, 4);
  }, [products]);

  const tabProducts = useMemo(() => {
    if (activeTab === 'best-selling') {
      return products.filter((p) => p.isBestSeller).slice(0, 8);
    }
    if (activeTab === 'trending') {
      return products.filter((p) => p.isTrending).slice(0, 8);
    }
    // Recommended for you: highest rated / value mix
    return [...products]
      .sort((a, b) => b.rating * b.discountPercent - a.rating * a.discountPercent)
      .slice(0, 8);
  }, [products, activeTab]);

  return (
    <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-5 space-y-6">
      {/* 1. Hero Image Slider */}
      <section className="relative rounded-xl overflow-hidden bg-[#172337] shadow-sm">
        {activeBanner ? (
          <div className="relative h-[300px] sm:h-[380px] lg:h-[430px] w-full">
            <img
              src={activeBanner.image}
              alt={activeBanner.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/90 via-[#0f172a]/55 to-transparent" />

            <div className="absolute inset-0 flex items-center">
              <div className="px-6 sm:px-12 max-w-xl text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FFE500]">
                  {activeBanner.badgeText}
                </p>
                <h1 className="font-display text-2xl sm:text-4xl lg:text-[42px] font-bold mt-2 leading-[1.12] text-balance">
                  {activeBanner.title}
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-200 line-clamp-2 max-w-md">
                  {activeBanner.subtitle}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(activeBanner.targetPath)}
                    className="px-5 py-2.5 rounded-md bg-[#FFE500] hover:bg-yellow-300 text-[#172337] font-bold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{activeBanner.ctaLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/shop?section=top-deals')}
                    className="px-4 py-2.5 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold text-sm backdrop-blur-xs transition-colors whitespace-nowrap shrink-0"
                  >
                    View Top Deals
                  </button>
                </div>
              </div>
            </div>

            {banners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSlideIdx((prev) => (prev - 1 + banners.length) % banners.length)
                  }
                  aria-label="Previous slide"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-slate-900 hover:bg-white flex items-center justify-center shadow-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSlideIdx((prev) => (prev + 1) % banners.length)}
                  aria-label="Next slide"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-slate-900 hover:bg-white flex items-center justify-center shadow-md"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {banners.map((b, i) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSlideIdx(i)}
                      aria-label={`Slide ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === slideIdx ? 'w-7 bg-[#FFE500]' : 'w-2 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-[340px] flex items-center justify-center text-white">
            Loading featured showcase...
          </div>
        )}
      </section>

      {/* 2. Flash Sale & Top Deals with Live Countdown */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                Flash Sale & Top Deals
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Verified markdowns on flagship mobiles, audio, footwear, and beauty
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-100 text-[#2874F0]">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">Ends in</span>
              <span className="font-mono-num text-sm font-bold text-[#172337]">
                {countdown.hrs}:{countdown.mins}:{countdown.secs}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/shop?section=flash-sale')}
            className="px-4 py-2 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <span>View All Deals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
            {flashAndTopDeals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Electronics & Fashion Dual Promotional Banners */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="relative rounded-xl overflow-hidden bg-[#2874F0] text-white p-6 sm:p-8 flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10 max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FFE500]">
              Electronics & Mobiles
            </p>
            <h3 className="font-display text-2xl font-bold mt-1.5">
              Upgrade Your Everyday Tech
            </h3>
            <p className="text-sm text-blue-100 mt-1.5">
              Save up to ₹15,000 on 5G smartphones, ultrabooks, and ANC studio headphones.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/category/electronics')}
                className="px-4 py-2 rounded-md bg-[#FFE500] text-[#172337] font-bold text-xs sm:text-sm hover:bg-yellow-300 transition-colors"
              >
                Shop Electronics
              </button>
              <button
                type="button"
                onClick={() => navigate('/category/mobiles')}
                className="px-4 py-2 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm transition-colors"
              >
                Explore Mobiles
              </button>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-blue-100">
            <Tag className="w-3.5 h-3.5 text-[#FFE500]" />
            <span>
              Apply code <strong className="font-mono-num text-white">FLASH20</strong> at checkout
            </span>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-[#172337] text-white p-6 sm:p-8 flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10 max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FFE500]">
              Fashion & Home Living
            </p>
            <h3 className="font-display text-2xl font-bold mt-1.5">
              Curated Apparel & Kitchen Craft
            </h3>
            <p className="text-sm text-slate-300 mt-1.5">
              Selvedge denim, marathon sneakers, espresso machines, and organic pantry duos.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/category/fashion')}
                className="px-4 py-2 rounded-md bg-white text-[#172337] font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors"
              >
                Shop Fashion
              </button>
              <button
                type="button"
                onClick={() => navigate('/category/appliances')}
                className="px-4 py-2 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm transition-colors"
              >
                Home & Appliances
              </button>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-[#FFE500]" />
            <span>
              Extra 10% off with <strong className="font-mono-num text-white">VELO10</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 4. Best Selling, Trending & Recommended For You (Clean Tabbed Showcase) */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('best-selling')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'best-selling'
                  ? 'bg-white text-[#2874F0] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Best Selling Products
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trending')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'trending'
                  ? 'bg-white text-[#2874F0] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trending Now
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recommended')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'recommended'
                  ? 'bg-white text-[#2874F0] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recommended For You
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="text-sm font-semibold text-[#2874F0] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-5">
          {tabProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. Category Visual Tiles */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6">
        <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 mb-4">
          Shop by Department
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/category/${cat.slug}`)}
              className="group text-left rounded-lg border border-slate-200/80 hover:border-[#2874F0] p-2.5 transition-all hover:-translate-y-0.5 bg-slate-50/50 hover:bg-blue-50/40"
            >
              <div className="aspect-[4/3] rounded overflow-hidden bg-white mb-2">
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-[#2874F0] truncate">
                {cat.name}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 6. Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
              Recently Viewed
            </h2>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="text-xs sm:text-sm font-semibold text-[#2874F0] hover:underline"
            >
              Continue Shopping
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentlyViewed.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
