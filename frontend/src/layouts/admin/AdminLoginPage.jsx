import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx'; // Đảm bảo đường dẫn đúng

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Lấy hàm login từ Context
  const { loginAdmin } = useAdminAuth();
  
  // Hook dùng để chuyển trang
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Gọi hàm đăng nhập
      // Lưu ý: Hàm loginAdmin trong context nên trả về true/false hoặc Promise
      // Ở đây tôi giả lập việc gọi hàm login
      const success = await loginAdmin(email, password);
      
      // 2. Nếu login thành công thì chuyển hướng
      if (success) {
        // QUAN TRỌNG: Chuyển hướng về trang chủ Admin
        navigate('/admin'); 
      } else {
        setError('Email hoặc mật khẩu không chính xác!');
      }
    } catch (err) {
      // Trường hợp hàm loginAdmin không trả về boolean mà throw error
      console.error("Login error:", err);
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Style để giống hình ảnh bạn gửi
  const styles = {
    container: {
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa', // Màu nền xám nhạt
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      padding: '40px',
      borderRadius: '15px',
      backgroundColor: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    input: {
      backgroundColor: '#e9ecef', // Màu input xám nhạt
      border: 'none',
      padding: '12px 15px',
      borderRadius: '6px',
      marginBottom: '15px',
      width: '100%',
    },
    button: {
      width: '100%',
      padding: '12px',
      borderRadius: '6px',
      fontWeight: 'bold',
      backgroundColor: '#0d6efd', // Màu xanh dương đậm
      border: 'none',
      marginTop: '10px',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Tiêu đề */}
        <h3 className="fw-bold text-primary mb-2">Quản Trị Viên</h3>
        <p className="text-muted small mb-4">Đăng nhập hệ thống quản lý</p>

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3 text-start">
            <input
              type="email"
              className="form-control"
              placeholder="admin@canthotravel.com"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-3 text-start">
            <input
              type="password"
              className="form-control"
              placeholder="••••••••••••"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={styles.button}
            disabled={isLoading}
          >
            {isLoading ? (
              <span><span className="spinner-border spinner-border-sm me-2" />Đang xử lý...</span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        {/* Nút quay lại */}
        <div className="mt-4">
          <Link to="/" className="text-decoration-none text-muted small">
            <i className="bi bi-arrow-left me-1"></i> Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;