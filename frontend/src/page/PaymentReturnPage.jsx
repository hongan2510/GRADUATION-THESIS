import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

// SỬA 1: "Bỏ dấu comment" (uncomment) để import Navbar và Footer
import NavbarMain from '../components/NavbarMain';
import FooterMain from '../components/FooterMain';

// (Hàm helper getVnpayMessage giữ nguyên)
const getVnpayMessage = (code) => {
  switch (code) {
    case '00':
      return 'Giao dịch thành công!';
    case '07':
      return 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên hệ VNPAY).';
    case '09':
      return 'Thẻ/Tài khoản chưa đăng ký Dịch vụ Internet Banking.';
    case '10':
      return 'Xác thực thẻ/tài khoản không thành công (sai OTP).';
    case '11':
      return 'Đã hết hạn chờ thanh toán. Vui lòng thử lại.';
    case '12':
      return 'Thẻ/Tài khoản bị khóa.';
    case '13':
      return 'Quý khách nhập sai mật khẩu quá số lần quy định.';
    case '24':
      return 'Giao dịch bị hủy bởi người dùng.';
    case '51':
      return 'Tài khoản không đủ số dư để thực hiện giao dịch.';
    case '65':
      return 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.';
    case '70':
      return 'Giao dịch bị giới hạn theo loại thẻ/tài khoản.';
    default:
      return 'Giao dịch không thành công. Lỗi không xác định.';
  }
};

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'failed'
  const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...');
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    // (Logic useEffect giữ nguyên)
    const responseCode = searchParams.get('vnp_ResponseCode');
    const txnRef = searchParams.get('vnp_TxnRef');
    setOrderId(txnRef);

    if (responseCode === '00') {
      setStatus('success');
      setMessage(getVnpayMessage(responseCode));
    } else {
      setStatus('failed');
      setMessage(getVnpayMessage(responseCode));
    }
  }, [searchParams]);

  const renderContent = () => {
    // (Logic renderContent giữ nguyên)
    if (status === 'loading') {
      return (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h3 className="mt-3">{message}</h3>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center">
          <i className="bi bi-check-circle-fill display-1 text-success mb-3"></i>
          <h1 className="fw-bold">Thanh toán thành công!</h1>
          <p className="fs-5 text-muted">{message}</p>
          {orderId && (
            <p className="fs-5">
              Mã đơn hàng của bạn: <strong className="text-primary">{orderId}</strong>
            </p>
          )}
          <hr className="my-4" />
          <p>Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi.</p>
          <Link to="/" className="btn btn-primary btn-lg me-2">
            <i className="bi bi-house-fill me-2"></i>Về Trang chủ
          </Link>
          <Link to="/my-bookings" className="btn btn-outline-primary btn-lg">
            <i className="bi bi-box-fill me-2"></i>Xem đơn hàng
          </Link>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="text-center">
          <i className="bi bi-x-circle-fill display-1 text-danger mb-3"></i>
          <h1 className="fw-bold">Thanh toán thất bại</h1>
          <p className="fs-5 text-muted">{message}</p>
          {orderId && (
            <p className="fs-5">
              Mã đơn hàng: <strong className="text-primary">{orderId}</strong>
            </p>
          )}
          <hr className="my-4" />
          <p>Đã có lỗi xảy ra hoặc bạn đã hủy giao dịch. Vui lòng thử lại.</p>
          <Link to="/" className="btn btn-primary btn-lg">
            <i className="bi bi-house-fill me-2"></i>Về Trang chủ
          </Link>
        </div>
      );
    }
  };

  return (
    // SỬA 2: Dùng layout flex để Navbar và Footer dính đúng vị trí
    <div className="d-flex flex-column min-vh-100">
      
      {/* SỬA 3: Bỏ dấu comment */}
      <NavbarMain />

      {/* SỬA 4: Sửa lại layout container
          - Bỏ: style={{ minHeight: '80vh', marginTop: '70px' }}
          - Thêm: className="flex-grow-1 py-5" 
          (flex-grow-1 sẽ tự động lấp đầy khoảng trống giữa Navbar và Footer)
      */}
      <div className="container d-flex align-items-center justify-content-center flex-grow-1 py-5">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0 rounded-4 p-4 p-md-5">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* SỬA 5: Bỏ dấu comment */}
      <FooterMain />
    </div>
  );
}