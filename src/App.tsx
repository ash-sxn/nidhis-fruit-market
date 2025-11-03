
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DiwaliGiftingPage from "./pages/category/diwali-gifting";
import DryFruitsComboPage from "./pages/category/dry-fruits-combo";
import FestivalGiftingPage from "./pages/category/festival-gifting";
import FlavourMakhanaPage from "./pages/category/flavour-makhana";
import NidhisDryFruitsPage from "./pages/category/nidhis-dry-fruits";
import NidhisSpicesPage from "./pages/category/nidhis-spices";
import NidhisWholeSpicesPage from "./pages/category/nidhis-whole-spices";
import SuperFoodPage from "./pages/category/super-food";
import AuthPage from "./pages/AuthPage";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BlogPage from "./pages/BlogPage";
import Cart from "./components/Cart";
import Wishlist from "./components/Wishlist";
import AccountPage from "./pages/AccountPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminMfaPage from "./pages/admin/AdminMfaPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import ProductsPage from "./pages/ProductsPage";
import { useAdminAccess } from "@/hooks/useAdminAccess";

const queryClient = new QueryClient();

// Custom RequireAuth wrapper
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    // Listen first, then check session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-saffron font-bold">Loading...</div>;
  }
  return authed ? <>{children}</> : <Navigate to="/auth" />;
};

const AdminGuard: React.FC = () => {
  const location = useLocation();
  const { loading, isAdmin, needsAuth, needsMfa } = useAdminAccess();
  const isMfaRoute = location.pathname.startsWith('/admin/mfa');

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-saffron font-bold">Checking access...</div>;
  }

  if (needsAuth) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (needsMfa && !isMfaRoute) {
    return <Navigate to="/admin/mfa" replace />;
  }

  if (!needsMfa && isMfaRoute) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Index />} />
          {/* Category Pages */}
          <Route path="/category/diwali-gifting" element={<DiwaliGiftingPage />} />
          <Route path="/category/dry-fruits-combo" element={<DryFruitsComboPage />} />
          <Route path="/category/festival-gifting" element={<FestivalGiftingPage />} />
          <Route path="/category/flavour-makhana" element={<FlavourMakhanaPage />} />
          <Route path="/category/nidhis-dry-fruits" element={<NidhisDryFruitsPage />} />
          <Route path="/category/nidhis-spices" element={<NidhisSpicesPage />} />
          <Route path="/category/nidhis-whole-spices" element={<NidhisWholeSpicesPage />} />
          <Route path="/category/super-food" element={<SuperFoodPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/admin" element={<AdminGuard />}>
            <Route path="mfa" element={<AdminMfaPage />} />
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="team" element={<AdminUsersPage />} />
            </Route>
          </Route>
          {/* Example protected route: */}
          {/* <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} /> */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
