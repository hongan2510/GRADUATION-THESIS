import React, { createContext, useContext, useState } from 'react';
// Lưu ý: Để sử dụng useNavigate, AdminAuthProvider phải nằm trong <BrowserRouter> ở App.js
import { useNavigate } from 'react-router-dom';

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
    // Giả lập dữ liệu admin ban đầu để demo giao diện
    // Trong thực tế, bạn sẽ kiểm tra localStorage hoặc gọi API ở đây
    const [admin, setAdmin] = useState({
        user_id: 1,
        full_name: "Admin System",
        email: "admin@canthotravel.com",
        role: "admin"
    });

    const navigate = useNavigate();

    const loginAdmin = (data) => {
        setAdmin(data);
        // Lưu token vào localStorage nếu cần
    };

    const logoutAdmin = () => {
        if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
            setAdmin(null);
            // Xóa token: localStorage.removeItem('admin_token');
            navigate('/admin/login');
        }
    };

    // Giá trị cung cấp cho toàn bộ admin app
    const value = {
        admin,
        loginAdmin,
        logoutAdmin,
        isAuthenticated: !!admin
    };

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
};

// Hook để các component con sử dụng dễ dàng
export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error("useAdminAuth phải được sử dụng bên trong AdminAuthProvider");
    }
    return context;
};