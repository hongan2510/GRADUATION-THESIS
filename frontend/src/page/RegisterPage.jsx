import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ======================================================
// 1. COMPONENT POPUP ĐĂNG KÝ THÀNH CÔNG
// ======================================================
const SuccessModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s' }}>
      
      <div className="bg-white rounded-5 p-5 shadow-lg text-center position-relative overflow-hidden" 
           style={{ width: '420px', maxWidth: '90%', animation: 'scaleUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        
        {/* Icon Success */}
        <div className="mb-4 position-relative d-inline-block">
            <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center" style={{width: '90px', height: '90px'}}>
                <i className="bi bi-person-check-fill text-success" style={{fontSize: '3.5rem'}}></i>
            </div>
            <div className="position-absolute top-0 start-0 w-100 h-100 rounded-circle border border-success opacity-50 animate-ping"></div>
        </div>

        <h3 className="fw-bold text-dark mb-2">Đăng Ký Thành Công!</h3>
        <p className="text-muted mb-4">
            Tài khoản của bạn đã được tạo.<br/>
            Vui lòng đăng nhập để bắt đầu hành trình.
        </p>

        <button 
            onClick={onClose} 
            className="btn btn-success w-100 rounded-pill py-3 fw-bold shadow-sm btn-hover-scale"
        >
            Đăng nhập ngay <i className="bi bi-box-arrow-in-right ms-2"></i>
        </button>
      </div>
    </div>
  );
};

