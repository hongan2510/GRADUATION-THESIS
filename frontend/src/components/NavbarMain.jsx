import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';

/* =========================================
   GOOGLE TRANSLATE HELPER
========================================= */
const changeGoogleTranslateLanguage = (lang) => {
  const interval = setInterval(() => {
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
      clearInterval(interval);
    }
  }, 100);
};

// ==========================================
// 1. COMPONENT CHUÔNG THÔNG BÁO
// ==========================================
const NotificationBell = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(
        `http://localhost:8082/api/notifications?user_id=${user.user_id}`
      );
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Lỗi tải thông báo", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [user]);

  const handleMarkAsRead = async () => {
    try {
      await axios.post(
        'http://localhost:8082/api/notifications/mark-read',
        { user_id: user.user_id }
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Lỗi mark read", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <i className="bi bi-check-circle-fill text-success fs-4"></i>;
      case 'danger': return <i className="bi bi-x-circle-fill text-danger fs-4"></i>;
      case 'warning': return <i className="bi bi-alarm-fill text-warning fs-4"></i>;
      default: return <i className="bi bi-info-circle-fill text-primary fs-4"></i>;
    }
  };

  const getLink = (notif) => {
    if (!notif.booking_id) return "#";
    if (notif.booking_type === 'restaurant')
      return `/booking-history/restaurant/${notif.booking_id}`;
    return `/my-bookings`;
  };

  return (
    <div className="nav-item position-relative me-2" ref={dropdownRef}>
      <button
        className="btn btn-light rounded-circle position-relative shadow-sm border"
        style={{ width: 42, height: 42 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`bi bi-bell${unreadCount > 0 ? '-fill text-primary' : ''}`}></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show dropdown-menu-end shadow-lg border-0 p-0"
          style={{ width: 380, top: 55, right: 0 }}
        >
          <div className="p-3 border-bottom bg-light d-flex justify-content-between">
            <strong>Thông báo</strong>
            {unreadCount > 0 && (
              <button className="btn btn-link p-0" onClick={handleMarkAsRead}>
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div style={{ maxHeight: 400 }} className="overflow-auto">
            {notifications.length > 0 ? notifications.map(n => (
              <Link
                to={getLink(n)}
                key={n.id}
                className={`d-block p-3 border-bottom text-decoration-none ${
                  n.is_read ? 'bg-white' : 'bg-primary-subtle'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <div className="d-flex gap-3">
                  {getIcon(n.type)}
                  <div>
                    <div className="fw-bold">{n.title}</div>
                    <div className="text-muted small">{n.message}</div>
                    <small className="text-muted">{n.time}</small>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="text-center text-muted py-5">
                <i className="bi bi-bell-slash fs-1 d-block mb-3"></i>
                Không có thông báo mới
              </div>
            )}
          </div>

          <div className="text-center p-2 border-top bg-light">
            <Link to="/my-bookings" className="fw-bold text-primary text-decoration-none">
              Xem tất cả đơn hàng
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. NAVBAR MAIN
// ==========================================
export default function NavbarMain() {
  const { currentUser, logout } = useAuth();
  const [displayUser, setDisplayUser] = useState(currentUser);

  useEffect(() => {
    if (currentUser) setDisplayUser(currentUser);
    else {
      const stored = localStorage.getItem('user');
      setDisplayUser(stored ? JSON.parse(stored) : null);
    }
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold text-primary fs-4" to="/">
          <i className="bi bi-compass-fill me-2"></i>CanThoTravel
        </Link>

        <div className="collapse navbar-collapse">
          {/* MENU TRÁI */}
          <ul className="navbar-nav me-auto fw-semibold gap-1">
            <li className="nav-item">
              <Link className="nav-link px-3" to="/search?type=hotel">
                <i className="bi bi-building me-1"></i> Khách sạn
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link px-3" to="/search?type=activity">
                <i className="bi bi-activity me-1"></i> Hoạt động
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link px-3" to="/search?type=restaurant">
                <i className="bi bi-shop me-1"></i> Nhà hàng
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link px-3" to="/promotions">
                <i className="bi bi-tags-fill me-1"></i> Ưu đãi
              </Link>
            </li>
          </ul>

          {/* MENU PHẢI */}
          <ul className="navbar-nav align-items-center gap-2 fw-semibold">
            
            {/* 🌐 LANGUAGE SWITCH */}
            <li className="nav-item dropdown">
              <button
                className="btn btn-light btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center gap-1"
                data-bs-toggle="dropdown"
              >
                <i className="bi bi-translate"></i>
                Lang
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center gap-2"
                    onClick={() => changeGoogleTranslateLanguage('vi')}
                  >
                    🇻🇳 Tiếng Việt
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center gap-2"
                    onClick={() => changeGoogleTranslateLanguage('en')}
                  >
                    🇬🇧 English
                  </button>
                </li>
              </ul>
            </li>

            {displayUser ? (
              <>
                <NotificationBell user={displayUser} />

                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle px-3" href="#" data-bs-toggle="dropdown">
                    <i className="bi bi-person-circle me-1"></i>
                    Chào, {displayUser.full_name || 'User'}
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="bi bi-person-vcard me-2"></i> Hồ sơ cá nhân
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/my-bookings">
                        <i className="bi bi-briefcase me-2"></i> Đơn đặt của tôi
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i> Đăng xuất
                      </button>
                    </li>
                  </ul>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="btn btn-light btn-sm rounded-pill px-3" to="/login">
                    <i className="bi bi-box-arrow-in-right me-1"></i> Đăng nhập
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-primary btn-sm rounded-pill px-3" to="/register">
                    <i className="bi bi-person-plus-fill me-1"></i> Đăng ký
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
