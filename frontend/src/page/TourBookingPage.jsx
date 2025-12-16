// src/pages/TourBookingPage.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';


const TourBookingPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const tourId = searchParams.get('tourId');
    const urlGuestCount = parseInt(searchParams.get('guests')) || 1;
    const urlDateParam = searchParams.get('date');
    const priceParam = parseFloat(searchParams.get('price')) || 0;
    
    const [tour, setTour] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const [couponCode, setCouponCode] = useState('');
    const [discountValue, setDiscountValue] = useState(0);
    const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });

    const [guestCount, setGuestCount] = useState(urlGuestCount);
    const [selectedDate, setSelectedDate] = useState(urlDateParam || new Date().toISOString().split('T')[0]);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        note: '',
        paymentMethod: 'pay_later' // Mặc định chọn thanh toán sau
    });

    const [submitting, setSubmitting] = useState(false);

    const formatTime = (timeString) => {
        if (!timeString) return '';
        return timeString.substring(0, 5);
    };

    const formatDateDisplay = (isoDate) => {
        if (!isoDate) return '';
        try {
            const d = new Date(isoDate);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        } catch {
            return isoDate;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setFormData(prev => ({
                        ...prev,
                        fullName: parsedUser.full_name || '',
                        email: parsedUser.email || '',
                        phone: parsedUser.phone || ''
                    }));
                }

                if (tourId) {
                    const res = await axios.get(`http://localhost:8082/api/tours/${tourId}`);
                    setTour(res.data);
                }
            } catch (error) {
                console.error("Lỗi:", error);
                Swal.fire('Lỗi', 'Không tìm thấy thông tin tour!', 'error').then(() => navigate('/'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        window.scrollTo(0, 0);
    }, [tourId, navigate]);

    const updateGuests = (change) => {
        setGuestCount(prev => {
            const newValue = prev + change;
            if (newValue < 1) return 1;
            if (tour && tour.max_people && newValue > tour.max_people) return tour.max_people;
            return newValue;
        });
        setDiscountValue(0);
        setCouponMessage({ text: '', type: '' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const applyCoupon = async () => {
        if (!couponCode) {
            setCouponMessage({ text: 'Vui lòng nhập mã giảm giá.', type: 'error' });
            return;
        }

        const currentOrderValue = (tour ? Number(tour.price) : priceParam) * guestCount;
        const currentUserId = user ? user.user_id : null; 

        try {
            Swal.fire({ title: 'Đang kiểm tra mã...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const res = await axios.post('http://localhost:8082/api/coupons/validate', {
                code: couponCode,
                user_id: currentUserId,
                order_value: currentOrderValue,
                service_type: 'TOUR'
            });

            Swal.close();

            if (res.data && res.data.success) {
                const discount = Number(res.data.discount_amount || 0);
                if (discount >= currentOrderValue) {
                    setDiscountValue(currentOrderValue);
                    setCouponMessage({ text: `Áp dụng thành công! Giảm tối đa ${currentOrderValue.toLocaleString()} ₫.`, type: 'success' });
                } else {
                    setDiscountValue(discount);
                    setCouponMessage({ text: `Áp dụng thành công! Giảm ${discount.toLocaleString()} ₫.`, type: 'success' });
                }
            } else {
                setDiscountValue(0);
                setCouponMessage({ text: res.data?.message || 'Mã không hợp lệ.', type: 'error' });
            }

        } catch (error) {
            Swal.close();
            setDiscountValue(0);
            console.error("LỖI KẾT NỐI SERVER:", error);
            
            if (error.response && error.response.status === 404) {
                setCouponMessage({ text: 'Lỗi: Không tìm thấy API xác thực (404 Not Found).', type: 'error' });
            } else if (error.response && error.response.data && error.response.data.message) {
                setCouponMessage({ text: error.response.data.message, type: 'error' });
            } else {
                setCouponMessage({ text: 'Lỗi kết nối server khi xác thực mã.', type: 'error' });
            }
        }
    };

    const cancelCoupon = () => {
        setCouponCode('');
        setDiscountValue(0);
        setCouponMessage({ text: 'Đã hủy mã.', type: 'error' });
    };

    // ===== FIXED handleSubmit (Logic quan trọng) =====
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.fullName || !formData.phone || !formData.email) {
            Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ họ tên, email và số điện thoại.', 'warning');
            return;
        }

        if (!tourId) {
            Swal.fire('Lỗi', 'Thiếu thông tin tour.', 'error');
            return;
        }

        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            const returnTo = `${location.pathname}${location.search}`;
            navigate(`/login?next=${encodeURIComponent(returnTo)}`);
            return;
        }

        const basePrice = tour ? Number(tour.price) : priceParam;
        const subTotal = basePrice * guestCount;
        const finalTotal = Math.max(0, subTotal - discountValue);

        if (couponCode && discountValue === 0) {
            const confirm = await Swal.fire({
                title: 'Mã giảm giá chưa được áp dụng?',
                text: 'Bạn đã nhập mã nhưng hệ thống chưa xác nhận. Bạn có muốn tiếp tục thanh toán mà không dùng mã không?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Tiếp tục',
                cancelButtonText: 'Quay lại'
            });
            if (!confirm.isConfirmed) return;
        }

        // ⚠️ MAPPING PAYMENT METHOD CHO BACKEND ⚠️
        // Frontend: 'online_banking' -> Backend: 'pay_online'
        // Frontend: 'pay_later' -> Backend: 'pay_later'
        const paymentMethodForBackend = formData.paymentMethod === 'online_banking' ? 'pay_online' : 'pay_later';

        const bookingData = {
            user_id: JSON.parse(storedUser).user_id,
            customer_name: formData.fullName,
            customer_email: formData.email,
            customer_phone: formData.phone,
            note: formData.note,
            tour_id: tourId, 
            check_in_date: selectedDate, 
            guests_count: guestCount, 
            total_price: finalTotal,
            coupon_code: couponCode || null,
            payment_method: paymentMethodForBackend // Gửi đúng giá trị backend cần
        };

        try {
            setSubmitting(true);
            Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            // Gọi API tạo đơn (Backend sẽ tự xử lý việc gửi mail dựa trên payment_method)
            const res = await axios.post('http://localhost:8082/api/bookings/tour', bookingData); 

            Swal.close();

            if (res.data && res.data.success) {
                const newBookingId = res.data.booking_id;

                // TRƯỜNG HỢP 1: THANH TOÁN ONLINE
                if (formData.paymentMethod === 'online_banking') {
                    // Backend KHÔNG gửi mail vé lúc này
                    // Chuyển hướng sang trang thanh toán
                    const couponParam = couponCode ? `&couponCode=${encodeURIComponent(couponCode)}` : '';
                    navigate(`/payment/process?bookingId=${newBookingId}&amount=${finalTotal}&type=tour&email=${encodeURIComponent(formData.email)}${couponParam}`);
                    return;
                } 
                
                // TRƯỜNG HỢP 2: THANH TOÁN SAU
                else {
                    // Backend ĐÃ gửi mail xác nhận vé lúc này
                    const result = await Swal.fire({
                        icon: 'success',
                        title: 'Đặt tour thành công!',
                        html: `Mã đơn hàng: <b>#${newBookingId}</b><br/>Vui lòng kiểm tra email xác nhận vé điện tử.`,
                        showDenyButton: true,
                        denyButtonText: '<i class="bi bi-house"></i> Về trang chủ',
                        confirmButtonColor: '#0d6efd',
                        denyButtonColor: '#6c757d',
                        allowOutsideClick: false
                    });

                    if (result.isConfirmed) {
                        navigate(`/booking/success?bookingId=${newBookingId}`);
                    } else {
                        navigate('/');
                    }
                }
            } else {
                Swal.fire('Lỗi', res.data?.message || 'Có lỗi khi tạo đơn.', 'error');
            }
        } catch (error) {
            console.error(error);
            try { Swal.close(); } catch(e) {}
            Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi đặt tour. Vui lòng thử lại.', 'error');
        } finally {
            setSubmitting(false);
        }
    };
    // ===== END FIXED handleSubmit =====

    if (loading) return <div className="vh-100 d-flex justify-content-center align-items-center"><div className="spinner-border text-primary"></div></div>;
    if (!tour) return null;

    const basePrice = (tour.price || 0);
    const subTotal = basePrice * guestCount;
    const finalTotal = Math.max(0, subTotal - discountValue);
    
    const displayStartTime = tour.start_time ? formatTime(tour.start_time) : "05:00"; 
    const displayEndTime = tour.end_time ? formatTime(tour.end_time) : ""; 
    const startLocation = tour.start_location || tour.address || "Bến Ninh Kiều, Cần Thơ";
    const endLocation = tour.end_location || "Tại điểm xuất phát"; 
    const durationText = tour.duration_hours ? `${tour.duration_hours} giờ` : (tour.duration || '');

    return (
        <div className="bg-light min-vh-100 font-sans">
            <div className="sticky-top bg-white shadow-sm" style={{zIndex: 1050}}>
        
            </div>

            <div className="container py-5">
                <div className="text-center mb-5">
                    <h2 className="fw-bold text-primary">Xác nhận đặt Tour</h2>
                    <p className="text-muted">Hoàn tất thông tin để bắt đầu hành trình</p>
                </div>

                <div className="row g-4">
                    <div className="col-lg-7">
                        <div className="bg-white p-4 rounded-4 shadow-sm border mb-4">
                            <h5 className="fw-bold mb-4 border-start border-4 border-primary ps-3">Thông tin liên hệ</h5>
                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Họ và tên <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control bg-light" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="Ví dụ: Nguyễn Văn A" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Số điện thoại <span className="text-danger">*</span></label>
                                        <input type="tel" className="form-control bg-light" name="phone" value={formData.phone} onChange={handleChange} required placeholder="09xxxxxxxxx" />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-bold text-muted">Email nhận vé <span className="text-danger">*</span></label>
                                        <input type="email" className="form-control bg-light" name="email" value={formData.email} onChange={handleChange} required placeholder="email@example.com" />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-bold text-muted">Ghi chú thêm</label>
                                        <textarea className="form-control bg-light" rows="3" name="note" value={formData.note} onChange={handleChange} placeholder="Ví dụ: Ăn chay, đón tại khách sạn..."></textarea>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white p-4 rounded-4 shadow-sm border">
                            <h5 className="fw-bold mb-4 border-start border-4 border-success ps-3">Phương thức thanh toán</h5>
                            <div className="d-flex flex-column gap-3">
                                <label className={`d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer transition ${formData.paymentMethod === 'pay_later' ? 'border-primary bg-primary bg-opacity-10' : 'hover-bg-light'}`}>
                                    <input type="radio" name="paymentMethod" value="pay_later" className="form-check-input flex-shrink-0" checked={formData.paymentMethod === 'pay_later'} onChange={handleChange} style={{width:'20px', height:'20px'}} />
                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-dark">Thanh toán sau (Tiền mặt/Chuyển khoản)</div>
                                        <div className="small text-muted">Thanh toán khi nhân viên liên hệ xác nhận booking.</div>
                                    </div>
                                    <i className="bi bi-cash-coin fs-3 text-success"></i>
                                </label>

                                <label className={`d-flex align-items-center gap-3 p-3 border rounded-3 cursor-pointer transition ${formData.paymentMethod === 'online_banking' ? 'border-primary bg-primary bg-opacity-10' : 'hover-bg-light'}`}>
                                    <input type="radio" name="paymentMethod" value="online_banking" className="form-check-input flex-shrink-0" checked={formData.paymentMethod === 'online_banking'} onChange={handleChange} style={{width:'20px', height:'20px'}} />
                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-dark">Thanh toán Online (Thẻ ATM/Visa)</div>
                                        <div className="small text-muted">Thanh toán an toàn, xác nhận ngay lập tức.</div>
                                    </div>
                                    <div className="d-flex gap-2 text-primary fs-3">
                                        <i className="bi bi-credit-card-2-front"></i>
                                        <i className="bi bi-bank"></i>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-5">
                        <div className="bg-white rounded-4 shadow-lg border overflow-hidden sticky-top" style={{top: '100px', zIndex: 1}}>
                            <div className="bg-primary p-3 text-white text-center">
                                <h5 className="m-0 fw-bold">Tóm tắt chuyến đi</h5>
                            </div>
                            
                            <div className="p-4">
                                <div className="d-flex gap-3 mb-4">
                                    <img src={tour.image || 'https://placehold.co/100'} alt={tour.name || 'tour'} className="rounded-3 object-fit-cover shadow-sm" width="80" height="80" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100'; }} />
                                    <div>
                                        <h6 className="fw-bold text-dark mb-1 line-clamp-2">{tour.name}</h6>
                                        <div className="text-warning small mb-1">
                                            {[...Array(tour.avg_rating ? Math.round(tour.avg_rating / 2) : 5)].map((_,i) => <i key={i} className="bi bi-star-fill"></i>)}
                                        </div>
                                        <div className="small text-muted">{tour.short_description}</div>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted"><i className="bi bi-calendar-check me-2"></i>Ngày khởi hành</label>
                                    <input type="date" className="form-control fw-bold text-primary bg-light border-0" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setSelectedDate(e.target.value)} />
                                    <div className="small text-muted mt-1">Ngày: <span className="fw-bold">{formatDateDisplay(selectedDate)}</span></div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label small fw-bold text-muted"><i className="bi bi-people me-2"></i>Số lượng khách</label>
                                    <div className="input-group">
                                        <button className="btn btn-outline-secondary" onClick={() => updateGuests(-1)} disabled={guestCount <= 1}>-</button>
                                        <input type="text" className="form-control text-center fw-bold bg-white" value={`${guestCount} người`} readOnly />
                                        <button className="btn btn-outline-secondary" onClick={() => updateGuests(1)} disabled={tour.max_people && guestCount >= tour.max_people}>+</button>
                                    </div>
                                    {tour.max_people && (<div className="small text-muted mt-1">Tối đa: {tour.max_people} khách</div>)}
                                </div>

                                <div className="bg-light p-3 rounded-3 mb-4 border border-dashed">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted small">Bắt đầu:</span>
                                        <span className="fw-bold text-dark">{displayStartTime}</span>
                                    </div>
                                    
                                    {displayEndTime && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted small">Kết thúc:</span>
                                            <span className="fw-bold text-dark">{displayEndTime}</span>
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted small">Thời lượng:</span>
                                        <span className="fw-bold text-dark">{durationText}</span>
                                    </div>
                                    
                                    <hr className="my-2 opacity-25"/>
                                    
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="text-muted small text-nowrap me-2">Điểm đón:</span>
                                        <span className="fw-bold text-dark text-end small">{startLocation}</span>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-start">
                                        <span className="text-muted small text-nowrap me-2">Điểm trả:</span>
                                        <span className="fw-bold text-dark text-end small">{endLocation}</span>
                                    </div>
                                </div>
                                
                                <div className="mb-4 pt-2">
                                    <label className="form-label small fw-bold text-primary"><i className="bi bi-tag me-2"></i>Mã giảm giá (Coupon)</label>
                                    <div className="input-group mb-2">
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="Nhập mã coupon" 
                                            value={couponCode} 
                                            onChange={(e) => {
                                                setCouponCode(e.target.value);
                                                setDiscountValue(0);
                                                setCouponMessage({ text: '', type: '' });
                                            }}
                                            disabled={discountValue > 0}
                                        />
                                        <button 
                                            className="btn btn-primary" 
                                            type="button" 
                                            onClick={discountValue > 0 ? cancelCoupon : applyCoupon}
                                            disabled={(!couponCode && discountValue === 0)}
                                        >
                                            {discountValue > 0 ? 'Hủy mã' : 'Áp dụng'}
                                        </button>
                                    </div>
                                    {couponMessage.text && (
                                        <div className={`small fw-bold ${couponMessage.type === 'success' ? 'text-success' : 'text-danger'}`}>
                                            {couponMessage.text}
                                        </div>
                                    )}
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Đơn giá:</span>
                                    <span className="fw-bold">{Number(basePrice).toLocaleString('vi-VN')} ₫</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Tổng phụ ({guestCount} khách):</span>
                                    <span className="fw-bold">{Number(subTotal).toLocaleString('vi-VN')} ₫</span>
                                </div>
                                {discountValue > 0 && (
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="text-success fw-bold"><i className="bi bi-arrow-down-circle-fill me-1"></i>Giảm giá Coupon:</span>
                                        <span className="fw-bold text-success">- {Number(discountValue).toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between align-items-center mb-4 pt-2 border-top">
                                    <span className="text-muted fw-bold">Tổng thanh toán:</span>
                                    <span className="fw-bold text-danger fs-3">{Number(finalTotal).toLocaleString('vi-VN')} ₫</span>
                                </div>

                                <button className="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-sm text-uppercase" onClick={handleSubmit} disabled={!tourId || submitting}>
                                    {submitting ? 'Đang xử lý...' : 'XÁC NHẬN ĐẶT TOUR'}
                                </button>
                                
                                <div className="text-center mt-3 small text-muted">
                                    <i className="bi bi-shield-check text-success me-1"></i> Thông tin của bạn được bảo mật tuyệt đối
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            
            
            <style>{`
                .hover-bg-light:hover { background-color: #f8f9fa; }
                .cursor-pointer { cursor: pointer; }
                .transition { transition: all 0.2s ease; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .border-dashed { border-style: dashed !important; }
                .object-fit-cover { object-fit: cover; }
            `}</style>
        </div>
    );
};

export default TourBookingPage;