// ======================================================
// 2. TRANG ĐĂNG KÝ (PREMIUM DESIGN)
// ======================================================
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8082/api/register', {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      if (res.status === 201) {
        // Thay vì alert, hiện Popup đẹp
        setShowSuccess(true);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.message);
      } else {
        setError("Không thể kết nối đến Server (Kiểm tra Backend 8082).");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
      setShowSuccess(false);
      navigate('/login');
  };

  return (
    <div className="container-fluid min-vh-100 d-flex p-0 bg-white font-sans overflow-hidden">
      
      {/* CỘT TRÁI: HÌNH ẢNH BANNER */}
      <div className="d-none d-lg-block col-lg-6 p-0 position-relative overflow-hidden min-vh-100">
        <img 
            src="/cantho.jpg" 
            alt="Can Tho Landscape" 
            className="w-100 h-100 object-fit-cover image-pan"
            onError={(e) => {
                e.target.onerror = null; 
                e.target.src = "https://images.unsplash.com/photo-1575968725890-5e580928eb2d?q=80&w=1200"; 
            }}
        />
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-40 d-flex flex-column justify-content-center px-5 text-white">
            <div className="animate-slide-right">
                <h1 className="display-4 fw-bold mb-3">Tạo <span className="text-warning">Tài Khoản</span></h1>
                <p className="fs-5 lead border-start border-4 border-warning ps-3">
                    Tham gia cộng đồng du lịch lớn nhất miền Tây.<br/>
                    Trải nghiệm trọn vẹn, ưu đãi bất tận.
                </p>
            </div>
        </div>
      </div>

      {/* CỘT PHẢI: FORM ĐĂNG KÝ */}
      <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center p-4 position-relative min-vh-100 overflow-auto">
        
        {/* Hình nền mờ trang trí */}
        <div className="position-absolute top-0 end-0 p-5 opacity-10">
            <i className="bi bi-person-plus-fill display-1 text-primary"></i>
        </div>

        <div className="w-100 animate-slide-up" style={{ maxWidth: '500px', paddingTop: '20px', paddingBottom: '20px' }}>
          
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
                <div className="bg-primary text-white rounded-3 p-2">
                    <i className="bi bi-flower1 fs-4"></i>
                </div>
                <span className="fw-bold text-primary fs-5">CanThoTravel</span>
            </div>
            <h2 className="fw-bold display-6 text-dark">Đăng Ký Mới</h2>
            <p className="text-muted">Nhập thông tin của bạn để bắt đầu.</p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center mb-4 rounded-3 animate-fade-in">
                <i className="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Họ tên */}
            <div className="mb-3">
              <label className="form-label fw-bold small text-uppercase text-secondary">Họ và tên</label>
              <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-border shadow-sm-hover">
                <span className="input-group-text bg-white border-0 ps-3 text-muted"><i className="bi bi-person"></i></span>
                <input 
                  type="text" 
                  name="fullName"
                  className="form-control border-0 ps-2 fs-6" 
                  placeholder="Ví dụ: Nguyễn Văn A" 
                  value={formData.fullName}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label fw-bold small text-uppercase text-secondary">Email</label>
              <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-border shadow-sm-hover">
                <span className="input-group-text bg-white border-0 ps-3 text-muted"><i className="bi bi-envelope"></i></span>
                <input 
                  type="email" 
                  name="email"
                  className="form-control border-0 ps-2 fs-6" 
                  placeholder="name@example.com" 
                  value={formData.email}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            {/* Số điện thoại */}
            <div className="mb-3">
              <label className="form-label fw-bold small text-uppercase text-secondary">Số điện thoại</label>
              <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-border shadow-sm-hover">
                <span className="input-group-text bg-white border-0 ps-3 text-muted"><i className="bi bi-telephone"></i></span>
                <input 
                  type="tel" 
                  name="phone"
                  className="form-control border-0 ps-2 fs-6" 
                  placeholder="0912 345 678" 
                  value={formData.phone}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            {/* Mật khẩu & Xác nhận */}
            <div className="row g-3 mb-3">
                <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase text-secondary">Mật khẩu</label>
                    <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-border shadow-sm-hover">
                        <span className="input-group-text bg-white border-0 ps-3 text-muted"><i className="bi bi-lock"></i></span>
                        <input 
                        type="password" 
                        name="password"
                        className="form-control border-0 ps-2 fs-6" 
                        placeholder="••••••••" 
                        value={formData.password}
                        onChange={handleChange}
                        required 
                        />
                    </div>
                </div>
                <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase text-secondary">Xác nhận MK</label>
                    <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-border shadow-sm-hover">
                        <span className="input-group-text bg-white border-0 ps-3 text-muted"><i className="bi bi-shield-lock"></i></span>
                        <input 
                        type="password" 
                        name="confirmPassword"
                        className="form-control border-0 ps-2 fs-6" 
                        placeholder="••••••••" 
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required 
                        />
                    </div>
                </div>
            </div>

            {/* Điều khoản */}
            <div className="form-check mb-4">
              <input className="form-check-input cursor-pointer" type="checkbox" required id="terms" />
              <label className="form-check-label small text-muted cursor-pointer" htmlFor="terms">
                Tôi đồng ý với <Link to="/terms" className="text-primary fw-bold text-decoration-none">Điều khoản dịch vụ</Link> và <Link to="/privacy" className="text-primary fw-bold text-decoration-none">Chính sách bảo mật</Link>
              </label>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary w-100 py-3 rounded-3 fw-bold fs-6 btn-gradient shadow-lg btn-hover-scale"
              disabled={loading}
            >
              {loading ? (
                  <span><span className="spinner-border spinner-border-sm me-2"></span>Đang tạo tài khoản...</span>
              ) : "Đăng Ký Ngay"}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-muted mb-0">
              Đã có tài khoản? <Link to="/login" className="fw-bold text-primary text-decoration-none hover-underline ms-1">Đăng nhập</Link>
            </p>
          </div>
        </div>
      </div>

      {/* --- RENDER POPUP THÀNH CÔNG --- */}
      <SuccessModal 
        isOpen={showSuccess} 
        onClose={handleCloseSuccess} 
      />

      {/* --- CSS STYLE INLINE --- */}
      <style>{`
        .btn-gradient {
            background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
            border: none;
            transition: all 0.3s ease;
        }
        .form-control:focus { box-shadow: none; }
        .transition-border { border: 1px solid #dee2e6; transition: all 0.3s ease; }
        .input-group:focus-within { border-color: #0d6efd !important; box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.15); }
        .shadow-sm-hover:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important; }
        .btn-hover-scale:hover { transform: scale(1.02); box-shadow: 0 10px 20px rgba(13, 110, 253, 0.2) !important; }
        .hover-underline:hover { text-decoration: underline !important; }
        .cursor-pointer { cursor: pointer; }

        @keyframes slideRight { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-right { animation: slideRight 1s ease-out forwards; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }

        @keyframes imagePan { from { transform: scale(1); } to { transform: scale(1.1); } }
        .image-pan { animation: imagePan 20s infinite alternate linear; }

        @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </div>
  );
};

export default RegisterPage;