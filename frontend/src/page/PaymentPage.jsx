import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const PaymentPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Lấy tham số từ URL
    const amount = parseFloat(searchParams.get('amount')) || 0;
    const bookingId = searchParams.get('bookingId');
    const email = searchParams.get('email'); 
    
    // Lấy loại đơn hàng (tour hoặc hotel), mặc định là hotel
    const bookingType = searchParams.get('type') || 'hotel'; 

    const [isProcessing, setIsProcessing] = useState(false);
    const [cardInfo, setCardInfo] = useState({
        cardNumber: '',
        cardName: '',
        expiry: '',
        cvv: ''
    });

    // Hàm xử lý nhập liệu (State binding)
    const handleInputChange = (e) => {
        setCardInfo({ ...cardInfo, [e.target.name]: e.target.value });
    };

    // --- HÀM HỦY GIAO DỊCH ---
    const handleCancelPayment = async () => {
        const result = await Swal.fire({
            title: 'Hủy thanh toán?',
            text: "Giao dịch sẽ bị hủy và đơn hàng sẽ không được giữ. Bạn có chắc chắn không?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Đúng, hủy đơn',
            cancelButtonText: 'Không, tôi muốn thanh toán'
        });

        if (result.isConfirmed) {
            try {
                // Gọi API hủy đơn
                await axios.post('http://localhost:8082/api/bookings/cancel', { booking_id: bookingId });
                Swal.fire('Đã hủy', 'Giao dịch đã bị hủy.', 'success').then(() => {
                    navigate('/'); // Quay về trang chủ
                });
            } catch (error) {
                console.error("Lỗi khi hủy:", error);
                navigate('/'); 
            }
        }
    };

    // --- HÀM XỬ LÝ THANH TOÁN ---
    const handlePayment = async (e) => {
        e.preventDefault();
        
        // Validate cơ bản
        if (!cardInfo.cardNumber || cardInfo.cardNumber.length < 9) {
            return Swal.fire('Lỗi', 'Vui lòng nhập số thẻ hợp lệ (ít nhất 9 số)', 'error');
        }
        if (!cardInfo.cvv || cardInfo.cvv.length < 3) {
            return Swal.fire('Lỗi', 'Vui lòng nhập mã CVV hợp lệ', 'error');
        }

        setIsProcessing(true);

        try {
            // [QUAN TRỌNG] CHỌN API DỰA VÀO TYPE
            const apiUrl = bookingType === 'tour' 
                ? 'http://localhost:8082/api/payment/process-tour'  // API mới cho Tour
                : 'http://localhost:8082/api/payment/process';       // API cũ cho Hotel

            const res = await axios.post(apiUrl, {
                booking_id: bookingId,
                amount: amount,
                email: email, 
                card_number: cardInfo.cardNumber,
                card_name: cardInfo.cardName,
                cvv: cardInfo.cvv
            });

            if (res.data.success) {
                // --- POPUP THÀNH CÔNG ---
                Swal.fire({
                    icon: 'success',
                    title: 'Thanh toán thành công!',
                    html: `Mã giao dịch: <b>${res.data.transaction_id}</b><br>Đơn đặt hàng đã được xác nhận.`,
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: '<i class="bi bi-house-door"></i> Về trang chủ',
                    cancelButtonText: '<i class="bi bi-person-gear"></i> Quản lý đặt chỗ',
                    confirmButtonColor: '#0d6efd',
                    denyButtonColor: '#198754',
                    cancelButtonColor: '#6c757d',
                    allowOutsideClick: false 
                }).then((result) => {
                    if (result.isConfirmed) {
                        navigate('/'); 
                    } else if (result.isDenied) {
                        // Chuyển đến trang chi tiết thành công
                        navigate(`/booking/success?bookingId=${bookingId}`);
                    } else {
                        navigate('/profile'); // Quản lý đặt chỗ
                    }
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Giao dịch thất bại',
                text: error.response?.data?.message || 'Vui lòng kiểm tra lại thông tin thẻ hoặc kết nối mạng.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-light min-vh-100 font-sans">
            
            {/* Header: Đặt zIndex cao để luôn nổi */}
            <div className="sticky-top bg-white shadow-sm" style={{zIndex: 1050}}>
                
            </div>

            {/* Container: Thêm padding-top (pt-5) và margin-top (mt-4) để tránh bị Header đè */}
            <div className="container py-5 mt-4">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
                            
                            {/* Header Card: Đổi màu tùy theo loại Tour hay Hotel */}
                            <div className={`card-header text-white p-4 text-center position-relative ${bookingType === 'tour' ? 'bg-info' : 'bg-primary'}`}>
                                <button 
                                    onClick={handleCancelPayment} 
                                    className="btn btn-sm btn-outline-light position-absolute top-0 start-0 m-3 border-0" 
                                    title="Hủy giao dịch"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>

                                <h4 className="fw-bold mb-0">CỔNG THANH TOÁN {bookingType === 'tour' ? 'TOUR' : ''}</h4>
                                <small className="opacity-75">Thanh toán an toàn & bảo mật</small>
                            </div>

                            <div className="card-body p-4">
                                <div className="text-center mb-4">
                                    <p className="text-muted mb-1">Tổng tiền thanh toán</p>
                                    <h2 className={`fw-bold ${bookingType === 'tour' ? 'text-info' : 'text-primary'}`}>{amount.toLocaleString()} ₫</h2>
                                    <span className="badge bg-light text-dark border">Đơn hàng #{bookingId}</span>
                                </div>

                                <form onSubmit={handlePayment}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Số thẻ (Nhập: 123456789)</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white"><i className="bi bi-credit-card"></i></span>
                                            <input 
                                                type="text" className="form-control" name="cardNumber"
                                                placeholder="0000 0000 0000 0000"
                                                value={cardInfo.cardNumber} onChange={handleInputChange} required
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Tên chủ thẻ</label>
                                        <input 
                                            type="text" className="form-control" name="cardName"
                                            placeholder="NGUYEN VAN A" style={{textTransform: 'uppercase'}}
                                            value={cardInfo.cardName} onChange={handleInputChange} required
                                            autoComplete="off"
                                        />
                                    </div>

                                    <div className="row g-2 mb-4">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted">Ngày hết hạn</label>
                                            <input 
                                                type="text" className="form-control" name="expiry"
                                                placeholder="MM/YY"
                                                value={cardInfo.expiry} onChange={handleInputChange} required
                                                autoComplete="off"
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted">CVV/CVC</label>
                                            <div className="input-group">
                                                <input 
                                                    type="password" className="form-control" name="cvv"
                                                    placeholder="123" maxLength="3"
                                                    value={cardInfo.cvv} onChange={handleInputChange} required
                                                    autoComplete="off"
                                                />
                                                <span className="input-group-text bg-white"><i className="bi bi-question-circle"></i></span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className={`btn w-100 py-3 fw-bold rounded-3 shadow-sm mb-3 ${bookingType === 'tour' ? 'btn-info text-white' : 'btn-success'}`}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <span><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý...</span>
                                        ) : (
                                            `THANH TOÁN ${amount.toLocaleString()} ₫`
                                        )}
                                    </button>

                                    <button 
                                        type="button" 
                                        onClick={handleCancelPayment}
                                        className="btn btn-outline-secondary w-100 py-2 fw-bold rounded-3 border-0"
                                    >
                                        Hủy giao dịch
                                    </button>
                                </form>
                                
                                <div className="text-center mt-3">
                                    <small className="text-muted"><i className="bi bi-lock-fill me-1"></i>Giao dịch được mã hóa an toàn 100%</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default PaymentPage;