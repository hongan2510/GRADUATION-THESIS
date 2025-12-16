import React, { useState } from "react";
import { Link } from "react-router-dom";

// 1. DỮ LIỆU TUYỂN DỤNG (Đã thêm chi tiết: Mô tả, Yêu cầu, Quyền lợi)
const jobOpenings = [
  {
    id: 1,
    title: "Nhân viên Kinh doanh Tour (Sales Executive)",
    department: "Kinh doanh",
    location: "Cần Thơ",
    type: "Toàn thời gian",
    salary: "8 - 15 triệu + Hoa hồng",
    deadline: "30/12/2025",
    description: [
      "Tìm kiếm và khai thác khách hàng tiềm năng (khách lẻ, khách đoàn, doanh nghiệp).",
      "Tư vấn, thiết kế và báo giá các chương trình du lịch phù hợp với nhu cầu khách hàng.",
      "Đàm phán, ký kết hợp đồng và theo dõi quá trình thực hiện hợp đồng.",
      "Chăm sóc khách hàng cũ và mở rộng mạng lưới khách hàng mới."
    ],
    requirements: [
      "Tốt nghiệp Cao đẳng/Đại học chuyên ngành Du lịch, QTKD hoặc các ngành liên quan.",
      "Có ít nhất 1 năm kinh nghiệm ở vị trí tương đương.",
      "Kỹ năng giao tiếp, thuyết phục và đàm phán tốt.",
      "Chịu được áp lực doanh số."
    ],
    benefits: [
      "Lương cứng cạnh tranh + Thưởng hoa hồng cao theo doanh số.",
      "Được tham gia các chuyến du lịch khảo sát (Famtrip) hàng năm.",
      "Môi trường làm việc trẻ trung, năng động.",
      "Đóng BHXH, BHYT đầy đủ theo quy định."
    ]
  },
  {
    id: 2,
    title: "Chuyên viên Marketing Online",
    department: "Marketing",
    location: "Cần Thơ",
    type: "Toàn thời gian",
    salary: "10 - 18 triệu",
    deadline: "15/01/2026",
    description: [
      "Lên kế hoạch và triển khai các chiến dịch quảng cáo trên Facebook, Google, Tiktok.",
      "Quản trị và phát triển nội dung cho Website và Fanpage của công ty.",
      "Phối hợp với team thiết kế để tạo ra các ấn phẩm truyền thông thu hút.",
      "Đo lường và báo cáo hiệu quả của các chiến dịch Marketing."
    ],
    requirements: [
      "Có kinh nghiệm chạy Ads (Facebook/Google) từ 1 năm trở lên.",
      "Có khả năng viết content thu hút, bắt trend.",
      "Biết sử dụng các công cụ thiết kế cơ bản (Canva, Photoshop) là một lợi thế.",
      "Tư duy sáng tạo, nhạy bén với thị trường."
    ],
    benefits: [
      "Lương thưởng hấp dẫn dựa trên hiệu quả công việc (KPIs).",
      "Cơ hội thăng tiến lên Trưởng nhóm Marketing.",
      "Được tài trợ tham gia các khóa học nâng cao kỹ năng.",
      "Teambuilding, du lịch định kỳ."
    ]
  },
  {
    id: 3,
    title: "Hướng dẫn viên Du lịch (Cộng tác viên)",
    department: "Vận hành",
    location: "Cần Thơ & Miền Tây",
    type: "Bán thời gian / Theo tour",
    salary: "500k - 800k/ngày + Tip",
    deadline: "Tuyển liên tục",
    description: [
      "Thực hiện công tác hướng dẫn tham quan cho khách du lịch theo chương trình tour.",
      "Thuyết minh về các điểm đến, văn hóa, lịch sử địa phương.",
      "Hỗ trợ và giải quyết các vấn đề phát sinh của khách trong quá trình đi tour.",
      "Đảm bảo an toàn và sự hài lòng của khách hàng."
    ],
    requirements: [
      "Có thẻ Hướng dẫn viên du lịch (Nội địa hoặc Quốc tế) còn hạn.",
      "Am hiểu sâu sắc về văn hóa, lịch sử miền Tây sông nước.",
      "Sức khỏe tốt, nhiệt tình, vui vẻ và có trách nhiệm.",
      "Ưu tiên các bạn có khả năng giao tiếp tiếng Anh tốt."
    ],
    benefits: [
      "Thu nhập hấp dẫn theo ngày công và tiền Tip từ khách.",
      "Cơ hội được đào tạo và trở thành nhân viên chính thức.",
      "Được ưu tiên sắp xếp lịch tour ổn định.",
      "Môi trường làm việc chuyên nghiệp, thân thiện."
    ]
  },
  {
    id: 4,
    title: "Nhân viên Chăm sóc Khách hàng",
    department: "Dịch vụ Khách hàng",
    location: "Cần Thơ",
    type: "Toàn thời gian",
    salary: "7 - 10 triệu",
    deadline: "20/12/2025",
    description: [
      "Tiếp nhận và giải đáp thắc mắc của khách hàng qua điện thoại, email, chat.",
      "Hỗ trợ khách hàng đặt dịch vụ và xử lý các vấn đề phát sinh (đổi/hủy vé, khiếu nại).",
      "Thu thập ý kiến phản hồi để nâng cao chất lượng dịch vụ.",
      "Phối hợp với các bộ phận khác để đảm bảo trải nghiệm tốt nhất cho khách."
    ],
    requirements: [
      "Giọng nói nhẹ nhàng, dễ nghe, không nói ngọng/lắp.",
      "Kỹ năng lắng nghe và xử lý tình huống tốt.",
      "Kiên nhẫn, cẩn thận và có tinh thần phục vụ khách hàng.",
      "Tiếng Anh giao tiếp cơ bản."
    ],
    benefits: [
      "Lương tháng 13, thưởng lễ tết.",
      "Được đào tạo bài bản về kỹ năng CSKH.",
      "Làm việc trong văn phòng hiện đại, tiện nghi.",
      "Chế độ nghỉ phép năm đầy đủ."
    ]
  },
];

