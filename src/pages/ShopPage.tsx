import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Product } from '../types.ts';

interface ShopPageProps {
  initialCategory?: string;
}

export function ShopPage({ initialCategory }: ShopPageProps) {
  const { currentPath, categories, navigate } = useStore();
  const searchParams = new URLSearchParams(currentPath.split('?')[1] || '');
  const qParam = searchParams.get('q') || '';
  const sectionParam = searchParams.get('section') || '';

  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory || searchParams.get('category') || 'all'
  );
  const [sort, setSort] = useState(searchParams.get('sort') || 'popularity');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [minDiscount, setMinDiscount] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedCategory(initialCategory || 'all');
  }, [initialCategory]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const qs = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'all') qs.set('category', selectedCategory);
    if (qParam) qs.set('q', qParam);
    if (sectionParam) qs.set('section', sectionParam);
    if (sort) qs.set('sort', sort);
    if (minPrice) qs.set('minPrice', minPrice);
    if (maxPrice) qs.set('maxPrice', maxPrice);
    if (minRating > 0) qs.set('minRating', String(minRating));
    if (minDiscount > 0) qs.set('minDiscount', String(minDiscount));
    if (inStockOnly) qs.set('inStock', 'true');

    apiRequest<{ products: Product[] }>(`/api/products?${qs.toString()}`)
      .then((res) => {
        if (active) setProducts(res.products);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedCategory,
    qParam,
    sectionParam,
    sort,
    minPrice,
    maxPrice,
    minRating,
    minDiscount,
    inStockOnly,
  ]);

  const clearFilters = () => {
    setSelectedCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setMinDiscount(0);
    setInStockOnly(false);
    setSort('popularity');
    navigate('/shop');
  };

  const activeCategoryName =
    selectedCategory === 'all'
      ? sectionParam
        ? sectionParam.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        : 'All Products'
      : categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory;

  return (
    <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Mobile Filter Trigger */}
        <div className="w-full lg:hidden flex items-center justify-between bg-white p-3.5 rounded-lg border border-slate-200">
          <span className="text-sm font-semibold text-slate-900">
            {activeCategoryName} ({products.length})
          </span>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-[#2874F0] text-xs font-semibold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Left Filter Sidebar */}
        <aside
          className={`${
            mobileFiltersOpen
              ? 'fixed inset-0 z-50 bg-white p-5 overflow-y-auto'
              : 'hidden lg:block w-64 shrink-0 bg-white rounded-lg border border-slate-200/80 p-5 sticky top-32'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">Filters</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-[#2874F0] hover:underline"
              >
                Clear All
              </button>
              {mobileFiltersOpen && (
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close filters"
                  className="p-1 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5 pt-4 text-sm">
            {/* Category Filter */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Category
              </h3>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === 'all'}
                    onChange={() => {
                      setSelectedCategory('all');
                      navigate('/shop');
                    }}
                    className="accent-[#2874F0]"
                  />
                  <span>All Categories</span>
                </label>
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900"
                  >
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === cat.slug}
                      onChange={() => {
                        setSelectedCategory(cat.slug);
                        navigate(`/category/${cat.slug}`);
                      }}
                      className="accent-[#2874F0]"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Price Range (₹)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded font-mono-num"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded font-mono-num"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { label: 'Under ₹5,000', min: '', max: '5000' },
                  { label: '₹5K - ₹25K', min: '5000', max: '25000' },
                  { label: '₹25K+', min: '25000', max: '' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setMinPrice(preset.min);
                      setMaxPrice(preset.max);
                    }}
                    className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#2874F0]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Customer Rating
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm">
                {[4.5, 4, 3].map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="minRating"
                      checked={minRating === r}
                      onChange={() => setMinRating(r)}
                      className="accent-[#2874F0]"
                    />
                    <span>{r}★ & above</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="radio"
                    name="minRating"
                    checked={minRating === 0}
                    onChange={() => setMinRating(0)}
                    className="accent-[#2874F0]"
                  />
                  <span>Any Rating</span>
                </label>
              </div>
            </div>

            {/* Discount Filter */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Discount
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm">
                {[30, 20, 10, 0].map((d) => (
                  <label key={d} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="minDiscount"
                      checked={minDiscount === d}
                      onChange={() => setMinDiscount(d)}
                      className="accent-[#2874F0]"
                    />
                    <span>{d === 0 ? 'All Discounts' : `${d}% or more`}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-sm">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="accent-[#2874F0]"
                />
                <span>Exclude Out of Stock</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main Results Grid */}
        <section className="flex-1 min-w-0 w-full bg-white rounded-lg border border-slate-200/80 p-5">
          {/* Header & Sort Bar */}
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">
                {qParam ? `Results for "${qParam}"` : activeCategoryName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Showing {products.length} {products.length === 1 ? 'product' : 'products'}
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Sort By:
              </span>
              {[
                { key: 'popularity', label: 'Popularity' },
                { key: 'price_asc', label: 'Price -- Low to High' },
                { key: 'price_desc', label: 'Price -- High to Low' },
                { key: 'rating', label: 'Top Rated' },
                { key: 'newest', label: 'Newest' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSort(opt.key)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    sort === opt.key
                      ? 'bg-blue-50 text-[#2874F0] border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-lg font-semibold text-slate-900">
                No matching products found
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Try adjusting your price range, rating, or search keywords.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 px-5 py-2 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
