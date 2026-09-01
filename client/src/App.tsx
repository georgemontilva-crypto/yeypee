import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import Characters from "./pages/Characters";
import CharacterDetail from "./pages/CharacterDetail";
import Shop from "./pages/Shop";
import MyCollection from "./pages/MyCollection";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import ResetPassword from "./pages/ResetPassword";
import ContentPage from "./pages/ContentPage";
import Wholesale from "./pages/Wholesale";
import { FOOTER_PAGES } from "./lib/footerPages";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/Orders";
import AdminOrderDetail from "./pages/admin/OrderDetail";
import AdminUsers from "./pages/admin/Users";
import AdminUserDetail from "./pages/admin/UserDetail";
import AdminLeads from "./pages/admin/Leads";
import AdminMedia from "./pages/admin/Media";
import AdminCollections from "./pages/admin/Collections";
import AdminPages from "./pages/admin/Pages";
import AdminWholesale from "./pages/admin/Wholesale";
import AdminCharacters from "./pages/admin/Characters";
import AdminProducts from "./pages/admin/Products";
import AdminNews from "./pages/admin/News";
import AdminPartners from "./pages/admin/Partners";
import AdminStores from "./pages/admin/Stores";
import AdminSettingsPage from "./pages/admin/Settings";
import ScrollToTop from "./components/ScrollToTop";

function RequireLogin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:slug" element={<CollectionDetail />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/characters/:slug" element={<CharacterDetail />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/my-collection" element={<MyCollection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<RequireLogin><Account /></RequireLogin>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/wholesale" element={<Wholesale />} />
          {FOOTER_PAGES.map((p) => (
            <Route
              key={p.slug}
              path={`/${p.slug}`}
              element={<ContentPage slug={p.slug} fallbackTitle={p.fallbackTitle} fallbackBody={p.fallbackBody} />}
            />
          ))}
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="characters" element={<AdminCharacters />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="partners" element={<AdminPartners />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="wholesale" element={<AdminWholesale />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