export default function CareersPage() {
  // 2. STATE ĐỂ QUẢN LÝ POPUP
  const [selectedJob, setSelectedJob] = useState(null);

  // Hàm mở popup
  const handleOpenModal = (job) => {
    setSelectedJob(job);
    // Ngăn cuộn trang nền khi mở modal
    document.body.style.overflow = 'hidden';
  };

  // Hàm đóng popup
  const handleCloseModal = () => {
    setSelectedJob(null);
    // Cho phép cuộn trang trở lại
    document.body.style.overflow = 'unset';
  };

  return (
    <div className="bg-light min-vh-100">
      {/* 1. Hero Banner */}
      <div className="position-relative bg-dark text-white py-5 mb-5">
        <div className="container text-center py-5 position-relative z-1">
          <h1 className="display-4 fw-bold mb-3">Gia Nhập Đội Ngũ CanTho Travel</h1>
          <p className="lead mb-4 fs-4">
            Cùng nhau kiến tạo những hành trình đáng nhớ và lan tỏa vẻ đẹp miền Tây.
          </p>
          <a href="#openings" className="btn btn-primary btn-lg fw-bold px-5 rounded-pill shadow-sm">
            Xem Các Vị Trí Đang Tuyển
          </a>
        </div>
        <div
          className="position-absolute top-0 start-0 w-100 h-100 opacity-50"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0,
          }}
        ></div>
      </div>

      <div className="container">
        {/* 2. Tại sao chọn chúng tôi (Giữ nguyên) */}
        <div className="text-center mb-5">
          <h2 className="fw-bold mb-3">Tại Sao Nên Làm Việc Tại Đây?</h2>
          <p className="text-muted w-75 mx-auto">
            Chúng tôi không chỉ cung cấp một công việc, chúng tôi mang đến một sự nghiệp và một gia đình thứ hai.
          </p>
        </div>

        {/* (Phần Cards Tại sao chọn chúng tôi - Giữ nguyên code cũ của bạn ở đây nếu muốn, tôi rút gọn để tập trung vào phần chính) */}
        
        {/* 3. Danh sách vị trí tuyển dụng */}
        <div id="openings" className="py-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Các Vị Trí Đang Mở</h2>
            <p className="text-muted">Hãy tìm vị trí phù hợp với bạn và ứng tuyển ngay hôm nay</p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-10">
              {jobOpenings.map((job) => (
                <div key={job.id} className="card border-0 shadow-sm mb-3 hover-shadow transition-all">
                  <div className="card-body p-4 d-md-flex align-items-center justify-content-between">
                    <div className="mb-3 mb-md-0">
                      <h5 className="fw-bold text-primary mb-1">{job.title}</h5>
                      <div className="text-muted small d-flex flex-wrap gap-3 mt-2">
                        <span><i className="bi bi-briefcase me-1"></i> {job.department}</span>
                        <span><i className="bi bi-geo-alt me-1"></i> {job.location}</span>
                        <span><i className="bi bi-clock me-1"></i> {job.type}</span>
                      </div>
                    </div>
                    <div>
                      {/* Nút mở Popup */}
                      <button 
                        className="btn btn-outline-primary rounded-pill px-4 fw-semibold"
                        onClick={() => handleOpenModal(job)}
                      >
                        Xem Chi Tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-muted">Không tìm thấy vị trí phù hợp? Gửi CV của bạn về <a href="mailto:tuyendung@canthotravel.vn" className="fw-bold text-primary text-decoration-none">tuyendung@canthotravel.vn</a></p>
          </div>
        </div>
      </div>

      {/* 4. POPUP MODAL (Hiển thị khi selectedJob != null) */}
      {selectedJob && (
        <>
          {/* Lớp nền tối (Backdrop) */}
          <div 
            className="modal-backdrop fade show" 
            style={{ zIndex: 1050 }}
            onClick={handleCloseModal} // Bấm ra ngoài để đóng
          ></div>

          {/* Hộp Modal */}
          <div className="modal fade show d-block" style={{ zIndex: 1055 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
              <div className="modal-content rounded-4 border-0 shadow-lg">
                
                {/* Header */}
                <div className="modal-header bg-primary text-white rounded-top-4">
                  <h5 className="modal-title fw-bold">
                    {selectedJob.title}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={handleCloseModal}
                  ></button>
                </div>

                {/* Body */}
                <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {/* Thông tin chung */}
                  <div className="row mb-4 g-3">
                    <div className="col-sm-6">
                      <div className="p-3 bg-light rounded-3 h-100">
                        <p className="mb-1 text-muted small text-uppercase fw-bold">Mức lương</p>
                        <p className="mb-0 fw-bold text-success">{selectedJob.salary}</p>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="p-3 bg-light rounded-3 h-100">
                        <p className="mb-1 text-muted small text-uppercase fw-bold">Hạn nộp hồ sơ</p>
                        <p className="mb-0 fw-bold text-danger">{selectedJob.deadline}</p>
                      </div>
                    </div>
                  </div>

                  {/* Chi tiết */}
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Mô tả công việc</h6>
                    <ul className="ps-3">
                      {selectedJob.description.map((item, idx) => (
                        <li key={idx} className="mb-2 text-secondary">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Yêu cầu ứng viên</h6>
                    <ul className="ps-3">
                      {selectedJob.requirements.map((item, idx) => (
                        <li key={idx} className="mb-2 text-secondary">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Quyền lợi được hưởng</h6>
                    <ul className="ps-3">
                      {selectedJob.benefits.map((item, idx) => (
                        <li key={idx} className="mb-2 text-secondary">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <div className="modal-footer bg-light rounded-bottom-4">
                  <button 
                    type="button" 
                    className="btn btn-secondary rounded-pill px-4" 
                    onClick={handleCloseModal}
                  >
                    Đóng
                  </button>
                  <a 
                    href={`mailto:tuyendung@canthotravel.vn?subject=Ứng tuyển ${selectedJob.title}`}
                    className="btn btn-primary rounded-pill px-4 fw-bold"
                  >
                    Ứng Tuyển Ngay
                  </a>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}