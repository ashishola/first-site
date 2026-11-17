import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { PaymentStatusPage } from './pages/PaymentStatusPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';

function AppRoutes() {
  const { currentPath } = useStore();
  const pathname = currentPath.split('?')[0];

  let content: React.ReactNode = <HomePage />;

  if (pathname === '/' || pathname === '') {
    content = <HomePage />;
  } else if (pathname === '/shop') {
    content = <ShopPage />;
  } else if (pathname.startsWith('/category/')) {
    const slug = pathname.replace('/category/', '').split('/')[0];
    content = <ShopPage initialCategory={slug} />;
  } else if (pathname.startsWith('/product/')) {
    const slug = pathname.replace('/product/', '').split('/')[0];
    content = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/cart') {
    content = <CartPage />;
  } else if (pathname === '/checkout') {
    content = <CheckoutPage />;
  } else if (pathname.startsWith('/payment/success/')) {
    const orderId = pathname.replace('/payment/success/', '').split('/')[0];
    content = <PaymentStatusPage mode="success" orderId={orderId} />;
  } else if (pathname === '/payment/failure') {
    content = <PaymentStatusPage mode="failure" />;
  } else if (pathname === '/account') {
    content = <AccountPage />;
  } else if (pathname.startsWith('/admin')) {
    content = <AdminDashboardPage />;
  }

  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F3F6]">
      <Navbar />
      <div className="flex-1">{content}</div>
      {!isAdmin && <Footer />}
      <AuthModal />
      <CartDrawer />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  );
}
