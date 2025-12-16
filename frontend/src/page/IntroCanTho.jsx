import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const IntroCanTho = () => {
  // Tự động cuộn lên đầu trang khi mở
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Danh sách địa điểm (Dữ liệu tĩnh)
  const locations = [
    {
      id: 1,
      name: "Bến Ninh Kiều",
      img: "/benninhkieu.jpg",
      desc: "Biểu tượng của xứ Tây Đô, Bến Ninh Kiều nằm êm đềm bên dòng sông Hậu hiền hòa. Nơi đây không chỉ là công viên đi dạo tuyệt đẹp mà còn là trung tâm của các hoạt động du thuyền, ẩm thực và chợ đêm sầm uất. Về đêm, bến Ninh Kiều lung linh ánh đèn, mang đến cảm giác thư thái lạ thường.",
      highlight: "Trải nghiệm du thuyền nghe đờn ca tài tử."
    },
    {
      id: 2,
      name: "Cầu Đi Bộ Ninh Kiều",
      img: "/caudibo.jpg",
      desc: "Nối liền bến Ninh Kiều và cồn Cái Khế, cầu đi bộ (hay còn gọi là Cầu Tình Yêu) là điểm check-in không thể bỏ qua. Với thiết kế hình chữ S uốn lượn tượng trưng cho đất nước Việt Nam và hai đài hoa sen khổng lồ, cầu rực rỡ sắc màu mỗi khi màn đêm buông xuống.",
      highlight: "Địa điểm ngắm hoàng hôn và chụp ảnh đêm tuyệt đẹp."
    },
    {
      id: 3,
      name: "Thiền Viện Trúc Lâm Phương Nam",
      img: "/thienvientruclam.jpg",
      desc: "Là thiền viện lớn nhất miền Tây Nam Bộ, mang đậm lối kiến trúc thời Lý - Trần. Không gian nơi đây thanh tịnh, trang nghiêm với những mái ngói cong vút, hồ sen thơm ngát và khuôn viên rộng lớn rợp bóng cây xanh, giúp du khách tìm lại sự an yên trong tâm hồn.",
      highlight: "Kiến trúc gỗ lim tinh xảo và tượng Phật khổng lồ."
    },
    {
      id: 4,
      name: "Cầu Cần Thơ",
      img: "/caucantho.jpg",
      desc: "Cây cầu dây văng có nhịp chính dài nhất khu vực Đông Nam Á (tại thời điểm khánh thành), nối liền đôi bờ sông Hậu. Cầu Cần Thơ không chỉ có ý nghĩa quan trọng về kinh tế mà còn là một kiệt tác kiến trúc, sừng sững và hùng vĩ giữa vùng sông nước mênh mông.",
      highlight: "Ngắm toàn cảnh sông Hậu hùng vĩ từ trên cao."
    },
    {
      id: 5,
      name: "Khu Du Lịch Mỹ Khánh",
      img: "/khudulichmykhanh.jpg",
      desc: "Được ví như một Đồng Bằng Sông Cửu Long thu nhỏ, Mỹ Khánh hội tụ đầy đủ những nét văn hóa đặc trưng: vườn trái cây trĩu quả, các trò chơi dân gian (đua heo, đua chó), tham quan nhà cổ Nam Bộ và thưởng thức ẩm thực miệt vườn dân dã.",
      highlight: "Hóa thân thành điền chủ và thưởng thức trái cây tại vườn."
    }
  ];

  return (
    <div className="bg-white min-vh-100 font-sans">
      
      {/* 1. HERO BANNER */}
      <div className="position-relative vh-100 d-flex align-items-center justify-content-center overflow-hidden">
        {/* Background Image with Zoom Animation */}
        <div 
            className="position-absolute top-0 start-0 w-100 h-100 image-zoom-slow"
            style={{ 
                backgroundImage: `url('/banner-cantho.jpg')`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                filter: 'brightness(0.6)'
            }}
        ></div>
        
        {/* Hero Content */}
        <div className="position-relative text-center text-white px-3 animate-up">
            <h5 className="text-uppercase letter-spacing-4 mb-3 text-warning fw-bold">Chào mừng đến với</h5>
            <h1 className="display-1 fw-bold mb-4 text-shadow">CẦN THƠ</h1>
            <p className="fs-4 fw-light mb-5 d-none d-md-block" style={{maxWidth: '700px', margin: '0 auto'}}>
                "Cần Thơ gạo trắng nước trong – Ai đi đến đó lòng không muốn về"
            </p>
            
            {/* --- NÚT ĐÃ SỬA: Chuyển sang trang tất cả Tour --- */}
            <Link to="/search?type=tour" className="btn btn-outline-light rounded-pill px-5 py-3 fw-bold fs-6 hover-fill-white transition">
                KHÁM PHÁ NGAY <i className="bi bi-arrow-right ms-2"></i>
            </Link>
        </div>
      </div>

      {/* 2. INTRO SECTION */}
      <div className="container py-5 my-5 text-center">
        <div className="row justify-content-center">
            <div className="col-lg-8">
                <i className="bi bi-flower1 fs-1 text-primary mb-3 d-block"></i>
                <h2 className="fw-bold text-dark mb-4">Vẻ Đẹp Tây Đô</h2>
                <p className="text-muted fs-5 lh-lg">
                    Cần Thơ là trung tâm sầm uất nhất của vùng Đồng bằng Sông Cửu Long, nơi giao thoa giữa nét hiện đại của đô thị loại I và vẻ đẹp mộc mạc của văn hóa sông nước. Đến với Cần Thơ là đến với những khu chợ nổi tấp nập, những vườn trái cây trĩu quả quanh năm và sự hào sảng, hiếu khách của người miền Tây.
                </p>
            </div>
        </div>
      </div>

      {/* 3. DESTINATIONS LIST (ZIG-ZAG LAYOUT) */}
      <div className="container pb-5">
        {locations.map((loc, index) => (
            <div key={loc.id} className={`row align-items-center mb-5 gx-5 py-4 ${index % 2 !== 0 ? 'flex-row-reverse' : ''}`}>
                {/* Image Column */}
                <div className="col-lg-6 mb-4 mb-lg-0">
                    <div className="position-relative overflow-hidden rounded-4 shadow-lg group-hover-img">
                        <img 
                            src={loc.img} 
                            alt={loc.name} 
                            className="w-100 object-fit-cover transition-transform"
                            style={{height: '400px'}}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/600x400?text=Check+Image+Name";
                            }}
                        />
                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-white opacity-0 hover-opacity-10 transition"></div>
                    </div>
                </div>

                {/* Text Column */}
                <div className="col-lg-6">
                    <div className={`p-lg-4 ${index % 2 !== 0 ? 'text-lg-end' : 'text-lg-start'} text-center`}>
                        <h6 className="text-primary fw-bold text-uppercase ls-2 mb-2">Điểm đến #{index + 1}</h6>
                        <h2 className="fw-bold mb-3 text-dark display-6">{loc.name}</h2>
                        <p className="text-muted mb-4 lead" style={{fontSize: '1rem'}}>{loc.desc}</p>
                        
                        <div className={`d-inline-flex align-items-center gap-3 p-3 bg-light rounded-3 mb-4 ${index % 2 !== 0 && 'flex-row-reverse'}`}>
                            <div className="bg-white p-2 rounded-circle text-warning shadow-sm">
                                <i className="bi bi-star-fill fs-5"></i>
                            </div>
                            <span className="fw-bold text-dark fst-italic">"{loc.highlight}"</span>
                        </div>

                        <div>
                            {/* --- NÚT ĐÃ SỬA: Chuyển sang trang tất cả Tour --- */}
                            <Link to="/search?type=tour" className="btn btn-dark rounded-pill px-4 py-2 fw-bold shadow-hover transition">
                                Tìm Tour & Vé <i className="bi bi-ticket-perforated ms-2"></i>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* 4. CALL TO ACTION FOOTER */}
      <div className="bg-primary py-5 text-white text-center" style={{backgroundImage: 'linear-gradient(135deg, #0d6efd 0%, #0043a8 100%)'}}>
          <div className="container py-4">
              <h2 className="fw-bold mb-3">Bạn đã sẵn sàng khám phá Cần Thơ?</h2>
              <p className="mb-4 opacity-75 fs-5">Đặt phòng khách sạn và tour ngay hôm nay để nhận ưu đãi hấp dẫn.</p>
              <div className="d-flex justify-content-center gap-3">
                  <Link to="/search?type=hotel" className="btn btn-light text-primary rounded-pill px-5 py-3 fw-bold shadow-lg hover-scale">
                      <i className="bi bi-building me-2"></i> Đặt Khách Sạn
                  </Link>
                  <Link to="/" className="btn btn-outline-light rounded-pill px-5 py-3 fw-bold hover-bg-white hover-text-primary">
                      Về Trang Chủ
                  </Link>
              </div>
          </div>
      </div>

      {/* --- CUSTOM CSS --- */}
      <style>{`
        .font-sans { font-family: 'Inter', sans-serif; }
        .ls-2 { letter-spacing: 2px; }
        .letter-spacing-4 { letter-spacing: 4px; }
        .text-shadow { text-shadow: 2px 2px 8px rgba(0,0,0,0.5); }
        
        /* Animations */
        @keyframes zoomSlow { from { transform: scale(1); } to { transform: scale(1.1); } }
        .image-zoom-slow { animation: zoomSlow 20s infinite alternate linear; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-up { animation: fadeInUp 1s ease-out forwards; }

        /* Transitions */
        .transition { transition: all 0.3s ease; }
        .transition-transform { transition: transform 0.5s ease; }
        
        .group-hover-img:hover img { transform: scale(1.05); }
        .hover-fill-white:hover { background-color: white; color: black; }
        .hover-scale:hover { transform: scale(1.05); }
        .hover-bg-white:hover { background-color: white; color: #0d6efd !important; }
        .hover-text-primary:hover { color: #0d6efd !important; }
        
        .shadow-hover:hover { box-shadow: 0 10px 20px rgba(0,0,0,0.15); transform: translateY(-2px); }
      `}</style>
    </div>
  );
};

export default IntroCanTho;