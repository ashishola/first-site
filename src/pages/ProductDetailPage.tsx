import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { apiRequest, formatINR } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Product, ProductReview } from '../types.ts';

interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const {
    navigate,
    addToCart,
    user,
    toggleWishlist,
    openAuthModal,
    trackProductView,
    showToast,
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [pincode, setPincode] = useState('560038');
  const [pincodeMsg, setPincodeMsg] = useState('Delivery available by Tomorrow');

  // Review form state
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setActiveImage(0);

    apiRequest<{ product: Product; reviews: ProductReview[]; related: Product[] }>(
      `/api/products/${encodeURIComponent(slug)}`
    )
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setReviews(res.reviews);
        setRelated(res.related);
        setSelectedVariant(res.product.variants[0] || '');
        trackProductView(res.product);
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, trackProductView]);

  const handleBuyNow = async () => {
    if (!product) return;
    await addToCart(product, 1, selectedVariant, false);
    navigate('/checkout');
  };

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{6}$/.test(pincode.trim())) {
      setPincodeMsg(`Express delivery available to ${pincode.trim()} by Tomorrow`);
    } else {
      setPincodeMsg('Please enter a valid 6-digit postal code');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await apiRequest<{ review: ProductReview; product: Product }>(
        `/api/products/${product.id}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({
            rating: revRating,
            title: revTitle,
            comment: revComment,
          }),
        }
      );
      setReviews((prev) => [res.review, ...prev]);
      setProduct(res.product);
      setRevTitle('');
      setRevComment('');
      showToast('Thank you! Your review has been published.');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-8">
        <div className="bg-white rounded-xl p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 h-96 bg-slate-100 rounded-lg animate-pulse" />
          <div className="lg:col-span-7 space-y-4">
            <div className="h-8 bg-slate-100 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-slate-100 rounded w-1/3 animate-pulse" />
            <div className="h-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-16 text-center">
        <div className="bg-white rounded-xl p-10 max-w-md mx-auto border border-slate-200">
          <h1 className="font-display text-xl font-bold text-slate-900">
            Product Not Found
          </h1>
          <p className="text-sm text-slate-500 mt-2">{error || 'This listing may have been removed.'}</p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="mt-5 px-5 py-2.5 rounded-md bg-[#2874F0] text-white text-sm font-semibold"
          >
            Back to Catalog
          </button>
        </div>
      </main>
    );
  }

  const isWishlisted = Boolean(user?.wishlist.includes(product.id));
  const outOfStock = product.stock <= 0;

  return (
    <main className="max-w-[1360px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-2">
        <button type="button" onClick={() => navigate('/')} className="hover:text-[#2874F0]">
          Home
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => navigate(`/category/${product.categorySlug}`)}
          className="hover:text-[#2874F0]"
        >
          {product.category}
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Product Showcase (Sticky Gallery Left + Contiguous Purchase Module Right) */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-4">
          <div className="relative aspect-[4/3] rounded-lg bg-slate-50 border border-slate-200/70 overflow-hidden">
            <img
              src={product.images[activeImage] || product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => void toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-500"
            >
              <Heart
                className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`}
              />
            </button>
          </div>

          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              {product.images.map((img, i) => (
                <button
                  key={`${img}_${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`w-20 aspect-[4/3] rounded-md overflow-hidden border-2 transition-colors shrink-0 ${
                    i === activeImage ? 'border-[#2874F0]' : 'border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} view ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => void addToCart(product, 1, selectedVariant)}
              className="py-3.5 px-4 rounded-md bg-[#FF9F00] hover:bg-[#f39600] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>ADD TO CART</span>
            </button>
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => void handleBuyNow()}
              className="py-3.5 px-4 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>BUY NOW</span>
            </button>
          </div>
        </div>

        {/* Right: Contiguous Purchase Module & Specs */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {product.brand} · SKU {product.sku}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1 leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-xs tabular-nums">
                <span>{product.rating.toFixed(1)}</span>
                <Star className="w-3 h-3 fill-current" />
              </span>
              <span className="text-slate-600 font-medium tabular-nums">
                {product.reviewCount.toLocaleString('en-IN')} Ratings & Reviews
              </span>
              <span className="text-slate-300">|</span>
              <span
                className={`text-xs font-semibold ${
                  product.stock > 5
                    ? 'text-emerald-700'
                    : product.stock > 0
                      ? 'text-amber-700'
                      : 'text-rose-600'
                }`}
              >
                {product.stock > 5
                  ? `In Stock (${product.stock} available)`
                  : product.stock > 0
                    ? `Only ${product.stock} left in stock`
                    : 'Currently Out of Stock'}
              </span>
            </div>
          </div>

          {/* Pricing Block */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/70">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold font-mono-num text-slate-900">
                {formatINR(product.price)}
              </span>
              {product.mrp > product.price && (
                <>
                  <span className="text-base font-mono-num text-slate-400 line-through">
                    {formatINR(product.mrp)}
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {product.discountPercent}% off
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Inclusive of all taxes · Free delivery on orders above ₹499
            </p>
          </div>

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Select Option
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium border transition-colors ${
                      selectedVariant === variant
                        ? 'border-[#2874F0] bg-blue-50 text-[#2874F0] font-semibold'
                        : 'border-slate-300 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {variant}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Availability Check */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Delivery & Services
            </p>
            <form onSubmit={handlePincodeCheck} className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter Delivery Pincode"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md font-mono-num focus:outline-none focus:border-[#2874F0]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Check
              </button>
            </form>
            <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#2874F0]" />
                <span>{pincodeMsg}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>7-Day Replacement & Cash on Delivery Eligible</span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900 mb-2">
              Product Description
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Specifications Table */}
          {product.specifications.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h2 className="font-display text-base font-bold text-slate-900 mb-3">
                Specifications
              </h2>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-3 text-sm">
                    <div className="col-span-1 px-4 py-2.5 bg-slate-50 text-slate-500 font-medium">
                      {spec.label}
                    </div>
                    <div className="col-span-2 px-4 py-2.5 text-slate-900">
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ratings & Customer Reviews */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Ratings & Customer Reviews
          </h2>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200/70">
            <div className="text-center pr-4 border-r border-slate-200">
              <p className="font-display text-4xl font-bold text-slate-900 tabular-nums">
                {product.rating.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {product.reviewCount} ratings
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Verified buyer feedback helps shoppers pick the right configuration.
            </p>
          </div>

          {/* Write a Review Form */}
          <form
            onSubmit={handleSubmitReview}
            className="p-4 rounded-lg border border-slate-200 space-y-3"
          >
            <h3 className="text-sm font-bold text-slate-900">Write a Product Review</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Your Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRevRating(star)}
                    className="p-1"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= revRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={revTitle}
              onChange={(e) => setRevTitle(e.target.value)}
              placeholder="Review headline (optional)"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
            />
            <textarea
              rows={3}
              required
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="Share what you liked or disliked about this product..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {submittingReview ? 'Submitting...' : user ? 'Submit Review' : 'Sign In to Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 divide-y divide-slate-100">
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500 py-8">
              No written reviews yet. Be the first customer to review this product.
            </p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="py-4 first:pt-0">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-xs font-semibold tabular-nums">
                    <span>{rev.rating}</span>
                    <Star className="w-3 h-3 fill-current" />
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900">{rev.title}</h4>
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{rev.comment}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-medium text-slate-600">{rev.userName}</span>
                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Buyer</span>
                    </span>
                  )}
                  <span>·</span>
                  <span>{new Date(rev.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-4">
            Related Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
