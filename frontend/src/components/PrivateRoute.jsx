// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // 1. Chưa đăng nhập -> Đá về Login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 2. Đã đăng nhập nhưng không phải Owner -> Đá về trang chủ (hoặc trang báo lỗi 403)
  if (currentUser.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  // 3. Hợp lệ -> Cho vào
  return children;
};

export default PrivateRoute;