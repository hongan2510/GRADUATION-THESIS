import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx'; 

const AdminLayout = () => {
    const { logoutAdmin, admin } = useAdminAuth(); 
    const location = useLocation();
    const [hoveredPath, setHoveredPath] = useState(null);
    const [isLogoutHovered, setIsLogoutHovered] = useState(false);

    // --- CÁC BIẾN STYLE CỐ ĐỊNH ---
    const primaryColor = '#0d6efd'; // Bootstrap Primary Blue
    const sidebarBg = '#212529';    // Dark (Xanh than)
    const activeBg = '#0d6efd';     // Màu nền khi Active
    const hoverBg = '#343a40';      // Màu nền khi Hover
    const logoutColor = '#dc3545';  // Màu đỏ Danger

    // Hàm kiểm tra active link
    const isActive = (path) => {
        if (path === '/admin') {
            return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
        }
        return location.pathname.startsWith(path);
    };

    // Style cho các nút điều hướng
    const navLinkStyle = (path) => ({
        color: 'white', 
        textDecoration: 'none',
        padding: '12px 20px',
        display: 'flex', 
        alignItems: 'center',
        borderRadius: '8px',
        backgroundColor: isActive(path) ? activeBg : (hoveredPath === path ? hoverBg : 'transparent'),
        transition: 'all 0.2s ease',
        fontWeight: isActive(path) ? '600' : '400',
        marginBottom: '8px', // Khoảng cách giữa các nút
        boxShadow: isActive(path) ? '0 4px 6px rgba(13, 110, 253, 0.3)' : 'none',
    });

    // Style cho nút Đăng xuất
    const buttonStyle = {
        padding: '12px 15px', 
        backgroundColor: isLogoutHovered ? '#bb2d3b' : logoutColor,
        color: 'white', 
        border: 'none', 
        borderRadius: '8px',
        cursor: 'pointer',
        width: '100%',
        marginTop: 'auto', // Đẩy xuống dưới cùng
        transition: 'all 0.2s ease',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: isLogoutHovered ? '0 4px 10px rgba(220, 53, 69, 0.4)' : 'none'
    };
    
    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            {/* Sidebar Cố định */}
            <div style={{ 
                width: '260px', 
                backgroundColor: sidebarBg, 
                color: 'white', 
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed', // Giữ Sidebar cố định
                height: '100vh',
                left: 0,
                top: 0,
                zIndex: 1000,
                boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
            }}>
                {/* Logo Admin */}
                <div className="mb-4 px-2">
                    <h4 className="fw-bold m-0" style={{ letterSpacing: '1px' }}>
                        <span style={{ color: primaryColor }}>CanTho</span> Admin
                    </h4>
                    <p className="text-muted small m-0">Hệ thống quản trị</p>
                </div>
                
                <hr className="text-secondary my-2" />

                {/* Menu Items */}
                <ul style={{ listStyle: 'none', padding: 0, flex: 1, overflowY: 'auto' }} className="mt-3">
                    <li>
                        <Link 
                            to="/admin" 
                            style={navLinkStyle('/admin')}
                            onMouseEnter={() => setHoveredPath('/admin')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-speedometer2 me-3 fs-5"></i> Tổng quan
                        </Link>
                    </li>
                    
                    <li>
                        <Link 
                            to="/admin/bookings" 
                            style={navLinkStyle('/admin/bookings')}
                            onMouseEnter={() => setHoveredPath('/admin/bookings')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-calendar-check me-3 fs-5"></i> Đặt chỗ
                        </Link>
                    </li>

                    <li>
                        <Link 
                            to="/admin/hotels" 
                            style={navLinkStyle('/admin/hotels')}
                            onMouseEnter={() => setHoveredPath('/admin/hotels')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-building me-3 fs-5"></i> Khách sạn
                        </Link>
                    </li>
                    
                    <li>
                        <Link 
                            to="/admin/tours" 
                            style={navLinkStyle('/admin/tours')}
                            onMouseEnter={() => setHoveredPath('/admin/tours')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-map me-3 fs-5"></i> Tour du lịch
                        </Link>
                    </li>

                    <li>
                        <Link 
                            to="/admin/restaurants" 
                            style={navLinkStyle('/admin/restaurants')}
                            onMouseEnter={() => setHoveredPath('/admin/restaurants')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-shop me-3 fs-5"></i> Nhà hàng
                        </Link>
                    </li>

                    {/* 🔥 MỤC MỚI: QUẢN LÝ COUPON */}
                    <li>
                        <Link 
                            to="/admin/coupons" 
                            style={navLinkStyle('/admin/coupons')}
                            onMouseEnter={() => setHoveredPath('/admin/coupons')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-ticket-perforated me-3 fs-5"></i> Quản lý Coupon
                        </Link>
                    </li>

                    <li>
                        <Link 
                            to="/admin/users" 
                            style={navLinkStyle('/admin/users')}
                            onMouseEnter={() => setHoveredPath('/admin/users')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-people me-3 fs-5"></i> Người dùng
                        </Link>
                    </li>

                    {/* 🔥 MỤC MỚI: ĐÁNH GIÁ */}
                    <li>
                        <Link 
                            to="/admin/reviews" 
                            style={navLinkStyle('/admin/reviews')}
                            onMouseEnter={() => setHoveredPath('/admin/reviews')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-star-half me-3 fs-5"></i> Đánh giá
                        </Link>
                    </li>

                    {/* 🔥 MỤC MỚI: TRUNG TÂM TRỢ GIÚP */}
                    <li>
                        <Link 
                            to="/admin/support" 
                            style={navLinkStyle('/admin/support')}
                            onMouseEnter={() => setHoveredPath('/admin/support')}
                            onMouseLeave={() => setHoveredPath(null)}
                        >
                            <i className="bi bi-headset me-3 fs-5"></i> Trung tâm trợ giúp
                        </Link>
                    </li>
                </ul>

                {/* Footer Sidebar: User Info & Logout */}
                <div className="pt-3 border-top border-secondary">
                    <div className="d-flex align-items-center mb-3 px-2">
                        <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-2" style={{ width: '35px', height: '35px' }}>
                            {admin?.full_name ? admin.full_name.charAt(0) : 'A'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div className="text-white fw-semibold text-truncate" style={{ fontSize: '14px' }}>
                                {admin?.full_name || 'Admin'}
                            </div>
                            <div className="text-muted small" style={{ fontSize: '12px' }}>Administrator</div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={logoutAdmin} 
                        style={buttonStyle}
                        onMouseEnter={() => setIsLogoutHovered(true)}
                        onMouseLeave={() => setIsLogoutHovered(false)}
                    >
                        <i className="bi bi-box-arrow-right"></i> Đăng xuất
                    </button>
                </div>
            </div>
            
            {/* Nội dung chính (Main Content) */}
            <div style={{ 
                flex: 1, 
                marginLeft: '260px', // Bằng width của Sidebar
                padding: '30px',
                width: 'calc(100% - 260px)' // Đảm bảo không bị tràn
            }}>
                <Outlet /> 
            </div>
        </div>
    );
};

export default AdminLayout;