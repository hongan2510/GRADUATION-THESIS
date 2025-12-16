import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import NavbarMain from '../components/NavbarMain.jsx';

// ===== FOOTER GIỮ NGUYÊN =====
const Footer = () => {
  return (
    <footer className="bg-dark text-white py-5 mt-auto">
      <div className="container">
        <div className="row">
          <div className="col-md-3 col-6 mb-4">
            <h5 className="fw-bold mb-3 fs-6">CanThoTravel</h5>
            <ul className="nav flex-column">
              <li className="nav-item mb-2">
                <Link to="/about" className="nav-link p-0 text-white-50">Về chúng tôi</Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/careers" className="nav-link p-0 text-white-50">Tuyển dụng</Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/press" className="nav-link p-0 text-white-50">Báo chí</Link>
              </li>
            </ul>
          </div>

          <div className="col-md-3 col-6 mb-4">
            <h5 className="fw-bold mb-3 fs-6">Hỗ trợ</h5>
            <ul className="nav flex-column">
              <li className="nav-item mb-2">
                <Link to="/help" className="nav-link p-0 text-white-50">Trung tâm trợ giúp</Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/contact" className="nav-link p-0 text-white-50">Liên hệ</Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/privacy" className="nav-link p-0 text-white-50">Chính sách bảo mật</Link>
              </li>
            </ul>
          </div>

          <div className="col-md-3 col-6 mb-4">
            <h5 className="fw-bold mb-3 fs-6">Điểm đến</h5>
            <ul className="nav flex-column">
              <li className="nav-item mb-2">
                <Link to="/search?q=Ninh Kieu" className="nav-link p-0 text-white-50">Ninh Kiều</Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/search?q=Cai Rang" className="nav-link p-0 text-white-50">Cái Răng</Link>
              </li>
            </ul>
          </div>

          <div className="col-md-3 col-6 mb-4">
            <h5 className="fw-bold mb-3 fs-6">Theo dõi</h5>
            <div className="d-flex fs-4 gap-3">
              <i className="bi bi-facebook text-white-50"></i>
              <i className="bi bi-instagram text-white-50"></i>
              <i className="bi bi-youtube text-white-50"></i>
            </div>
          </div>
        </div>

        <hr className="text-white-50" />
        <div className="text-center text-white-50 small">
          © {new Date().getFullYear()} CanThoTravel
        </div>
      </div>
    </footer>
  );
};

// ===== MAIN LAYOUT CÓ TRANSITION =====
export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="d-flex flex-column min-vh-100 page-wrapper">
      <NavbarMain />

      <main className="flex-grow-1">
        {/* KEY + TRANSITION */}
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
