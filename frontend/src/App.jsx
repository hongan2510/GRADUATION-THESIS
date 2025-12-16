import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

/* =======================
   USER PAGES
======================= */
import HomeCanTho from "./page/HomeCanTho";
import SearchResultsPage from "./page/SearchResultsPage";
import HotelDetailPage from "./page/HotelDetailPage";
import TourDetailPage from "./page/TourDetailPage";
import RestaurantDetailPage from "./page/RestaurantDetailPage";
import BookingPage from "./page/BookingPage";
import PaymentReturnPage from "./page/PaymentReturnPage";

import LoginPage from "./page/LoginPage";
import RegisterPage from "./page/RegisterPage";
import ProfilePage from "./page/ProfilePage";

import AboutPage from "./page/AboutPage";
import HelpPage from "./page/HelpPage";
import PrivacyPolicyPage from "./page/PrivacyPolicyPage";
import TermsPage from "./page/TermsPage";
import PromotionsPage from "./page/PromotionsPage";

/* =======================
   LAYOUTS
======================= */
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/admin/AdminLayout";

/* =======================
   ADMIN
======================= */
import DashboardPage from "./page/admin/DashboardPage";
import HotelManagementPage from "./page/admin/HotelManagementPage";
import BookingManagementPage from "./page/admin/BookingManagementPage";
import UserManagementPage from "./page/admin/UserManagementPage";
import AdminLoginPage from "./layouts/admin/AdminLoginPage";

/* =======================
   CONTEXT & GUARD
======================= */
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { AuthProvider } from "./context/AuthContext";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

/* =======================
   SCROLL TO TOP (NO SMOOTH)
======================= */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <AuthProvider>

          <ScrollToTop />

          <Routes>

            {/* ================= USER ROUTES ================= */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomeCanTho />} />
              <Route path="search" element={<SearchResultsPage />} />

              {/* Detail pages */}
              <Route path="hotel/:hotel_id" element={<HotelDetailPage />} />
              <Route path="tour/:tour_id" element={<TourDetailPage />} />
              <Route path="restaurant/:restaurant_id" element={<RestaurantDetailPage />} />

              {/* Booking */}
              <Route path="booking/checkout" element={<BookingPage />} />
              <Route path="payment/return" element={<PaymentReturnPage />} />

              {/* Auth */}
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Footer pages */}
              <Route path="about" element={<AboutPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="privacy" element={<PrivacyPolicyPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="promotions" element={<PromotionsPage />} />
            </Route>

            {/* ================= ADMIN ROUTES ================= */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            <Route path="/admin" element={<AdminProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="hotels" element={<HotelManagementPage />} />
                <Route path="bookings" element={<BookingManagementPage />} />
                <Route path="users" element={<UserManagementPage />} />
              </Route>
            </Route>

            {/* ================= 404 ================= */}
            <Route
              path="*"
              element={
                <div className="text-center py-5 mt-5">
                  <h1>404 Not Found</h1>
                </div>
              }
            />

          </Routes>
        </AuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
