import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// ======================================================
// 1. COMPONENT POPUP YÊU CẦU ĐĂNG NHẬP
// ======================================================
const LoginRequestModal = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
      <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
           style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, backdropFilter: 'blur(5px)', animation: 'fadeIn 0.3s' }}>
          
          <div className="bg-white rounded-4 p-4 shadow-lg text-center position-relative overflow-hidden" 
               style={{ width: '400px', maxWidth: '90%', animation: 'slideUp 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)' }}>
              
              <div className="position-absolute top-0 start-0 w-100 bg-primary opacity-10" style={{height: '120px', borderRadius: '0 0 50% 50%'}}></div>
              <button onClick={onClose} className="btn-close position-absolute top-0 end-0 m-3 shadow-none" style={{zIndex: 10}}></button>

              <div className="position-relative mb-3 mt-2">
                  <div className="d-inline-flex justify-content-center align-items-center bg-white rounded-circle shadow-sm p-3" style={{width: '80px', height: '80px'}}>
                       <i className="bi bi-person-fill-lock text-primary fs-1"></i>
                  </div>
              </div>

              <h4 className="fw-bold mb-2 text-dark position-relative">Bạn chưa đăng nhập</h4>
              <p className="text-muted mb-4 px-3 position-relative small">
                  Vui lòng đăng nhập để tiếp tục đặt tour và nhận các ưu đãi tích điểm dành riêng cho thành viên.
              </p>

              <div className="d-grid gap-2 px-2">
                  <button className="btn btn-primary rounded-pill py-2 fw-bold shadow-sm" onClick={onLogin}>
                      Đăng nhập ngay
                  </button>
                  <button className="btn btn-light rounded-pill py-2 fw-semibold text-muted" onClick={onClose}>
                      Xem tiếp, chưa đặt
                  </button>
              </div>
          </div>
          <style>{`
              @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
      </div>
  );
};

// ======================================================
// 2. COMPONENT CHÍNH (TOUR DETAIL)
// ======================================================
const TourDetailPage = () => {
  const { tour_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLoginModal, setShowLoginModal] = useState(false);

  const [tour, setTour] = useState(null);
  const [relatedTours, setRelatedTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeSection, setActiveSection] = useState('overview');
  const [showGoTop, setShowGoTop] = useState(false);

  const [guests, setGuests] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateMessage, setDateMessage] = useState({ text: '', type: '' });

  const navItems = [
    { label: 'Tổng quan', id: 'overview' },
    { label: 'Lịch trình', id: 'itinerary' },
    { label: 'Điểm nổi bật', id: 'highlights' },
    { label: 'Chính sách', id: 'policies' },
    { label: 'Đánh giá', id: 'reviews' }
  ];

  const getTodayVN = () => {
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000); 
    return vn.toISOString().split('T')[0];
  };

  const onImageError = (e) => {
    e.target.onerror = null;
    e.target.src = 'https://placehold.co/800x600?text=No+Image';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const formatDateDisplay = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return iso;
    }
  };

  const formatCurrency = (v) => {
    try {
      return Number(v).toLocaleString('vi-VN');
    } catch {
      return v;
    }
  };

  const normalizeAvailableDates = (arr) => {
    if (!Array.isArray(arr)) return null;
    const mapped = arr.map(d => {
      if (!d) return null;
      if (typeof d === 'string') return d.split('T')[0];
      return null;
    }).filter(Boolean);
    const unique = Array.from(new Set(mapped)).sort();
    return unique.length ? unique : null;
  };

  // --- FETCH DATA ---
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resDetail, resSimilar] = await Promise.all([
          axios.get(`http://localhost:8082/api/tours/${tour_id}`),
          axios.get(`http://localhost:8082/api/tours/${tour_id}/similar`)
        ]);

        if (cancelled) return;
        const detail = resDetail.data || null;
        setTour(detail);
        setRelatedTours(Array.isArray(resSimilar.data) ? resSimilar.data : []);

        const normalized = normalizeAvailableDates(detail?.available_dates);
        if (normalized && normalized.length > 0) {
          setSelectedDate(normalized[0]);
          setDateMessage({ text: `Ngày khả dụng: ${formatDateDisplay(normalized[0])}`, type: 'info' });
        } else if (detail && detail.start_date && /^\d{4}-\d{2}-\d{2}$/.test(detail.start_date)) {
          setSelectedDate(detail.start_date);
          setDateMessage({ text: `Ngày khởi hành mặc định: ${formatDateDisplay(detail.start_date)}`, type: 'info' });
        } else {
          const today = getTodayVN();
          setSelectedDate(today);
          setDateMessage({ text: `Ngày mặc định: ${formatDateDisplay(today)}`, type: 'info' });
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
        setError('Không thể tải thông tin tour. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    window.scrollTo(0, 0);
    return () => { cancelled = true; };
  }, [tour_id]);

  // --- SCROLL SPY ---
  useEffect(() => {
    const handler = () => {
      const y = window.scrollY || window.pageYOffset;
      setShowGoTop(y > 400);
      const spyPos = y + 180;
      for (const it of navItems) {
        const el = document.getElementById(it.id);
        if (!el) continue;
        if (spyPos >= el.offsetTop && spyPos < el.offsetTop + el.offsetHeight) {
          setActiveSection(it.id);
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 140;
    const pos = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: pos, behavior: 'smooth' });
    setActiveSection(id);
  };

  const updateGuests = (delta) => {
    setGuests(prev => {
      let next = prev + delta;
      if (next < 1) next = 1;
      if (tour && tour.max_people && next > tour.max_people) next = tour.max_people;
      return next;
    });
  };

  // --- LOGIC NGÀY ---
  const availableDates = tour ? normalizeAvailableDates(tour.available_dates) : null;
  const isDateAllowed = (isoDate) => {
    if (!isoDate) return false;
    if (!availableDates) {
      const today = new Date(getTodayVN());
      const d = new Date(isoDate);
      today.setHours(0,0,0,0);
      d.setHours(0,0,0,0);
      return d >= today;
    }
    return availableDates.includes(isoDate);
  };

  const handleDateChange = (isoDate) => {
    setSelectedDate(isoDate);
    if (!isoDate) {
      setDateMessage({ text: 'Vui lòng chọn ngày khởi hành.', type: 'error' });
      return;
    }
    if (!isDateAllowed(isoDate)) {
      if (availableDates && availableDates.length > 0) {
        setDateMessage({ text: `Ngày này không khả dụng. Vui lòng chọn trong danh sách có sẵn.`, type: 'error' });
      } else {
        setDateMessage({ text: `Ngày đã chọn nhỏ hơn hôm nay. Chọn ngày lớn hơn hoặc bằng hôm nay.`, type: 'error' });
      }
    } else {
      setDateMessage({ text: `Ngày hợp lệ: ${formatDateDisplay(isoDate)}`, type: 'success' });
    }
  };

  const handleRedirectLogin = () => {
      const redirectTo = `${location.pathname}${location.search}`;
      setShowLoginModal(false);
      navigate(`/login?next=${encodeURIComponent(redirectTo)}`);
  };

  const handleBooking = () => {
    if (!tour) return;
    if (!selectedDate) {
      setDateMessage({ text: 'Vui lòng chọn ngày khởi hành.', type: 'error' });
      const el = document.getElementById('booking-widget');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 120, behavior: 'smooth' });
      return;
    }
    if (!isDateAllowed(selectedDate)) {
      setDateMessage({ text: 'Ngày khởi hành không hợp lệ. Vui lòng chọn lại.', type: 'error' });
      return;
    }

    const user = localStorage.getItem('user'); 
    if (!user) {
        setShowLoginModal(true);
        return;
    }

    setSubmitting(true);
    const q = new URLSearchParams({
      tourId: String(tour_id),
      guests: String(guests),
      price: String(tour.price || 0),
      date: selectedDate
    }).toString();

    setTimeout(() => {
      setSubmitting(false);
      navigate(`/booking/tour-checkout?${q}`);
    }, 200);
  };

  if (loading) return <div className="vh-100 d-flex justify-content-center align-items-center"><div className="spinner-border text-primary"></div></div>;
  if (error || !tour) return <div className="text-center py-5"><h3>{error || 'Không tìm thấy tour'}</h3><button className="btn btn-primary mt-3" onClick={() => navigate('/')}>Về trang chủ</button></div>;

  const totalScore = Array.isArray(tour.reviews) ? tour.reviews.reduce((acc, cur) => acc + Number(cur.rating || 0), 0) : 0;
  const avgScore = tour.reviews && tour.reviews.length ? (totalScore / tour.reviews.length).toFixed(1) : 0;
  const ratingText = avgScore >= 9 ? 'Tuyệt hảo' : avgScore >= 8 ? 'Rất tốt' : avgScore >= 7 ? 'Tốt' : 'Hài lòng';

  const displayStartTime = tour.start_time ? formatTime(tour.start_time) : '';
  const displayEndTime = tour.end_time ? formatTime(tour.end_time) : '';

  return (
    <div className="bg-light min-vh-100 font-sans position-relative">
      <div className="sticky-top bg-white" style={{ zIndex: 1030 }}></div>

      <div className="bg-white shadow-sm sticky-menu border-top" style={{ position: 'sticky', top: 0, zIndex: 1020 }}>
        <div className="container">
          <div className="d-flex align-items-center justify-content-between" style={{ height: '60px' }}>
            <div className="d-flex gap-4 overflow-auto no-scrollbar h-100 align-items-center flex-grow-1">
              {navItems.map(it => (
                <button
                  key={it.id}
                  className={`bg-transparent border-0 fw-bold px-3 text-nowrap transition ${activeSection === it.id ? 'text-primary' : 'text-muted'}`}
                  style={{ fontSize: '0.95rem' }}
                  onClick={() => scrollToSection(it.id)}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <div className="d-flex align-items-center gap-3 ps-3 border-start h-100">
              <div className="d-none d-md-block text-end lh-1">
                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Giá từ</small>
                <span className="fw-bold text-danger fs-5">{formatCurrency(tour.price)} ₫</span>
              </div>
              <button className="btn btn-primary fw-bold px-4 py-2 rounded-pill shadow-sm text-nowrap btn-hover-up" onClick={() => scrollToSection('booking-widget')}>Đặt ngay</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {/* GALLERY */}
        <div className="row g-2 mb-4" id="overview" style={{ height: 480 }}>
          <div className="col-md-8 h-100">
            <img src={tour.image || 'https://placehold.co/800x600'} className="w-100 h-100 object-fit-cover rounded-start-4 shadow-sm" alt={tour.name} onError={onImageError} />
          </div>
          <div className="col-md-4 h-100 d-flex flex-column gap-2">
            <div className="h-50">
              <img src={tour.image_2 || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800'} className="w-100 h-100 object-fit-cover rounded-top-end-4 shadow-sm" alt="sub1" onError={onImageError} />
            </div>
            <div className="h-50 position-relative">
              <img src={tour.image_3 || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800'} className="w-100 h-100 object-fit-cover rounded-bottom-end-4 shadow-sm" alt="sub2" onError={onImageError} />
              <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center rounded-bottom-end-4 text-white fw-bold cursor-pointer hover-overlay">
                <i className="bi bi-images me-2"></i> Xem tất cả ảnh
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="bg-white p-4 rounded-4 shadow-sm border mb-4 position-relative overflow-hidden">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="d-flex gap-2 mb-2">
                    {tour.dest_name && <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill"><i className="bi bi-geo-alt-fill me-1"></i>{tour.dest_name}</span>}
                    {tour.category_name && <span className="badge bg-warning bg-opacity-10 text-warning-emphasis px-3 py-2 rounded-pill"><i className="bi bi-tag-fill me-1"></i>{tour.category_name}</span>}
                  </div>
                  <h1 className="fw-bold text-dark fs-2 mb-2">{tour.name}</h1>

                  <div className="d-flex flex-wrap align-items-center gap-4 text-muted small mt-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-clock-history fs-5 text-primary"></i>
                      <span>Thời lượng: <br /><b>{tour.duration_hours ? `${tour.duration_hours} giờ` : tour.duration || '-'}</b></span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-alarm fs-5 text-primary"></i>
                      <span>Giờ giấc: <br /><b>{displayStartTime || '-'}{displayEndTime ? ` - ${displayEndTime}` : ''}</b></span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-people fs-5 text-primary"></i>
                      <span>Quy mô: <br /><b>{tour.max_people ? `Max ${tour.max_people} khách` : 'Liên hệ'}</b></span>
                    </div>
                  </div>
                </div>

                {tour.reviews && tour.reviews.length > 0 && (
                  <div className="text-end d-none d-md-block p-3 bg-light rounded-3">
                    <div className="fw-bold text-primary fs-5">{ratingText}</div>
                    <div className="small text-muted">{tour.reviews.length} đánh giá</div>
                    <div className="bg-primary text-white fs-3 fw-bold rounded px-3 py-1 mt-1 d-inline-block shadow-sm">{avgScore}</div>
                  </div>
                )}
              </div>

              <hr className="my-4 opacity-10" />

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="d-flex gap-3 align-items-start p-3 bg-light rounded-3 border">
                    <i className="bi bi-geo-alt-fill text-danger fs-4 mt-1"></i>
                    <div>
                      <small className="text-muted fw-bold text-uppercase">Điểm tập trung</small>
                      <div className="fw-bold text-dark">{tour.start_location || 'Liên hệ sau'}</div>
                      {tour.start_time && <div className="small text-primary mt-1"><i className="bi bi-clock me-1"></i>{formatTime(tour.start_time)}</div>}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex gap-3 align-items-start p-3 bg-light rounded-3 border">
                    <i className="bi bi-flag-fill text-success fs-4 mt-1"></i>
                    <div>
                      <small className="text-muted fw-bold text-uppercase">Điểm kết thúc</small>
                      <div className="fw-bold text-dark">{tour.end_location || 'Tại điểm xuất phát'}</div>
                      {tour.end_time && <div className="small text-primary mt-1"><i className="bi bi-clock me-1"></i>{formatTime(tour.end_time)}</div>}
                    </div>
                  </div>
                </div>
              </div>

              <h5 className="fw-bold mb-3"><i className="bi bi-info-circle me-2 text-primary"></i>Giới thiệu</h5>
              <p className="text-muted" style={{ lineHeight: 1.8, textAlign: 'justify', fontSize: '0.95rem' }}>
                {tour.description || 'Đang cập nhật mô tả tour.'}
              </p>
            </div>

            {/* HIGHLIGHTS */}
            <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="highlights">
              <h4 className="fw-bold mb-4 border-start border-4 border-warning ps-3">Điểm nổi bật & Bao gồm</h4>
              <div className="row g-3">
                {(Array.isArray(tour.amenities) && tour.amenities.length > 0) ? tour.amenities.map((am, idx) => {
                    const name = typeof am === 'string' ? am : am.name;
                    const icon = (typeof am === 'object' && am.icon) ? am.icon : 'bi-check-lg';
                    return (
                        <div key={idx} className="col-sm-6 col-md-4">
                            <div className="d-flex align-items-center gap-3 p-3 border border-light-subtle rounded-3 bg-light h-100 hover-shadow transition">
                            <div className="bg-white p-2 rounded-circle shadow-sm text-success"><i className={`bi ${icon} fs-5`}></i></div>
                            <span className="fw-medium text-dark small">{name}</span>
                            </div>
                        </div>
                    )
                }) : <div className="col-12 text-muted">Chưa có thông tin điểm nổi bật.</div>}
              </div>
            </div>

            {/* ITINERARY - TIME SLOTS / TIMELINE */}
            <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="itinerary">
              <h4 className="fw-bold mb-4 border-start border-4 border-primary ps-3">Lịch trình tour</h4>
              <div className="position-relative ps-3">
                <div className="position-absolute top-0 bottom-0 start-0 border-start border-2 border-primary border-opacity-25 ms-2" style={{ zIndex: 0 }} />
                {Array.isArray(tour.itinerary) && tour.itinerary.length > 0 ? tour.itinerary.map((item, idx) => (
                  <div key={idx} className="mb-4 position-relative ps-4">
                    <div className="position-absolute top-0 start-0 translate-middle-x bg-white border border-4 border-primary rounded-circle shadow-sm" 
                         style={{ width: 20, height: 20, zIndex: 1, left: 8, top: 4 }}>
                    </div>
                    <div className="card border-0 shadow-sm bg-light hover-shadow transition">
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-primary me-2" style={{minWidth: '60px'}}>
                                {item.time || `Mốc ${idx + 1}`}
                            </span>
                            <h6 className="fw-bold text-dark m-0">{item.title}</h6>
                        </div>
                        <p className="text-muted small mb-0" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{item.description}</p>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-muted fst-italic ps-4">Đang cập nhật lịch trình...</div>}
              </div>
            </div>

            {/* POLICIES */}
            <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="policies">
              <h4 className="fw-bold mb-3 border-start border-4 border-danger ps-3">Chính sách tour</h4>
              {tour.policies ? (
                <div className="bg-danger bg-opacity-10 p-3 rounded-3 border border-danger border-opacity-25">
                  <ul className="list-unstyled mb-0 small text-dark d-grid gap-2">
                    {typeof tour.policies === 'string' ? tour.policies.split(/\n|<\/li>|<br>/).filter(Boolean).map((p, i) => (
                      <li key={i} className="d-flex gap-2"><i className="bi bi-check-circle-fill text-danger mt-1"></i><span dangerouslySetInnerHTML={{ __html: p }} /></li>
                    )) : (Array.isArray(tour.policies) ? tour.policies.map((p, i) => (
                      <li key={i} className="d-flex gap-2"><i className="bi bi-check-circle-fill text-danger mt-1"></i><span>{p}</span></li>
                    )) : <li className="d-flex gap-2"><i className="bi bi-check-circle-fill text-danger mt-1"></i><span>Không có chính sách đặc biệt.</span></li>)}
                  </ul>
                </div>
              ) : <div className="text-muted">Chính sách đang được cập nhật.</div>}
            </div>

            {/* REVIEWS */}
            <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="reviews">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold m-0 border-start border-4 border-success ps-3">Đánh giá từ khách hàng ({tour.reviews ? tour.reviews.length : 0})</h4>
              </div>

              {tour.reviews && tour.reviews.length > 0 ? (
                <div className="vstack gap-4">
                  {tour.reviews.map((r, index) => (
                    <div key={r.review_id || index} className="border-bottom pb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-3">
                          <img 
                            src={r.avatar || 'https://placehold.co/100?text=User'} 
                            className="rounded-circle object-fit-cover border shadow-sm" 
                            width="50" 
                            height="50" 
                            alt={r.full_name || 'Khách hàng'} 
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100?text=User'; }} 
                          />
                          <div>
                            <div className="fw-bold text-dark">{r.full_name || 'Khách ẩn danh'}</div>
                            <div className="text-warning small d-flex align-items-center">
                              {[...Array(5)].map((_, i) => (
                                <i key={i} className={`bi ${i < Math.round(Number(r.rating) || 5) ? 'bi-star-fill' : 'bi-star'} me-1`}></i>
                              ))}
                              {r.rating && <span className="text-muted ms-1 small">({Number(r.rating).toFixed(1)})</span>}
                            </div>
                          </div>
                        </div>
                        <small className="text-muted bg-light px-2 py-1 rounded border">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : ''}
                        </small>
                      </div>

                      {/* User Comment */}
                      <div className="bg-light p-3 rounded-3 mt-2 position-relative">
                          <i className="bi bi-chat-quote-fill position-absolute top-0 start-0 translate-middle text-secondary opacity-25 fs-4 ps-4 pt-2"></i>
                          <p className="text-dark mb-0 fst-italic ps-2">"{r.comment || 'Không có nhận xét chi tiết.'}"</p>
                      </div>

                      {/* 🔥 ADMIN REPLY SECTION (ĐÃ THÊM MỚI) 🔥 */}
                      {r.admin_reply && (
                        <div className="d-flex mt-3 ms-4">
                          <div className="me-3 d-flex flex-column align-items-center">
                             {/* Đường kẻ nối */}
                             <div style={{width: '2px', height: '15px', background: '#e0e0e0', marginBottom: '5px'}}></div>
                             <i className="bi bi-arrow-return-right text-primary fs-4"></i>
                          </div>
                          <div className="bg-primary bg-opacity-10 p-3 rounded-3 border border-primary w-100">
                            <div className="d-flex align-items-center mb-1">
                              <span className="badge bg-primary me-2">Phản hồi từ Admin</span>
                              <small className="text-muted">{r.admin_reply_at ? new Date(r.admin_reply_at).toLocaleDateString('vi-VN') : ''}</small>
                            </div>
                            <p className="mb-0 text-dark small">{r.admin_reply}</p>
                          </div>
                        </div>
                      )}
                      
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-light rounded-3">
                  <i className="bi bi-chat-square-quote display-3 text-muted opacity-25"></i>
                  <p className="text-muted mt-3">Chưa có đánh giá nào cho tour này.</p>
                </div>
              )}
            </div>
            
            {/* RELATED TOURS */}
            {relatedTours && relatedTours.length > 0 && (
              <div className="mt-5">
                <h4 className="fw-bold mb-4">Các hoạt động khác tại {tour.dest_name}</h4>
                <div className="row g-3">
                  {relatedTours.map(item => (
                    <div className="col-6 col-md-3" key={item.tour_id}>
                      <div className="card h-100 border-0 shadow-sm hover-shadow transition cursor-pointer" onClick={() => { navigate(`/tour/${item.tour_id}`); window.scrollTo(0,0); }}>
                        <div className="position-relative">
                          <img src={item.image || 'https://placehold.co/400x300'} className="card-img-top object-fit-cover rounded-top-3" style={{ height: 160 }} alt={item.name} onError={onImageError} />
                          <span className="position-absolute top-0 end-0 m-2 badge bg-white text-dark shadow-sm"><i className="bi bi-clock me-1 text-primary"></i>{item.duration || '-'}</span>
                        </div>
                        <div className="card-body p-3 d-flex flex-column">
                          <h6 className="fw-bold text-dark mb-1 line-clamp-2" style={{ minHeight: 40 }}>{item.name}</h6>
                          <div className="d-flex align-items-center mb-2">
                            <div className="text-warning small me-2">
                              {[...Array(5)].map((_, i) => (<i key={i} className={`bi ${i < Math.round(item.avg_rating || 0) ? 'bi-star-fill' : 'bi-star'} small`}></i>))}
                            </div>
                            <span className="text-muted small" style={{ fontSize: '0.75rem' }}>({item.total_reviews || 0})</span>
                          </div>
                          <div className="mt-auto pt-2 border-top">
                            <span className="text-muted small">Từ</span>
                            <span className="fw-bold text-danger fs-5 ms-1">{formatCurrency(item.price)} ₫</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT - BOOKING WIDGET */}
          <div className="col-lg-4">
            <div className="sticky-top" style={{ top: 80, zIndex: 10 }}>
              <div className="bg-white p-4 rounded-4 shadow-lg border border-primary border-opacity-25 mb-4 position-relative overflow-hidden" id="booking-widget">
                <div className="position-absolute top-0 start-0 w-100 bg-primary" style={{ height: 6 }} />

                <div className="text-center mb-4 pt-2">
                  <div className="text-muted small text-decoration-line-through">{formatCurrency((tour.price || 0) * 1.2)} ₫</div>
                  <div className="fs-1 fw-bold text-danger lh-1 mb-1">{formatCurrency(tour.price)} ₫</div>
                  <small className="text-muted">giá mỗi khách</small>
                </div>

                {/* DATE PICKER */}
                <div className="mb-3">
                  <label className="fw-bold small mb-1 text-muted text-uppercase">Ngày khởi hành</label>

                  {Array.isArray(availableDates) && availableDates.length > 0 ? (
                    <>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text bg-light border-end-0"><i className="bi bi-calendar-event text-primary"></i></span>
                        <select
                          className="form-select bg-white border-start-0 fs-6 cursor-pointer"
                          value={selectedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          aria-label="Chọn ngày khởi hành"
                        >
                          {availableDates.map(d => (
                            <option key={d} value={d}>
                              {formatDateDisplay(d)}{tour.start_time ? ` — ${formatTime(tour.start_time)}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="small text-muted mt-1">Chọn ngày có sẵn. Một số ngày có thể hết chỗ vào giờ cao điểm.</div>
                    </>
                  ) : (
                    <>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text bg-light border-end-0"><i className="bi bi-calendar-event text-primary"></i></span>
                        <input
                          type="date"
                          className="form-control bg-white border-start-0 fs-6 cursor-pointer"
                          value={selectedDate}
                          min={getTodayVN()}
                          onChange={(e) => handleDateChange(e.target.value)}
                          aria-label="Chọn ngày khởi hành"
                        />
                      </div>
                      <div className="small text-muted mt-1">Chọn ngày (tối thiểu là hôm nay).</div>
                    </>
                  )}

                  {tour.start_time && (
                    <div className="text-success small mt-1">
                      <i className="bi bi-clock me-1"></i> Xuất phát lúc: <b>{formatTime(tour.start_time)}</b>
                    </div>
                  )}

                  {dateMessage.text && (
                    <div className={`mt-2 small ${dateMessage.type === 'error' ? 'text-danger' : (dateMessage.type === 'info' ? 'text-muted' : 'text-success')}`}>
                      {dateMessage.text}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="fw-bold small mb-1 text-muted text-uppercase">Số lượng khách</label>
                  <div className="d-flex align-items-center justify-content-between border rounded-3 p-2 bg-white">
                    <button className="btn btn-light rounded-3 border text-primary" onClick={() => updateGuests(-1)} disabled={guests <= 1}><i className="bi bi-dash-lg"></i></button>
                    <div className="text-center">
                      <span className="fw-bold fs-4 d-block lh-1">{guests}</span>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>Người</small>
                    </div>
                    <button className="btn btn-light rounded-3 border text-primary" onClick={() => updateGuests(1)} disabled={tour.max_people && guests >= tour.max_people}><i className="bi bi-plus-lg"></i></button>
                  </div>
                  {tour.max_people && <div className="small text-muted mt-1">Tối đa: {tour.max_people} khách</div>}
                </div>

                <div className="d-flex justify-content-between mb-4 border-top pt-3">
                  <span className="fw-bold text-dark fs-5">Tổng cộng:</span>
                  <span className="fw-bold text-primary fs-4">{formatCurrency((tour.price || 0) * guests)} ₫</span>
                </div>

                <button className="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-sm btn-hover-up text-uppercase fs-6" onClick={handleBooking} disabled={submitting || !isDateAllowed(selectedDate)}>
                  <i className="bi bi-ticket-perforated-fill me-2"></i>{submitting ? 'Đang xử lý...' : 'Đặt Tour Ngay'}
                </button>

                <div className="text-center mt-3 small bg-light p-2 rounded text-muted">
                  <i className="bi bi-shield-check text-success me-1"></i> Giữ chỗ ngay, thanh toán an toàn!
                </div>
              </div>

              <div className="bg-white p-4 rounded-4 shadow-sm border text-center">
                <div className="mb-3 d-inline-block p-3 rounded-circle bg-primary bg-opacity-10">
                  <i className="bi bi-headset fs-1 text-primary"></i>
                </div>
                <h6 className="fw-bold">Cần hỗ trợ tư vấn?</h6>
                <p className="text-muted small mb-3">Liên hệ chuyên viên tư vấn để được giải đáp mọi thắc mắc về tour.</p>
                <a href="tel:19001234" className="btn btn-outline-primary rounded-pill btn-sm fw-bold px-4 w-100"><i className="bi bi-telephone-fill me-2"></i>1900 1234</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showGoTop && (
        <button className="btn btn-primary position-fixed" style={{ right: 20, bottom: 20, zIndex: 2000, borderRadius: '50%', width: 48, height: 48 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Về đầu trang">
          <i className="bi bi-arrow-up"></i>
        </button>
      )}

      {/* --- POPUP YÊU CẦU ĐĂNG NHẬP --- */}
      <LoginRequestModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleRedirectLogin}
      />

      <style>{`
        .hover-shadow:hover { box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15)!important; }
        .transition { transition: all 0.3s ease; }
        .btn-hover-up:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(13,110,253,0.15); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .object-fit-cover { object-fit: cover; }
        .rounded-start-4 { border-radius: 1rem 0 0 1rem; }
        .rounded-top-3 { border-top-left-radius: .75rem; border-top-right-radius: .75rem; }
      `}</style>
    </div>
  );
};

export default TourDetailPage;