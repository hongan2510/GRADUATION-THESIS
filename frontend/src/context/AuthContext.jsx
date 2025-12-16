import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Hook để các component con (như Navbar, LoginPage) gọi dữ liệu
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Khi web tải lại, tự động đọc user từ LocalStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user'); // Lưu ý: Key là 'user' cho khớp với các file khác
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Lỗi đọc dữ liệu user:", error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // 2. Hàm Đăng nhập (Chỉ cập nhật State + Lưu LocalStorage)
  // KHÔNG GỌI API Ở ĐÂY để tránh xung đột với ProfilePage
  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  // 3. Hàm Đăng xuất
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
    window.location.href = '/login'; 
  };

  const value = {
    currentUser,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}