import React from 'react';
import { ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function Footer() {
  const { navigate, categories, openAuthModal, user } = useStore();

  return (
    <footer className="mt-14 bg-[#172337] text-slate-300">
      {/* Trust Strip */}
      <div className="border-b border-slate-700/70 bg-[#1e2d45]">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-[#FFE500] shrink-0" />
            <div>
              <p className="font-semibold text-white">Fast Nationwide Delivery</p>
              <p className="text-xs text-slate-400">Free standard shipping on orders ₹499+</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#FFE500] shrink-0" />
            <div>
              <p className="font-semibold text-white">100% Secure Payments</p>
              <p className="text-xs text-slate-400">Razorpay, UPI, Cards & Cash on Delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-[#FFE500] shrink-0" />
            <div>
              <p className="font-semibold text-white">7-Day Easy Returns</p>
              <p className="text-xs text-slate-400">Hassle-free doorstep pickup & refunds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-[1360px] mx-auto px-4 lg:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
        <div>
          <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-3">
            Shop Categories
          </h4>
          <ul className="space-y-2">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/category/${c.slug}`)}
                  className="hover:text-white transition-colors"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-3">
            Customer Account
          </h4>
          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => (user ? navigate('/account?tab=orders') : openAuthModal('login'))}
                className="hover:text-white transition-colors"
              >
                Track My Orders
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => (user ? navigate('/account?tab=wishlist') : openAuthModal('login'))}
                className="hover:text-white transition-colors"
              >
                Saved Wishlist
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => (user ? navigate('/account?tab=addresses') : openAuthModal('login'))}
                className="hover:text-white transition-colors"
              >
                Delivery Addresses
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="hover:text-white transition-colors"
              >
                Shopping Cart
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-3">
            Marketplace
          </h4>
          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => navigate('/shop?section=top-deals')}
                className="hover:text-white transition-colors"
              >
                Top Deals
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate('/shop?section=best-selling')}
                className="hover:text-white transition-colors"
              >
                Best Selling
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() =>
                  user && (user.role === 'admin' || user.role === 'seller')
                    ? navigate('/admin')
                    : openAuthModal('seller')
                }
                className="hover:text-white transition-colors"
              >
                Seller & Admin Portal
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-400 font-semibold uppercase tracking-wider mb-3">
            ShopKart Commerce
          </h4>
          <p className="text-slate-400 leading-relaxed">
            ShopKart Internet Marketplace Pvt. Ltd.
            <br />
            Embassy Tech Village, Outer Ring Road
            <br />
            Bengaluru 560103, Karnataka
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800 py-4 px-4 lg:px-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ShopKart Marketplace. All rights reserved.
      </div>
    </footer>
  );
}
