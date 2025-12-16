// src/pages/HomeCanTho.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

// --- COMPONENTS ---

// [ĐÃ SỬA] Card Địa Điểm: Bấm vào chuyển sang trang chi tiết /destination/:id
const DestinationCard = ({ dest }) => (
    <div className="col-md-3 col-6 mb-4">
      {/* Sửa Link tại đây: Dùng dest.dest_id để dẫn sang trang chi tiết */}
      <Link to={`/destination/${dest.dest_id}`} className="text-decoration-none text-dark">
        <div className="card border-0 h-100 shadow-sm hover-shadow transition overflow-hidden rounded-3">
          <div className="position-relative" style={{ paddingTop: '75%' }}>
            <img 
                src={dest.image || 'https://placehold.co/300x200'} 
                alt={dest.name} 
                className="position-absolute top-0 start-0 w-100 h-100" 
                style={{ objectFit: 'cover' }} 
                onError={(e) => e.target.src='https://placehold.co/300x200'}
            />
            <div className="position-absolute bottom-0 start-0 w-100 h-50" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}></div>
            <div className="position-absolute bottom-0 start-0 p-3 w-100 text-white">
               <h5 className="fw-bold mb-0 text-truncate">{dest.name}</h5>
               <p className="small mb-0 opacity-75 text-truncate"><i className="bi bi-geo-alt-fill me-1"></i>{dest.location || 'Cần Thơ'}</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
);

const HotelSuggestionCard = ({ hotel, queryParams = '' }) => (
    <Link to={`/hotel/${hotel.hotel_id}${queryParams}`} className="text-decoration-none text-dark" style={{ minWidth: '260px', maxWidth: '260px' }}>
        <div className="card border-0 shadow-sm h-100 rounded-3 overflow-hidden hover-shadow transition bg-white">
            <div className="position-relative">
                <img 
                    src={hotel.image_url || 'https://placehold.co/300x200'} 
                    alt={hotel.name} 
                    className="card-img-top" 
                    style={{ height: '160px', objectFit: 'cover' }} 
                    onError={(e) => e.target.src='https://placehold.co/300x200'}
                />
                <span className="position-absolute top-0 start-0 m-2 badge bg-danger shadow-sm">
                    Giảm {Math.floor(Math.random() * 30) + 10}% hôm nay
                </span>
            </div>
            <div className="card-body p-3">
                <h6 className="fw-bold text-truncate mb-1" title={hotel.name}>{hotel.name}</h6>
                <div className="text-warning small mb-2">
                    {[...Array(hotel.star_rating || 3)].map((_, i) => <i key={i} className="bi bi-star-fill"></i>)}
                </div>
                <div className="mt-2 border-top pt-2">
                      <span className="d-block small text-muted">Giá mỗi đêm từ</span>
                      <span className="text-danger fw-bold fs-5">
                        {hotel.min_price && Number(hotel.min_price) > 0 
                            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(hotel.min_price))
                            : 'Liên hệ'}
                      </span>
                </div>
            </div>
        </div>
    </Link>
);

