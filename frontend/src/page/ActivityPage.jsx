import React from "react";
import { Link } from "react-router-dom";

// Chỉ hiển thị các địa điểm liên quan đến Cần Thơ
const popularDestinations = [
  { id: 1, name: "Chợ Nổi Cái Răng", image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80", count: "50+ hoạt động" },
  { id: 2, name: "Bến Ninh Kiều", image: "https://images.unsplash.com/photo-1627399150562-3c35e4a3f19c?w=600&q=80", count: "30+ hoạt động" }, // Thay thế bằng ảnh Ninh Kiều thực tế nếu có
  { id: 3, name: "Cồn Sơn", image: "https://images.unsplash.com/photo-1565699501723-67627907336e?w=600&q=80", count: "20+ hoạt động" }, // Ảnh minh họa miệt vườn
  { id: 4, name: "Vườn Cò Bằng Lăng", image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80", count: "15+ hoạt động" }, // Ảnh minh họa thiên nhiên
];

// Chỉ hiển thị các hoạt động tại Cần Thơ
const topActivities = [
  {
    id: 1,
    title: "Tour Chợ Nổi Cái Răng & Lò Hủ Tiếu",
    location: "Cần Thơ",
    price: "250.000 ₫",
    rating: 4.8,
    reviews: 120,
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80"
  },
  {
    id: 2,
    title: "Du thuyền ăn tối trên sông Cần Thơ",
    location: "Cần Thơ",
    price: "450.000 ₫",
    rating: 4.6,
    reviews: 85,
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80" // Ảnh minh họa sông nước
  },
  {
    id: 3,
    title: "Tour Cồn Sơn: Làm bánh dân gian & Cá lóc bay",
    location: "Cần Thơ",
    price: "350.000 ₫",
    rating: 4.9,
    reviews: 210,
    image: "https://images.unsplash.com/photo-1565699501723-67627907336e?w=600&q=80" // Ảnh minh họa
  },
    {
    id: 4,
    title: "Tham quan Nhà Cổ Bình Thủy",
    location: "Cần Thơ",
    price: "50.000 ₫",
    rating: 4.7,
    reviews: 300,
    image: "https://images.unsplash.com/photo-1590176637783-294488a95166?w=600&q=80" // Ảnh minh họa kiến trúc cổ
  }
];

export default function ActivityPage() {
  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Hero Search Section */}
      <div className="bg-primary py-5">
        <div className="container py-4">
          <h1 className="text-white fw-bold mb-3">Khám phá Cần Thơ: Vui chơi & Trải nghiệm</h1>
          <p className="text-white-50 mb-4 fs-5">Tìm vé tham quan, tour du lịch và trải nghiệm văn hóa độc đáo tại Tây Đô</p>
          
          <div className="bg-white p-2 rounded-3 shadow-sm d-flex">
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-white border-0"><i className="bi bi-search text-muted"></i></span>
              <input 
                type="text" 
                className="form-control border-0" 
                placeholder="Bạn muốn trải nghiệm gì? (VD: Chợ nổi, làm bánh...)" 
              />
            </div>
            <button className="btn btn-warning fw-bold px-5 rounded-3">TÌM KIẾM</button>
          </div>
        </div>
      </div>

      <div className="container mt-5">
        {/* Điểm đến phổ biến tại Cần Thơ */}
        <h3 className="fw-bold mb-4">Điểm đến nổi bật tại Cần Thơ</h3>
        <div className="row g-3 mb-5">
          {popularDestinations.map(dest => (
            <div key={dest.id} className="col-md-3 col-6">
              <div className="card border-0 text-white rounded-4 overflow-hidden shadow-sm hover-translate-y">
                <img src={dest.image} className="card-img" alt={dest.name} style={{height: '250px', objectFit: 'cover', filter: 'brightness(0.8)'}} />
                <div className="card-img-overlay d-flex flex-column justify-content-end p-3">
                  <h4 className="card-title fw-bold mb-0">{dest.name}</h4>
                  <small className="card-text">{dest.count}</small>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hoạt động đề xuất */}
        <h3 className="fw-bold mb-4">Trải nghiệm không thể bỏ lỡ</h3>
        <div className="row g-4">
          {topActivities.map(item => (
            <div key={item.id} className="col-lg-3 col-md-6">
              <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-shadow">
                <img src={item.image} className="card-img-top" alt={item.title} style={{height: '200px', objectFit: 'cover'}} />
                <div className="card-body p-4 d-flex flex-column">
                  <small className="text-muted text-uppercase fw-bold mb-1" style={{fontSize: '0.75rem'}}>{item.location}</small>
                  <h5 className="card-title fw-bold mb-2 text-truncate" title={item.title}>{item.title}</h5>
                  
                  <div className="d-flex align-items-center mb-3">
                    <span className="badge bg-warning text-dark me-2">{item.rating} <i className="bi bi-star-fill"></i></span>
                    <span className="text-muted small">({item.reviews} đánh giá)</span>
                  </div>
                  
                  <div className="mt-auto d-flex justify-content-between align-items-end">
                    <div className="text-muted small">Giá từ</div>
                    <div className="text-danger fw-bold fs-5">{item.price}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}