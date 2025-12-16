import React from 'react';
import { Link } from 'react-router-dom';

export default function FooterMain() {
  return (
    <footer className="bg-white border-top">
      <div className="container py-5">
        <div className="row g-4">
          
          {/* Cột 1: Về CanThoTravel */}
          <div className="col-lg-3 col-md-6">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-compass-fill me-2 text-primary"></i>
              CanThoTravel
            </h5>
            <p className="text-muted small">
              Khám phá Cần Thơ, trái tim của Đồng bằng Sông Cửu Long. 
              Đặt phòng khách sạn, tour du lịch và vé tham quan với giá tốt nhất.
            </p>
            <div className="d-flex gap-3 fs-4">
              <a href="#" className="text-muted"><i className="bi bi-facebook"></i></a>
              <a href="#" className="text-muted"><i className="bi bi-instagram"></i></a>
              <a href="#" className="text-muted"><i className="bi bi-tiktok"></i></a>
            </div>
          </div>

          {/* Cột 2: Hỗ trợ */}
          <div className="col-lg-2 col-md-6">
            <h6 className="fw-bold mb-3">Hỗ trợ</h6>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li><Link to="/help" className="text-decoration-none text-muted">Trung tâm Trợ giúp</Link></li>
              <li><Link to="/faq" className="text-decoration-none text-muted">Câu hỏi thường gặp</Link></li>
              <li><Link to="/contact" className="text-decoration-none text-muted">Liên hệ chúng tôi</Link></li>
            </ul>
          </div>

          {/* Cột 3: Về Công ty */}
          <div className="col-lg-2 col-md-6">
            <h6 className="fw-bold mb-3">Về chúng tôi</h6>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li><Link to="/about" className="text-decoration-none text-muted">Về CanThoTravel</Link></li>
              <li><Link to="/careers" className="text-decoration-none text-muted">Tuyển dụng</Link></li>
              <li><Link to="/blog" className="text-decoration-none text-muted">Blog du lịch</Link></li>
            </ul>
          </div>

          {/* Cột 4: Điểm đến (Ví dụ) */}
          <div className="col-lg-2 col-md-6">
            <h6 className="fw-bold mb-3">Điểm đến</h6>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li><Link to="/search?q=Ninh Kiều" className="text-decoration-none text-muted">Quận Ninh Kiều</Link></li>
              <li><Link to="/search?q=Cái Răng" className="text-decoration-none text-muted">Quận Cái Răng</Link></li>
              <li><Link to="/search?q=Phong Điền" className="text-decoration-none text-muted">Huyện Phong Điền</Link></li>
              <li><Link to="/search?q=Cồn Sơn" className="text-decoration-none text-muted">Cồn Sơn</Link></li>
            </ul>
          </div>

          {/* Cột 5: Tải ứng dụng (Giả lập) */}
          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold mb-3">Tải ứng dụng</h6>
            <div className="card bg-light border-0">
              <div className="card-body text-center">
                <i className="bi bi-qr-code fs-1"></i>
                <p className="mb-0 small text-muted">Quét mã để tải ứng dụng</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dòng Copyright */}
      <div className="bg-body-tertiary">
        <div className="container py-3 d-flex justify-content-between align-items-center">
          <span className="text-muted small">
            © 2025 CanThoTravel. Đồ án tốt nghiệp.
          </span>
          <div className="d-flex gap-3">
             <Link to="/terms" className="text-decoration-none text-muted small">Điều khoản Dịch vụ</Link>
             <Link to="/privacy" className="text-decoration-none text-muted small">Chính sách Bảo mật</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}