const GuestSelector = ({ guests, setGuests, onClose }) => {
    const updateGuest = (type, operation) => {
        setGuests(prev => {
            const newValue = operation === 'inc' ? prev[type] + 1 : prev[type] - 1;
            if (type === 'rooms' && newValue < 1) return prev;
            if (type === 'adults' && newValue < 1) return prev;
            if (type === 'children' && newValue < 0) return prev;
            return { ...prev, [type]: newValue };
        });
    };

    return (
        <div className="position-absolute bg-white shadow-lg rounded-4 p-4 border animate__animated animate__fadeIn" style={{ top: '110%', right: 0, width: '360px', zIndex: 1050 }} onClick={(e) => e.stopPropagation()}>
            {['rooms', 'adults', 'children'].map((type) => (
                <div key={type} className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <span className="fw-bold d-block text-capitalize fs-6">{type === 'rooms' ? 'Phòng' : type === 'adults' ? 'Người lớn' : 'Trẻ em'}</span>
                        {type !== 'rooms' && <small className="text-muted">{type === 'adults' ? '18 tuổi trở lên' : '0-17 tuổi'}</small>}
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <button className="btn btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center" style={{width: '35px', height: '35px'}} onClick={() => updateGuest(type, 'dec')} disabled={type === 'rooms' ? guests[type] <= 1 : type === 'adults' ? guests[type] <= 1 : guests[type] <= 0}><i className="bi bi-dash"></i></button>
                        <span className="fw-bold fs-5" style={{width: '25px', textAlign: 'center'}}>{guests[type]}</span>
                        <button className="btn btn-outline-primary rounded-circle p-0 d-flex align-items-center justify-content-center" style={{width: '35px', height: '35px'}} onClick={() => updateGuest(type, 'inc')}><i className="bi bi-plus"></i></button>
                    </div>
                </div>
            ))}
            <button className="btn btn-primary w-100 fw-bold py-2 rounded-3" onClick={onClose}>XONG</button>
        </div>
    );
};

