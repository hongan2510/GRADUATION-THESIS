import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import NavbarMain from '../components/NavbarMain';
import FooterMain from '../components/FooterMain';

const BookingSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const responseCode = searchParams.get('vnp_ResponseCode');

    useEffect(() => {
        if (responseCode === '00') {
            // Ở đây bạn có thể gọi API cập nhật trạng thái đơn hàng thành "Đã thanh toán" (status_id = 3)
            // axios.post('http://localhost:8082/api/bookings/update-status', ...)
        }
    }, [responseCode]);

    return (
        <div className="d-flex flex-column min-vh-100">
            <NavbarMain />
            <div className="flex-grow-1 d-flex align-items-center justify-content-center bg-light">
                <div className="bg-white p-5 rounded-4 shadow-sm text-center" style={{maxWidth: '500px'}}>
                    <div className="mb-4">
                        <i className="bi bi-check-circle-fill text-success" style={{fontSize: '4rem'}}></i>
                    </div>
                    <h2 className="fw-bold text-success mb-3">Thanh toán thành công!</h2>
                    <p className="text-muted mb-4">
                        Cảm ơn bạn đã sử dụng dịch vụ. Mã đặt phòng của bạn đã được xác nhận.
                    </p>
                    <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold" onClick={() => navigate('/')}>
                        Về trang chủ
                    </button>
                </div>
            </div>
            <FooterMain />
        </div>
    );
};

export default BookingSuccessPage;