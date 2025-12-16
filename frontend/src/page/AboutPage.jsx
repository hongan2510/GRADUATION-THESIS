import React from "react";
import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="bg-light min-vh-100">
      {/* 1. Hero Banner */}
      <div className="position-relative bg-primary text-white py-5 mb-5">
        <div className="container text-center py-5">
          <h1 className="display-4 fw-bold mb-3">Về CanTho Travel</h1>
          <p className="lead mb-0">
            Kết nối bạn với vẻ đẹp sông nước miền Tây và văn hóa độc đáo của Cần Thơ.
          </p>
        </div>
        {/* Background decoration (optional) */}
        <div 
            className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
            style={{ 
                backgroundImage: 'url("https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?ixlib=rb-4.0.3")', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                zIndex: 0 
            }}
        ></div>
      </div>

      <div className="container">
        {/* 2. Câu chuyện của chúng tôi */}
        <div className="row align-items-center mb-5">
          <div className="col-md-6 mb-4 mb-md-0">
            <img
              src="https://images.unsplash.com/photo-1583417319070-4a69db38a482?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Chợ nổi Cái Răng"
              className="img-fluid rounded-4 shadow-sm"
            />
          </div>
          <div className="col-md-6 ps-md-5">
            <h2 className="fw-bold text-primary mb-3">Câu Chuyện Của Chúng Tôi</h2>
            <p className="text-muted fs-5">
              CanTho Travel được thành lập với niềm đam mê mãnh liệt dành cho vùng đất Tây Đô. Chúng tôi tin rằng Cần Thơ không chỉ là một điểm đến, mà là một hành trình khám phá văn hóa, ẩm thực và con người hào sảng nơi đây.
            </p>
            <p className="text-muted">
              Từ những chuyến đi nhỏ lẻ ban đầu, chúng tôi đã phát triển thành một nền tảng du lịch toàn diện, cung cấp dịch vụ đặt phòng, tour du lịch và vé máy bay, giúp hàng ngàn du khách trải nghiệm trọn vẹn vẻ đẹp của miền sông nước Cửu Long.
            </p>
          </div>
        </div>

        {/* 3. Sứ mệnh & Tầm nhìn (Cards) */}
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm text-center p-4 rounded-4 hover-shadow transition-all">
              <div className="card-body">
                <div className="icon-box bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{width: '64px', height: '64px'}}>
                  <i className="bi bi-gem fs-2"></i>
                </div>
                <h4 className="fw-bold">Sứ Mệnh</h4>
                <p className="text-muted">
                  Mang đến những trải nghiệm du lịch chân thực, chất lượng cao và đáng nhớ nhất tại Cần Thơ cho du khách trong và ngoài nước.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm text-center p-4 rounded-4 hover-shadow transition-all">
              <div className="card-body">
                <div className="icon-box bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{width: '64px', height: '64px'}}>
                  <i className="bi bi-eye fs-2"></i>
                </div>
                <h4 className="fw-bold">Tầm Nhìn</h4>
                <p className="text-muted">
                  Trở thành nền tảng du lịch hàng đầu khu vực Đồng bằng Sông Cửu Long, là cầu nối văn hóa tin cậy giữa địa phương và thế giới.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow-sm text-center p-4 rounded-4 hover-shadow transition-all">
              <div className="card-body">
                <div className="icon-box bg-warning bg-opacity-10 text-warning rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{width: '64px', height: '64px'}}>
                  <i className="bi bi-heart fs-2"></i>
                </div>
                <h4 className="fw-bold">Giá Trị Cốt Lõi</h4>
                <p className="text-muted">
                  Tận tâm phục vụ, minh bạch trong mọi giao dịch, và luôn đặt sự hài lòng của khách hàng làm kim chỉ nam cho mọi hoạt động.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Tại sao chọn chúng tôi */}
        <div className="bg-white rounded-4 p-5 shadow-sm mb-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Tại Sao Chọn CanTho Travel?</h2>
            <p className="text-muted">Chúng tôi cam kết mang lại giá trị tốt nhất cho chuyến đi của bạn</p>
          </div>
          <div className="row g-4">
            <div className="col-md-6 col-lg-3 text-center">
              <h1 className="display-4 fw-bold text-primary mb-2">500+</h1>
              <p className="fw-semibold text-muted">Khách sạn & Homestay</p>
            </div>
            <div className="col-md-6 col-lg-3 text-center">
              <h1 className="display-4 fw-bold text-primary mb-2">10k+</h1>
              <p className="fw-semibold text-muted">Khách hàng hài lòng</p>
            </div>
            <div className="col-md-6 col-lg-3 text-center">
              <h1 className="display-4 fw-bold text-primary mb-2">24/7</h1>
              <p className="fw-semibold text-muted">Hỗ trợ khách hàng</p>
            </div>
            <div className="col-md-6 col-lg-3 text-center">
              <h1 className="display-4 fw-bold text-primary mb-2">100%</h1>
              <p className="fw-semibold text-muted">Uy tín & An toàn</p>
            </div>
          </div>
        </div>

        {/* 5. CTA - Kêu gọi hành động */}
        <div className="bg-primary text-white rounded-4 p-5 text-center mb-5">
          <h2 className="fw-bold mb-3">Sẵn Sàng Khám Phá Cần Thơ?</h2>
          <p className="fs-5 mb-4 opacity-75">
            Đặt ngay chuyến đi tiếp theo của bạn với những ưu đãi tốt nhất từ chúng tôi.
          </p>
          <div className="d-flex gap-3 justify-content-center">
            <Link to="/" className="btn btn-light btn-lg fw-bold px-4">
              Đặt Phòng Ngay
            </Link>
            <Link to="/contact" className="btn btn-outline-light btn-lg fw-bold px-4">
              Liên Hệ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}