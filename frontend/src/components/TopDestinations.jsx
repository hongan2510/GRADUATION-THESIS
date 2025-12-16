import React from "react";
// Import <Link> từ react-router-dom
import { Link } from "react-router-dom";

// Component này nhận prop 'data' (là danh sách Destinations từ API)
export default function TopDestinations({ data }) { 
  
  // Kiểm tra nếu không có dữ liệu hoặc dữ liệu không phải là mảng
  if (!data || data.length === 0) {
    return (
        <section className="text-center py-3 text-muted">
            <h2 className="section-title fw-bold mb-3">Các điểm đến thu hút nhất Cần Thơ</h2>
            <p>Không có dữ liệu điểm đến nào được tìm thấy.</p>
        </section>
    );
  }
    
  return (
    <section className="mb-4">
      <h2 className="section-title fw-bold mb-3">Các điểm đến thu hút nhất Cần Thơ</h2>
      
      {/* Bọc danh sách trong class scroll-x để cuộn ngang (đã fix) */}
      <div className="scroll-x"> 
        {data.map((d) => (
          
          <div key={d.dest_id}> 
              {/* Áp dụng class "dest-card" (CSS Agoda style) */}
              <Link
                to={`/search?q=${d.name}&type=activity`}
                className="dest-card text-decoration-none text-dark"
                // Loại bỏ style={{ backgroundImage: `url(...)` }}
              >
                {/* 1. SỬ DỤNG THẺ IMG (Class dest-card-img từ App.css) */}
                <img
                  src={d.image_url || d.image} 
                  alt={d.name}
                  className="dest-card-img" 
                  onError={(e) => { e.target.src = 'https://placehold.co/250x140/EEE/333?text=Lỗi+Ảnh'; e.target.onerror = null; }}
                />
                
                {/* 2. THẺ CHỨA NỘI DUNG CHỮ (Class dest-card-body từ App.css) */}
                <div className="dest-card-body">
                  {/* Class name và meta từ App.css */}
                  <div className="name text-truncate">{d.name}</div>
                  {/* Thông tin phụ (số chỗ ở, số hoạt động...) */}
                  <div className="meta">{d.city_name || d.location || 'Chưa rõ hoạt động'}</div>
                </div>
              </Link>
          </div>
        ))}
      </div>
    </section>
  );
}