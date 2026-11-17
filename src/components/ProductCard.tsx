import React, { useState } from 'react';
import { Heart, Package, ShoppingCart, Star } from 'lucide-react';
import { formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import type { Product } from '../types.ts';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { navigate, addToCart, user, toggleWishlist } = useStore();
  const [imgError, setImgError] = useState(false);

  const isWishlisted = Boolean(user?.wishlist.includes(product.id));
  const outOfStock = product.stock <= 0;

  return (
    <article className="group bg-white border border-slate-200/80 rounded-lg overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Image Container (4:3 aspect ratio) */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="w-full h-full block text-left focus-visible:outline-2 focus-visible:outline-[#2874F0]"
        >
          {!imgError && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 text-slate-400 p-4 text-center">
              <Package className="w-8 h-8 mb-1.5 text-slate-300" />
              <span className="text-xs font-medium text-slate-500 line-clamp-1">
                {product.brand}
              </span>
            </div>
          )}
        </button>

        {/* Wishlist Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleWishlist(product.id);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 shadow-xs border border-slate-200/70 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`}
          />
        </button>
      </div>

      {/* Product Metadata */}
      <div className={`flex-1 flex flex-col ${compact ? 'p-3' : 'p-4'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
          {product.brand} · {product.category}
        </p>

        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="mt-1 text-left focus-visible:outline-2 focus-visible:outline-[#2874F0]"
        >
          <h3 className="text-sm sm:text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#2874F0] transition-colors">
            {product.name}
          </h3>
        </button>

        {/* Rating + Review Count (Unboxed clean metadata) */}
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white font-semibold tabular-nums">
            <span>{product.rating.toFixed(1)}</span>
            <Star className="w-3 h-3 fill-current" />
          </span>
          <span className="text-slate-400 tabular-nums">
            ({product.reviewCount.toLocaleString('en-IN')})
          </span>
          {outOfStock && (
            <span className="text-rose-600 font-medium ml-auto">Out of Stock</span>
          )}
        </div>

        {/* Price Row */}
        <div className="mt-auto pt-3 flex items-baseline gap-2 flex-wrap">
          <span className="text-base sm:text-lg font-bold font-mono-num text-slate-900">
            {formatINR(product.price)}
          </span>
          {product.mrp > product.price && (
            <>
              <span className="text-xs font-mono-num text-slate-400 line-through">
                {formatINR(product.mrp)}
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                {product.discountPercent}% off
              </span>
            </>
          )}
        </div>

        {/* Action Button */}
        {!compact && (
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => void addToCart(product, 1)}
            className="mt-3 w-full py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 bg-blue-50 text-[#2874F0] hover:bg-[#2874F0] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'Unavailable' : 'Add to Cart'}</span>
          </button>
        )}
      </div>
    </article>
  );
}
