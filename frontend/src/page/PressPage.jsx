import React from "react";
import { Link } from "react-router-dom";

// Dữ liệu mẫu cho Thông cáo báo chí
const pressReleases = [
  {
    id: 1,
    date: "15 Tháng 11, 2025",
    title: "CanThoTravel ra mắt tính năng đặt tour 'Trải nghiệm Chợ nổi Cái Răng' độc quyền",
    summary:
      "Nền tảng du lịch hàng đầu Cần Thơ giới thiệu gói tour mới kết hợp công nghệ thực tế ảo và trải nghiệm văn hóa sông nước chân thực.",
    category: "Sản phẩm & Dịch vụ",
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    date: "01 Tháng 10, 2025",
    title: "CanThoTravel đạt mốc 1 triệu lượt đặt phòng tại khu vực Đồng bằng Sông Cửu Long",
    summary:
      "Cột mốc quan trọng đánh dấu sự tin tưởng của du khách đối với nền tảng đặt phòng trực tuyến số 1 tại miền Tây.",
    category: "Doanh nghiệp",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    date: "20 Tháng 09, 2025",
    title: "Hợp tác chiến lược giữa CanThoTravel và các hãng hàng không nội địa",
    summary:
      "Ký kết thỏa thuận nhằm mang lại mức giá vé máy bay tốt nhất cho du khách đến Cần Thơ trong mùa du lịch cuối năm.",
    category: "Hợp tác",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  },
];

// Dữ liệu mẫu cho Media Kit (Logo, Hình ảnh)
const mediaAssets = [
  {
    id: 1,
    title: "Logo CanThoTravel (PNG)",
    size: "1.2 MB",
    type: "Logo",
  },
  {
    id: 2,
    title: "Bộ nhận diện thương hiệu (Brand Guidelines)",
    size: "5.4 MB",
    type: "PDF",
  },
  {
    id: 3,
    title: "Hình ảnh Ban lãnh đạo",
    size: "10.5 MB",
    type: "Image Pack",
  },
];

export default function PressPage() {
  return (
    <div className="bg-light min-vh-100">
      {/* 1. Hero Banner */}
      <div className="position-relative bg-dark text-white py-5 mb-5">
        <div className="container text-center py-5 position-relative z-1">
          <h1 className="display-4 fw-bold mb-3">Trung Tâm Báo Chí</h1>
          <p className="lead mb-0 fs-4">
            Tin tức mới nhất, thông cáo báo chí và tài nguyên truyền thông từ CanThoTravel.
          </p>
        </div>
        {/* Background Image Overlay */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100 opacity-50"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80")', // Ảnh văn phòng/làm việc
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0,
          }}
        ></div>
      </div>

      <div className="container">
        
        {/* 2. Thông tin liên hệ báo chí (Nổi bật) */}
        <div className="row justify-content-center mb-5">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
                  <i className="bi bi-envelope-paper fs-3"></i>
                </div>
                <div className="flex-grow-1 ms-4">
                  <h5 className="fw-bold mb-1">Liên hệ Báo chí & Truyền thông</h5>
                  <p className="text-muted mb-0">
                    Dành cho các yêu cầu phỏng vấn, thông tin báo chí: 
                    <a href="mailto:press@canthotravel.vn" className="fw-bold text-primary text-decoration-none ms-1">press@canthotravel.vn</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-5">
          {/* Cột trái: Tin tức & Thông cáo */}
          <div className="col-lg-8">
            <h3 className="fw-bold mb-4 border-bottom pb-2">Thông Cáo Báo Chí Mới Nhất</h3>
            
            <div className="d-flex flex-column gap-4">
              {pressReleases.map((news) => (
                <div key={news.id} className="card border-0 shadow-sm rounded-4 overflow-hidden hover-shadow transition-all">
                  <div className="row g-0">
                    <div className="col-md-4">
                      <img 
                        src={news.image} 
                        className="img-fluid h-100 w-100 object-fit-cover" 
                        alt={news.title} 
                        style={{minHeight: '200px'}}
                      />
                    </div>
                    <div className="col-md-8">
                      <div className="card-body p-4 d-flex flex-column h-100">
                        <div className="mb-2">
                            <span className="badge bg-light text-primary border border-primary me-2">{news.category}</span>
                            <small className="text-muted"><i className="bi bi-calendar3 me-1"></i> {news.date}</small>
                        </div>
                        <h5 className="card-title fw-bold mb-2">
                          <Link to="#" className="text-dark text-decoration-none hover-text-primary">
                            {news.title}
                          </Link>
                        </h5>
                        <p className="card-text text-muted small flex-grow-1 mb-3">
                          {news.summary}
                        </p>
                        <div>
                            <Link to="#" className="text-primary fw-bold text-decoration-none small">
                                Đọc thêm <i className="bi bi-arrow-right ms-1"></i>
                            </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Phân trang đơn giản */}
            <div className="mt-5 text-center">
                <button className="btn btn-outline-primary rounded-pill px-4">Xem thêm tin cũ hơn</button>
            </div>
          </div>

          {/* Cột phải: Media Kit & About */}
          <div className="col-lg-4">
            {/* Media Kit */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Tài Nguyên Truyền Thông</h5>
                <p className="text-muted small mb-4">Tải xuống logo, hình ảnh và tài liệu thương hiệu chính thức của CanThoTravel.</p>
                
                <ul className="list-group list-group-flush">
                  {mediaAssets.map((asset) => (
                    <li key={asset.id} className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center border-bottom-0 border-top">
                      <div>
                        <p className="mb-0 fw-semibold small">{asset.title}</p>
                        <small className="text-muted">{asset.type} • {asset.size}</small>
                      </div>
                      <button className="btn btn-light btn-sm rounded-circle" title="Tải xuống">
                        <i className="bi bi-download text-primary"></i>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="d-grid mt-3">
                    <button className="btn btn-primary rounded-pill">Tải Trọn Bộ Media Kit</button>
                </div>
              </div>
            </div>

            {/* Về CanThoTravel tóm tắt */}
            <div className="card border-0 shadow-sm rounded-4 bg-primary text-white p-4">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Về CanThoTravel</h5>
                <p className="small opacity-75 mb-4">
                  CanThoTravel là nền tảng du lịch trực tuyến hàng đầu tại Cần Thơ, cung cấp dịch vụ đặt phòng, vé máy bay và tour du lịch trọn gói. Chúng tôi kết nối du khách với những trải nghiệm văn hóa sông nước độc đáo nhất.
                </p>
                <Link to="/about" className="btn btn-light text-primary fw-bold w-100 rounded-pill">
                    Tìm Hiểu Thêm
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}