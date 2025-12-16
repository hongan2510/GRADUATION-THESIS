import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminProtectedRoute = () => {
  const { admin, loading } = useAdminAuth();

  if (loading) return <div>Đang tải...</div>;

  // Nếu chưa đăng nhập admin, chuyển về trang login admin
  return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default AdminProtectedRoute;