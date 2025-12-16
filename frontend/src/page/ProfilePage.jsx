// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = 'http://localhost:8082/api';

// --- CẤU HÌNH TRẠNG THÁI (Đã thêm trạng thái 6) ---
const BOOKING_STATUS = {
  1: { key: 'pending', label: '⏳ Chờ thanh toán', badgeClass: 'bg-warning text-dark' },
  2: { key: 'confirmed', label: '✅ Đã xác nhận', badgeClass: 'bg-success text-white' },
  3: { key: 'paid', label: '💳 Đã thanh toán', badgeClass: 'bg-info text-white' },
  4: { key: 'completed', label: '🚀 Đã hoàn thành', badgeClass: 'bg-primary text-white' },
  5: { key: 'cancelled', label: '❌ Đã hủy', badgeClass: 'bg-secondary text-white' },
  6: { key: 'refunded', label: '💸 Đã hoàn tiền', badgeClass: 'bg-success bg-gradient text-white' } // 🔥 MỚI
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (a) => {
  if (a === null || a === undefined || isNaN(Number(a))) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(a));
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('vi-VN');
};

const normalizeStatus = (s) => {
  const raw = s ?? '';
  const maybeNum = Number(raw);
  // Cập nhật mảng bao gồm số 6
  if (!isNaN(maybeNum) && [1, 2, 3, 4, 5, 6].includes(maybeNum)) return maybeNum;
  return 2; 
};

// Logic tính trạng thái hiển thị
const getEffectiveStatus = (originalStatus, dateString) => {
    const s = Number(originalStatus);
    const d = new Date(dateString);
    const now = new Date();
    now.setHours(0,0,0,0);
    if(d) d.setHours(0,0,0,0);

    // Thêm status 6 vào điều kiện giữ nguyên
    if (s === 4 || s === 5 || s === 6) return s; 
    
    if ((s === 2 || s === 3) && d < now) {
        return 4; 
    }
    return s;
};

// Render sao đánh giá
const renderRatingStars = (rating) => {
  let safeRating = parseFloat(rating) || 0;
  if (safeRating > 5) safeRating = safeRating / 2;
  safeRating = Math.min(Math.max(safeRating, 0), 5);

  const fullStars = Math.floor(safeRating);
  const hasHalf = safeRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="text-warning small d-flex align-items-center">
        {Array(fullStars).fill(0).map((_, i) => <i key={`f-${i}`} className="bi bi-star-fill"></i>)}
        {hasHalf && <i className="bi bi-star-half"></i>}
        {Array(emptyStars).fill(0).map((_, i) => <i key={`e-${i}`} className="bi bi-star text-secondary opacity-25"></i>)}
        <span className="text-muted ms-2 fw-bold" style={{fontSize: '0.8rem'}}>({safeRating}/5)</span>
    </div>
  );
};

/* =========================================
   COMPONENT: FAVORITES PANEL
   ========================================= */
