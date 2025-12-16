import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// --- 1. IMPORT LAYOUTS ---
import MainLayout from "./layouts/MainLayout.jsx";
import AdminLayout from './layouts/admin/AdminLayout.jsx';

// --- 2. IMPORT CONTEXT & SECURITY ---
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AdminProtectedRoute from './components/AdminProtectedRoute.jsx';


// --- 3. IMPORT CÁC TRANG USER (CLIENT SIDE) ---
import HomeCanTho from "./page/HomeCanTho.jsx";
import SearchResultsPage from "./page/SearchResultsPage.jsx";
import IntroCanTho from './page/IntroCanTho';
import ContactPage from './page/ContactPage';
import AboutPage from "./page/AboutPage.jsx";
import CareersPage from "./page/CareersPage.jsx";
import PressPage from "./page/PressPage.jsx";
import HelpPage from "./page/HelpPage.jsx";
import PrivacyPolicyPage from "./page/PrivacyPolicyPage.jsx";
import TermsPage from "./page/TermsPage.jsx";
import PromotionsPage from './page/PromotionsPage.jsx';
import DestinationDetailPage from "./page/DestinationDetailPage.jsx";

// Chi tiết & Booking
import HotelDetailPage from "./page/HotelDetailPage.jsx";
import TourDetailPage from "./page/TourDetailPage.jsx";
import RestaurantDetailPage from "./page/RestaurantDetailPage";
import BookingCheckoutPage from "./page/BookingCheckoutPage.jsx";
import TourBookingPage from './page/TourBookingPage';
import BookingDetail from './page/BookingDetail.jsx';
import PaymentReturnPage from "./page/PaymentReturnPage.jsx";
import BookingSuccessPage from './page/BookingSuccessPage';
import PaymentPage from './page/PaymentPage';

// Auth & Profile
import LoginPage from "./page/LoginPage.jsx";
import RegisterPage from "./page/RegisterPage.jsx";
import ProfilePage from "./page/ProfilePage.jsx";

// --- 4. IMPORT CÁC TRANG ADMIN ---
import AdminLoginPage from './layouts/admin/AdminLoginPage.jsx';
import DashboardPage from './page/admin/DashboardPage.jsx';
import UserManagementPage from './page/admin/UserManagementPage.jsx';
import HotelManagementPage from './page/admin/HotelManagementPage.jsx';
import TourManagementPage from './page/admin/TourManagementPage';
import RestaurantManagementPage from './page/admin/RestaurantManagementPage';
import ReviewManagementPage from './page/admin/ReviewManagementPage';
import SupportManagementPage from './page/admin/SupportManagementPage';
import AdminBookings from './page/admin/AdminBookings';
import AdminCoupons from './page/admin/AdminCoupons';

// --- 5. IMPORT CÁC TRANG OWNER (ĐỐI TÁC) ---
// Lưu ý: Kiểm tra kỹ đường dẫn file OwnerLogin và OwnerDashboard của bạn
import OwnerLogin from "./components/OwnerLogin"; 
import OwnerDashboard from './page/owner/OwnerDashboard';
import ChatBox from './components/ChatBox';


// === Component ScrollToTop: Tự động cuộn lên đầu trang khi chuyển hướng ===
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      
      {/* Suspense để hiển thị loading khi tải trang */}
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      }>
        {/* BỌC CẢ 2 PROVIDER ĐỂ QUẢN LÝ STATE CHO CẢ ADMIN VÀ USER */}
        <AdminAuthProvider>
          <AuthProvider>
            <Routes>
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
              {/* ========================================================= */}
              {/* PHẦN 1: OWNER ROUTES (Độc lập - Không dùng MainLayout)  */}
              {/* ========================================================= */}
              <Route path="/owner" element={<OwnerLogin />} />
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />

              {/* ========================================================= */}
              {/* PHẦN 2: ADMIN ROUTES (Giao diện quản trị)               */}
              {/* ========================================================= */}
              {/* Trang Login Admin */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Khu vực Admin được bảo vệ (Cần đăng nhập) */}
              <Route path="/admin" element={<AdminProtectedRoute />}>
                  <Route element={<AdminLayout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="dashboard" element={<DashboardPage />} />
                      
                      <Route path="users" element={<UserManagementPage />} />
                      <Route path="bookings" element={<AdminBookings />} />
                      <Route path="hotels" element={<HotelManagementPage />} />
                      <Route path="tours" element={<TourManagementPage />} />
                      <Route path="restaurants" element={<RestaurantManagementPage />} />
                      <Route path="reviews" element={<ReviewManagementPage />} />
                      <Route path="support" element={<SupportManagementPage />} />
                      <Route path="coupons" element={<AdminCoupons />} />
                  </Route>
              </Route>

              {/* ========================================================= */}
              {/* PHẦN 3: USER ROUTES (Giao diện khách hàng - MainLayout) */}
              {/* ========================================================= */}
              <Route path="/" element={<MainLayout />}>
                {/* Trang chủ & Tìm kiếm */}
                <Route index element={<HomeCanTho />} />
                <Route path="search" element={<SearchResultsPage />} />
                <Route path="intro-cantho" element={<IntroCanTho />} />
                
                {/* Trang chi tiết Hotel & Tour & Restaurant */}
                <Route path="hotel/:hotel_id" element={<HotelDetailPage />} />
                <Route path="tour/:tour_id" element={<TourDetailPage />} />
                <Route path="restaurant/:restaurant_id" element={<RestaurantDetailPage />} />
                
                {/* Quy trình đặt phòng & Thanh toán */}
                <Route path="booking/checkout" element={<BookingCheckoutPage />} />
                <Route path="booking/tour-checkout" element={<TourBookingPage />} />
                <Route path="payment/process" element={<PaymentPage />} />
                <Route path="payment/return" element={<PaymentReturnPage />} />
                <Route path="booking/success" element={<BookingSuccessPage />} />
                <Route path="booking/:type/:id" element={<BookingDetail />} />

                {/* Tài khoản User */}

                
                {/* Hồ sơ cá nhân */}
                <Route path="profile" element={<ProfilePage />} />
                <Route path="my-bookings" element={<ProfilePage />} />
                <Route path="my-reviews" element={<ProfilePage />} />

                {/* Trang khuyến mãi */}
                <Route path="promotions" element={<PromotionsPage />} />

                {/* Các trang thông tin (Footer) */}
                <Route path="about" element={<AboutPage />} />
                <Route path="careers" element={<CareersPage />} />
                <Route path="press" element={<PressPage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="privacy" element={<PrivacyPolicyPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="destination/:id" element={<DestinationDetailPage />} />
                
              </Route>

            </Routes>
          </AuthProvider>
          <ChatBox />
        </AdminAuthProvider>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;