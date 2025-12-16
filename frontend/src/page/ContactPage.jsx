import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useSearchParams, Link } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = 'http://localhost:8082/api';

const ContactPage = () => {
  const { currentUser } = useAuth();
  
  // 1. QUẢN LÝ TAB BẰNG URL (Để link từ Footer hoạt động)
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'contact'; // Mặc định là contact

  // Hàm chuyển tab
  const changeTab = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // Tự động cuộn lên đầu trang khi đổi tab
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // --- STATES CHO FORM ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    topic: 'general',
    booking_id: '',
    message: ''
  });

  const [userBookings, setUserBookings] = useState([]); // Danh sách tất cả đơn hàng
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 STATE LỌC: Chọn loại dịch vụ trước (Hotel/Tour/Restaurant)
  const [selectedServiceFilter, setSelectedServiceFilter] = useState(''); 

  // Danh sách chủ đề
  const topics = [
    { value: 'general', label: '💌 Góp ý chung / Câu hỏi khác' },
    { value: 'booking_issue', label: '⚠️ Báo cáo sự cố đơn hàng', requireBooking: true },
    { value: 'refund', label: '💸 Yêu cầu hoàn tiền / Hủy dịch vụ', requireBooking: true },
    { value: 'partnership', label: '🤝 Liên hệ hợp tác / Đối tác' },
    { value: 'account', label: '🔒 Vấn đề tài khoản / Đăng nhập' }
  ];

  // 2. FETCH DỮ LIỆU USER & ĐƠN HÀNG
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.full_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      }));
      fetchUserBookings(currentUser.user_id || currentUser.id);
    }
  }, [currentUser]);

  const fetchUserBookings = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users/${userId}/bookings-simple`);
      setUserBookings(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
    }
  };

  // 3. CÁC HÀM XỬ LÝ FORM
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Khi chọn loại dịch vụ -> Reset mã đơn đã chọn cũ
  const handleServiceTypeChange = (e) => {
    setSelectedServiceFilter(e.target.value);
    setFormData(prev => ({ ...prev, booking_id: '' })); 
  };

  // Lọc danh sách đơn hàng theo loại đã chọn
  const filteredBookings = userBookings.filter(b => b.type === selectedServiceFilter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate cơ bản
    if (!formData.name || !formData.email || !formData.message) {
      return Swal.fire('Thiếu thông tin', 'Vui lòng điền tên, email và nội dung.', 'warning');
    }

    // Validate Booking ID nếu chủ đề yêu cầu
    const selectedTopicObj = topics.find(t => t.value === formData.topic);
    if (selectedTopicObj?.requireBooking && !formData.booking_id) {
       return Swal.fire('Thiếu thông tin', 'Vui lòng chọn Loại dịch vụ và Mã đơn hàng cụ thể.', 'warning');
    }

    setIsSubmitting(true);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/contact`, formData);
      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Gửi thành công!',
          text: `Mã phiếu hỗ trợ: #${res.data.ticket_code}. Chúng tôi đã gửi email xác nhận.`,
          confirmButtonColor: '#0d6efd'
        });
        // Reset form
        setFormData(prev => ({ ...prev, message: '', booking_id: '', topic: 'general' }));
        setSelectedServiceFilter('');
      } else {
        Swal.fire('Lỗi', res.data.message, 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Lỗi', 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER: FORM LIÊN HỆ ---
  const renderContactForm = () => {
    const currentTopicObj = topics.find(t => t.value === formData.topic);
    const showBookingSelect = currentTopicObj?.requireBooking;

    return (
      <div className="row g-5 animate__animated animate__fadeIn">
        {/* Cột trái: Thông tin */}
        <div className="col-lg-5">
          <h2 className="fw-bold mb-4 text-primary">Liên hệ hỗ trợ</h2>
          <p className="text-muted mb-4">
            Đội ngũ CanTho Travel luôn sẵn sàng lắng nghe bạn. Hãy gửi yêu cầu và chúng tôi sẽ phản hồi trong vòng 24h.
          </p>
          
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <div className="d-flex mb-4 align-items-center">
                <div className="flex-shrink-0 btn-square bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                  <i className="bi bi-geo-alt-fill fs-5"></i>
                </div>
                <div className="ms-3">
                  <h6 className="fw-bold mb-0">Văn phòng chính</h6>
                  <p className="text-muted small mb-0">3/2 Xuân Khánh, Ninh Kiều, Cần Thơ</p>
                </div>
              </div>

              <div className="d-flex mb-4 align-items-center">
                <div className="flex-shrink-0 btn-square bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                  <i className="bi bi-envelope-fill fs-5"></i>
                </div>
                <div className="ms-3">
                  <h6 className="fw-bold mb-0">Email hỗ trợ</h6>
                  <p className="text-muted small mb-0">support@canthotravel.com</p>
                </div>
              </div>

              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 btn-square bg-warning bg-opacity-10 text-dark rounded-circle d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                  <i className="bi bi-telephone-fill fs-5"></i>
                </div>
                <div className="ms-3">
                  <h6 className="fw-bold mb-0">Tổng đài 24/7</h6>
                  <p className="text-muted small mb-0">1900 1234 (1.000đ/phút)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Form nhập liệu */}
        <div className="col-lg-7">
          <div className="bg-white p-5 rounded-4 shadow-lg border-0">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Họ và tên <span className="text-danger">*</span></label>
                  <input type="text" className="form-control bg-light border-0 py-3" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Email <span className="text-danger">*</span></label>
                  <input type="email" className="form-control bg-light border-0 py-3" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Số điện thoại</label>
                  <input type="text" className="form-control bg-light border-0 py-3" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Vấn đề cần hỗ trợ <span className="text-danger">*</span></label>
                  <select className="form-select bg-light border-0 py-3" name="topic" value={formData.topic} onChange={handleChange}>
                    {topics.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* 🔥 KHỐI CHỌN ĐƠN HÀNG (2 BƯỚC) 🔥 */}
                {showBookingSelect && (
                  <div className="col-12 bg-primary bg-opacity-10 p-3 rounded-3 border border-primary border-opacity-25 animate__animated animate__fadeIn">
                    <h6 className="fw-bold text-primary mb-3"><i className="bi bi-search me-2"></i>Tìm đơn hàng cần hỗ trợ</h6>
                    
                    <div className="row g-3">
                      {/* BƯỚC 1: Chọn Loại Dịch Vụ */}
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-dark">1. Loại dịch vụ</label>
                        <select className="form-select border-0 py-2 shadow-sm" value={selectedServiceFilter} onChange={handleServiceTypeChange}>
                          <option value="">-- Chọn loại --</option>
                          <option value="hotel">🏨 Khách sạn</option>
                          <option value="tour">🗺️ Tour du lịch</option>
                          <option value="restaurant">🍽️ Nhà hàng</option>
                        </select>
                      </div>

                      {/* BƯỚC 2: Chọn Đơn Hàng (Đã lọc) */}
                      <div className="col-md-6">
                        <label className="form-label small fw-bold text-dark">2. Chọn đơn hàng</label>
                        <select 
                          className="form-select border-0 py-2 shadow-sm" 
                          name="booking_id" 
                          value={formData.booking_id} 
                          onChange={handleChange}
                          disabled={!selectedServiceFilter} 
                        >
                          <option value="">-- Chọn mã đơn --</option>
                          {filteredBookings.length > 0 ? (
                            filteredBookings.map(b => (
                              // Gửi value dạng "type-id" để Backend xử lý
                              <option key={`${b.type}-${b.booking_id}`} value={`${b.type}-${b.booking_id}`}>
                                #{b.booking_id} - {b.title} ({new Date(b.created_at).toLocaleDateString('vi-VN')})
                              </option>
                            ))
                          ) : (
                            <option disabled>Không tìm thấy đơn phù hợp</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {selectedServiceFilter && filteredBookings.length === 0 && (
                       <div className="mt-2 small text-danger">
                          <i className="bi bi-exclamation-circle me-1"></i> Bạn chưa có đơn <b>{selectedServiceFilter}</b> nào gần đây.
                       </div>
                    )}
                  </div>
                )}

                <div className="col-12">
                  <label className="form-label small fw-bold text-muted">Nội dung chi tiết <span className="text-danger">*</span></label>
                  <textarea className="form-control bg-light border-0" rows="5" name="message" placeholder="Mô tả chi tiết vấn đề của bạn..." value={formData.message} onChange={handleChange} required></textarea>
                </div>

                <div className="col-12 mt-4">
                  <button type="submit" className="btn btn-primary w-100 py-3 fw-bold rounded-pill shadow-sm transition-hover" disabled={isSubmitting}>
                    {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang gửi...</> : <><i className="bi bi-send-fill me-2"></i>Gửi Yêu Cầu Hỗ Trợ</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER: FAQ ---
  const renderFAQ = () => (
    <div className="max-w-800 mx-auto animate__animated animate__fadeIn">
      <div className="text-center mb-5">
        <h2 className="fw-bold text-primary">Câu hỏi thường gặp</h2>
        <p className="text-muted">Giải đáp nhanh các thắc mắc phổ biến</p>
      </div>
      <div className="accordion shadow-sm rounded-4 overflow-hidden" id="accordionFAQ">
        {[
          { q: "Làm sao để đặt tour?", a: "Bạn có thể tìm kiếm tour trên trang chủ, xem chi tiết và nhấn nút 'Đặt ngay'. Sau đó điền thông tin và thanh toán." },
          { q: "Chính sách hủy đơn như thế nào?", a: "Bạn có thể hủy miễn phí trước 24h đối với Tour và 48h đối với Khách sạn. Sau thời gian này phí hủy sẽ áp dụng tùy theo quy định từng dịch vụ." },
          { q: "Tôi có thể thay đổi ngày đi không?", a: "Có, vui lòng liên hệ hotline 1900 1234 hoặc gửi yêu cầu hỗ trợ qua form này để nhân viên hỗ trợ đổi ngày (có thể phát sinh phí chênh lệch)." },
          { q: "Phương thức thanh toán?", a: "Chúng tôi chấp nhận thẻ tín dụng, chuyển khoản ngân hàng và thanh toán trực tiếp tại văn phòng." },
          { q: "Làm sao để liên hệ khi gặp sự cố?", a: "Bạn có thể gọi hotline 1900 1234 hoặc gửi email về support@canthotravel.com để được hỗ trợ 24/7." }
        ].map((item, index) => (
          <div className="accordion-item border-0 border-bottom" key={index}>
            <h2 className="accordion-header">
              <button className="accordion-button collapsed fw-bold bg-white shadow-none py-3" type="button" data-bs-toggle="collapse" data-bs-target={`#faq${index}`}>
                <i className="bi bi-question-circle-fill text-primary me-3"></i> {item.q}
              </button>
            </h2>
            <div id={`faq${index}`} className="accordion-collapse collapse" data-bs-parent="#accordionFAQ">
              <div className="accordion-body text-muted pt-0 pb-3 ps-5">
                {item.a}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- RENDER: CHÍNH SÁCH BẢO MẬT ---
  const renderPrivacy = () => (
    <div className="max-w-800 mx-auto bg-white p-5 rounded-4 shadow-sm animate__animated animate__fadeIn border">
        <h2 className="fw-bold mb-4 text-primary border-bottom pb-3">Chính sách bảo mật</h2>
        <div className="text-muted" style={{lineHeight: 1.8}}>
            <p><strong>1. Mục đích thu thập thông tin cá nhân</strong><br/>
            CanTho Travel cam kết bảo mật thông tin của bạn. Chúng tôi chỉ thu thập thông tin cần thiết (Họ tên, Email, SĐT) để xử lý đơn hàng và hỗ trợ khách hàng.</p>
            <p><strong>2. Phạm vi sử dụng thông tin</strong><br/>
            Thông tin của bạn được sử dụng để: gửi xác nhận đặt chỗ, liên hệ khi có thay đổi lịch trình, gửi ưu đãi (nếu bạn đăng ký).</p>
            <p><strong>3. Thời gian lưu trữ</strong><br/>
            Dữ liệu cá nhân được lưu trữ cho đến khi có yêu cầu hủy bỏ từ khách hàng hoặc theo quy định pháp luật.</p>
            <p><strong>4. Cam kết bảo mật</strong><br/>
            Chúng tôi không chia sẻ thông tin của bạn cho bên thứ ba ngoại trừ các đối tác trực tiếp cung cấp dịch vụ (Khách sạn/Nhà xe) để phục vụ chuyến đi của bạn.</p>
        </div>
    </div>
  );

  // --- RENDER: ĐIỀU KHOẢN ---
  const renderTerms = () => (
    <div className="max-w-800 mx-auto bg-white p-5 rounded-4 shadow-sm animate__animated animate__fadeIn border">
        <h2 className="fw-bold mb-4 text-primary border-bottom pb-3">Điều khoản dịch vụ</h2>
        <div className="text-muted" style={{lineHeight: 1.8}}>
            <p><strong>1. Chấp nhận điều khoản</strong><br/>
            Bằng việc sử dụng website CanTho Travel, bạn đồng ý tuân thủ các điều khoản sử dụng này.</p>
            <p><strong>2. Quy định đặt dịch vụ</strong><br/>
            Giá dịch vụ có thể thay đổi tùy thời điểm. Đơn hàng chỉ được xác nhận khi bạn nhận được email xác nhận hoặc tin nhắn từ hệ thống.</p>
            <p><strong>3. Trách nhiệm của khách hàng</strong><br/>
            Bạn chịu trách nhiệm cung cấp thông tin chính xác. Chúng tôi không chịu trách nhiệm nếu xảy ra sự cố do thông tin sai lệch.</p>
            <p><strong>4. Hoàn tiền & Hủy dịch vụ</strong><br/>
            Việc hoàn tiền sẽ được xử lý trong vòng 7-14 ngày làm việc tùy thuộc vào ngân hàng thụ hưởng. Phí hủy có thể áp dụng tùy theo thời điểm bạn gửi yêu cầu.</p>
        </div>
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="bg-light min-vh-100 font-sans">
      {/* Header Banner Dynamic Text */}
      <div className="bg-primary py-5 text-white text-center position-relative overflow-hidden">
        <div className="container position-relative" style={{zIndex: 2}}>
          <h1 className="display-5 fw-bold mb-2">
            {activeTab === 'contact' && "Trung Tâm Trợ Giúp"}
            {activeTab === 'faq' && "Câu Hỏi Thường Gặp"}
            {activeTab === 'privacy' && "Chính Sách Bảo Mật"}
            {activeTab === 'terms' && "Điều Khoản Sử Dụng"}
          </h1>
          <p className="lead opacity-75">
            {activeTab === 'contact' && "Chúng tôi luôn ở đây để hỗ trợ bạn"}
            {activeTab === 'faq' && "Tìm câu trả lời nhanh chóng cho thắc mắc của bạn"}
            {activeTab === 'privacy' && "Cam kết bảo vệ thông tin cá nhân của khách hàng"}
            {activeTab === 'terms' && "Quy định và quyền lợi khi sử dụng dịch vụ"}
          </p>
        </div>
        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10" style={{background: 'url(https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=2000) center/cover'}}></div>
      </div>

      <div className="container py-5">
        {/* Navigation Tabs (Click vào để chuyển tab) */}
        <div className="d-flex justify-content-center mb-5 overflow-auto">
          <div className="btn-group shadow-sm bg-white rounded-pill p-1">
            {[
              { id: 'contact', label: 'Gửi yêu cầu', icon: 'bi-chat-dots' },
              { id: 'faq', label: 'Câu hỏi thường gặp', icon: 'bi-question-circle' },
              { id: 'privacy', label: 'Chính sách bảo mật', icon: 'bi-shield-check' },
              { id: 'terms', label: 'Điều khoản', icon: 'bi-file-text' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`btn rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2 border-0 ${activeTab === tab.id ? 'btn-primary' : 'btn-white text-secondary'}`}
              >
                <i className={`bi ${tab.icon}`}></i> <span className="d-none d-sm-inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-vh-50">
          {activeTab === 'contact' && renderContactForm()}
          {activeTab === 'faq' && renderFAQ()}
          {activeTab === 'privacy' && renderPrivacy()}
          {activeTab === 'terms' && renderTerms()}
        </div>
      </div>
      
      <style>{`
        .transition-hover:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(13,110,253,0.2) !important; }
      `}</style>
    </div>
  );
};

export default ContactPage;