function FavoritesPanel({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axios.get(`${API_BASE_URL}/users/${userId}/favorites`)
         .then(res => setItems(res.data || []))
         .catch(() => setItems([]))
         .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (!items.length) return <div className="text-center py-5 text-muted bg-white rounded-4 shadow-sm">Bạn chưa có mục yêu thích nào.</div>;

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body p-4">
        <h5 className="mb-4 fw-bold text-primary"><i className="bi bi-heart-fill me-2"></i>Yêu thích</h5>
        <div className="row g-3">
            {items.map((it, i) => (
                <div key={i} className="col-md-6">
                    <div className="d-flex align-items-center p-3 border rounded-4 hover-shadow transition bg-white h-100">
                        <div className="flex-grow-1" style={{minWidth:0}}>
                            <h6 className="fw-bold mb-1 text-truncate">{it.name || it.title}</h6>
                            <small className="text-muted d-block text-truncate"><i className="bi bi-geo-alt me-1"></i>{it.address}</small>
                        </div>
                        <Link to={it.url || '#'} className="btn btn-sm btn-light text-primary ms-2 rounded-circle shadow-sm" style={{width: 35, height: 35, display:'flex', alignItems:'center', justifyContent:'center'}}><i className="bi bi-arrow-right"></i></Link>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================
   COMPONENT: REVIEWS PANEL
   ========================================= */
function ReviewsPanel({ userId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axios.get(`${API_BASE_URL}/users/${userId}/reviews`)
         .then(res => {
             const data = Array.isArray(res.data) ? res.data : [];
             setReviews(data);
         })
         .catch((err) => {
             console.error("Error loading reviews:", err);
             setReviews([]);
         })
         .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (!reviews.length) return <div className="text-center py-5 text-muted bg-white rounded-4 shadow-sm">Bạn chưa gửi đánh giá nào.</div>;

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body p-4">
        <h5 className="mb-4 fw-bold text-primary"><i className="bi bi-star-fill me-2"></i>Đánh giá của tôi</h5>
        <div className="d-flex flex-column gap-3">
          {reviews.map((r, i) => (
            <div key={i} className="p-3 border rounded-4 bg-white hover-shadow transition">
              <div className="d-flex gap-3">
                <div className="flex-shrink-0">
                    <img 
                        src={r.service_image || 'https://placehold.co/80?text=Service'} 
                        className="rounded-3 object-fit-cover border" 
                        width="80" height="80" 
                        alt="Service"
                        onError={(e)=>e.target.src='https://placehold.co/80?text=No+Image'}
                    />
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                      <div>
                          <h6 className="mb-0 fw-bold text-dark">{r.service_name || 'Dịch vụ không xác định'}</h6>
                          <small className="text-muted d-block" style={{fontSize: '0.75rem'}}>
                            {r.service_address || 'Địa chỉ đang cập nhật'}
                          </small>
                      </div>
                      <small className="text-muted bg-light px-2 py-1 rounded">
                          {formatDate(r.created_at)}
                      </small>
                  </div>
                  <div className="mb-2">
                      {renderRatingStars(r.rating)}
                  </div>
                  <div className="bg-light p-2 rounded-3 border-start border-4 border-warning small text-secondary fst-italic">
                      "{r.comment || 'Không có nhận xét chi tiết.'}"
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================
   COMPONENT: ACCOUNT INFO
   ========================================= */
function AccountInfoPanel({ user, onProfileUpdated }) {
  const [formData, setFormData] = useState({ full_name: '', phone: '' });
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) setFormData({ full_name: user.full_name || '', phone: user.phone || '' });
  }, [user]);

  const handleUpdateInfo = async () => {
    try {
      const res = await axios.put(`${API_BASE_URL}/users/${user.user_id || user.id}`, formData);
      onProfileUpdated(res.data.user || { ...user, ...formData });
      setEditing(false);
      Swal.fire({icon: 'success', title: 'Thành công', text: 'Cập nhật thông tin thành công', timer: 1500, showConfirmButton: false});
    } catch (e) { Swal.fire('Lỗi', 'Không thể cập nhật', 'error'); }
  };

  const handleChangePass = async () => {
    if (!passData.old || !passData.new) return Swal.fire('Lỗi', 'Vui lòng nhập đủ thông tin', 'warning');
    if (passData.new !== passData.confirm) return Swal.fire('Lỗi', 'Mật khẩu xác nhận không khớp', 'error');
    try {
      await axios.put(`${API_BASE_URL}/users/${user.user_id || user.id}`, { password: passData.new, old_password: passData.old });
      Swal.fire({icon: 'success', title: 'Thành công', text: 'Đổi mật khẩu thành công', timer: 1500, showConfirmButton: false});
      setPassData({ old: '', new: '', confirm: '' });
    } catch (e) { Swal.fire('Lỗi', e.response?.data?.message || 'Mật khẩu cũ không đúng', 'error'); }
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header bg-white border-bottom-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Thông tin cá nhân</h5>
                <button className={`btn btn-sm ${editing ? 'btn-secondary' : 'btn-light text-primary fw-bold'}`} onClick={() => setEditing(!editing)}>
                    {editing ? 'Hủy' : <><i className="bi bi-pencil me-1"></i> Chỉnh sửa</>}
                </button>
            </div>
            <div className="card-body px-4 pb-4">
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="small text-muted fw-bold mb-1">Họ và tên</label>
                        <input className="form-control bg-light border-0" disabled={!editing} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                        <label className="small text-muted fw-bold mb-1">Số điện thoại</label>
                        <input className="form-control bg-light border-0" disabled={!editing} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="col-12">
                        <label className="small text-muted fw-bold mb-1">Email (Không thể thay đổi)</label>
                        <input className="form-control bg-light border-0" disabled value={user?.email} />
                    </div>
                    {editing && <div className="col-12 text-end"><button className="btn btn-primary px-4 rounded-pill" onClick={handleUpdateInfo}>Lưu thay đổi</button></div>}
                </div>
            </div>
        </div>
      </div>
      
      <div className="col-12">
        <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
                <h5 className="fw-bold mb-3 text-danger"><i className="bi bi-shield-lock me-2"></i>Bảo mật</h5>
                <div className="row g-3">
                    <div className="col-md-4"><input type="password" class="form-control bg-light border-0" placeholder="Mật khẩu hiện tại" value={passData.old} onChange={e => setPassData({...passData, old: e.target.value})} /></div>
                    <div className="col-md-4"><input type="password" class="form-control bg-light border-0" placeholder="Mật khẩu mới" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} /></div>
                    <div className="col-md-4"><div className="input-group"><input type="password" class="form-control bg-light border-0" placeholder="Nhập lại mật khẩu mới" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} /><button className="btn btn-outline-danger" onClick={handleChangePass}>Đổi</button></div></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   MAIN PAGE: PROFILE PAGE
   ========================================= */

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [userProfile, setUserProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [restBookings, setRestBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tabs state
  const [tabs, setTabs] = useState({ hotel: 'upcoming', tour: 'upcoming', restaurant: 'upcoming' });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const user = currentUser || (stored ? JSON.parse(stored) : null);
    if (user) {
      setUserProfile(user);
      fetchAllBookings(user.user_id || user.id, user.email);
    } else {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const fetchAllBookings = async (userId, email) => {
    setLoading(true);
    try {
      // 1. Hotel & Tours
      const resMain = await axios.get(`${API_BASE_URL}/users/${userId}/bookings`, { params: { pageSize: 1000 } });
      const listMain = Array.isArray(resMain.data) ? resMain.data : (resMain.data.bookings || []);
      
      setBookings(listMain.map(b => ({
        ...b,
        booking_id: b.booking_id || b.id, 
        status_id: normalizeStatus(b.status_id || b.status),
        total_price: Number(b.total_price || b.amount || 0),
        booking_type: (b.booking_type || b.type || '').toLowerCase()
      })));

      // 2. Restaurants
      const resRest = await axios.get(`${API_BASE_URL}/users/${userId}/restaurant-bookings`, { params: { email } });
      const listRest = Array.isArray(resRest.data) ? resRest.data : [];
      setRestBookings(listRest.map(r => ({
        booking_id: r.booking_id || r.id,
        booking_type: 'restaurant',
        service_name: r.restaurant_name || r.customer_name || 'Đặt bàn nhà hàng',
        service_image: 'https://placehold.co/120x90?text=Restaurant',
        primary_date: r.booking_time,
        guests_count: r.guest_count,
        status_id: normalizeStatus(r.status),
        total_price: 0,
        created_at: r.created_at
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Logic lọc danh sách theo tab
  const getFilteredList = (type, tab) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let source = type === 'restaurant' ? restBookings : bookings.filter(b => b.booking_type === type);

    return source.filter(b => {
      const status = b.status_id;
      // Dùng check_out_date (khách sạn) hoặc primary_date (tour/nhà hàng) để so sánh
      let endDate = new Date(b.check_out_date || b.end_date || b.primary_date || b.start_date);
      endDate.setHours(0, 0, 0, 0);
      
      const isPast = endDate < now;

      if (tab === 'pending') return status === 1;
      if (tab === 'cancelled') return status === 5;
      if (tab === 'refunded') return status === 6; // 🔥 LỌC ĐƠN ĐÃ HOÀN TIỀN
      
      // Hiển thị ở tab hoàn tất nếu (Status 4) HOẶC (2,3 mà đã quá hạn)
      if (tab === 'completed') {
        return status === 4 || ((status === 2 || status === 3) && isPast);
      }

      // Sắp tới: Status 2/3 VÀ chưa qua ngày
      if (tab === 'upcoming') {
        return (status === 2 || status === 3) && !isPast;
      }
      return false;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const renderSection = (type, label, icon) => {
    const currentTab = tabs[type];
    const list = getFilteredList(type, currentTab);

    return (
      <div className="mb-5 animate__animated animate__fadeInUp">
        <div className="d-flex align-items-center mb-3">
            <div className="bg-primary text-white rounded p-2 me-3 shadow-sm"><i className={`bi ${icon} fs-5`}></i></div>
            <h4 className="fw-bold text-dark m-0">{label}</h4>
        </div>
        
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white p-0 border-bottom">
            <div className="d-flex">
              {[
                { id: 'upcoming', label: 'Sắp tới' },
                { id: 'pending', label: 'Chờ thanh toán' },
                { id: 'completed', label: 'Hoàn tất' },
                { id: 'cancelled', label: 'Đã hủy' },
                { id: 'refunded', label: 'Đã hoàn tiền' } // 🔥 TAB MỚI
              ].map(t => (
                <button
                  key={t.id}
                  className={`flex-fill btn rounded-0 py-3 fw-bold border-bottom border-3 transition ${currentTab === t.id ? 'border-primary text-primary bg-primary bg-opacity-10' : 'border-transparent text-secondary'}`}
                  onClick={() => setTabs(prev => ({ ...prev, [type]: t.id }))}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="card-body p-4 bg-light" style={{ minHeight: 250 }}>
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : list.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-3 opacity-25" style={{fontSize: '3rem'}}></i>
                <p>Chưa có đơn hàng nào trong mục này.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {list.map(item => {
                  const endDateStr = item.check_out_date || item.end_date || item.primary_date;
                  const effectiveStatus = getEffectiveStatus(item.status_id, endDateStr);
                  const st = BOOKING_STATUS[effectiveStatus] || BOOKING_STATUS[2];
                  
                  const bookingTypeSlug = String(item.booking_type || 'hotel').toLowerCase();
                  
                  const detailLink = item.booking_id ? `/booking/${bookingTypeSlug}/${item.booking_id}` : '#';

                  return (
                    <div key={item.booking_id || Math.random()} className="card border-0 shadow-sm p-3 hover-card transition bg-white rounded-4">
                      <div className="row align-items-center g-3">
                        <div className="col-md-4">
                            <div className="position-relative">
                                <img 
                                  src={item.service_image || 'https://placehold.co/300x200'} 
                                  className="w-100 rounded-3 object-fit-cover shadow-sm" 
                                  style={{ height: '140px' }} 
                                  alt="Service"
                                  onError={(e) => e.target.src = 'https://placehold.co/300x200'} 
                                />
                                <span className={`position-absolute top-0 start-0 m-2 badge ${st.badgeClass} shadow-sm rounded-pill px-3 py-2`}>
                                    {st.label}
                                </span>
                            </div>
                        </div>
                        
                        <div className="col-md-5">
                            <h5 className="fw-bold mb-1 text-dark text-truncate">{item.service_name}</h5>
                            <div className="text-muted small mb-3"><i className="bi bi-geo-alt me-1"></i> {item.service_address || 'Việt Nam'}</div>
                            
                            <div className="d-flex flex-wrap gap-2 text-secondary small bg-light p-2 rounded border border-light">
                                <div className="me-3"><i className="bi bi-upc-scan me-1 text-primary"></i> Mã: <span className="fw-bold text-dark">#{item.booking_id}</span></div>
                                <div className="me-3"><i className="bi bi-calendar-event me-1 text-primary"></i> Ngày: <span className="fw-bold text-dark">{formatDate(item.primary_date || item.start_date)}</span></div>
                                {item.guests_count && <div><i className="bi bi-people me-1 text-primary"></i> Khách: <strong>{item.guests_count}</strong></div>}
                            </div>
                        </div>

                        <div className="col-md-3 text-md-end d-flex flex-column justify-content-center">
                             <div className="mb-3">
                                <div className="small text-muted">Tổng thanh toán</div>
                                <div className="fw-bold text-danger fs-4">{formatCurrency(item.total_price)}</div>
                             </div>
                             {type !== 'restaurant' && (
                               <Link to={detailLink} className="btn btn-outline-primary rounded-pill w-100 fw-bold hover-bg-primary">
                                    Xem chi tiết <i className="bi bi-arrow-right ms-1"></i>
                               </Link>
                             )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!userProfile) return null;

  return (
    <div className="bg-light min-vh-100 pb-5">
       <div className="container py-5">
         <div className="row g-4">
           {/* Sidebar */}
           <div className="col-lg-3">
             <div className="card border-0 shadow-lg rounded-4 sticky-top overflow-hidden" style={{top: 100}}>
                <div className="bg-primary h-100px" style={{height: '80px'}}></div>
                <div className="card-body text-center p-4 pt-0">
                    <div className="position-relative d-inline-block mb-3" style={{marginTop: '-40px'}}>
                        <img src={userProfile.profile_img || 'https://i.pravatar.cc/150?img=3'} className="rounded-circle border border-4 border-white shadow-sm bg-white" width="100" height="100" alt="Avt" />
                    </div>
                    <h5 className="fw-bold mb-1">{userProfile.full_name}</h5>
                    <p className="text-muted small text-truncate">{userProfile.email}</p>
                    <hr className="my-4 opacity-10" />
                    <div className="list-group list-group-flush text-start custom-menu">
                        {[
                            { path: '/profile', icon: 'bi-person-circle', label: 'Tài khoản' },
                            { path: '/my-bookings', icon: 'bi-ticket-perforated', label: 'Đơn đặt chỗ' },
                            { path: '/my-reviews', icon: 'bi-star', label: 'Đánh giá' },
                        ].map(m => (
                            <Link 
                                key={m.path} 
                                to={m.path} 
                                className={`list-group-item list-group-item-action border-0 py-3 px-3 rounded-3 mb-1 d-flex align-items-center ${currentPath === m.path ? 'bg-primary text-white shadow-sm fw-bold' : 'text-secondary bg-transparent'}`}
                            >
                                <i className={`bi ${m.icon} fs-5 me-3`}></i> {m.label}
                            </Link>
                        ))}
                        <button onClick={() => { logout(); navigate('/login'); }} className="list-group-item list-group-item-action border-0 py-3 px-3 rounded-3 text-danger bg-transparent mt-2 fw-bold">
                            <i className="bi bi-box-arrow-right fs-5 me-3"></i> Đăng xuất
                        </button>
                    </div>
                </div>
             </div>
           </div>

           {/* Content */}
           <div className="col-lg-9">
              {currentPath === '/profile' && <AccountInfoPanel user={userProfile} onProfileUpdated={(u) => { setUserProfile(u); localStorage.setItem('user', JSON.stringify(u)); }} />}

              {currentPath === '/my-bookings' && (
                <>
                  {renderSection('hotel', 'Khách sạn', 'bi-building-fill')}
                  {renderSection('tour', 'Tour du lịch', 'bi-geo-alt-fill')}
                  {renderSection('restaurant', 'Nhà hàng', 'bi-cup-straw')}
                </>
              )}

              {currentPath === '/my-reviews' && <ReviewsPanel userId={userProfile.user_id || userProfile.id} />}
           </div>
         </div>
       </div>

       <style>{`
          .transition { transition: all 0.25s ease; }
          .hover-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important; }
          .hover-bg-primary:hover { background-color: #0d6efd; color: white; }
          .custom-menu .list-group-item:hover:not(.active) { background-color: #f1f3f5; color: #0d6efd; }
          .object-fit-cover { object-fit: cover; }
       `}</style>
    </div>
  );
}