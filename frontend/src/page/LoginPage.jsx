import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

// ======================================================
// 1. DỮ LIỆU SLIDE CHỮ
// ======================================================
const SLIDES_CONTENT = [
  {
    title: (<span>Vẻ đẹp <span className="text-warning">Tây Đô</span></span>),
    desc: "Hành trình khám phá miền sông nước bắt đầu từ đây."
  },
  {
    title: (<span>Chợ Nổi <span className="text-warning">Cái Răng</span></span>),
    desc: "Trải nghiệm văn hóa mua bán độc đáo trên sông."
  },
  {
    title: (<span>Ẩm Thực <span className="text-warning">Miền Tây</span></span>),
    desc: "Thưởng thức hương vị dân dã, đậm đà khó quên."
  },
  {
    title: (<span>Con Người <span className="text-warning">Hào Sảng</span></span>),
    desc: "Sự thân thiện, hiếu khách làm ấm lòng du khách."
  }
];

// ======================================================
// 2. COMPONENT POPUP THÀNH CÔNG
// ======================================================
const SuccessModal = ({ isOpen, onClose, userName }) => {
  if (!isOpen) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s' }}>
      
      <div className="bg-white rounded-5 p-5 shadow-lg text-center position-relative overflow-hidden" 
           style={{ width: '400px', maxWidth: '90%', animation: 'scaleUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        
        <div className="mb-4 position-relative d-inline-block">
            <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center" style={{width: '90px', height: '90px'}}>
                <i className="bi bi-check-lg text-success" style={{fontSize: '3.5rem'}}></i>
            </div>
            <div className="position-absolute top-0 start-0 w-100 h-100 rounded-circle border border-success opacity-50 animate-ping"></div>
        </div>

        <h3 className="fw-bold text-dark mb-2">Đăng nhập thành công!</h3>
        <p className="text-muted mb-4">
            Chào mừng <b>{userName}</b>.<br/>Chuẩn bị khám phá những chuyến đi tuyệt vời nhé!
        </p>

        <button 
            onClick={onClose} 
            className="btn btn-primary w-100 rounded-pill py-3 fw-bold shadow-sm btn-gradient"
        >
            Tiếp tục ngay <i className="bi bi-arrow-right ms-2"></i>
        </button>
      </div>
    </div>
  );
};

// ======================================================
// 3. TRANG ĐĂNG NHẬP CHÍNH
// ======================================================
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // State cho Slide chữ
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fadeKey, setFadeKey] = useState(0); 

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const nextUrl = searchParams.get('next') || '/';

  // Hiệu ứng chuyển chữ mỗi 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES_CONTENT.length);
      setFadeKey((prev) => prev + 1); 
    }, 5000); 

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8082/api/login', { email, password });
      if (res.status === 200) {
        const userData = res.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        login(userData);
        setCurrentUser(userData);
        setShowSuccess(true);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.message); 
      } else {
        setError("Không thể kết nối đến Server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
      setShowSuccess(false);
      if (nextUrl !== '/') { navigate(nextUrl); } 
      else { window.location.href = '/'; }
  };

  return (
    // Thêm min-vh-100 vào container chính để đảm bảo full chiều cao màn hình
    <div className="container-fluid min-vh-100 d-flex p-0 bg-white font-sans overflow-hidden">
      
      {/* CỘT TRÁI: HÌNH ẢNH BANNER & SLIDER */}
      {/* QUAN TRỌNG: Thêm min-vh-100 vào đây để khung này có chiều cao */}
      <div className="d-none d-lg-block col-lg-6 p-0 position-relative overflow-hidden min-vh-100">
        
        {/* 1. Sử dụng đúng tên file: /cantho.jpeg 
            2. class "object-fit-cover" chính là thứ giúp cut hình vừa khung
        */}
        <img 
            src="/cantho.jpg" 
            alt="Can Tho Landscape" 
            className="w-100 h-100 object-fit-cover image-pan"
            onError={(e) => {
                e.target.onerror = null; 
                // Ảnh dự phòng online nếu file local lỗi
                e.target.src = "https://images.unsplash.com/photo-1575968725890-5e580928eb2d?q=80&w=1200"; 
            }}
        />
        
        {/* Lớp phủ màu & Nội dung Slide */}
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-40 d-flex flex-column justify-content-center px-5 text-white">
            <div key={fadeKey} className="animate-fade-in-up">
                <h1 className="display-3 fw-bold mb-3">
                    {SLIDES_CONTENT[currentSlide].title}
                </h1>
                <p className="fs-4 lead border-start border-4 border-warning ps-3">
                    {SLIDES_CONTENT[currentSlide].desc}
                </p>
            </div>

            {/* Dấu chấm chỉ báo slide */}
            <div className="d-flex gap-2 mt-4">
                {SLIDES_CONTENT.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`rounded-pill transition-all ${idx === currentSlide ? 'bg-warning' : 'bg-white bg-opacity-50'}`}
                        style={{ width: idx === currentSlide ? '30px' : '10px', height: '6px', transition: 'all 0.5s ease' }}
                    />
                ))}
            </div>
        </div>
      </div>

      {/* CỘT PHẢI: FORM ĐĂNG NHẬP */}
      {/* Thêm min-vh-100 để đảm bảo cột phải cũng full chiều cao */}
      <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center p-4 p-md-5 position-relative min-vh-100">
        
        {/* Hình trang trí nền mờ */}
        <div className="position-absolute top-0 end-0 p-5 opacity-10">
            <i className="bi bi-airplane-engines-fill display-1 text-primary"></i>
        </div>

        <div className="w-100 animate-slide-up" style={{ maxWidth: '480px' }}>
          
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-2">
                <div className="bg-primary text-white rounded-3 p-2">
                    <i className="bi bi-flower1 fs-4"></i>
                </div>
                <span className="fw-bold text-primary fs-5">CanThoTravel</span>
            </div>
            <h2 className="fw-bold display-6 text-dark">Chào mừng trở lại! 👋</h2>
            <p className="text-muted">Vui lòng nhập thông tin để tiếp tục.</p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center mb-4 rounded-3">
                <i className="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label fw-bold small text-uppercase text-secondary">Email</label>
              <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-border shadow-sm-hover">
                <span className="input-group-text bg-white border-0 ps-3 text-muted">
                    <i className="bi bi-envelope"></i>
                </span>
                <input 
                  type="email" 
                  className="form-control border-0 ps-2 py-3 fs-6" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center">
                <label className="form-label fw-bold small text-uppercase text-secondary">Mật khẩu</label>
              </div>
              <div className="input-group input-group-lg border rounded-3 overflow-hidden transition-border shadow-sm-hover">
                <span className="input-group-text bg-white border-0 ps-3 text-muted">
                    <i className="bi bi-lock"></i>
                </span>
                <input 
                  type="password" 
                  className="form-control border-0 ps-2 py-3 fs-6" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check">
                    <input className="form-check-input cursor-pointer" type="checkbox" id="rememberMe" />
                    <label className="form-check-label text-muted small cursor-pointer" htmlFor="rememberMe">Ghi nhớ tôi</label>
                </div>
                <Link to="/forgot-password" style={{ textDecoration: 'none' }} className="small fw-bold text-primary hover-underline">
                    Quên mật khẩu?
                </Link>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary w-100 py-3 rounded-3 fw-bold fs-6 btn-gradient shadow-lg btn-hover-scale"
              disabled={loading}
            >
              {loading ? (
                  <span><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý...</span>
              ) : "Đăng Nhập"}
            </button>
          </form>

          <div className="text-center mt-5">
            <p className="text-muted">
              Bạn chưa có tài khoản? <Link to="/register" className="fw-bold text-primary text-decoration-none hover-underline ms-1">Đăng ký ngay</Link>
            </p>
          </div>
        </div>
      </div>

      <SuccessModal 
        isOpen={showSuccess} 
        onClose={handleCloseSuccess} 
        userName={currentUser?.full_name || currentUser?.username || "Bạn"}
      />

      <style>{`
        .btn-gradient {
            background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
            border: none;
            transition: all 0.3s ease;
        }
        .form-control:focus { box-shadow: none; }
        .transition-border { border: 1px solid #dee2e6; transition: all 0.3s ease; }
        .input-group:focus-within { border-color: #0d6efd !important; box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.15); }
        .shadow-sm-hover:hover { box-shadow: 0 4px 15px rgba(172, 187, 12, 0.05) !important; }
        .btn-hover-scale:hover { transform: scale(1.02); box-shadow: 0 10px 20px rgba(13, 110, 253, 0.2) !important; }
        .hover-underline:hover { text-decoration: underline !important; }
        .cursor-pointer { cursor: pointer; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }

        @keyframes imagePan { from { transform: scale(1); } to { transform: scale(1.1); } }
        .image-pan { animation: imagePan 20s infinite alternate linear; }

        @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes ping { 75%, 100% { transform: scale(1.4); opacity: 0; } }
        
        /* Đảm bảo object-fit hoạt động tốt */
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </div>
  );
};

export default LoginPage;