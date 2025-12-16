import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// ======================================================
// 1. COMPONENT POPUP YÊU CẦU ĐĂNG NHẬP (GIỮ NGUYÊN)
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
                    Vui lòng đăng nhập để tiếp tục đặt phòng và nhận các ưu đãi dành riêng cho thành viên.
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
// 2. COMPONENT CHÍNH (HOTEL DETAIL)
// ======================================================
const HotelDetailPage = () => {
  const { hotel_id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation(); 

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [roomQuantities, setRoomQuantities] = useState({});

  // --- HÀM XỬ LÝ TĂNG GIẢM SỐ LƯỢNG PHÒNG ---
  const handleQuantityChange = (roomId, delta, maxLimit) => {
      setRoomQuantities(prev => {
          const currentQty = prev[roomId] !== undefined ? prev[roomId] : 1; 
          let newQty = currentQty + delta;
          
          // Không cho nhỏ hơn 1
          if (newQty < 1) newQty = 1;
          
          // Không cho lớn hơn số phòng trống (maxLimit)
          if (newQty > maxLimit) newQty = maxLimit;
          
          return { ...prev, [roomId]: newQty };
      });
  };

  const [hotel, setHotel] = useState(null);
  const [nearbyData, setNearbyData] = useState({ all: [], restaurant: [], activity: [] });
  const [activeNearbyTab, setActiveNearbyTab] = useState('all'); 
  const [loading, setLoading] = useState(true);
    
  const [activeSection, setActiveSection] = useState('overview');
  const [showGoTop, setShowGoTop] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  const [showCompareModal, setShowCompareModal] = useState(false);
  const [similarHotels, setSimilarHotels] = useState([]); 
  const [targetHotel, setTargetHotel] = useState(null);
    
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); 

  const [activeExpTab, setActiveExpTab] = useState('explore'); 

  const [filterType, setFilterType] = useState('all'); 
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5; 

  const checkIn = searchParams.get('checkIn') || new Date().toISOString().split('T')[0];
  const checkOut = searchParams.get('checkOut');
  const guestsParam = searchParams.get('guests') || '';
  const parsedGuestsCount = (() => {
      if (!guestsParam) return 2;
      const parts = guestsParam.split('-').map(p => Number(p) || 0);
      return parts.length ? Math.max(1, parts[0]) : 2;
  })();

  // --- HELPERS FOR SIMILAR HOTELS ---
  const openCompareModal = async () => {
      setShowCompareModal(true);
      if (similarHotels.length === 0) {
          try {
              const res = await axios.get(`http://localhost:8082/api/hotels/${hotel_id}/similar`);
              setSimilarHotels(res.data);
              if (res.data.length > 0) {
                  setTargetHotel(res.data[0]);
                  setSearchTerm(res.data[0].name); 
              }
          } catch (error) {
              console.error("Lỗi lấy khách sạn tương tự", error);
          }
      }
  };

  const handleSelectTarget = (hotel) => {
      setTargetHotel(hotel);
      setSearchTerm(hotel.name);
      setIsDropdownOpen(false);
  };

  useEffect(() => {
      const fetchSimilarOrSearch = async () => {
          try {
              let url = `http://localhost:8082/api/hotels/${hotel_id}/similar`;
              if (searchTerm.trim()) {
                  url += `?q=${encodeURIComponent(searchTerm)}`;
              }
              const res = await axios.get(url);
              setSimilarHotels(res.data);
          } catch (error) {
              console.error("Lỗi tìm kiếm:", error);
          }
      };

      const timeoutId = setTimeout(() => {
          if (showCompareModal) fetchSimilarOrSearch();
      }, 300);

      return () => clearTimeout(timeoutId);
  }, [searchTerm, hotel_id, showCompareModal]);
    
  const navItems = [
      { label: 'Tổng quan', id: 'overview' },
      { label: 'Phòng nghỉ', id: 'rooms' },
      { label: 'Làm gì đi đâu', id: 'activities' },
      { label: 'Chủ nhà', id: 'host' },
      { label: 'Tiện ích', id: 'facilities' },
      { label: 'Chính sách', id: 'policies' },
      { label: 'Vị trí', id: 'location' },
      { label: 'Đánh giá', id: 'reviews' }
  ];

  // --- FETCH DỮ LIỆU ---
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const cIn = searchParams.get('checkIn') || new Date().toISOString().split('T')[0];
        const cOut = searchParams.get('checkOut') || new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const res = await axios.get(`http://localhost:8082/api/hotels/${hotel_id}?checkIn=${cIn}&checkOut=${cOut}`);
        const data = res.data;
        setHotel(data);

        const activities = data.nearby_activities || []; 
        const restaurants = data.nearby_restaurants || [];
        
        const mixedList = [];
        const maxLength = Math.max(activities.length, restaurants.length);
        for (let i = 0; i < maxLength; i++) {
            if (activities[i]) mixedList.push(activities[i]);
            if (restaurants[i]) mixedList.push(restaurants[i]);
        }

        setNearbyData({
            all: mixedList.slice(0, 6),
            activity: activities, 
            restaurant: restaurants
        });

        // Khởi tạo số lượng phòng (mặc định là 1 nếu còn phòng)
        if (data.rooms && data.rooms.length > 0) {
            const init = {};
            data.rooms.forEach(r => {
                const total = r.total_inventory || 5;
                const booked = r.is_booked || 0;
                const maxAvailable = Math.max(0, total - booked);
                init[r.room_id] = maxAvailable > 0 ? 1 : 0;
            });
            setRoomQuantities(init);
        }

      } catch (error) {
        console.error("Lỗi tải chi tiết:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    window.scrollTo(0, 0);
  }, [hotel_id, searchParams, location.key]);

  const reviewStats = useMemo(() => {
      const reviews = hotel?.reviews || [];
      const totalReviews = reviews.length;
      
      if (totalReviews === 0) {
          return { avgScore: 0, ratingText: "Chưa có đánh giá", count: 0, cleanliness: 0, location: 0, service: 0 };
      }
      
      const totalScore = reviews.reduce((acc, curr) => acc + Number(curr.rating || 0), 0);
      const avgScore = (totalScore / totalReviews).toFixed(1);

      let ratingText = "Hài lòng";
      if (avgScore >= 9.0) ratingText = "Trên cả tuyệt vời";
      else if (avgScore >= 8.0) ratingText = "Tuyệt vời";
      else if (avgScore >= 7.0) ratingText = "Rất tốt";

      return { 
          avgScore, 
          ratingText, 
          count: totalReviews, 
          cleanliness: avgScore, 
          location: avgScore, 
          service: avgScore 
      };
  }, [hotel]);

  // --- FILTER REVIEWS ---
  const getFilteredReviews = () => {
      if (!hotel || !hotel.reviews) return [];
      let filtered = hotel.reviews;

      if (filterType === 'cleanliness') {
          filtered = filtered.filter(r => 
              (r.comment && r.comment.toLowerCase().includes('sạch')) || 
              Number(r.rating) >= 8
          );
      } else if (filterType === 'location') {
          filtered = filtered.filter(r => 
              r.comment && (r.comment.toLowerCase().includes('vị trí') || r.comment.toLowerCase().includes('gần'))
          );
      }
      return filtered;
  };

  const filteredReviews = getFilteredReviews();
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);

  const handlePageChange = (pageNumber) => {
      setCurrentPage(pageNumber);
      const reviewSection = document.getElementById('reviews');
      if(reviewSection) {
          const y = reviewSection.getBoundingClientRect().top + window.pageYOffset - 160;
          window.scrollTo({top: y, behavior: 'smooth'});
      }
  };

  useEffect(() => {
      const handleScroll = () => {
          const scrollPosition = window.scrollY;
          if (scrollPosition > 400) setShowGoTop(true);
          else setShowGoTop(false);

          const spyPosition = scrollPosition + 140; 
          for (const item of navItems) {
              const element = document.getElementById(item.id);
              if (element) {
                  const offsetTop = element.offsetTop;
                  const offsetBottom = offsetTop + element.offsetHeight;
                  if (spyPosition >= offsetTop && spyPosition < offsetBottom) {
                      setActiveSection(item.id);
                  }
              }
          }
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, [loading]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (id) => {
      if (id === 'policies') {
          setShowPolicyModal(true);
      } else {
          scrollToSection(id);
      }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  const getSeeAllLink = () => {
      if (activeNearbyTab === 'restaurant') return '/search?type=restaurant';
      if (activeNearbyTab === 'activity') return '/search?type=activity';
      return '/search?type=activity';
  };

  const handleRedirectLogin = () => {
      const redirectTo = `${location.pathname}${location.search}`;
      setShowLoginModal(false);
      navigate(`/login?next=${encodeURIComponent(redirectTo)}`);
  };

  // ======================================================
  // 3. HÀM ĐẶT PHÒNG
  // ======================================================
  const handleHoldBooking = async (room) => {
      const cIn = checkIn || new Date().toISOString().split('T')[0];
      let cOut = checkOut;
      if (!cOut) {
          const date = new Date(cIn);
          date.setDate(date.getDate() + 1);
          cOut = date.toISOString().split('T')[0];
      }

      const qtyInit = roomQuantities[room.room_id];
      const qty = qtyInit !== undefined ? qtyInit : 1;

      const userStorage = localStorage.getItem('user');
      const currentUser = userStorage ? JSON.parse(userStorage) : null;

      // 1. Kiểm tra LocalStorage (Login sơ bộ)
      if (!currentUser) {
          setShowLoginModal(true);
          return;
      }

      try {
          Swal.fire({ title: 'Đang kiểm tra phòng...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

          const guestsCountToSend = Number(parsedGuestsCount) || 1;

          // Gọi API tạo booking mới (POST)
          const res = await axios.post('http://localhost:8082/api/bookings/hold', {
              user_id: currentUser ? currentUser.user_id : null, 
              hotel_id: Number(hotel_id),
              room_id: room.room_id,
              check_in: cIn,
              check_out: cOut,
              guests_count: guestsCountToSend,
              quantity: Number(qty)
          });

          if (res.data && res.data.success) {
              Swal.close();
              
              localStorage.removeItem("currentBookingId"); 
              localStorage.removeItem("booking_id"); 
              
              navigate(`/booking/checkout?bookingId=${res.data.booking_id}`);
          } else {
              Swal.close();
              Swal.fire({ icon: 'error', title: 'Không thể giữ chỗ', text: res.data?.message || 'Lỗi từ server' });
          }
      } catch (error) {
          Swal.close(); 

          if (error.response && error.response.status === 401) {
              Swal.fire({
                  icon: 'warning',
                  title: 'Phiên đăng nhập hết hạn',
                  text: 'Vui lòng đăng nhập lại để tiếp tục.',
                  confirmButtonText: 'Đăng nhập',
                  showCancelButton: true,
                  cancelButtonText: 'Hủy'
              }).then((result) => {
                  if (result.isConfirmed) {
                      localStorage.removeItem('user'); 
                      setShowLoginModal(true); 
                  }
              });
              return;
          }

          Swal.fire({
            icon: 'error',
            title: 'Thông báo',
            text: error.response?.data?.message || 'Không thể giữ chỗ lúc này',
            confirmButtonText: 'Đã hiểu'
          });
      }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (!hotel) return <div className="text-center py-5"><h3>Không tìm thấy khách sạn!</h3></div>;

  return (
    <div className="bg-light min-vh-100 font-sans position-relative">
      <div className="sticky-top bg-white" style={{zIndex: 1030}}></div>

      {/* MENU PHỤ */}
      <div className="bg-white shadow-sm sticky-menu border-top" style={{position: 'sticky', top: '70px', zIndex: 1020}}>
          <div className="container">
              <div className="d-flex align-items-center justify-content-between" style={{height: '60px'}}>
                  <div className="d-flex gap-4 overflow-auto no-scrollbar h-100 align-items-center flex-grow-1">
                      {navItems.map((item) => (
                          <button 
                            key={item.id} 
                            className={`btn btn-link text-decoration-none fw-bold p-0 border-0 h-100 px-2 d-flex align-items-center text-nowrap ${activeSection === item.id ? 'text-primary' : 'text-dark'}`}
                            style={{ borderBottom: activeSection === item.id ? '3px solid #0d6efd' : '3px solid transparent', borderRadius: 0, fontSize: '0.95rem', transition: 'all 0.2s' }}
                            onClick={() => handleNavClick(item.id)}
                          >
                              {item.label}
                          </button>
                      ))}
                  </div>
                  <div className="d-flex align-items-center gap-3 ps-3 border-start h-100">
                      <div className="text-end d-none d-md-block">
                          <small className="text-muted d-block lh-1" style={{fontSize: '0.7rem'}}>Giá mỗi đêm từ</small>
                          <span className="fw-bold text-danger fs-5 lh-1">
                              {hotel.rooms?.[0]?.price_per_night ? Number(hotel.rooms[0].price_per_night).toLocaleString() : '999.000'} ₫
                          </span>
                      </div>
                      <button className="btn btn-primary btn-sm fw-bold px-4 py-2 rounded-3 shadow-sm text-nowrap" onClick={() => scrollToSection('rooms')}>Xem giá</button>
                      {showGoTop && (
                          <button className="btn btn-link text-decoration-none fw-bold text-secondary d-flex align-items-center gap-1 text-nowrap ms-2 animate__animated animate__fadeIn" onClick={scrollToTop} style={{fontSize: '0.9rem'}}>
                            Về đầu trang <i className="bi bi-arrow-up"></i>
                          </button>
                      )}
                  </div>
              </div>
          </div>
      </div>

      <div className="container py-4">
        
        {/* GALLERY ẢNH */}
        <div className="row g-2 mb-4" id="overview">
            <div className="col-md-8">
                <img src={hotel.image_url || 'https://placehold.co/800x600'} className="w-100 h-100 object-fit-cover rounded-start-3 shadow-sm cursor-pointer hover-zoom" style={{minHeight: '400px', maxHeight: '400px'}} alt="Main" onError={(e) => e.target.src='https://placehold.co/800x600'} />
            </div>
            <div className="col-md-4 d-flex flex-column gap-2">
                <div className="position-relative h-50"><img src="https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop" className="w-100 h-100 object-fit-cover rounded-top-end-3 shadow-sm cursor-pointer" alt="Sub 1" /></div>
                <div className="position-relative h-50">
                      <img src="https://images.unsplash.com/photo-1590073242678-cfea53382e52?q=80&w=800&auto=format&fit=crop" className="w-100 h-100 object-fit-cover rounded-bottom-end-3 shadow-sm cursor-pointer" alt="Sub 2" />
                      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center rounded-bottom-end-3 cursor-pointer hover-overlay"><span className="text-white fw-bold fs-5"><i className="bi bi-images me-2"></i>Xem tất cả ảnh</span></div>
                </div>
            </div>
        </div>

        <div className="row">
            {/* CỘT TRÁI */}
            <div className="col-lg-8">
                {/* HEADER INFO */}
                <div className="bg-white p-4 rounded-4 shadow-sm mb-4 border-bottom border-4 border-primary position-relative overflow-hidden">
                    <div className="d-flex justify-content-between align-items-start">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <span className="badge bg-primary text-white text-uppercase" style={{fontSize: '0.7rem'}}>Khách sạn</span>
                                <div className="text-warning">{[...Array(hotel.star_rating || 3)].map((_,i) => <i key={i} className="bi bi-star-fill small"></i>)}</div>
                            </div>
                            <h2 className="fw-bold mb-1 text-dark">{hotel.name}</h2>
                            <div className="mb-2">
                              <button className="btn btn-outline-primary btn-sm rounded-pill fw-bold" onClick={openCompareModal}>
                                <i className="bi bi-arrow-left-right me-2"></i>So sánh với khách sạn khác
                              </button>
                            </div>
                            <p className="text-muted mb-2 small"><i className="bi bi-geo-alt-fill text-primary me-1"></i> {hotel.address}, {hotel.city_name} - <a href="#location" className="text-decoration-none">Xem trên bản đồ</a></p>
                        </div>
                        <div className="text-end d-none d-md-block">
                            <div className="d-flex align-items-center justify-content-end gap-2 mb-1">
                                <div className="text-end"><div className="fw-bold text-primary">{reviewStats.ratingText}</div><div className="small text-muted">{reviewStats.count} nhận xét</div></div>
                                <div className="bg-primary text-white fs-5 fw-bold rounded p-2 lh-1 shadow-sm">{reviewStats.avgScore}</div>
                            </div>
                        </div>
                    </div>
                    <hr className="my-4 opacity-10" />
                    <h5 className="fw-bold mb-3">Về chúng tôi</h5>
                    <p className="text-muted small" style={{lineHeight: '1.8', textAlign: 'justify'}}>{hotel.description || `Tọa lạc tại vị trí lý tưởng...`}</p>
                </div>

                {/* DANH SÁCH PHÒNG */}
                <div className="bg-white rounded-4 shadow-sm border overflow-hidden mb-4" id="rooms">
                    <div className="p-4 border-bottom bg-light">
                        <h4 className="fw-bold m-0">Phòng nghỉ tại {hotel.name}</h4>
                    </div>
                    {hotel.rooms && hotel.rooms.length > 0 ? (
                        <div className="d-flex flex-column">
                            {hotel.rooms.map((room, idx) => {
                                const total = room.total_inventory || 5; 
                                const booked = room.is_booked || 0;
                                const maxAvailable = Math.max(0, total - booked);
                                const currentQty = roomQuantities[room.room_id] !== undefined ? roomQuantities[room.room_id] : 1;

                                return (
                                <div className="p-4 border-bottom position-relative" key={idx}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="fw-bold text-dark m-0" style={{fontSize: '1.2rem'}}>
                                            {room.room_type_name || room.room_type || "Phòng tiêu chuẩn"}
                                        </h5>
                                        {idx === 0 && <span className="badge bg-danger bg-opacity-10 text-danger small px-2 py-1 border border-danger border-opacity-25">Bán chạy nhất!</span>}
                                    </div>
                                    <div className="row g-0">
                                        {/* CỘT ẢNH */}
                                        <div className="col-md-4 pe-md-3 border-end">
                                            <div className="position-relative mb-2 group-hover-zoom" style={{height: '180px'}}>
                                                <img 
                                                    src={room.image || room.image_url} 
                                                    alt={room.room_type}
                                                    className={`img-fluid w-100 h-100 rounded-2 object-fit-cover border shadow-sm ${maxAvailable <= 0 ? 'grayscale' : 'cursor-pointer'}`}
                                                    onError={(e) => {e.target.onerror = null; e.target.src="https://via.placeholder.com/300x200"}}
                                                />
                                                {maxAvailable <= 0 && (
                                                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center rounded-2">
                                                        <span className="text-white fw-bold border border-white px-3 py-1 rounded">ĐÃ HẾT</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="d-flex flex-wrap gap-2 small text-muted mt-3">
                                                <div className="d-flex align-items-center me-3"><i className="bi bi-aspect-ratio me-2 fs-6"></i> {room.size || 25} m²</div>
                                                <div className="d-flex align-items-center me-3"><i className="bi bi-hdd-stack me-2 fs-6"></i> 1 giường đôi</div>
                                            </div>
                                        </div>

                                        {/* CỘT LỢI ÍCH */}
                                        <div className="col-md-4 px-md-3 border-end">
                                            <div className="bg-success bg-opacity-10 p-2 rounded mb-3 border border-success border-opacity-25">
                                                <small className="fw-bold text-success"><i className="bi bi-check-circle-fill me-1"></i> Lợi ích phòng này</small>
                                            </div>
                                            <ul className="list-unstyled small mb-0 d-grid gap-2">
                                                <li className="text-success fw-bold"><i className="bi bi-check-lg me-2"></i>Thanh toán tại nơi ở</li>
                                                <li className="text-success"><i className="bi bi-check-lg me-2 fs-6"></i>WiFi miễn phí</li>
                                                {maxAvailable > 0 && maxAvailable <= 3 && (
                                                    <li className="text-danger fw-bold animate__animated animate__pulse animate__infinite">
                                                        <i className="bi bi-exclamation-circle me-2"></i>Chỉ còn {maxAvailable} phòng!
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        {/* CỘT GIÁ & NÚT - SỬA PHẦN NÀY */}
                                        <div className="col-md-4 ps-md-3 d-flex flex-column justify-content-between">
                                            <div className="text-end mb-3">
                                                <div className="small text-muted">Mỗi đêm chỉ từ</div>
                                                <div className="text-muted text-decoration-line-through small">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((room.price || room.price_per_night || 0) * 1.3)}
                                                </div>
                                                <div className="fs-2 fw-bold text-danger lh-1 my-1">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.price || room.price_per_night)}
                                                </div>
                                                <div className="small text-muted">Chưa bao gồm thuế & phí</div>
                                            </div>
                                            
                                            <div className="mt-auto">
                                                {/* Logic hiển thị nút */}
                                                {maxAvailable <= 0 ? (
                                                    // TRƯỜNG HỢP HẾT PHÒNG
                                                    <>
                                                        <button 
                                                            className="btn btn-secondary w-100 fw-bold py-3 shadow-sm disabled" 
                                                            disabled
                                                            style={{fontSize: '1.1rem', cursor: 'not-allowed', opacity: 0.7}} 
                                                        >
                                                            HẾT PHÒNG
                                                        </button>
                                                        <div className="text-center mt-2 text-muted small fw-bold">
                                                            <i className="bi bi-calendar-x me-1"></i> Đã kín lịch ngày bạn chọn
                                                        </div>
                                                    </>
                                                ) : (
                                                    // TRƯỜNG HỢP CÒN PHÒNG
                                                    <>
                                                        {/* Bộ chọn số lượng */}
                                                        <div className="d-flex justify-content-end align-items-center gap-2 mb-2">
                                                            <span className="small fw-bold text-muted">Số phòng:</span>
                                                            <div className="input-group input-group-sm" style={{width: '110px'}}>
                                                                <button 
                                                                    className="btn btn-outline-secondary" 
                                                                    type="button"
                                                                    disabled={currentQty <= 1}
                                                                    onClick={() => handleQuantityChange(room.room_id, -1, maxAvailable)}
                                                                >
                                                                    <i className="bi bi-dash"></i>
                                                                </button>
                                                                <input 
                                                                    type="text" 
                                                                    className="form-control text-center fw-bold bg-white" 
                                                                    value={currentQty} 
                                                                    readOnly 
                                                                />
                                                                <button 
                                                                    className="btn btn-outline-secondary" 
                                                                    type="button"
                                                                    disabled={currentQty >= maxAvailable}
                                                                    onClick={() => handleQuantityChange(room.room_id, 1, maxAvailable)}
                                                                >
                                                                    <i className="bi bi-plus"></i>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Nút đặt phòng */}
                                                        <button 
                                                            className="btn btn-primary w-100 fw-bold py-3 shadow-sm btn-hover-up text-uppercase" 
                                                            style={{fontSize: '1.1rem'}} 
                                                            onClick={() => handleHoldBooking(room)}
                                                        >
                                                            ĐẶT NGAY
                                                        </button>
                                                        
                                                        {/* Cảnh báo nếu chọn max */}
                                                        {currentQty === maxAvailable && (
                                                            <div className="text-center mt-2 text-warning small fw-bold">
                                                                <i className="bi bi-info-circle-fill"></i> Bạn đã chọn tối đa số phòng trống
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}) 
                            }
                        </div>
                    ) : (<div className="p-5 text-center text-muted bg-light border-top"><h5>Chưa có phòng trống</h5></div>)}
                    <style>{` .grayscale { filter: grayscale(100%); } `}</style>
                </div>

                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="activities">
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                        <h4 className="fw-bold m-0 border-start border-4 border-success ps-3">Làm gì đi đâu gần đây</h4>
                        <div className="d-flex gap-2 bg-light p-1 rounded-pill">
                            <button className={`btn btn-sm rounded-pill px-3 fw-bold ${activeNearbyTab === 'all' ? 'bg-white shadow-sm text-success' : 'text-muted border-0'}`} onClick={() => setActiveNearbyTab('all')}>Tất cả</button>
                            <button className={`btn btn-sm rounded-pill px-3 fw-bold ${activeNearbyTab === 'restaurant' ? 'bg-white shadow-sm text-success' : 'text-muted border-0'}`} onClick={() => setActiveNearbyTab('restaurant')}><i className="bi bi-shop me-1"></i>Nhà hàng</button>
                            <button className={`btn btn-sm rounded-pill px-3 fw-bold ${activeNearbyTab === 'activity' ? 'bg-white shadow-sm text-success' : 'text-muted border-0'}`} onClick={() => setActiveNearbyTab('activity')}><i className="bi bi-ticket-perforated me-1"></i>Hoạt động</button>
                        </div>
                        <Link to={getSeeAllLink()} className="text-decoration-none fw-bold small text-primary">Xem tất cả <i className="bi bi-chevron-right"></i></Link>
                    </div>
                    
                    <div className="row g-3">
                        {nearbyData[activeNearbyTab] && nearbyData[activeNearbyTab].length > 0 ? nearbyData[activeNearbyTab].map((item, idx) => (
                            <div className="col-md-6 col-lg-4" key={`${item.type}-${item.id || item.restaurant_id || idx}`}>
                                <Link to={item.type === 'restaurant' ? `/restaurant/${item.id}` : `/activity/${item.id}`} className="text-decoration-none">
                                    <div className="card h-100 border-0 shadow-sm hover-shadow transition overflow-hidden group-hover-card">
                                            <div className="position-relative">
                                                <img src={item.image || 'https://placehold.co/300x200'} className="card-img-top object-fit-cover" alt={item.name} style={{height: '180px'}} />
                                                <span className="position-absolute top-0 start-0 m-2 badge bg-success bg-opacity-75 backdrop-blur shadow-sm"><i className="bi bi-geo-alt-fill me-1"></i> {item.distance ? `${Number(item.distance).toFixed(1)} km` : 'Gần đây'}</span>
                                                <span className={`position-absolute top-0 end-0 m-2 badge ${item.type === 'restaurant' ? 'bg-warning' : 'bg-primary'} text-white shadow-sm`}>{item.type === 'restaurant' ? <i className="bi bi-shop"></i> : <i className="bi bi-ticket-perforated-fill"></i>}</span>
                                            </div>
                                            <div className="card-body p-3 d-flex flex-column"><h6 className="fw-bold text-dark mb-1 line-clamp-1" title={item.name}>{item.name}</h6><p className="text-muted small mb-2 line-clamp-2 flex-grow-1" style={{minHeight: '40px'}}>{item.description || 'Trải nghiệm thú vị đang chờ đón bạn.'}</p></div>
                                    </div>
                                </Link>
                            </div>
                        )) : (<div className="col-12 text-center text-muted py-5 bg-light rounded-3"><i className="bi bi-geo-alt-fill fs-1 mb-2 text-secondary opacity-50"></i><p>Chưa có địa điểm nổi bật nào trong phạm vi 20km quanh khách sạn này.</p></div>)}
                    </div>
                </div>

                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="host">
                    <h5 className="fw-bold mb-3">Chủ nhà</h5>
                    <div className="d-flex align-items-center gap-4">
                        <div className="flex-shrink-0"><img src={hotel.owner_avatar || "https://placehold.co/100x100?text=Host"} className="rounded-circle object-fit-cover border shadow-sm" width="90" height="90" alt="Host Avatar" onError={(e) => e.target.src="https://placehold.co/100x100?text=Host"}/></div>
                        <div className="flex-grow-1">
                            <div className="d-flex flex-wrap justify-content-between align-items-start mb-2"><div><h6 className="fw-bold text-dark mb-1" style={{fontSize: '1.1rem'}}>{hotel.owner_name || "Chủ nhà ẩn danh"}</h6><Link to="#" className="text-decoration-none small fw-bold text-primary">Xem hồ sơ chủ nhà <i className="bi bi-chevron-right small"></i></Link></div><div className="text-muted small text-end"><div className="mb-1 d-flex align-items-center justify-content-end gap-2"><i className="bi bi-calendar-check text-secondary"></i><span>Tham gia: {hotel.owner_join_date ? new Date(hotel.owner_join_date).toLocaleDateString('vi-VN') : 'Không rõ'}</span></div><div className="d-flex align-items-center justify-content-end gap-2 text-success fw-bold"><i className="bi bi-lightning-fill"></i><span>Phản hồi nhanh</span></div></div></div>
                            <div className="bg-light p-3 rounded-3 mt-2"><p className="text-dark small mb-2 fst-italic">"Chào mừng bạn đến với chỗ nghỉ của chúng tôi! Chúng tôi luôn cố gắng mang đến trải nghiệm tốt nhất."</p>{hotel.owner_email && (<div className="d-flex align-items-center gap-2 small text-muted border-top pt-2 mt-2"><i className="bi bi-envelope-fill"></i> <span>{hotel.owner_email}</span></div>)}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="facilities">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-bold m-0">Tiện nghi và cơ sở vật chất</h4>
                        <span className="text-primary fw-bold small">Tuyệt vời {reviewStats.avgScore} <small className="text-muted fw-normal">Tiện nghi</small></span>
                    </div>
                    {hotel.amenities && hotel.amenities.length > 0 ? (
                        <div className="row g-3">
                            {hotel.amenities.map((am, idx) => {
                                // Xử lý tên: Nếu là chuỗi thì lấy luôn, nếu là object thì lấy .name
                                const amenityName = typeof am === 'string' ? am : am.name;
                                
                                // Xử lý icon: Nếu là object có icon thì lấy, không thì mặc định
                                const hasCustomIcon = typeof am === 'object' && am.icon && am.icon.startsWith('bi-');

                                return (
                                    <div key={idx} className="col-6 col-md-3">
                                        <div className="d-flex align-items-center gap-2 text-dark small">
                                            {hasCustomIcon ? (
                                                <i className={`${am.icon} text-success fs-6`}></i>
                                            ) : (
                                                <i className="bi bi-check-circle-fill text-success fs-6"></i>
                                            )}
                                            <span className="fw-medium">{amenityName}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="row g-4">
                            <div className="col-md-3"><h6 className="fw-bold small mb-3">Ngôn ngữ</h6><ul className="list-unstyled small text-muted d-grid gap-2"><li><i className="bi bi-translate me-2"></i>Tiếng Việt</li><li><i className="bi bi-translate me-2"></i>Tiếng Anh</li></ul></div>
                            <div className="col-md-3"><h6 className="fw-bold small mb-3">An toàn</h6><ul className="list-unstyled small text-muted d-grid gap-2"><li><i className="bi bi-check2-circle me-2"></i>Khử trùng</li><li><i className="bi bi-shield-check me-2"></i>Bảo vệ 24/7</li></ul></div>
                            <div className="col-md-3"><h6 className="fw-bold small mb-3">Ăn uống</h6><ul className="list-unstyled small text-muted d-grid gap-2"><li><i className="bi bi-cup-straw me-2"></i>Nhà hàng</li><li><i className="bi bi-cup-hot me-2"></i>Quầy bar</li></ul></div>
                            <div className="col-md-3"><h6 className="fw-bold small mb-3">Tiện ích</h6><ul className="list-unstyled small text-muted d-grid gap-2"><li><i className="bi bi-wifi me-2"></i>WiFi Free</li><li><i className="bi bi-snow me-2"></i>Máy lạnh</li></ul></div>
                        </div>
                    )}
                </div>

                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4">
                      <h5 className="fw-bold mb-3">Câu hỏi thường gặp</h5>
                      <div className="accordion accordion-flush" id="faqAccordion">
                        <div className="accordion-item border-0"><h2 className="accordion-header"><button className="accordion-button collapsed fw-bold bg-light rounded-3 mb-2 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">Khách sạn có dịch vụ đưa đón sân bay Cần Thơ không?</button></h2><div id="faq1" className="accordion-collapse collapse" data-bs-parent="#faqAccordion"><div className="accordion-body text-muted small pt-0 pb-3">Có, chúng tôi cung cấp dịch vụ đưa đón sân bay 24/7 với một khoản phụ phí nhỏ. Vui lòng liên hệ trước ít nhất 24h để sắp xếp xe.</div></div></div>
                        <div className="accordion-item border-0"><h2 className="accordion-header"><button className="accordion-button collapsed fw-bold bg-light rounded-3 mb-2 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">Thời gian nhận phòng và trả phòng là mấy giờ?</button></h2><div id="faq2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion"><div className="accordion-body text-muted small pt-0 pb-3">Thời gian nhận phòng tiêu chuẩn là từ 14:00 và trả phòng trước 12:00 trưa. Việc nhận phòng sớm hoặc trả phòng muộn tùy thuộc vào tình trạng phòng trống và có thể tính phí.</div></div></div>
                      </div>
                </div>

                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="reviews">
                    <h4 className="fw-bold mb-4 border-start border-4 border-primary ps-3">Bài đánh giá {hotel.name}</h4>
                    <div className="row">
                        <div className="col-md-4 border-end pe-md-4">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div className="bg-primary text-white fs-1 fw-bold rounded p-3 lh-1 shadow text-center" style={{minWidth: '80px'}}>
                                    {reviewStats.avgScore}
                                    <div className="fs-6 fw-normal mt-1">/10</div>
                                </div>
                                <div>
                                    <div className="fw-bold fs-4 text-primary">{reviewStats.ratingText}</div>
                                    <div className="text-muted small">Dựa trên {reviewStats.count} đánh giá</div>
                                </div>
                            </div>
                            <div className="d-grid gap-2">
                                <button className={`btn btn-sm text-start ${filterType === 'all' ? 'btn-primary text-white' : 'btn-light'}`} onClick={() => { setFilterType('all'); setCurrentPage(1); }}>Tất cả</button>
                                <button className={`btn btn-sm text-start ${filterType === 'cleanliness' ? 'btn-primary text-white' : 'btn-light'}`} onClick={() => { setFilterType('cleanliness'); setCurrentPage(1); }}>Sạch sẽ</button>
                                <button className={`btn btn-sm text-start ${filterType === 'location' ? 'btn-primary text-white' : 'btn-light'}`} onClick={() => { setFilterType('location'); setCurrentPage(1); }}>Vị trí</button>
                            </div>
                        </div>
                        <div className="col-md-8 ps-md-4">
                            {currentReviews && currentReviews.length > 0 ? (
                                <div className="d-flex flex-column gap-4">
                                    {currentReviews.map((review) => (
                                        <div className="border-bottom pb-4" key={review.review_id || Math.random()}>
                                            <div className="d-flex justify-content-between mb-2">
                                                <div className="d-flex align-items-center gap-3">
                                                    <img src={review.avatar || 'https://placehold.co/100?text=User'} className="rounded-circle object-fit-cover border shadow-sm" width="50" height="50" alt="user" onError={(e) => {e.target.onerror=null; e.target.src='https://placehold.co/100?text=User'}} />
                                                    <div>
                                                        <div className="fw-bold text-dark">{review.full_name || 'Khách ẩn danh'}</div>
                                                        <div className="text-warning small d-flex align-items-center">
                                                            {[...Array(5)].map((_, i) => (
                                                                <i key={i} className={`bi ${i < Math.round(Number(review.rating)/2) ? 'bi-star-fill' : 'bi-star'} me-1`}></i>
                                                            ))}
                                                            <span className="text-muted ms-1 small">({Number(review.rating).toFixed(1)})</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <small className="text-muted bg-light px-2 py-1 rounded border">
                                                    {review.created_at ? new Date(review.created_at).toLocaleDateString('vi-VN') : 'Gần đây'}
                                                </small>
                                            </div>
                                            <div className="bg-light p-3 rounded-3 mt-2 position-relative">
                                                <i className="bi bi-chat-quote-fill position-absolute top-0 start-0 translate-middle text-secondary opacity-25 fs-4 ps-4 pt-2"></i>
                                                <p className="text-dark mb-0 fst-italic ps-2">"{review.comment || 'Khách hàng không để lại bình luận chi tiết.'}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-4">Không tìm thấy đánh giá nào.</div>
                            )}

                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center gap-2 mt-4">
                                    <button className="btn btn-outline-secondary btn-sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}><i className="bi bi-chevron-left"></i></button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button key={i + 1} className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handlePageChange(i + 1)}>{i + 1}</button>
                                    ))}
                                    <button className="btn btn-outline-secondary btn-sm" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}><i className="bi bi-chevron-right"></i></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-0 rounded-4 shadow-sm mb-4 border overflow-hidden group-hover-map" id="map-section">
                    <div className="position-relative">
                          <div className="ratio ratio-21x9" style={{maxHeight: '350px'}}>
                            <iframe title="Hotel Location Big" src={`https://maps.google.com/maps?q=$${encodeURIComponent(hotel.name + " " + hotel.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} style={{border:0, filter: 'grayscale(20%)'}} allowFullScreen loading="lazy"></iframe>
                        </div>
                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-25 d-flex align-items-center justify-content-center transition-bg">
                            <div className="bg-white p-4 rounded-4 shadow-lg text-center animate__animated animate__fadeInUp" style={{maxWidth: '350px'}}>
                                <div className="text-primary mb-2"><i className="bi bi-geo-alt-fill fs-1"></i></div>
                                <h5 className="fw-bold text-dark">Khám phá khu vực quanh đây</h5>
                                <p className="text-muted small mb-3">Nằm tại vị trí đắc địa {hotel.city_name}, thuận tiện di chuyển đến các điểm tham quan nổi tiếng.</p>
                                <button className="btn btn-primary rounded-pill fw-bold px-4 py-2 shadow-sm btn-hover-scale" onClick={() => setShowExperienceModal(true)}><i className="bi bi-map me-2"></i> HIỆN BẢN ĐỒ CHI TIẾT</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CỘT PHẢI: SIDEBAR (GIỮ NGUYÊN) --- */}
            <div className="col-lg-4">
              <div className="sticky-top" style={{ top: '160px', zIndex: 10 }}>
                {/* WIDGET VỊ TRÍ */}
                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4" id="location-widget">
                    <div className="d-flex gap-4 mb-4 align-items-center"><div className="flex-shrink-0 position-relative" style={{width: '110px', height: '110px'}}><div className="w-100 h-100 rounded-4 overflow-hidden border shadow-sm position-relative"><iframe title="tiny-map" src={`https://maps.google.com/maps?q=$${encodeURIComponent(hotel.address)}&t=m&z=14&output=embed&iwloc=near`} style={{width: '100%', height: '100%', border: 0, filter: 'grayscale(20%) contrast(1.1)'}} loading="lazy"></iframe><div className="position-absolute top-50 start-50 translate-middle" style={{marginTop: '-15px'}}><i className="bi bi-geo-alt-fill text-danger" style={{fontSize: '2.5rem', filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.3))'}}></i></div></div></div><div className="flex-grow-1"><h5 className="fw-bold text-dark mb-2">Vị trí thuận tiện</h5><div className="d-flex align-items-center gap-2 mb-2"><span className="badge bg-success bg-opacity-10 text-success fs-6 px-3 py-2 rounded-pill fw-bold">{reviewStats.location} <i className="bi bi-star-fill small ms-1"></i></span><span className="text-muted fw-medium">Tuyệt vời để đi bộ</span></div><div className="text-success fw-bold d-flex align-items-center small"><i className="bi bi-check-circle-fill me-2 fs-5"></i><span>Cách trung tâm TP. 0.5 km</span></div></div></div>
                    <hr className="bg-secondary bg-opacity-10 my-4" />
                    <h6 className="fw-bold small text-uppercase text-muted mb-3 ls-1">Các địa danh & giao thông</h6>
                    <ul className="list-unstyled small fw-medium text-dark d-grid gap-3 mb-4">
                        {hotel.nearby_transport?.map((trans, idx) => (<li key={idx} className="d-flex justify-content-between align-items-center"><span className="d-flex align-items-center"><i className={`bi ${trans.type === 'airport' ? 'bi-airplane-engines-fill' : 'bi-bus-front-fill'} text-danger me-3 fs-5 opacity-75`} style={{width: '24px'}}></i>{trans.name}</span><span className="text-muted fw-normal">{trans.distance} km</span></li>))}
                        {hotel.nearby_landmarks?.map((place, idx) => (<li key={idx} className="d-flex justify-content-between align-items-center mt-2"><span className="d-flex align-items-center text-truncate" style={{maxWidth: '200px'}} title={place.name}><i className="bi bi-geo-alt-fill text-primary me-3 fs-5 opacity-75" style={{width: '24px'}}></i>{place.name}</span><span className="text-muted fw-normal">{Number(place.distance).toFixed(1)} km</span></li>))}
                    </ul>
                    <div className="mt-2"><button className="btn btn-outline-primary w-100 rounded-pill fw-bold py-2 d-flex align-items-center justify-content-center gap-2 hover-shadow transition" onClick={() => setShowExperienceModal(true)}><i className="bi bi-map-fill"></i> Xem bản đồ chi tiết</button></div>
                </div>

                <div className="bg-white p-4 rounded-3 shadow-sm border mb-3 text-center"><h6 className="fw-bold text-muted text-uppercase small">Đánh giá của khách</h6><div className="d-flex justify-content-center align-items-center gap-2 my-2"><div className="bg-primary text-white fs-2 fw-bold rounded p-2 lh-1 shadow">{reviewStats.avgScore}</div></div><div className="fw-bold fs-5">{reviewStats.ratingText}</div><div className="small text-muted">Dựa trên {reviewStats.count} đánh giá xác thực</div></div>
              </div>
            </div>
        </div>
      </div>

      {/* --- MODAL CHÍNH SÁCH --- */}
      {showPolicyModal && (
        <>
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" style={{zIndex: 1050}} onClick={() => setShowPolicyModal(false)}></div>
          <div className="position-fixed top-50 start-50 translate-middle bg-white rounded-4 shadow-lg overflow-hidden animate__animated animate__zoomIn" style={{zIndex: 1060, width: '90%', maxWidth: '600px', maxHeight: '90vh'}}>
              <div className="d-flex justify-content-between align-items-center p-4 border-bottom"><h5 className="fw-bold m-0">Chính sách lưu trú</h5><button className="btn-close" onClick={() => setShowPolicyModal(false)}></button></div>
              <div className="p-4 overflow-auto custom-scrollbar" style={{maxHeight: '70vh'}}>
                  <div className="mb-4"><h6 className="fw-bold text-dark mb-3"><i className="bi bi-clock-history me-2 text-primary"></i>Thời gian nhận/trả phòng</h6><div className="d-flex gap-3"><div className="border rounded-3 p-3 flex-grow-1 text-center bg-light"><div className="small text-muted mb-1">Nhận phòng</div><div className="fw-bold fs-5 text-success">{hotel.check_in_time || '14:00'}</div></div><div className="border rounded-3 p-3 flex-grow-1 text-center bg-light"><div className="small text-muted mb-1">Trả phòng</div><div className="fw-bold fs-5 text-danger">{hotel.check_out_time || '12:00'}</div></div></div></div>
                  <div className="mb-4"><h6 className="fw-bold text-dark mb-3"><i className="bi bi-file-earmark-text me-2 text-primary"></i>Chính sách chung</h6><div className="bg-light p-3 rounded-3"><ul className="list-unstyled mb-0 d-grid gap-2 small">{hotel.hotel_policy ? (hotel.hotel_policy.split(/(?:\d+\.\s)|(?:\n)/).filter(p => p && p.trim() !== "").map((p, i) => (<li key={i} className="d-flex align-items-start gap-2"><i className="bi bi-check-circle-fill text-success mt-1 flex-shrink-0"></i><span style={{lineHeight: '1.5'}}>{p.trim().replace(/^\./, '')}</span></li>))) : (<><li className="d-flex align-items-start gap-2"><i className="bi bi-check-circle-fill text-success mt-1"></i><span>Không cho phép hút thuốc.</span></li><li className="d-flex align-items-start gap-2"><i className="bi bi-check-circle-fill text-success mt-1"></i><span>Không mang thú cưng.</span></li></>)}</ul></div></div>
                  <div><h6 className="fw-bold text-dark mb-3"><i className="bi bi-people me-2 text-primary"></i>Trẻ em và giường phụ</h6><div className="border p-3 rounded-3"><div className="d-flex gap-3 mb-3"><i className="bi bi-emoji-smile fs-4 text-warning"></i><div><div className="fw-bold small">Trẻ em 0-6 tuổi</div><div className="small text-muted">Miễn phí nếu ngủ chung giường với bố mẹ.</div></div></div></div></div>
              </div>
              <div className="p-3 border-top bg-light text-end"><button className="btn btn-primary px-4 rounded-pill fw-bold" onClick={() => setShowPolicyModal(false)}>Đã hiểu</button></div>
          </div>
        </>
      )}

      {/* --- MODAL TRẢI NGHIỆM --- */}
      {showExperienceModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-white animate__animated animate__fadeIn" style={{zIndex: 2000}}>
            <div className="d-flex h-100">
                <div className="flex-grow-1 position-relative h-100">
                      <iframe src={`https://maps.google.com/maps?q=$${encodeURIComponent(hotel.name + " " + hotel.address)}&t=m&z=16&output=embed&iwloc=near`} width="100%" height="100%" style={{border:0}} allowFullScreen loading="lazy"></iframe>
                      <button className="btn btn-light position-absolute top-0 start-0 m-3 shadow-sm rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}} onClick={() => setShowExperienceModal(false)}><i className="bi bi-arrow-left fs-5"></i></button>
                </div>
                <div className="bg-white border-start d-flex flex-column" style={{width: '400px', minWidth: '350px'}}>
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center"><h5 className="fw-bold m-0">Khám phá xung quanh</h5><button className="btn-close" onClick={() => setShowExperienceModal(false)}></button></div>
                    <div className="overflow-auto flex-grow-1 custom-scrollbar p-3">
                        <div className="mb-4"><h6 className="fw-bold small text-muted text-uppercase mb-2">Lựa chọn hiện tại</h6><div className="d-flex gap-3 p-2 border rounded-3 bg-light shadow-sm"><img src={hotel.image_url || 'https://placehold.co/100'} className="rounded-2 object-fit-cover" width="60" height="60" alt="hotel" /><div><h6 className="fw-bold text-dark mb-1 line-clamp-1">{hotel.name}</h6><div className="text-warning small mb-1">{[...Array(hotel.star_rating || 3)].map((_,i) => <i key={i} className="bi bi-star-fill"></i>)}</div><div className="small text-primary fw-bold">{reviewStats.ratingText} ({reviewStats.avgScore})</div></div></div></div>
                        <div className="d-grid gap-3">
                            <div className="border rounded-3 overflow-hidden">
                                <button className="btn btn-light w-100 text-start fw-bold d-flex justify-content-between align-items-center p-3" onClick={() => setActiveExpTab(activeExpTab === 'explore' ? '' : 'explore')}><span><i className="bi bi-compass me-2 text-success"></i>Khám phá & Vui chơi</span><i className={`bi bi-chevron-${activeExpTab === 'explore' ? 'up' : 'down'}`}></i></button>
                                {activeExpTab === 'explore' && (<div className="p-2 bg-white border-top">{nearbyData.activity.map((item, idx) => (<div key={idx} className="d-flex gap-3 p-2 border-bottom last-border-0 hover-bg-light cursor-pointer"><img src={item.image} className="rounded-2 object-fit-cover" width="50" height="50" alt="act" /><div><div className="fw-bold text-dark small">{item.name}</div><div className="text-muted smaller"><i className="bi bi-geo-alt me-1"></i>Cách khoảng 2km</div></div></div>))}</div>)}
                            </div>
                            <div className="border rounded-3 overflow-hidden">
                                <button className="btn btn-light w-100 text-start fw-bold d-flex justify-content-between align-items-center p-3" onClick={() => setActiveExpTab(activeExpTab === 'food' ? '' : 'food')}><span><i className="bi bi-shop me-2 text-warning"></i>Ẩm thực & Mua sắm</span><i className={`bi bi-chevron-${activeExpTab === 'food' ? 'up' : 'down'}`}></i></button>
                                {activeExpTab === 'food' && (<div className="p-2 bg-white border-top">{nearbyData.restaurant.map((item, idx) => (<div key={idx} className="d-flex gap-3 p-2 border-bottom last-border-0 hover-bg-light cursor-pointer"><img src={item.image} className="rounded-2 object-fit-cover" width="50" height="50" alt="res" /><div><div className="fw-bold text-dark small">{item.name}</div><div className="text-muted smaller">{item.price_range}</div></div></div>))}</div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL SO SÁNH KHÁCH SẠN (GIỮ NGUYÊN) --- */}
      {showCompareModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center animate__animated animate__fadeIn" style={{zIndex: 2000}}>
            <div className="bg-white rounded-4 shadow-lg overflow-hidden d-flex flex-column" style={{width: '90%', maxWidth: '900px', maxHeight: '90vh'}}>
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                    <h5 className="fw-bold m-0"><i className="bi bi-bar-chart-line-fill text-primary me-2"></i>So sánh khách sạn</h5>
                    <button className="btn-close" onClick={() => setShowCompareModal(false)}></button>
                </div>
                <div className="flex-grow-1 overflow-auto custom-scrollbar p-0">
                    <div className="row g-0">
                        <div className="col-md-6 border-end p-4">
                            <div className="text-center mb-3"><span className="badge bg-primary mb-2">Đang xem</span><img src={hotel.image_url} className="w-100 rounded-3 object-fit-cover mb-2 shadow-sm" style={{height: '200px'}} alt="current" /><h5 className="fw-bold text-primary">{hotel.name}</h5></div>
                            <div className="vstack gap-3">
                                <div className="d-flex justify-content-between border-bottom pb-2"><span className="text-muted">Giá trung bình</span><span className="fw-bold text-danger">{hotel.rooms?.[0]?.price_per_night ? Number(hotel.rooms[0].price_per_night).toLocaleString() : '---'} ₫</span></div>
                                <div className="d-flex justify-content-between border-bottom pb-2"><span className="text-muted">Xếp hạng sao</span><div className="text-warning">{[...Array(hotel.star_rating || 0)].map((_,i) => <i key={i} className="bi bi-star-fill small"></i>)}</div></div>
                                <div className="d-flex justify-content-between border-bottom pb-2"><span className="text-muted">Đánh giá khách</span><span className="fw-bold">{reviewStats.avgScore} / 10 <span className="text-primary">({reviewStats.ratingText})</span></span></div>
                                <div><span className="text-muted d-block mb-1">Tiện ích nổi bật:</span><div className="d-flex flex-wrap gap-1"><span className="badge bg-light text-dark border">Wifi miễn phí</span><span className="badge bg-light text-dark border">Nhà hàng</span><span className="badge bg-light text-dark border">Dọn phòng</span></div></div>
                                <div><span className="text-muted d-block mb-1">Vị trí:</span><span className="small">{hotel.address}</span></div>
                            </div>
                        </div>
                        <div className="col-md-6 p-4 bg-aliceblue">
                            <div className="position-relative mb-3" ref={dropdownRef}>
                                <label className="small fw-bold text-muted mb-1">Chọn khách sạn để so sánh:</label>
                                <div className="input-group shadow-sm"><span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span><input type="text" className="form-control border-start-0 ps-0" placeholder="Nhập tên khách sạn..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value);setIsDropdownOpen(true);}} onFocus={() => setIsDropdownOpen(true)}/></div>
                                {isDropdownOpen && (<div className="position-absolute w-100 bg-white border rounded-bottom shadow-lg mt-1 overflow-auto custom-scrollbar" style={{zIndex: 1000, maxHeight: '250px'}}>{similarHotels.length > 0 ? (similarHotels.map(h => (<div key={h.hotel_id} className="p-2 border-bottom cursor-pointer hover-bg-light d-flex align-items-center gap-2" onClick={() => handleSelectTarget(h)}><img src={h.image_url || 'https://placehold.co/50'} width="40" height="40" className="rounded-1 object-fit-cover" alt="" /><div><div className="fw-bold small text-dark">{h.name}</div><div className="text-muted smaller">{h.price ? Number(h.price).toLocaleString() + ' ₫' : '---'}</div></div></div>))) : (<div className="p-3 text-center text-muted small">Không tìm thấy kết quả</div>)}</div>)}
                            </div>
                            {targetHotel ? (
                                <div className="animate__animated animate__fadeIn">
                                    <div className="text-center mb-3"><span className="badge bg-secondary mb-2">Đối thủ</span><img src={targetHotel.image_url || 'https://placehold.co/300x200'} className="w-100 rounded-3 object-fit-cover mb-2 shadow-sm" style={{height: '200px'}} alt="target" /><h5 className="fw-bold text-dark">{targetHotel.name}</h5></div>
                                    <div className="vstack gap-3">
                                        <div className="d-flex justify-content-between border-bottom pb-2"><span className="text-muted">Giá trung bình</span><span className={`fw-bold ${targetHotel.price < (hotel.rooms?.[0]?.price_per_night || 0) ? 'text-success' : 'text-danger'}`}>{targetHotel.price ? Number(targetHotel.price).toLocaleString() : '---'} ₫{targetHotel.price < (hotel.rooms?.[0]?.price_per_night || 0) && <span className="badge bg-success ms-2">Rẻ hơn</span>}</span></div>
                                        <div className="d-flex justify-content-between border-bottom pb-2"><span className="text-muted">Xếp hạng sao</span><div className="text-warning">{[...Array(targetHotel.star_rating || 0)].map((_,i) => <i key={i} className="bi bi-star-fill small"></i>)}</div></div>
                                        <div className="d-flex justify-content-between border-bottom pb-2"><span className="text-muted">Đánh giá khách</span><span className="fw-bold">{targetHotel.avg_rating ? Number(targetHotel.avg_rating).toFixed(1) : '---'} / 10 <span className="small text-muted ms-1">({targetHotel.total_reviews || 0} đánh giá)</span></span></div>
                                        <div><span className="text-muted d-block mb-1">Vị trí:</span><span className="small">{targetHotel.address || 'Đang cập nhật'}</span></div>
                                        <div className="mt-auto pt-3"><button className="btn btn-primary w-100 rounded-pill fw-bold" onClick={() => window.open(`/hotel/${targetHotel.hotel_id}`, '_blank')}>Xem chi tiết khách sạn này <i className="bi bi-box-arrow-up-right ms-1"></i></button></div>
                                    </div>
                                </div>
                            ) : (<div className="text-center text-muted py-5"><i className="bi bi-search fs-1 opacity-50"></i><p className="mt-2">Vui lòng chọn khách sạn để so sánh</p></div>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- [MỚI] RENDER POPUP LOGIN Ở CUỐI CÙNG --- */}
      <LoginRequestModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleRedirectLogin}
      />
      
      <style>{`
        .bg-aliceblue { background-color: #f8faff; }
        .hover-zoom:hover { transform: scale(1.02); transition: transform 0.3s ease; }
        .hover-shadow:hover { box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15)!important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .transition { transition: all 0.3s ease; }
        .cursor-pointer { cursor: pointer; }
        .nav-link-hover { color: #555; border-bottom: 3px solid transparent; padding-bottom: 10px; font-size: 0.9rem; }
        .nav-link-hover:hover { color: #0d6efd; border-bottom: 3px solid #0d6efd; }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        .btn-hover-up:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .border-dashed { border-style: dashed !important; }
        .ls-1 { letter-spacing: 1px; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
        .smaller { font-size: 0.75rem; }
        .btn-hover-scale:hover { transform: scale(1.05); transition: 0.3s; }
        .group-hover-map:hover iframe { filter: grayscale(0%); transition: 0.5s; }
        .grayscale { filter: grayscale(100%); }
      `}</style>
    </div>
  );
};

export default HotelDetailPage;