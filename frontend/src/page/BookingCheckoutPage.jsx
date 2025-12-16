import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// --- COMPONENT CON (UI) ---
const Section = ({ title, children }) => (
    <div className="card mb-4 section-card shadow-sm">
        <div className="card-header border-0 bg-white">
            <h5 className="fw-bold m-0 section-title">{title}</h5>
        </div>
        <div className="card-body">{children}</div>
    </div>
);

const OptionCard = ({ selected, onClick, title, price, subtext, icon, img }) => (
    <div className={`option-card ${selected ? 'selected' : ''}`} onClick={onClick}>
        <div className="d-flex align-items-center gap-3">
            <div className={`custom-radio ${selected ? 'checked' : ''}`}></div>
            <div className="flex-grow-1">
                <span className={`fw-bold d-block title-text ${selected ? 'text-primary' : 'text-dark'}`}>{title}</span>
                {subtext && <small className="text-muted sub-text">{subtext}</small>}
            </div>
            {price && <span className="fw-bold price-text">{price}</span>}
            {icon && <i className={`${icon} fs-3 text-primary`}></i>}
            {img && <img src={img} height="30" alt="logo" />}
        </div>
    </div>
);

// ---------------- Helper timezone VN ----------------
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

const getDateString = (isoString) => {
    if (!isoString) return '';
    return isoString.split('T')[0].split(' ')[0];
};
// ----------------------------------------------------

const BookingCheckoutPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const bookingId = searchParams.get('bookingId');

    // State dữ liệu
    const [hotel, setHotel] = useState(null);
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);

    // State form
    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [guestCount, setGuestCount] = useState(1);
    const [roomQuantity, setRoomQuantity] = useState(1);

    const [isUpdating, setIsUpdating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', arrivalTime: 'Chưa biết',
        supportTier: 'standard', paymentMethod: 'hotel', note: ''
    });

    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);

    const today = getVNDateYMD();

    // --- FETCH DATA ---
    const fetchBookingData = async (isRecursiveCall = false) => {
        if (!bookingId) {
            setLoading(false);
            Swal.fire('Lỗi', 'Không tìm thấy mã đơn hàng!', 'error').then(() => navigate('/'));
            return;
        }

        try {
            console.log("Đang gọi API lấy booking:", bookingId);
            const res = await axios.get(`http://localhost:8082/api/bookings/${bookingId}`);
            const data = res.data;

            if (!data) throw new Error("Không có dữ liệu trả về");

            setHotel(data.hotel_info);
            setRoom(data.room_info);

            const fetchedCheckIn = getDateString(data.check_in);
            const fetchedCheckOut = getDateString(data.check_out);

            const dateTodayMs = new Date(getVNDateYMD() + 'T00:00:00Z').getTime();
            const dateFetchedInMs = new Date(fetchedCheckIn + 'T00:00:00Z').getTime();

            let finalCheckIn = fetchedCheckIn;
            let finalCheckOut = fetchedCheckOut;

            if (dateFetchedInMs < dateTodayMs && !isRecursiveCall) {
                console.warn(`⚠️ Ngày cũ (${fetchedCheckIn}). Tự động cập nhật.`);
                finalCheckIn = getVNDateYMD();
                const nextDay = new Date(dateTodayMs);
                nextDay.setDate(nextDay.getDate() + 1);
                finalCheckOut = nextDay.toISOString().split('T')[0];

                try {
                    await axios.put(`http://localhost:8082/api/bookings/update/${bookingId}`, {
                        checkIn: finalCheckIn,
                        checkOut: finalCheckOut,
                        new_quantity: data.total_rooms
                    });
                    await fetchBookingData(true);
                    return;
                } catch (err) {
                    if (err.response && err.response.status === 404) {
                        localStorage.removeItem("booking_id");
                        navigate('/');
                        return;
                    }
                }
            }

            setCheckInDate(finalCheckIn);
            setCheckOutDate(finalCheckOut);
            setRoomQuantity(data.total_rooms || 1);
            
            if (loading) setGuestCount(data.guests_count || 1);

            if (data.expires_at) {
                const expireTime = new Date(data.expires_at).getTime();
                const now = new Date().getTime();
                const secondsLeft = Math.floor((expireTime - now) / 1000);

                if (secondsLeft <= 0) {
                    setTimeLeft(0);
                    Swal.fire({
                        icon: 'warning',
                        title: 'Hết thời gian giữ chỗ',
                        text: 'Vui lòng đặt lại phòng.',
                        confirmButtonText: 'Quay lại'
                    }).then(() => navigate(`/hotel/${data.hotel_info?.id}`));
                } else {
                    setTimeLeft(secondsLeft);
                }
            } else {
                setTimeLeft(1200);
            }

        } catch (error) {
            console.error("Lỗi load booking:", error);
            if (error.response && error.response.status === 404) {
                 Swal.fire({
                    icon: 'error',
                    title: 'Không tìm thấy đơn hàng',
                    text: 'Đơn hàng này không tồn tại hoặc đã hết hạn.',
                    confirmButtonText: 'Về trang chủ'
                }).then(() => {
                    localStorage.removeItem("currentBookingId");
                    navigate("/");
                });
            }
        } finally {
            if (!isRecursiveCall) setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookingData();
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setFormData(prev => ({
                    ...prev,
                    fullName: userData.full_name || '',
                    email: userData.email || '',
                    phone: userData.phone || ''
                }));
            } catch (e) {}
        }
    }, [bookingId]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((p) => {
                if (p <= 1) {
                    clearInterval(timer);
                    Swal.fire({ icon: 'warning', title: 'Hết thời gian!', confirmButtonText: 'OK' }).then(() => navigate(0));
                    return 0;
                }
                return p - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, navigate]);

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const generateTimeOptions = () => {
        const options = [<option key="unknown" value="Chưa biết">Tôi chưa biết</option>];
        for (let i = 12; i < 24; i++) options.push(<option key={i} value={`${i}:00 - ${i + 1}:00`}>{`${i}:00 - ${i + 1}:00`}</option>);
        options.push(<option key="24" value="Sau 00:00">Sau 00:00 (Hôm sau)</option>);
        return options;
    };

    // --- TÍNH TOÁN GIÁ ---
    const bookingInfo = useMemo(() => {
        if (!checkInDate || !checkOutDate || !room) {
            return { nights: 0, finalTotal: 0, totalRoomPrice: 0, tax: 0, supportFee: 0, couponDiscount: 0, maxCapacity: 0 };
        }

        const start = new Date(checkInDate + 'T00:00:00Z');
        const end = new Date(checkOutDate + 'T00:00:00Z');

        let nights = Math.ceil((end - start) / (1000 * 3600 * 24));
        if (nights < 1) nights = 1;

        const pricePerNight = Number(room.price || room.price_per_night || 0);
        const totalRoomPrice = pricePerNight * nights * roomQuantity;

        const supportFee = formData.supportTier === 'fast' ? 18545 : 0;
        const tax = totalRoomPrice * 0.10;
        const subTotal = totalRoomPrice + tax + supportFee;

        let couponDiscount = 0;
        if (appliedCoupon) couponDiscount = Number(appliedCoupon.discount);

        const finalTotal = Math.max(0, subTotal - couponDiscount);

        const maxGuestsPerRoom = Number(room.max_guests || 2);
        const maxCapacity = maxGuestsPerRoom * roomQuantity;

        return { nights, pricePerNight, totalRoomPrice, tax, supportFee, subTotal, couponDiscount, finalTotal, maxCapacity };
    }, [checkInDate, checkOutDate, room, formData.supportTier, appliedCoupon, roomQuantity]);

    // --- [SỬA LỖI] HÀM UPDATE ---
    const handleUpdateBooking = async (type, value) => {
        if (type === 'quantity' && value < 1) return;
        
        if (type === 'checkIn' && value >= checkOutDate) return Swal.fire('Lỗi', 'Ngày nhận phòng phải trước ngày trả phòng', 'error');
        if (type === 'checkOut' && value <= checkInDate) return Swal.fire('Lỗi', 'Ngày trả phòng phải sau ngày nhận phòng', 'error');
        if (type === 'checkIn' && value < today) return Swal.fire('Lỗi', 'Không thể chọn ngày trong quá khứ!', 'error');

        setIsUpdating(true);

        // Chuẩn bị payload: gửi đủ ngày và số lượng mới
        const payload = {
            new_quantity: type === 'quantity' ? value : roomQuantity, 
            checkIn: type === 'checkIn' ? value : checkInDate,
            checkOut: type === 'checkOut' ? value : checkOutDate
        };

        try {
            console.log("Updating booking...", payload);
            const res = await axios.put(`http://localhost:8082/api/bookings/update/${bookingId}`, payload);
            
            if (res.data.success) {
                // Nếu thành công -> Cập nhật State
                if (type === 'quantity') setRoomQuantity(value);
                if (type === 'checkIn') setCheckInDate(value);
                if (type === 'checkOut') setCheckOutDate(value);
                
                await fetchBookingData();
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
                Toast.fire({ icon: 'success', title: 'Đã cập nhật!' });
            }
        } catch (error) {
            console.error(error);
            // XỬ LÝ LỖI TỪ SERVER TRẢ VỀ (VD: HẾT PHÒNG)
            if (error.response) {
                Swal.fire({
                    icon: 'error',
                    title: 'Không thể cập nhật',
                    text: error.response.data.message || 'Lỗi kết nối server',
                    confirmButtonText: 'Đã hiểu'
                });
            } else {
                Swal.fire('Lỗi', 'Không thể kết nối đến server', 'error');
            }
            // Không cập nhật state -> UI tự quay về số cũ
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelTransaction = async () => {
        const result = await Swal.fire({
            title: 'Hủy giữ chỗ?',
            text: "Bạn có chắc muốn hủy đơn này và quay lại trang khách sạn?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Đồng ý hủy',
            cancelButtonText: 'Không'
        });

        if (result.isConfirmed) {
            try {
                await axios.post('http://localhost:8082/api/bookings/cancel', { booking_id: bookingId });
                navigate(`/hotel/${hotel?.id || ''}`);
            } catch (error) {
                navigate('/');
            }
        }
    };

    const handleApplyCoupon = async () => {
        const storedUser = localStorage.getItem('user');
        const userData = storedUser ? JSON.parse(storedUser) : null;
        const userId = userData?.user_id || null;

        if (!couponCode.trim()) return Swal.fire('Thông báo', 'Vui lòng nhập mã giảm giá', 'info');
        setCouponLoading(true);

        const totalOrderValue = bookingInfo.totalRoomPrice;

        try {
            const res = await axios.post('http://localhost:8082/api/coupons/validate', {
                code: couponCode.toUpperCase(),
                user_id: userId,
                order_value: totalOrderValue,
                service_type: 'HOTEL'
            });

            if (res.data.success) {
                const discount = res.data.discount_amount;
                setAppliedCoupon({ code: couponCode.toUpperCase(), discount: discount });
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
                Toast.fire({ icon: 'success', title: `Đã giảm: -${Number(discount).toLocaleString()}đ` });
            } else {
                setAppliedCoupon(null);
                Swal.fire('Không hợp lệ', res.data.message || 'Mã không hợp lệ', 'error');
            }
        } catch (error) {
            setAppliedCoupon(null);
            Swal.fire('Lỗi', error.response?.data?.message || 'Lỗi kiểm tra mã.', 'error');
        } finally { setCouponLoading(false); }
    };

    const handleRemoveCoupon = () => { setAppliedCoupon(null); setCouponCode(''); };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        if (guestCount > bookingInfo.maxCapacity) {
            return Swal.fire({
                icon: 'error', title: 'Quá số lượng người!',
                html: `Bạn đang chọn <b>${roomQuantity} phòng</b> (tối đa ${bookingInfo.maxCapacity} người), nhưng lại điền <b>${guestCount} người</b>.<br><br>👉 Vui lòng tăng số lượng phòng bên phải.`,
            });
        }

        if(!formData.fullName || !formData.phone) {
            return Swal.fire('Thiếu thông tin', 'Vui lòng điền tên và số điện thoại', 'warning');
        }

        setIsSubmitting(true);

        try {
            let finalNote = formData.note || '';
            if (appliedCoupon) finalNote += ` [Coupon: ${appliedCoupon.code} - Giảm: ${appliedCoupon.discount}]`;

            const paymentMethodForBackend = formData.paymentMethod === 'vnpay' ? 'pay_online' : 'pay_later';

            const payload = {
                booking_id: bookingId,
                user_id: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).user_id : null,
                customer_name: formData.fullName,
                customer_email: formData.email,
                customer_phone: formData.phone,
                arrival_time: formData.arrivalTime,
                support_tier: formData.supportTier,
                total_price: bookingInfo.finalTotal,
                note: finalNote,
                hotel_id: hotel?.id,
                details: {
                    room_id: room?.room_id,
                    check_in_date: checkInDate,
                    check_out_date: checkOutDate,
                    guests_count: guestCount,
                    price_per_night: bookingInfo.pricePerNight,
                },
                coupon_code: appliedCoupon ? appliedCoupon.code : null,
                payment_method: paymentMethodForBackend
            };

            console.log("Submitting...", payload);
            
            const res = await axios.post('http://localhost:8082/api/bookings/hotel', payload);

            if (res.data) {
                if (formData.paymentMethod === 'vnpay') {
                    const newBookingId = res.data.booking_id;
                    navigate(`/payment/process?bookingId=${newBookingId}&amount=${bookingInfo.finalTotal}&email=${encodeURIComponent(formData.email || '')}`);
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Đặt phòng thành công!',
                        text: 'Vui lòng kiểm tra email để xem xác nhận.',
                        confirmButtonColor: '#0d6efd'
                    }).then(() => navigate('/profile'));
                }
            } else {
                Swal.fire('Lỗi', 'Phản hồi không xác định từ server.', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', error.response?.data?.message || 'Đặt phòng thất bại. Vui lòng thử lại.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
            <div className="text-center">
                <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}} role="status"></div>
                <p className="mt-3 text-muted fw-bold">Đang tải thông tin đơn hàng...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-light min-vh-100 font-sans">
            <div className="sticky-top" style={{zIndex: 1000}}>
                <div className="bg-white border-bottom shadow-sm py-3 px-4 position-relative d-flex justify-content-center align-items-center">
                    <div className="text-danger fw-bold fs-5 d-flex align-items-center animate__animated animate__fadeInDown">
                        <i className="bi bi-clock-history me-2"></i>
                        <span className="me-2 d-none d-md-inline">Chúng tôi đang giữ giá trong...</span>
                        <span className="badge bg-danger rounded-pill shadow-sm" style={{minWidth: '80px'}}>{formatTime(timeLeft)}</span>
                    </div>
                    <button onClick={handleCancelTransaction} className="btn btn-outline-secondary btn-sm fw-bold border-0 text-muted hover-danger position-absolute end-0 me-4">
                        <i className="bi bi-x-circle me-1"></i> <span className="d-none d-sm-inline">Hủy & Thoát</span>
                    </button>
                </div>
            </div>

            <div className="container py-5">
                <div className="row g-5">
                    <div className="col-lg-8">
                        <Section title="Thông tin khách hàng">
                            <div className="mb-4">
                                <label className="form-label text-muted fw-bold small ls-1">Họ và tên <span className="text-danger">*</span></label>
                                <input type="text" className="form-control form-control-lg fw-bold text-primary" placeholder="Ví dụ: Nguyễn Văn A" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                            </div>
                            <div className="row g-4">
                                <div className="col-md-6"><label className="form-label text-muted fw-bold small ls-1">Email</label><input type="email" className="form-control form-control-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                                <div className="col-md-6"><label className="form-label text-muted fw-bold small ls-1">Số điện thoại <span className="text-danger">*</span></label><div className="input-group input-group-lg"><span className="input-group-text bg-light fw-bold text-muted">+84</span><input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div></div>
                            </div>
                        </Section>

                        <Section title="Thông tin lưu trú">
                            <div className="row mb-4 g-4">
                                <div className="col-md-6">
                                    <label className="form-label text-muted fw-bold small ls-1">Tổng số khách</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            className={`form-control form-control-lg ${guestCount > bookingInfo.maxCapacity ? 'is-invalid border-danger text-danger fw-bold' : 'bg-white'}`}
                                            value={guestCount} min="1" onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                                        />
                                        <span className="input-group-text bg-light">người</span>
                                    </div>

                                    {guestCount > bookingInfo.maxCapacity ? (
                                        <div className="text-danger small mt-2 fw-bold animate__animated animate__headShake">
                                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                            Quá tải! Vui lòng tăng số phòng bên phải.
                                        </div>
                                    ) : (
                                        <div className="text-success small mt-2 fw-bold animate__animated animate__fadeIn">
                                            <i className="bi bi-check-circle-fill me-1"></i>
                                            Hợp lệ (Tối đa: {bookingInfo.maxCapacity} người)
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted fw-bold small ls-1">Giờ đến dự kiến</label>
                                    <select className="form-select form-select-lg" value={formData.arrivalTime} onChange={e => setFormData({...formData, arrivalTime: e.target.value})}>{generateTimeOptions()}</select>
                                </div>
                            </div>
                            <label className="form-label text-muted fw-bold small ls-1">Yêu cầu đặc biệt</label>
                            <textarea className="form-control form-control-lg" rows="3" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
                        </Section>

                        <Section title="Thanh toán an toàn">
                            <OptionCard title="Thanh toán tại khách sạn" subtext="Thanh toán khi nhận phòng." selected={formData.paymentMethod === 'hotel'} onClick={() => setFormData({...formData, paymentMethod: 'hotel'})} icon="bi-cash-coin" />
                            <div className="mb-3"></div>
                            <OptionCard title="Thanh toán qua thẻ, Visa" subtext="An toàn qua VNPAY." selected={formData.paymentMethod === 'vnpay'} onClick={() => setFormData({...formData, paymentMethod: 'vnpay'})} img="https://vinadesign.vn/uploads/images/2023/05/vnpay-logo-vinadesign-25-12-57-55.jpg" />
                        </Section>

                        <button
                          onClick={handleSubmit}
                          className="btn btn-primary w-100 py-3 rounded-4 fw-bold fs-4 shadow-lg hover-up mt-4"
                          disabled={isSubmitting || guestCount > bookingInfo.maxCapacity}
                        >
                          {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý...</> : <><i className="bi bi-lock-fill me-2"></i> XÁC NHẬN ĐẶT PHÒNG</>}
                        </button>
                    </div>

                    <div className="col-lg-4">
                        <div className="sticky-top" style={{top: '100px', zIndex: 900}}>
                            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                                <div className="position-relative">
                                    <img src={hotel?.image_url} className="w-100 object-fit-cover" style={{height: '200px'}} alt="hotel" onError={(e) => e.target.src='https://placehold.co/400x250'} />
                                    <div className="position-absolute bottom-0 w-100 p-3 bg-gradient-dark text-white">
                                        <h5 className="fw-bold mb-0 text-shadow">{hotel?.name || 'Tên khách sạn'}</h5>
                                    </div>
                                </div>
                                <div className="card-body bg-light p-3">
                                    <div className="row g-2 text-center mb-3">
                                        <div className="col-6">
                                            <div className="bg-white p-2 rounded border hover-border-primary cursor-pointer position-relative">
                                                <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>NHẬN PHÒNG</small>
                                                <input
                                                    type="date"
                                                    className="form-control border-0 p-0 text-center fw-bold custom-date-input"
                                                    style={{fontSize: '0.85rem'}}
                                                    value={checkInDate}
                                                    min={today}
                                                    onChange={(e) => handleUpdateBooking('checkIn', e.target.value)}
                                                    disabled={isUpdating}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-white p-2 rounded border hover-border-primary cursor-pointer position-relative">
                                                <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>TRẢ PHÒNG</small>
                                                <input
                                                    type="date"
                                                    className="form-control border-0 p-0 text-center fw-bold custom-date-input"
                                                    style={{fontSize: '0.85rem'}}
                                                    value={checkOutDate}
                                                    min={checkInDate || today}
                                                    onChange={(e) => handleUpdateBooking('checkOut', e.target.value)}
                                                    disabled={isUpdating}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-3 align-items-center bg-white p-2 rounded border">
                                            <img src={room?.image_url} alt="room" className="rounded-2" width="60" height="60" style={{objectFit: 'cover'}} onError={(e) => e.target.src='https://placehold.co/70'}/>
                                            <div>
                                                <div className="fw-bold text-dark mb-1 small text-truncate" style={{maxWidth: '180px'}}>{room?.room_type_name || 'Loại phòng'}</div>
                                                <div className="text-muted small" style={{fontSize: '0.75rem'}}><i className="bi bi-people me-1"></i> Tối đa {room?.max_guests || 2} người/phòng</div>
                                            </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm rounded-4 p-2">
                                <div className="card-body p-4">
                                    <h5 className="fw-bold mb-4 border-bottom pb-3">Chi tiết giá</h5>

                                    <div className="d-flex justify-content-between align-items-center mb-3 bg-light p-2 rounded border">
                                        <span className="text-dark fw-bold small ms-2">Số lượng phòng</span>
                                        <div className="input-group input-group-sm w-auto">
                                            <button className="btn btn-white border" disabled={isUpdating} onClick={() => handleUpdateBooking('quantity', roomQuantity - 1)}>-</button>
                                            <span className="input-group-text bg-white fw-bold px-3">{isUpdating ? <div className="spinner-border spinner-border-sm"></div> : roomQuantity}</span>
                                            <button className="btn btn-white border" disabled={isUpdating} onClick={() => handleUpdateBooking('quantity', roomQuantity + 1)}>+</button>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between mb-2 fs-6">
                                        <span className="text-muted">Giá {bookingInfo.nights} đêm x {roomQuantity} phòng</span>
                                        <span className="fw-bold">{bookingInfo.totalRoomPrice.toLocaleString()} ₫</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2 fs-6"><span className="text-muted">Thuế & phí (10%)</span><span className="fw-bold">{bookingInfo.tax.toLocaleString()} ₫</span></div>
                                    {bookingInfo.supportFee > 0 && <div className="d-flex justify-content-between mb-2 text-primary fw-bold fs-6"><span>Phí hỗ trợ</span><span>{bookingInfo.supportFee.toLocaleString()} ₫</span></div>}

                                    <div className="mt-3 mb-3">
                                            {!appliedCoupon ? (
                                                <div className="input-group">
                                                    <input type="text" className="form-control form-control-sm" placeholder="Mã giảm giá" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                                                    <button className="btn btn-dark btn-sm" onClick={handleApplyCoupon} disabled={couponLoading}>{couponLoading ? '...' : 'Áp dụng'}</button>
                                                </div>
                                            ) : (
                                                <div className="alert alert-success d-flex justify-content-between align-items-center p-2 mb-0"><small><i className="bi bi-tag-fill me-1"></i> Mã <strong>{appliedCoupon.code}</strong></small><button className="btn btn-close btn-sm" onClick={handleRemoveCoupon}></button></div>
                                            )}
                                    </div>
                                    {appliedCoupon && <div className="d-flex justify-content-between mb-3 text-success fw-bold fs-6"><span>Mã giảm giá</span><span>- {bookingInfo.couponDiscount.toLocaleString()} ₫</span></div>}

                                    <hr className="my-3"/>
                                    <div className="d-flex justify-content-between align-items-end">
                                        <span className="fw-bold fs-4 text-dark">Tổng cộng</span>
                                        <span className="fw-bold fs-3 text-danger">{bookingInfo.finalTotal.toLocaleString()} ₫</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                body { background-color: #f3f5f9 !important; }
                .section-card { border-radius: 16px !important; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
                .section-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.08) !important; }
                .card-header { padding: 20px 30px !important; border-bottom: 1px solid #f0f0f0 !important; }
                .section-title { font-size: 1.25rem; color: #2d3436; border-left: 5px solid #0d6efd; padding-left: 15px; }
                .card-body { padding: 30px !important; }
                .form-control-lg, .form-select-lg { padding: 14px 20px; font-size: 1.1rem; border-radius: 12px; border: 1px solid #e0e6ed; background-color: #fcfcfc; }
                .form-control:focus, .form-select:focus { border-color: #0d6efd; box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1); background-color: #fff; }
                .input-group-text { border-radius: 12px 0 0 12px !important; border: 1px solid #e0e6ed; }
                .ls-1 { letter-spacing: 0.5px; }
                .option-card { border: 2px solid #f0f0f0; border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.2s ease-in-out; background: #fff; }
                .option-card:hover { border-color: #0d6efd; background-color: #f8fbff; }
                .option-card.selected { border-color: #0d6efd; background-color: #f0f7ff; box-shadow: 0 4px 15px rgba(13, 110, 253, 0.1); }
                .title-text { font-size: 1.15rem; }
                .sub-text { font-size: 0.95rem; }
                .price-text { font-size: 1.1rem; color: #2d3436; }
                .custom-radio { width: 24px; height: 24px; border: 2px solid #ccc; border-radius: 50%; position: relative; transition: all 0.2s; }
                .custom-radio.checked { border-color: #0d6efd; background-color: #0d6efd; }
                .custom-radio.checked::after { content: ''; position: absolute; width: 10px; height: 10px; background: white; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); }
                .bg-gradient-dark { background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%); }
                .text-shadow { text-shadow: 0 2px 5px rgba(0,0,0,0.5); }
                .custom-date-input { outline: none; cursor: pointer; color: #0d6efd; background: transparent; text-align: center; width: 100%; border-radius: 8px; }
                .custom-date-input:hover { background-color: #f0f7ff; }
                .custom-date-input::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(0.4) sepia(1) saturate(3) hue-rotate(190deg); transform: scale(1.3); margin-left: 8px; }
                .hover-border-primary { border: 1px solid #e0e0e0; transition: all 0.2s; }
                .hover-border-primary:hover { border-color: #0d6efd !important; box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1); }
                .hover-up:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(13, 110, 253, 0.4) !important; }
                .hover-danger:hover { background-color: #dc3545; color: white !important; border-color: #dc3545 !important; }
            `}</style>
        </div>
    );
};

export default BookingCheckoutPage;