// ---------------- HELPER ----------------
const getVNDateYMD = (date = new Date()) => {
  const now = date;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnMs = utcMs + 7 * 60 * 60 * 1000;
  const vn = new Date(vnMs);
  const yyyy = vn.getFullYear();
  const mm = String(vn.getMonth() + 1).padStart(2, '0');
  const dd = String(vn.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const HomeCanTho = () => {
  const navigate = useNavigate();

  // --- DATA STATES ---
  const [destinations, setDestinations] = useState([]);
  const [suggestedHotels, setSuggestedHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState('hotel');
  const [showGuestPopup, setShowGuestPopup] = useState(false);

  // --- SEARCH FORM STATES ---
  const todayVN = getVNDateYMD();
  const [bookingType, setBookingType] = useState('overnight');
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [checkInDate, setCheckInDate] = useState(() => todayVN);
  const [checkOutDate, setCheckOutDate] = useState(() => {
      const [y, m, d] = todayVN.split('-').map(Number);
      const next = new Date(y, m - 1, d + 1);
      const yyyy = next.getFullYear();
      const mm = String(next.getMonth() + 1).padStart(2, '0');
      const dd = String(next.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
  });

  const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0 });

  // --- REFS ---
  const checkInRef = useRef(null);
  const checkOutRef = useRef(null);
  const activityDateRef = useRef(null);
  const guestSelectorRef = useRef(null);
  const suggestionRef = useRef(null);
  const timeoutRef = useRef(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [destRes, hotelRes] = await Promise.all([
            axios.get('http://localhost:8082/api/destinations/featured'), // Cập nhật gọi API featured
            axios.get('http://localhost:8082/api/hotels')
        ]);
        setDestinations(destRes.data || []);
        setSuggestedHotels(hotelRes.data || []);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // --- AUTO-SUGGEST & HANDLERS ---
  const handleInputChange = (e) => {
      const value = e.target.value;
      setDestination(value);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (value.length > 0) {
          timeoutRef.current = setTimeout(async () => {
              try {
                  const res = await axios.get(`http://localhost:8082/api/search?q=${encodeURIComponent(value)}`);
                  let results = res.data || [];
                  if (activeTab === 'hotel') {
                      results = results.filter(item => item.type === 'hotel' || item.type === 'destination');
                      results.sort((a, b) => (a.type === 'hotel' ? -1 : 1));
                  } else if (activeTab === 'restaurant') {
                      results = results.filter(item => item.type === 'restaurant');
                  } else {
                      results = results.filter(item => item.type === 'tour' || item.type === 'destination');
                  }
                  setSuggestions(results);
                  setShowSuggestions(true);
              } catch (error) { console.error("Lỗi tìm kiếm:", error); }
          }, 300);
      } else { setShowSuggestions(false); }
  };

  const handleSelectSuggestion = (item) => {
    setShowSuggestions(false);
    setDestination(item.name);
    const guestStr = `${guests.adults}-${guests.children}-${guests.rooms}`;
    const queryParams = `?checkIn=${checkInDate}&checkOut=${checkOutDate}&guests=${guestStr}`;
    
    // Điều hướng dựa trên loại suggestion
    if (item.type === 'hotel') { 
        navigate(`/hotel/${item.id}${queryParams}`); 
    } 
    else if (item.type === 'restaurant') { 
        navigate(`/restaurant/${item.id}`); 
    } 
    else if (item.type === 'destination') { 
        navigate(`/destination/${item.id}`); // [ĐÃ SỬA] Chuyển đến trang chi tiết địa điểm
    }
    else if (['activity','tour'].includes(item.type)) { 
        navigate(`/activity/${item.id}${queryParams}`); 
    } 
    else { 
        navigate(`/search?type=${activeTab}&q=${encodeURIComponent(item.name)}`); 
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { handleSearch(); setShowSuggestions(false); e.target.blur(); }
  };

  useEffect(() => {
      if (!checkInDate) return;
      if (checkInDate >= checkOutDate) {
           const [y, m, d] = checkInDate.split('-').map(Number);
           const next = new Date(y, m - 1, d + 1);
           const yyyy = next.getFullYear();
           const mm = String(next.getMonth() + 1).padStart(2, '0');
           const dd = String(next.getDate()).padStart(2, '0');
           setCheckOutDate(`${yyyy}-${mm}-${dd}`);
      }
  }, [checkInDate]);

  useEffect(() => {
      function handleClickOutside(event) {
          if (guestSelectorRef.current && !guestSelectorRef.current.contains(event.target)) setShowGuestPopup(false);
          if (suggestionRef.current && !suggestionRef.current.contains(event.target)) setShowSuggestions(false);
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDatePicker = (ref) => {
      if (ref.current && ref.current.showPicker) { ref.current.showPicker(); } 
      else if (ref.current) { ref.current.focus(); }
  };

  const handleSearch = () => {
    if (activeTab === 'hotel') {
        const guestStr = `${guests.adults}-${guests.children}-${guests.rooms}`;
        const finalCheckOut = bookingType === 'dayuse' ? checkInDate : checkOutDate;
        navigate(`/search?type=hotel&q=${encodeURIComponent(destination)}&checkIn=${checkInDate}&checkOut=${finalCheckOut}&guests=${guestStr}`);
    } else if (activeTab === 'restaurant') {
        navigate(`/search?type=restaurant&q=${encodeURIComponent(destination)}&date=${checkInDate}`);
    } else {
        navigate(`/search?type=activity&q=${encodeURIComponent(destination)}&date=${checkInDate}`);
    }
  };

  // --- RENDER FORMS ---
  const renderHotelForm = () => (
      <div className="animate__animated animate__fadeIn">
            <div className="d-flex gap-2 mb-3">
                <button className={`btn rounded-pill px-3 py-2 fw-bold border ${bookingType === 'overnight' ? 'bg-aliceblue text-primary border-primary' : 'bg-white text-muted'}`} onClick={() => setBookingType('overnight')}>Chỗ Ở Qua Đêm</button>
                <button className={`btn rounded-pill px-3 py-2 fw-bold border ${bookingType === 'dayuse' ? 'bg-aliceblue text-primary border-primary' : 'bg-white text-muted'}`} onClick={() => setBookingType('dayuse')}>Chỗ Ở Trong Ngày</button>
            </div>
            <div className="row g-2">
                <div className="col-12 position-relative" ref={suggestionRef}>
                    <div className="border rounded-3 p-3 d-flex align-items-center hover-border-primary transition cursor-text" style={{height: '65px'}}>
                        <i className="bi bi-search fs-4 text-secondary me-3"></i>
                        <input type="text" className="form-control border-0 shadow-none p-0 fs-5 fw-bold" placeholder="Nhập tên khách sạn hoặc điểm đến..." value={destination} onChange={handleInputChange} onFocus={() => destination.length > 0 && handleInputChange({target: {value: destination}})} onKeyDown={handleKeyDown} autoComplete="off" />
                        {destination && <i className="bi bi-x-circle-fill text-secondary cursor-pointer ms-2" onClick={() => {setDestination(''); setShowSuggestions(false)}}></i>}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="position-absolute start-0 w-100 bg-white shadow-lg rounded-3 mt-1 overflow-hidden animate__animated animate__fadeIn" style={{zIndex: 1100, top: '100%'}}>
                            <div className="list-group list-group-flush">
                                {suggestions.map((item, index) => (
                                    <button key={index} className="list-group-item list-group-item-action d-flex align-items-center px-3 py-2 gap-3" onClick={() => handleSelectSuggestion(item)}>
                                        <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${item.type === 'hotel' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`} style={{width: '40px', height: '40px'}}><i className={`bi ${item.type === 'hotel' ? 'bi-building' : 'bi-geo-alt-fill'}`}></i></div>
                                        <div className="text-start"><div className="fw-bold text-dark">{item.name}</div><small className="text-muted">{item.type === 'hotel' ? 'Khách sạn' : 'Địa điểm'}</small></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="col-md-7">
                        <div className="border rounded-3 p-2 d-flex align-items-center h-100 hover-border-primary transition cursor-pointer" style={{height: '65px'}}>
                            <i className="bi bi-calendar-check fs-4 text-secondary px-3"></i>
                            <div className="d-flex w-100">
                                <div className="flex-grow-1 position-relative cursor-pointer" onClick={() => openDatePicker(checkInRef)}>
                                    <small className="text-muted fw-bold d-block" style={{fontSize: '0.7rem'}}>NHẬN PHÒNG</small>
                                    <input ref={checkInRef} type="date" className="form-control border-0 shadow-none p-0 position-absolute top-0 start-0 opacity-0" style={{pointerEvents: 'none'}} min={todayVN} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
                                    <span className="fw-bold fs-6">{checkInDate.split('-').reverse().join(' thg ')}</span>
                                </div>
                                <div className="border-end mx-3"></div>
                                <div className="flex-grow-1 position-relative cursor-pointer" onClick={() => bookingType === 'overnight' && openDatePicker(checkOutRef)}>
                                    <small className="text-muted fw-bold d-block" style={{fontSize: '0.7rem'}}>TRẢ PHÒNG</small>
                                    {bookingType === 'overnight' ? (
                                        <>
                                        <input ref={checkOutRef} type="date" className="form-control border-0 shadow-none p-0 position-absolute top-0 start-0 opacity-0" style={{pointerEvents: 'none'}} min={checkInDate || todayVN} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
                                        <span className="fw-bold fs-6">{checkOutDate.split('-').reverse().join(' thg ')}</span>
                                        </>
                                    ) : (
                                        <span className="fw-bold fs-6 text-secondary" style={{lineHeight: '24px'}}>Trong ngày</span>
                                    )}
                                </div>
                            </div>
                        </div>
                </div>
                <div className="col-md-5 position-relative" ref={guestSelectorRef}>
                    <div className="border rounded-3 p-3 h-100 d-flex align-items-center hover-border-primary transition cursor-pointer" style={{height: '65px'}} onClick={() => setShowGuestPopup(!showGuestPopup)}>
                            <i className="bi bi-people fs-4 text-secondary me-3"></i>
                            <div className="flex-grow-1">
                                <div className="fw-bold fs-5">{guests.adults} người lớn</div>
                                <small className="text-muted">{guests.children} trẻ em, {guests.rooms} phòng</small>
                            </div>
                            <i className="bi bi-chevron-down text-secondary"></i>
                    </div>
                    {showGuestPopup && (<GuestSelector guests={guests} setGuests={setGuests} onClose={() => setShowGuestPopup(false)} />)}
                </div>
            </div>
            <div className="position-absolute start-50 translate-middle-x" style={{bottom: '-30px', width: '60%', zIndex: 100}}>
                <button onClick={handleSearch} className="btn btn-primary w-100 py-3 fw-bold fs-4 shadow-lg rounded-3 text-uppercase hover-scale" style={{backgroundColor: '#5392f9', border: 'none'}}>TÌM KHÁCH SẠN</button>
            </div>
      </div>
  );

  const renderActivityForm = () => (
      <div className="animate__animated animate__fadeIn pb-3">
            <div className="mb-3 text-muted text-center" style={{fontSize: '0.9rem'}}>Khám phá các tour du lịch, vé tham quan và trải nghiệm độc đáo tại Cần Thơ</div>
            <div className="row g-2">
                <div className="col-md-8 position-relative" ref={suggestionRef}>
                    <div className="border rounded-3 p-2 d-flex align-items-center hover-border-primary transition cursor-text" style={{height: '65px'}}>
                        <i className="bi bi-ticket-perforated fs-4 text-secondary px-2"></i>
                        <div className="w-100">
                            <small className="text-muted fw-bold d-block" style={{fontSize: '0.7rem'}}>ĐIỂM ĐẾN HOẶC HOẠT ĐỘNG</small>
                            <input type="text" className="form-control border-0 shadow-none p-0 fw-bold" placeholder="Bạn muốn làm gì? (VD: Chợ nổi...)" value={destination} onChange={handleInputChange} onFocus={() => destination.length > 0 && handleInputChange({target: {value: destination}})} onKeyDown={handleKeyDown} autoComplete="off" style={{fontSize: '1rem'}} />
                        </div>
                        {destination && <i className="bi bi-x-circle-fill text-secondary cursor-pointer ms-2" onClick={() => {setDestination(''); setShowSuggestions(false)}}></i>}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="position-absolute start-0 w-100 bg-white shadow-lg rounded-3 mt-1 overflow-hidden animate__animated animate__fadeIn" style={{zIndex: 1100, top: '100%'}}>
                            <div className="list-group list-group-flush">
                                {suggestions.map((item, index) => (
                                    <button key={index} className="list-group-item list-group-item-action d-flex align-items-center px-3 py-2 gap-3" onClick={() => handleSelectSuggestion(item)}>
                                        <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${item.type === 'tour' ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'}`} style={{width: '40px', height: '40px'}}><i className={`bi ${item.type === 'tour' ? 'bi-star-fill' : 'bi-geo-alt-fill'}`}></i></div>
                                        <div className="text-start"><div className="fw-bold text-dark">{item.name}</div><small className="text-muted">{item.type === 'tour' ? 'Tour du lịch' : 'Địa điểm'}</small></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="col-md-4">
                     <div className="border rounded-3 p-2 d-flex align-items-center h-100 hover-border-primary transition cursor-pointer" style={{height: '65px'}} onClick={() => openDatePicker(activityDateRef)}>
                         <i className="bi bi-calendar-event fs-4 text-secondary px-2"></i>
                         <div className="flex-grow-1 position-relative">
                             <small className="text-muted fw-bold d-block" style={{fontSize: '0.7rem'}}>NGÀY ĐI</small>
                             <input ref={activityDateRef} type="date" className="form-control border-0 shadow-none p-0 position-absolute top-0 start-0 opacity-0" style={{pointerEvents: 'none'}} min={todayVN} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
                             <span className="fw-bold" style={{fontSize: '1rem'}}>{checkInDate.split('-').reverse().join(' thg ')}</span>
                         </div>
                     </div>
                </div>
            </div>
            <div className="position-absolute start-50 translate-middle-x" style={{bottom: '-30px', width: '60%', zIndex: 100}}>
                <button onClick={handleSearch} className="btn btn-primary w-100 py-3 fw-bold fs-4 shadow-lg rounded-3 text-uppercase hover-scale" style={{backgroundColor: '#5392f9', border: 'none'}}>TÌM HOẠT ĐỘNG</button>
            </div>
      </div>
  );

  const renderRestaurantForm = () => (
      <div className="animate__animated animate__fadeIn pb-3">
            <div className="mb-3 text-muted text-center" style={{fontSize: '0.9rem'}}>Khám phá ẩm thực miền Tây, quán ngon và nhà hàng nổi tiếng</div>
            <div className="row g-2">
                <div className="col-md-8 position-relative" ref={suggestionRef}>
                    <div className="border rounded-3 p-2 d-flex align-items-center hover-border-primary transition cursor-text" style={{height: '65px'}}>
                        <i className="bi bi-shop fs-4 text-secondary px-2"></i>
                        <div className="w-100">
                            <small className="text-muted fw-bold d-block" style={{fontSize: '0.7rem'}}>TÊN QUÁN HOẶC MÓN ĂN</small>
                            <input type="text" className="form-control border-0 shadow-none p-0 fw-bold" placeholder="Bạn muốn ăn gì? (VD: Lẩu mắm...)" value={destination} onChange={handleInputChange} onFocus={() => destination.length > 0 && handleInputChange({target: {value: destination}})} onKeyDown={handleKeyDown} autoComplete="off" style={{fontSize: '1rem'}} />
                        </div>
                        {destination && <i className="bi bi-x-circle-fill text-secondary cursor-pointer ms-2" onClick={() => {setDestination(''); setShowSuggestions(false)}}></i>}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="position-absolute start-0 w-100 bg-white shadow-lg rounded-3 mt-1 overflow-hidden animate__animated animate__fadeIn" style={{zIndex: 1100, top: '100%'}}>
                            <div className="list-group list-group-flush">
                                {suggestions.map((item, index) => (
                                    <button key={index} className="list-group-item list-group-item-action d-flex align-items-center px-3 py-2 gap-3" onClick={() => handleSelectSuggestion(item)}>
                                        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-danger-subtle text-danger" style={{width: '40px', height: '40px'}}><i className="bi bi-cup-hot-fill"></i></div>
                                        <div className="text-start"><div className="fw-bold text-dark">{item.name}</div><small className="text-muted">Nhà hàng / Quán ăn</small></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="col-md-4">
                     <div className="border rounded-3 p-2 d-flex align-items-center h-100 hover-border-primary transition cursor-pointer" style={{height: '65px'}} onClick={() => openDatePicker(activityDateRef)}>
                         <i className="bi bi-calendar-event fs-4 text-secondary px-2"></i>
                         <div className="flex-grow-1 position-relative">
                             <small className="text-muted fw-bold d-block" style={{fontSize: '0.7rem'}}>NGÀY ĐI ĂN</small>
                             <input ref={activityDateRef} type="date" className="form-control border-0 shadow-none p-0 position-absolute top-0 start-0 opacity-0" style={{pointerEvents: 'none'}} min={todayVN} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
                             <span className="fw-bold" style={{fontSize: '1rem'}}>{checkInDate.split('-').reverse().join(' thg ')}</span>
                         </div>
                     </div>
                </div>
            </div>
            <div className="position-absolute start-50 translate-middle-x" style={{bottom: '-30px', width: '60%', zIndex: 100}}>
                <button onClick={handleSearch} className="btn btn-primary w-100 py-3 fw-bold fs-4 shadow-lg rounded-3 text-uppercase hover-scale" style={{backgroundColor: '#5392f9', border: 'none'}}>TÌM NHÀ HÀNG</button>
            </div>
      </div>
  );

  return (
    <div className="bg-light pb-5 position-relative" style={{marginTop: '-20px'}}>
      <div className="position-relative d-flex flex-column align-items-center pt-5" style={{ backgroundImage: 'url("https://cdn6.agoda.net/images/MVC/default/background_image/illustrations/bg-agoda-homepage.png")', backgroundSize: 'cover', backgroundPosition: 'center 60%', minHeight: '550px' }}>
        <div className="container position-relative" style={{maxWidth: '1000px', zIndex: 100, marginTop: '40px'}}>
            <h1 className="text-white fw-bold text-center mb-2" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3)', fontSize: '2.5rem'}}>DU LỊCH CẦN THƠ</h1>
            <p className="text-white text-center mb-4 fs-5" style={{textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>Trải nghiệm vẻ đẹp Tây Đô, sông nước và ẩm thực độc đáo</p>

            <div className="d-flex justify-content-center gap-2 mb-0"> 
                <div onClick={() => {setActiveTab('hotel'); setDestination(''); setSuggestions([])}} className={`fw-bold px-4 py-3 rounded-top d-flex align-items-center gap-2 cursor-pointer transition ${activeTab === 'hotel' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-white hover-bg-white-20'}`} style={{marginBottom: activeTab === 'hotel' ? '-1px' : '0', zIndex: 102, position: 'relative'}}><i className="bi bi-building"></i> Khách sạn & Căn hộ</div>
                <div onClick={() => {setActiveTab('activity'); setDestination(''); setSuggestions([])}} className={`fw-bold px-4 py-3 rounded-top d-flex align-items-center gap-2 cursor-pointer transition ${activeTab === 'activity' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-white hover-bg-white-20'}`} style={{marginBottom: activeTab === 'activity' ? '-1px' : '0', zIndex: 102, position: 'relative'}}><i className="bi bi-ticket-perforated"></i> Hoạt động & Tham quan</div>
                <div onClick={() => {setActiveTab('restaurant'); setDestination(''); setSuggestions([])}} className={`fw-bold px-4 py-3 rounded-top d-flex align-items-center gap-2 cursor-pointer transition ${activeTab === 'restaurant' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-white hover-bg-white-20'}`} style={{marginBottom: activeTab === 'restaurant' ? '-1px' : '0', zIndex: 102, position: 'relative'}}><i className="bi bi-shop"></i> Nhà hàng & Ẩm thực</div>
            </div>

            <div className="bg-white p-4 rounded-4 shadow-lg position-relative pb-5" style={{borderTopLeftRadius: activeTab === 'hotel' ? '0' : '1rem', borderTopRightRadius: '1rem'}}>
                {activeTab === 'hotel' && renderHotelForm()}
                {activeTab === 'activity' && renderActivityForm()}
                {activeTab === 'restaurant' && renderRestaurantForm()}
            </div>
        </div>
      </div>

      <div className="container mt-5 pt-4">
         <div className="d-flex justify-content-between align-items-center mb-3">
             <h3 className="fw-bold text-dark mb-0">Điểm đến nổi bật tại Cần Thơ</h3>
             <Link to="/intro-cantho" className="btn btn-outline-primary rounded-pill fw-bold px-4 hover-shadow transition">
                 Xem thêm <i className="bi bi-arrow-right ms-2"></i>
             </Link>
         </div>

         <div className="row">{destinations.slice(0, 4).map((dest) => (<DestinationCard key={dest.dest_id} dest={dest} />))}</div>
         
         <div className="mt-5">
             <div className="d-flex justify-content-between align-items-center mb-3">
                 <h4 className="fw-bold text-dark mb-0">Gợi ý chỗ nghỉ:</h4>
                 <Link to={`/search?type=hotel&checkIn=${checkInDate}&checkOut=${checkOutDate}&guests=${guests.adults}-${guests.children}-${guests.rooms}`} className="btn btn-outline-primary rounded-pill fw-bold px-4 hover-shadow transition">
                    Xem thêm <i className="bi bi-arrow-right ms-2"></i>
                 </Link>
             </div>
             <div className="d-flex gap-4 overflow-auto pb-4 custom-scrollbar">
                {suggestedHotels.map((hotel) => {
                    const qp = `?checkIn=${checkInDate}&checkOut=${checkOutDate}&guests=${guests.adults}-${guests.children}-${guests.rooms}`;
                    return (<HotelSuggestionCard key={hotel.hotel_id} hotel={hotel} queryParams={qp} />);
                })}
             </div>
         </div>
      </div>

      <style>{`
        .bg-aliceblue { background-color: #eef6ff !important; }
        .hover-bg-white-20:hover { background-color: rgba(255,255,255,0.2); }
        .hover-border-primary:hover { border-color: #5392f9 !important; box-shadow: 0 0 0 1px #5392f9 inset; }
        .hover-scale:hover { transform: scale(1.02); transition: transform 0.2s; }
        .cursor-pointer { cursor: pointer; }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default HomeCanTho;