import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const OwnerLogin = () => {
  const navigate = useNavigate();
  
  // State quản lý dữ liệu và giao diện
  const [currentStep, setCurrentStep] = useState('LOGIN'); // 'LOGIN' hoặc 'CHANGE_PASSWORD'
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [newPassData, setNewPassData] = useState({ newPassword: '', confirmPassword: '' });
  
  // State UI/UX
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Ẩn/hiện mật khẩu

  // --- 1. LOGIC XỬ LÝ (FUNCTION) ---

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleNewPassChange = (e) => {
    setNewPassData({ ...newPassData, [e.target.name]: e.target.value });
    setError('');
  };

  // API Đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const res = await axios.post('http://localhost:8082/api/owner/login', formData);
        
        // Giả lập delay xíu cho user thấy hiệu ứng loading (nhìn chuyên nghiệp hơn)
        setTimeout(() => {
            if (res.data.success) {
                if (res.data.require_change_pass) {
                    // Chuyển sang màn hình đổi pass
                    setCurrentStep('CHANGE_PASSWORD');
                } else {
                    // Đăng nhập thành công -> Lưu và chuyển trang
                    localStorage.setItem('owner_token', 'logged-in');
                    localStorage.setItem('owner_user', res.data.username);
                    localStorage.setItem('user_id', res.data.user_id);
                    localStorage.setItem('full_name', res.data.full_name);
                    
                    navigate('/owner/dashboard');
                }
            }
            setIsLoading(false);
        }, 800);

    } catch (err) {
        setIsLoading(false);
        const msg = err.response?.data?.message || "Không thể kết nối đến máy chủ.";
        setError(msg);
    }
  };

  // API Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassData.newPassword.length < 6) {
        setError('Mật khẩu quá ngắn (tối thiểu 6 ký tự).');
        return;
    }

    if (newPassData.newPassword !== newPassData.confirmPassword) {
        setError('Mật khẩu xác nhận không khớp!');
        return;
    }

    setIsLoading(true);

    try {
        // QUAN TRỌNG: Gửi username xuống backend để SQL biết update cho ai
        const payload = {
            username: formData.username, // Lấy từ form login lúc nãy
            newPassword: newPassData.newPassword
        };

        const res = await axios.post('http://localhost:8082/api/auth/change-password-force', payload);

        if (res.data.success) {
            alert("🎉 Đổi mật khẩu thành công! Hãy đăng nhập lại.");
            // Reset về trang login để đăng nhập bằng pass mới
            window.location.reload(); 
        }
    } catch (err) {
        setIsLoading(false);
        setError(err.response?.data?.message || "Lỗi khi đổi mật khẩu.");
    }
  };

  // --- 2. GIAO DIỆN (UI RENDER) ---
  return (
    <div style={styles.container}>
      {/* Background động */}
      <div className="bg-animation">
        <div style={styles.blob1}></div>
        <div style={styles.blob2}></div>
        <div style={styles.blob3}></div>
      </div>

      {/* Thẻ chứa Form (Glassmorphism) */}
      <div style={styles.glassCard}>
        <div style={styles.header}>
            <div style={styles.logoIcon}>🔐</div>
            <h2 style={styles.title}>
                {currentStep === 'LOGIN' ? 'Admin Portal' : 'Bảo mật tài khoản'}
            </h2>
            <p style={styles.subtitle}>
                {currentStep === 'LOGIN' 
                   ? 'Chào mừng trở lại! Vui lòng đăng nhập.' 
                   : 'Vì lý do an toàn, hãy thiết lập mật khẩu mới.'}
            </p>
        </div>

        {/* --- FORM LOGIN --- */}
        {currentStep === 'LOGIN' && (
            <form onSubmit={handleLogin} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Tên đăng nhập</label>
                    <input 
                        type="text" 
                        name="username" 
                        style={styles.input} 
                        onChange={handleChange}
                        placeholder="Ví dụ: owner1"
                        required
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Mật khẩu</label>
                    <div style={{position: 'relative'}}>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            name="password" 
                            style={styles.input} 
                            onChange={handleChange}
                            placeholder="••••••"
                            required
                        />
                        <span 
                            onClick={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            {showPassword ? '🙈' : '👁️'}
                        </span>
                    </div>
                </div>

                {error && <div style={styles.errorMessage}>⚠️ {error}</div>}

                <button 
                    type="submit" 
                    style={isLoading ? {...styles.buttonPrimary, ...styles.buttonDisabled} : styles.buttonPrimary}
                    disabled={isLoading}
                >
                    {isLoading ? <span className="loader">Checking...</span> : 'Truy cập hệ thống'}
                </button>
            </form>
        )}

        {/* --- FORM ĐỔI PASS --- */}
        {currentStep === 'CHANGE_PASSWORD' && (
            <form onSubmit={handleChangePassword} style={styles.form}>
                <div style={styles.alertBox}>
                    <span style={{marginRight: '8px'}}>🛡️</span> 
                    Bạn đang sử dụng mật khẩu mặc định. Hãy đổi ngay để bảo vệ dữ liệu.
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Mật khẩu mới</label>
                    <input 
                        type="password" 
                        name="newPassword" 
                        style={styles.input} 
                        onChange={handleNewPassChange}
                        placeholder="Nhập mật khẩu mới..."
                        required
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nhập lại mật khẩu</label>
                    <input 
                        type="password" 
                        name="confirmPassword" 
                        style={styles.input} 
                        onChange={handleNewPassChange}
                        placeholder="Xác nhận mật khẩu..."
                        required
                    />
                </div>

                {error && <div style={styles.errorMessage}>⚠️ {error}</div>}

                <button 
                    type="submit" 
                    style={isLoading ? {...styles.buttonDanger, ...styles.buttonDisabled} : styles.buttonDanger}
                    disabled={isLoading}
                >
                    {isLoading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
                </button>
            </form>
        )}
      </div>

      {/* CSS Animation Keyframes (Inject vào trang) */}
      <style>{`
        @keyframes float {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .loader {
            display: inline-block;
        }
        input:focus {
            border-color: #6366f1 !important;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2) !important;
        }
      `}</style>
    </div>
  );
};

// --- BỘ CSS "OH WAO" ---
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#0f172a', // Màu nền tối sang trọng
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  // Các khối Blob bay bay
  blob1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '600px',
    height: '600px',
    background: 'linear-gradient(180deg, #4f46e5 0%, #a855f7 100%)',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.6,
    animation: 'float 8s infinite ease-in-out',
    zIndex: 1,
  },
  blob2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-5%',
    width: '500px',
    height: '500px',
    background: 'linear-gradient(180deg, #06b6d4 0%, #3b82f6 100%)',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.6,
    animation: 'float 10s infinite ease-in-out reverse',
    zIndex: 1,
  },
  blob3: { // Thêm 1 blob giữa để tạo chiều sâu
    position: 'absolute',
    top: '40%',
    left: '30%',
    width: '300px',
    height: '300px',
    background: '#ec4899',
    borderRadius: '50%',
    filter: 'blur(100px)',
    opacity: 0.3,
    zIndex: 1,
  },
  // Thẻ chính (Glassmorphism)
  glassCard: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '440px',
    padding: '40px 30px',
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Kính mờ trắng
    backdropFilter: 'blur(24px)', // Hiệu ứng mờ nền sau lưng
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    animation: 'fadeIn 0.6s ease-out',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '40px',
    marginBottom: '10px',
    display: 'inline-block',
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1e293b',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: '16px',
    color: '#0f172a',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box', // Fix lỗi tràn input
  },
  eyeIcon: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    fontSize: '18px',
    userSelect: 'none',
  },
  buttonPrimary: {
    marginTop: '10px',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    // Gradient màu xanh hiện đại
    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)',
  },
  buttonDanger: {
    marginTop: '10px',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    // Gradient màu đỏ cam cảnh báo
    background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    filter: 'grayscale(0.5)',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #fecaca',
    textAlign: 'center',
    fontWeight: '500',
    animation: 'fadeIn 0.3s ease',
  },
  alertBox: {
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    padding: '16px',
    borderRadius: '10px',
    fontSize: '14px',
    border: '1px solid #fed7aa',
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'center',
  }
};

export default OwnerLogin;