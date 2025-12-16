import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- 1. COMPONENT HÓA ĐƠN (DÙNG ĐỂ IN PDF - ẨN) ---
const InvoiceTemplate = React.forwardRef(({ booking }, ref) => (
  <div ref={ref} style={{ padding: '40px', fontFamily: 'Times New Roman', background: '#fff', width: '800px', minHeight: '1123px', color: '#000' }}>
    <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
      <h1 style={{ margin: 0, textTransform: 'uppercase', fontSize: '26px' }}>VÉ TOUR DU LỊCH</h1>
      <p style={{ fontSize: '14px', fontStyle: 'italic', marginTop: '5px' }}>CanTho Travel - Xác nhận đặt chỗ</p>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
      <div>
        <h3 style={{ fontSize: '16px', textDecoration: 'underline', marginBottom: '10px' }}>KHÁCH HÀNG</h3>
        <p style={{ margin: '5px 0' }}>Họ tên: <strong>{booking?.customer_name}</strong></p>
        <p style={{ margin: '5px 0' }}>SĐT: {booking?.customer_phone}</p>
        <p style={{ margin: '5px 0' }}>Email: {booking?.customer_email}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <h3 style={{ fontSize: '16px', textDecoration: 'underline', marginBottom: '10px' }}>THÔNG TIN VÉ</h3>
        <p style={{ margin: '5px 0' }}>Mã vé: <strong>#{booking?.booking_id}</strong></p>
        <p style={{ margin: '5px 0' }}>Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
      </div>
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '15px' }}>
      <thead style={{ backgroundColor: '#f0f0f0' }}>
        <tr>
          <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'left' }}>Dịch vụ</th>
          <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>Chi tiết hành trình</th>
          <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ border: '1px solid #000', padding: '10px', verticalAlign: 'top' }}>
            <strong style={{ fontSize: '16px' }}>{booking?.service_name}</strong>
            <div style={{ fontSize: '13px', marginTop: '5px', fontStyle: 'italic' }}>Mã Tour: #{booking?.tour_id}</div>
          </td>
          <td style={{ border: '1px solid #000', padding: '10px', verticalAlign: 'top' }}>
            <p style={{ margin: '5px 0' }}>📅 Ngày đi: <strong>{new Date(booking?.start_date).toLocaleDateString('vi-VN')}</strong></p>
            <p style={{ margin: '5px 0' }}>⏰ Thời gian: {booking?.start_time ? booking.start_time.slice(0,5) : '07:00'} - {booking?.end_time ? booking.end_time.slice(0,5) : '---'}</p>
            <p style={{ margin: '5px 0' }}>📍 Điểm đón: {booking?.start_location}</p>
            <p style={{ margin: '5px 0' }}>👥 Số vé: {booking?.guests_count} khách</p>
          </td>
          <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking?.total_price)}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="2" style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>TỔNG THANH TOÁN</td>
          <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking?.total_price)}
          </td>
        </tr>
      </tfoot>
    </table>
    
    <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
        <p>Cảm ơn quý khách đã tin tưởng và lựa chọn CanTho Travel!</p>
        <p>Vui lòng mang theo vé này (hoặc ảnh chụp) khi đến điểm hẹn.</p>
    </div>
  </div>
));

// --- 2. TRANG QUẢN LÝ CHÍNH ---
const TourManagementPage = () => {
    // States
    const [activeTab, setActiveTab] = useState('bookings');
    const [loading, setLoading] = useState(false);
    
    // Data
    const [bookings, setBookings] = useState([]);
    const [tours, setTours] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('all'); 
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');

    // Modals Booking & Refund
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showEditBookingModal, setShowEditBookingModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [bookingFormData, setBookingFormData] = useState({}); 
    
    // Refund States
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundData, setRefundData] = useState(null);
    const [adminRefundNote, setAdminRefundNote] = useState('');

    // Modals Tour & Category
    const [showTourModal, setShowTourModal] = useState(false);
    const [showTourDetailModal, setShowTourDetailModal] = useState(false);
    const [selectedTour, setSelectedTour] = useState(null);
    const [tourFormData, setTourFormData] = useState({});
    const [isEditingTour, setIsEditingTour] = useState(false);
    
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });

    // Upload & Print
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const componentRef = useRef(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // --- FETCH DATA ---
    const fetchBookings = () => {
        setLoading(true);
        fetch(`http://localhost:8082/api/admin/tour-bookings?status=${statusFilter}&search=${search}`)
            .then(res => res.json())
            .then(data => { setBookings(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const fetchTours = () => {
        setLoading(true);
        fetch(`http://localhost:8082/api/admin/tours?search=${search}`)
            .then(res => res.json())
            .then(data => { setTours(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const fetchCategories = () => {
        fetch(`http://localhost:8082/api/admin/tour-categories`)
            .then(res => res.json())
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        if(activeTab === 'bookings') fetchBookings();
        else { fetchTours(); fetchCategories(); }
    }, [activeTab, statusFilter, search]);

    // --- FILTER LOGIC ---
    const filteredTours = tours.filter(t => {
        const matchCategory = categoryFilter === 'all' || (t.category_id && String(t.category_id) === String(categoryFilter));
        const matchLocation = locationFilter === 'all' || (t.start_location && t.start_location.includes(locationFilter));
        return matchCategory && matchLocation;
    });
    const uniqueLocations = [...new Set(tours.map(t => t.start_location))].filter(Boolean);

    // --- ACTIONS BOOKING ---
    const handleDownloadPDF = async () => {
        if (!componentRef.current) return;
        setIsPrinting(true);
        try {
            const canvas = await html2canvas(componentRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Ve_Tour_${selectedBooking?.booking_id}.pdf`);
        } catch (err) { alert("Lỗi xuất PDF"); }
        setIsPrinting(false);
    };

    const handleUpdateStatus = (id, status) => {
        if(!window.confirm("Xác nhận thay đổi trạng thái?")) return;
        fetch(`http://localhost:8082/api/admin/tour-bookings/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status_id: status })
        }).then(res => res.json()).then(data => {
            if(data.success) {
                alert("Cập nhật thành công!");
                setShowBookingModal(false);
                fetchBookings();
            } else {
                alert("Lỗi: " + data.message);
            }
        });
    };

    const handleEditBooking = (booking) => {
        setBookingFormData({
            booking_id: booking.booking_id,
            start_date: booking.start_date ? booking.start_date.split('T')[0] : '',
            guests_count: booking.guests_count,
            total_price: booking.total_price,
            status_id: booking.status_id,
            note: booking.note || ''
        });
        setShowEditBookingModal(true);
    };

    const handleSaveBookingChanges = () => {
        if(!window.confirm("Lưu thay đổi và gửi mail thông báo cho khách?")) return;
        fetch(`http://localhost:8082/api/admin/tour-bookings/${bookingFormData.booking_id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bookingFormData)
        }).then(res => res.json()).then(data => {
            if(data.success) {
                alert("Cập nhật & Gửi mail thành công!");
                setShowEditBookingModal(false);
                fetchBookings();
            } else alert("Lỗi: " + data.message);
        });
    };

    // --- ACTIONS REFUND ---
    const handleOpenRefundModal = (booking) => {
        setSelectedBooking(booking);
        
        if (booking.refund_status && booking.refund_status !== null) {
            setRefundData({
                request_id: booking.request_id,
                bank_name: booking.bank_name || 'Chưa cập nhật',
                account_number: booking.account_number || '---',
                account_holder_name: booking.account_holder_name || booking.customer_name,
                refund_amount: booking.refund_amount || booking.total_price,
                reason: booking.refund_reason || 'Khách yêu cầu hủy',
            });
            setAdminRefundNote(booking.admin_note || '');
        } else {
            setRefundData({
                request_id: null,
                bank_name: 'Tiền mặt/Chuyển khoản (Admin nhập)',
                account_number: '---',
                account_holder_name: booking.customer_name,
                refund_amount: booking.total_price,
                reason: 'Admin chủ động hoàn tiền (Khách chưa gửi form)',
            });
            setAdminRefundNote('');
        }
        
        setShowRefundModal(true);
    };

    const handleProcessRefund = (status) => {
        if(!window.confirm(status === 'processed' ? "Xác nhận đã chuyển khoản cho khách?" : "Từ chối hoàn tiền?")) return;

        fetch(`http://localhost:8082/api/admin/process-refund`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                request_id: refundData.request_id,
                booking_id: selectedBooking.booking_id,
                status: status,
                admin_note: adminRefundNote,
                customer_email: selectedBooking.customer_email
            })
        }).then(res => res.json()).then(data => {
            if(data.success) {
                alert("Xử lý hoàn tiền thành công!");
                setShowRefundModal(false);
                fetchBookings();
            } else alert("Lỗi: " + data.message);
        });
    };

    // --- ACTIONS TOUR (CRUD & UPLOAD) ---
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // --- [SỬA ĐỔI] LOGIC LỊCH TRÌNH THEO GIỜ (TIMELINE) ---
    const handleAddItineraryItem = () => {
        // Mặc định tạo item có trường time
        const newItem = { time: '', title: '', description: '' };
        setTourFormData({ ...tourFormData, itinerary: [...(tourFormData.itinerary || []), newItem] });
    };

    const handleRemoveItineraryItem = (index) => {
        const newItinerary = [...(tourFormData.itinerary || [])];
        newItinerary.splice(index, 1);
        setTourFormData({ ...tourFormData, itinerary: newItinerary });
    };

    const handleChangeItineraryItem = (index, field, value) => {
        const newItinerary = [...(tourFormData.itinerary || [])];
        newItinerary[index][field] = value;
        setTourFormData({ ...tourFormData, itinerary: newItinerary });
    };

    const handleOpenTourModal = (tour = null) => {
        if (tour) {
            const itineraryData = Array.isArray(tour.itinerary) ? tour.itinerary : [];
            setTourFormData({ ...tour, itinerary: itineraryData });
            setIsEditingTour(true);
            setImagePreview(tour.image);
        } else {
            setTourFormData({ itinerary: [] });
            setIsEditingTour(false);
            setImagePreview(null);
        }
        setSelectedImageFile(null);
        setShowTourModal(true);
    };

    const handleSaveTour = async () => {
        let finalImageUrl = tourFormData.image;
        if (selectedImageFile) {
            const formData = new FormData();
            formData.append('image', selectedImageFile);
            try {
                const res = await fetch('http://localhost:8082/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) finalImageUrl = data.url;
            } catch (err) {
                alert("Lỗi upload ảnh!");
                return;
            }
        }

        const method = isEditingTour ? 'PUT' : 'POST';
        const url = isEditingTour 
            ? `http://localhost:8082/api/admin/tours/${tourFormData.tour_id}`
            : `http://localhost:8082/api/admin/tours`;

        const payload = { 
            ...tourFormData, 
            image: finalImageUrl,
            includes: tourFormData.includes || [],
            excludes: tourFormData.excludes || [],
            highlights: tourFormData.highlights || [],
            itinerary: tourFormData.itinerary || [],
            gallery: tourFormData.gallery || []
        };

        fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        }).then(res => res.json()).then(data => {
            if(data.success) {
                alert("Lưu Tour thành công!");
                setShowTourModal(false);
                fetchTours();
            } else alert("Lỗi: " + data.message);
        });
    };

    const handleDeleteTour = (id) => {
        if(!window.confirm("Bạn chắc chắn muốn xóa tour này?")) return;
        fetch(`http://localhost:8082/api/admin/tours/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if(data.success) { alert("Đã xóa!"); fetchTours(); }
                else alert("Lỗi: " + data.message);
            });
    };

    // --- ACTIONS CATEGORY ---
    const handleSaveCategory = () => {
        if (!categoryFormData.name) {
            alert("Vui lòng nhập tên loại tour!");
            return;
        }
        fetch('http://localhost:8082/api/admin/tour-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryFormData)
        }).then(res => res.json()).then(data => {
            if (data.success) {
                alert("Thêm thành công!");
                setShowCategoryModal(false);
                setCategoryFormData({ name: '', description: '' }); 
                fetchCategories(); 
            } else {
                alert("Lỗi: " + data.message);
            }
        }).catch(err => alert("Lỗi kết nối server"));
    };

    const handleDeleteCategory = (e, id, name) => {
        e.stopPropagation();
        if(!window.confirm(`Bạn có chắc muốn xóa loại "${name}" không?`)) return;
        fetch(`http://localhost:8082/api/admin/tour-categories/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert("Đã xóa thành công!");
                if(String(categoryFilter) === String(id)) setCategoryFilter('all');
                fetchCategories();
            } else alert(data.message);
        });
    };

    // UI Helpers
    const getBadge = (id) => {
        const map = { 1: 'warning', 2: 'success', 3: 'primary', 4: 'secondary', 5: 'danger' };
        const text = { 1: 'Chờ duyệt', 2: 'Đã xác nhận', 3: 'Đã thanh toán', 4: 'Hoàn thành', 5: 'Đã hủy' };
        return <span className={`badge bg-${map[id] || 'light'} rounded-pill px-3 py-2`}>{text[id]}</span>;
    };
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            {/* Header */}
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{zIndex:99}}>
                <div className="d-flex align-items-center">
                    <div className="bg-success text-white rounded p-2 me-3"><i className="bi bi-map-fill fs-5"></i></div>
                    <div><h5 className="fw-bold mb-0 text-dark">Quản Lý Tour Du Lịch</h5><small className="text-muted">Admin System</small></div>
                </div>
                <div className="d-flex gap-3">
                    <input type="text" className="form-control rounded-pill" placeholder="Tìm kiếm..." value={search} onChange={e=>setSearch(e.target.value)} style={{width: 300}}/>
                    <Link to="/admin" className="btn btn-outline-dark rounded-pill fw-bold"><i className="bi bi-grid me-2"></i>Dashboard</Link>
                </div>
            </div>

            <div className="container-fluid p-4">
                {/* Tabs */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="btn-group shadow-sm">
                        <button className={`btn px-4 fw-bold ${activeTab==='bookings'?'btn-dark':'btn-white bg-white'}`} onClick={()=>setActiveTab('bookings')}>Đơn Đặt Tour</button>
                        <button className={`btn px-4 fw-bold ${activeTab==='tours'?'btn-dark':'btn-white bg-white'}`} onClick={()=>setActiveTab('tours')}>Danh Sách Tour</button>
                    </div>
                    {/* Nút Thêm Tour */}
                    {activeTab === 'tours' && (
                        <div className="d-flex gap-2">
                            <select className="form-select rounded-pill shadow-sm" style={{width: '180px'}} value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
                                <option value="all">Tất cả điểm đi</option>
                                {uniqueLocations.map((loc, index) => <option key={index} value={loc}>{loc}</option>)}
                            </select>
                            <button className="btn btn-success fw-bold rounded-pill shadow-sm" onClick={() => handleOpenTourModal()}><i className="bi bi-plus-lg me-2"></i>Thêm Tour</button>
                        </div>
                    )}
                </div>

                {/* === TAB 1: BOOKINGS === */}
                {activeTab === 'bookings' && (
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div className="card-header bg-white py-3 px-4 border-bottom-0">
                            <div className="d-flex gap-2">
                                {[{id:'all', label:'Tất cả'}, {id:'2', label:'Đã xác nhận'}, {id:'4', label:'Hoàn thành'}, {id:'5', label:'Đã hủy'}].map(s => (
                                    <button key={s.id} className={`btn btn-sm rounded-pill px-3 fw-bold ${statusFilter===s.id?'btn-primary':'btn-light'}`} onClick={()=>setStatusFilter(s.id)}>{s.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light text-secondary small text-uppercase">
                                    <tr><th>Mã đơn</th><th>Khách hàng</th><th>Tour</th><th>Ngày đi</th><th>Tổng tiền</th><th>Trạng thái</th><th className="text-end pe-4">Thao tác</th></tr>
                                </thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr> :
                                    bookings.map(b => (
                                        <tr key={b.booking_id}>
                                            <td className="fw-bold text-primary ps-4">#{b.booking_id}</td>
                                            <td><div className="fw-bold text-dark">{b.customer_name}</div><small className="text-muted">{b.customer_phone}</small></td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <img src={b.service_image} width="50" height="50" className="rounded-3 me-3 shadow-sm" style={{objectFit:'cover'}} alt=""/>
                                                    <div><div className="fw-bold text-truncate" style={{maxWidth:250}}>{b.service_name}</div><div className="small text-muted"><i className="bi bi-clock me-1"></i>{b.duration_hours || 'Trong ngày'}</div></div>
                                                </div>
                                            </td>
                                            <td>
                                                {new Date(b.start_date).toDateString() === new Date().toDateString() ? 
                                                    <span className="badge bg-warning text-dark border shadow-sm">HÔM NAY</span> : 
                                                    <span className="text-muted fw-bold">{new Date(b.start_date).toLocaleDateString('vi-VN')}</span>
                                                }
                                                <div className="small text-muted">{b.start_time ? b.start_time.slice(0,5) : '07:00'}</div>
                                            </td>
                                            <td className="fw-bold text-success fs-6">{formatCurrency(b.total_price)}</td>
                                            <td>
                                                {getBadge(b.status_id)}
                                                {b.refund_status === 'pending' && <div className="badge bg-warning text-dark mt-1">Yêu cầu hoàn tiền</div>}
                                                {b.refund_status === 'processed' && <div className="badge bg-info mt-1">Đã hoàn tiền</div>}
                                                {b.refund_status === 'rejected' && <div className="badge bg-secondary mt-1">Từ chối hoàn</div>}
                                            </td>
                                            <td className="text-end pe-4">
                                                <button className="btn btn-light btn-sm rounded-circle shadow-sm border me-2" onClick={()=>{ setSelectedBooking(b); setShowBookingModal(true); }}><i className="bi bi-eye"></i></button>
                                                {[1, 2].includes(b.status_id) && (
                                                    <button className="btn btn-primary btn-sm rounded-circle shadow-sm border me-2" onClick={() => handleEditBooking(b)}><i className="bi bi-pencil-fill"></i></button>
                                                )}
                                                {b.status_id === 5 && (
                                                    <button 
                                                        className={`btn btn-sm rounded-circle shadow-sm border ${b.refund_status === 'pending' ? 'btn-warning text-dark' : 'btn-secondary text-white'}`} 
                                                        title="Hoàn tiền"
                                                        onClick={() => handleOpenRefundModal(b)}
                                                    >
                                                        <i className="bi bi-currency-dollar"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* === TAB 2: TOURS (PRODUCTS) === */}
                {activeTab === 'tours' && (
                    <div className="d-flex flex-column gap-3">
                        <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                            <div className="d-flex gap-2 overflow-auto align-items-center">
                                <span className="fw-bold text-muted small text-uppercase me-2" style={{whiteSpace:'nowrap'}}>Lọc theo loại:</span>
                                <button className={`btn btn-sm rounded-pill px-3 fw-bold ${categoryFilter === 'all' ? 'btn-primary' : 'btn-light text-secondary'}`} onClick={() => setCategoryFilter('all')}>Tất cả</button>
                                {categories.map(c => (
                                    <div key={c.category_id} className="btn-group shadow-sm" role="group">
                                            <button className={`btn btn-sm fw-bold ps-3 ${String(categoryFilter) === String(c.category_id) ? 'btn-primary' : 'btn-light text-secondary'}`} onClick={() => setCategoryFilter(String(c.category_id))} style={{whiteSpace:'nowrap', borderTopLeftRadius: '50rem', borderBottomLeftRadius: '50rem', borderRight:'none'}}>{c.name}</button>
                                            <button className={`btn btn-sm pe-3 ps-1 ${String(categoryFilter) === String(c.category_id) ? 'btn-primary border-start' : 'btn-light text-secondary text-opacity-50'}`} style={{borderTopRightRadius: '50rem', borderBottomRightRadius: '50rem', borderLeft:'none'}} onClick={(e) => handleDeleteCategory(e, c.category_id, c.name)}><i className="bi bi-x-lg small" style={{fontSize:'0.6rem'}}></i></button>
                                    </div>
                                ))}
                                <button className="btn btn-sm btn-outline-success rounded-circle shadow-sm ms-2 flex-shrink-0" style={{width: '32px', height: '32px'}} title="Thêm phân loại mới" onClick={() => setShowCategoryModal(true)}><i className="bi bi-plus-lg"></i></button>
                            </div>
                        </div>

                        <div className="row g-4">
                            {filteredTours.length > 0 ? filteredTours.map(t => (
                                <div className="col-md-6 col-xl-4" key={t.tour_id}>
                                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-shadow">
                                        <div className="position-relative" style={{cursor: 'pointer'}} onClick={() => { setSelectedTour(t); setShowTourDetailModal(true); }}>
                                            <img src={t.image} className="w-100" style={{height:'200px', objectFit:'cover'}} alt=""/>
                                            <div className="position-absolute top-0 end-0 p-2"><span className="badge bg-white text-dark shadow-sm">{t.category_name || 'Chưa phân loại'}</span></div>
                                        </div>
                                        <div className="card-body d-flex flex-column p-4">
                                            <h5 className="fw-bold text-truncate mb-2" title={t.name}>{t.name}</h5>
                                            <div className="d-flex align-items-center text-muted small mb-3"><i className="bi bi-geo-alt me-1"></i> {t.start_location} <i className="bi bi-arrow-right mx-2"></i> {t.end_location || 'Kết thúc'}</div>
                                            <div className="fw-bold text-success fs-5 mb-3">{formatCurrency(t.price)}</div>
                                            <div className="mt-auto d-flex gap-2">
                                                <button className="btn btn-outline-primary btn-sm flex-fill rounded-pill" onClick={() => handleOpenTourModal(t)}>Sửa</button>
                                                <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={()=>handleDeleteTour(t.tour_id)}>Xóa</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : <div className="col-12 text-center py-5 text-muted">Không tìm thấy tour phù hợp với bộ lọc.</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL REFUND --- */}
            {showRefundModal && refundData && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-warning text-dark"><h5 className="modal-title fw-bold"><i className="bi bi-cash-coin me-2"></i>Xử Lý Hoàn Tiền</h5><button type="button" className="btn-close" onClick={()=>setShowRefundModal(false)}></button></div>
                            <div className="modal-body p-4">
                                <div className="alert alert-warning small">Hoàn tiền cho đơn đã hủy <strong>#{selectedBooking.booking_id}</strong>.</div>
                                <div className="mb-3 p-3 bg-light rounded border">
                                    <h6 className="fw-bold mb-2">Thông tin nhận tiền:</h6>
                                    <p className="mb-1">Ngân hàng: <strong>{refundData.bank_name}</strong></p>
                                    <p className="mb-1">Số tài khoản: <strong className="text-primary fs-5">{refundData.account_number}</strong></p>
                                    <p className="mb-1">Chủ tài khoản: <strong>{refundData.account_holder_name}</strong></p>
                                    <p className="mb-0 text-danger fw-bold">Số tiền hoàn: {formatCurrency(refundData.refund_amount)}</p>
                                </div>
                                <div className="mb-3"><label className="fw-bold small">Lý do khách hủy:</label><div className="p-2 bg-light rounded text-muted fst-italic">{refundData.reason}</div></div>
                                <div><label className="fw-bold small">Ghi chú của Admin:</label><textarea className="form-control" rows="2" placeholder="Ví dụ: Đã chuyển khoản..." value={adminRefundNote} onChange={e=>setAdminRefundNote(e.target.value)}></textarea></div>
                            </div>
                            <div className="modal-footer bg-light d-flex justify-content-between"><button className="btn btn-outline-danger" onClick={() => handleProcessRefund('rejected')}>Từ chối</button><div><button className="btn btn-secondary me-2" onClick={()=>setShowRefundModal(false)}>Đóng</button><button className="btn btn-success fw-bold" onClick={() => handleProcessRefund('processed')}>Xác nhận</button></div></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL CATEGORY --- */}
            {showCategoryModal && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-success text-white"><h5 className="modal-title fw-bold">Thêm Loại Tour</h5><button type="button" className="btn-close btn-close-white" onClick={()=>setShowCategoryModal(false)}></button></div>
                            <div className="modal-body p-4">
                                <div className="mb-3"><label className="fw-bold small">Tên loại tour</label><input type="text" className="form-control" value={categoryFormData.name} onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} /></div>
                                <div className="mb-3"><label className="fw-bold small">Mô tả</label><textarea className="form-control" rows="3" value={categoryFormData.description} onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})}></textarea></div>
                            </div>
                            <div className="modal-footer bg-light"><button className="btn btn-light" onClick={()=>setShowCategoryModal(false)}>Hủy</button><button className="btn btn-success fw-bold" onClick={handleSaveCategory}>Thêm mới</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL ADD/EDIT TOUR (ĐÃ SỬA: LỊCH TRÌNH THEO MỐC THỜI GIAN) --- */}
            {showTourModal && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-dark text-white">
                                <h5 className="modal-title fw-bold">{isEditingTour ? 'Cập nhật Tour' : 'Thêm Tour Mới'}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowTourModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="row g-3">
                                    <div className="col-12"><label className="fw-bold small mb-1">Hình ảnh (Upload)</label><div className="d-flex align-items-center gap-3"><div className="flex-shrink-0">{imagePreview ? <img src={imagePreview} alt="Preview" className="rounded border" style={{width: '100px', height: '100px', objectFit: 'cover'}} /> : <div className="rounded border d-flex align-items-center justify-content-center bg-light text-muted" style={{width:'100px', height:'100px'}}>No Image</div>}</div><div className="flex-grow-1"><input type="file" className="form-control" accept="image/*" onChange={handleImageChange} /></div></div></div>
                                    <div className="col-12"><label className="fw-bold small">Tên Tour</label><input className="form-control" value={tourFormData.name||''} onChange={e=>setTourFormData({...tourFormData, name:e.target.value})} /></div>
                                    <div className="col-md-6"><label className="fw-bold small">Phân loại</label><select className="form-select" value={tourFormData.category_id || ''} onChange={e=>setTourFormData({...tourFormData, category_id:e.target.value})}><option value="">-- Chọn loại --</option>{categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select></div>
                                    <div className="col-md-6"><label className="fw-bold small">Giá (VNĐ)</label><input type="number" className="form-control" value={tourFormData.price||''} onChange={e=>setTourFormData({...tourFormData, price:e.target.value})} /></div>
                                    <div className="col-md-4"><label className="fw-bold small">Thời lượng (giờ)</label><input type="number" className="form-control" value={tourFormData.duration_hours||''} onChange={e=>setTourFormData({...tourFormData, duration_hours:e.target.value})} /></div>
                                    <div className="col-md-4"><label className="fw-bold small">Giờ đi</label><input type="time" className="form-control" value={tourFormData.start_time||''} onChange={e=>setTourFormData({...tourFormData, start_time:e.target.value})} /></div>
                                    <div className="col-md-4"><label className="fw-bold small">Giờ về</label><input type="time" className="form-control" value={tourFormData.end_time||''} onChange={e=>setTourFormData({...tourFormData, end_time:e.target.value})} /></div>
                                    <div className="col-md-6"><label className="fw-bold small">Điểm đón</label><input className="form-control" value={tourFormData.start_location||''} onChange={e=>setTourFormData({...tourFormData, start_location:e.target.value})} /></div>
                                    <div className="col-md-6"><label className="fw-bold small">Điểm trả</label><input className="form-control" value={tourFormData.end_location||''} onChange={e=>setTourFormData({...tourFormData, end_location:e.target.value})} /></div>
                                    <div className="col-12"><label className="fw-bold small">Mô tả ngắn</label><textarea className="form-control" rows="2" value={tourFormData.description||''} onChange={e=>setTourFormData({...tourFormData, description:e.target.value})}></textarea></div>
                                    
                                    {/* --- [SỬA] LỊCH TRÌNH CHI TIẾT DẠNG TIMELINE --- */}
                                    <div className="col-12">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <label className="fw-bold small">Lịch trình trong ngày (Timeline)</label>
                                            <button type="button" className="btn btn-sm btn-outline-primary rounded-pill" onClick={handleAddItineraryItem}>
                                                <i className="bi bi-plus-lg me-1"></i> Thêm mốc thời gian
                                            </button>
                                        </div>
                                        <div className="bg-light p-3 rounded-3 border">
                                            {tourFormData.itinerary && tourFormData.itinerary.length > 0 ? (
                                                tourFormData.itinerary.map((item, idx) => (
                                                    <div key={idx} className="card mb-3 shadow-sm border-0">
                                                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-2">
                                                            <span className="fw-bold text-primary">Mốc {idx + 1}</span>
                                                            <button type="button" className="btn btn-sm btn-close" onClick={() => handleRemoveItineraryItem(idx)}></button>
                                                        </div>
                                                        <div className="card-body p-3">
                                                            <div className="row g-2 mb-2">
                                                                <div className="col-4">
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-control form-control-sm fw-bold" 
                                                                        placeholder="Giờ (VD: 08:00)" 
                                                                        value={item.time || ''}
                                                                        onChange={(e) => handleChangeItineraryItem(idx, 'time', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-8">
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-control form-control-sm fw-bold" 
                                                                        placeholder="Hoạt động chính (VD: Đón khách)" 
                                                                        value={item.title || ''}
                                                                        onChange={(e) => handleChangeItineraryItem(idx, 'title', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <textarea 
                                                                    className="form-control form-control-sm" 
                                                                    rows="2" 
                                                                    placeholder="Mô tả chi tiết hoạt động..." 
                                                                    value={item.description || ''} 
                                                                    onChange={(e) => handleChangeItineraryItem(idx, 'description', e.target.value)}
                                                                ></textarea>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : <div className="text-center text-muted py-3 small">Chưa có lịch trình. Bấm "Thêm mốc thời gian" để tạo.</div>}
                                        </div>
                                    </div>
                                    {/* --- KẾT THÚC PHẦN SỬA --- */}

                                </div>
                            </div>
                            <div className="modal-footer bg-light"><button className="btn btn-secondary" onClick={()=>setShowTourModal(false)}>Hủy</button><button className="btn btn-success px-4 fw-bold" onClick={handleSaveTour}>Lưu Tour</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL XEM CHI TIẾT TOUR (READ ONLY) --- */}
            {showTourDetailModal && selectedTour && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)'}}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header border-bottom px-4"><h5 className="modal-title fw-bold">Chi tiết: {selectedTour.name}</h5><button type="button" className="btn-close" onClick={()=>setShowTourDetailModal(false)}></button></div>
                            <div className="modal-body p-0">
                                <div className="row g-0">
                                    <div className="col-md-5 bg-light"><img src={selectedTour.image} className="w-100" style={{height:'300px', objectFit:'cover'}} alt=""/><div className="p-4"><h5 className="fw-bold text-success mb-3">{formatCurrency(selectedTour.price)} / khách</h5><ul className="list-unstyled text-muted small"><li className="mb-2"><strong>Loại:</strong> {selectedTour.category_name}</li><li className="mb-2"><strong>Điểm đón:</strong> {selectedTour.start_location}</li><li className="mb-2"><strong>Điểm đến:</strong> {selectedTour.end_location}</li><li className="mb-2"><strong>Thời lượng:</strong> {selectedTour.duration_hours} tiếng</li><li><strong>Giờ đi:</strong> {selectedTour.start_time} - <strong>Giờ về:</strong> {selectedTour.end_time}</li></ul></div></div>
                                    <div className="col-md-7 p-4">
                                        <h6 className="fw-bold text-uppercase text-muted small mb-2">Mô tả</h6><p className="small text-muted">{selectedTour.description}</p><hr className="opacity-25"/>
                                        <h6 className="fw-bold text-uppercase text-muted small mb-2">Lịch trình chi tiết</h6>
                                        <div className="p-3 bg-light rounded border small text-dark" style={{maxHeight:'300px', overflowY:'auto'}}>
                                            {selectedTour.itinerary && Array.isArray(selectedTour.itinerary) && selectedTour.itinerary.length > 0 ? (
                                                selectedTour.itinerary.map((it, i) => (
                                                    <div key={i} className="mb-3 border-bottom pb-2 last:border-0">
                                                        <div className="d-flex align-items-center mb-1">
                                                            <span className="badge bg-primary me-2">{it.time || `Mốc ${i+1}`}</span>
                                                            <strong className="text-dark">{it.title}</strong>
                                                        </div>
                                                        <p className="mb-0 text-muted ms-1 small">{it.description}</p>
                                                    </div>
                                                ))
                                            ) : (<div>Chưa cập nhật lịch trình.</div>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light"><button className="btn btn-secondary" onClick={()=>setShowTourDetailModal(false)}>Đóng</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL BOOKING DETAIL & EDIT (KEEP AS IS) --- */}
            {showBookingModal && selectedBooking && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)'}}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header bg-success text-white px-4"><h5 className="modal-title fw-bold">Chi tiết đơn tour #{selectedBooking.booking_id}</h5><button type="button" className="btn-close btn-close-white" onClick={()=>setShowBookingModal(false)}></button></div>
                            <div className="modal-body p-4 bg-white">
                                <div className="row g-4">
                                    <div className="col-md-7">
                                        <h6 className="fw-bold text-uppercase text-muted small mb-3">Thông tin hành trình</h6>
                                        <div className="d-flex mb-3"><img src={selectedBooking.service_image} className="rounded-3 shadow-sm me-3" width="80" height="80" style={{objectFit:'cover'}} alt=""/><div><div className="fw-bold text-success mb-1">{selectedBooking.service_name}</div><span className="badge bg-light text-dark border">Mã Tour: #{selectedBooking.tour_id}</span></div></div>
                                        <div className="p-3 bg-light rounded-3 border">
                                            <div className="row g-3">
                                                <div className="col-6"><small className="d-block text-muted">Ngày khởi hành</small><strong className="text-dark">{new Date(selectedBooking.start_date).toLocaleDateString('vi-VN')}</strong></div>
                                                <div className="col-6"><small className="d-block text-muted">Thời gian</small><strong>{selectedBooking.start_time ? selectedBooking.start_time.slice(0,5) : '07:00'} - {selectedBooking.end_time ? selectedBooking.end_time.slice(0,5) : '---'}</strong></div>
                                                <div className="col-6"><small className="d-block text-muted">Điểm đón</small><strong>{selectedBooking.start_location || 'Tại văn phòng'}</strong></div>
                                                <div className="col-6"><small className="d-block text-muted">Điểm kết thúc</small><strong>{selectedBooking.end_location || 'Như điểm đón'}</strong></div>
                                                <div className="col-12 pt-2 border-top"><small className="d-block text-muted">Ghi chú của khách</small><span className="fst-italic text-dark">{selectedBooking.note || 'Không có ghi chú'}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-5">
                                        <div className="h-100 d-flex flex-column justify-content-between">
                                            <div className="p-3 border rounded-3 mb-3"><h6 className="fw-bold text-uppercase text-muted small mb-3">Khách hàng</h6><div className="fw-bold fs-5">{selectedBooking.customer_name}</div><div className="text-muted"><i className="bi bi-telephone me-2"></i>{selectedBooking.customer_phone}</div><div className="text-muted"><i className="bi bi-envelope me-2"></i>{selectedBooking.customer_email}</div></div>
                                            <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success text-center"><small className="text-uppercase text-success fw-bold">Tổng thanh toán</small><div className="fs-2 fw-bold text-success">{formatCurrency(selectedBooking.total_price)}</div><div className="mt-2">{getBadge(selectedBooking.status_id)}</div></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light px-4 py-3 justify-content-between"><button className="btn btn-outline-dark fw-bold" onClick={handleDownloadPDF} disabled={isPrinting}>{isPrinting ? 'Đang tạo PDF...' : <><i className="bi bi-file-earmark-pdf me-2"></i>Xuất Vé PDF</>}</button><div className="d-flex gap-2">{[1, 2].includes(selectedBooking.status_id) && <button className="btn btn-outline-danger fw-bold" onClick={()=>handleUpdateStatus(selectedBooking.booking_id, 5)}>Hủy Đơn</button>}{selectedBooking.status_id === 1 && <button className="btn btn-success fw-bold px-4 shadow-sm" onClick={()=>handleUpdateStatus(selectedBooking.booking_id, 2)}><i className="bi bi-check-lg me-2"></i>Xác Nhận & Gửi Vé</button>}</div></div>
                        </div>
                    </div>
                </div>
            )}

            {showEditBookingModal && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-primary text-white"><h5 className="modal-title fw-bold">Chỉnh sửa Đơn #{bookingFormData.booking_id}</h5><button type="button" className="btn-close btn-close-white" onClick={()=>setShowEditBookingModal(false)}></button></div>
                            <div className="modal-body p-4">
                                <div className="mb-3"><label className="fw-bold small">Ngày khởi hành</label><input type="date" className="form-control" value={bookingFormData.start_date} onChange={e => setBookingFormData({...bookingFormData, start_date: e.target.value})} /></div>
                                <div className="row g-3 mb-3"><div className="col-6"><label className="fw-bold small">Số lượng khách</label><input type="number" className="form-control" value={bookingFormData.guests_count} onChange={e => setBookingFormData({...bookingFormData, guests_count: e.target.value})} /></div><div className="col-6"><label className="fw-bold small">Tổng tiền (VNĐ)</label><input type="number" className="form-control fw-bold text-success" value={bookingFormData.total_price} onChange={e => setBookingFormData({...bookingFormData, total_price: e.target.value})} /></div></div>
                                <div className="mb-3"><label className="fw-bold small">Trạng thái</label><select className="form-select" value={bookingFormData.status_id} onChange={e => setBookingFormData({...bookingFormData, status_id: e.target.value})}><option value="1">Chờ duyệt</option><option value="2">Đã xác nhận</option><option value="4">Hoàn thành</option><option value="5">Đã hủy</option></select></div>
                                <div className="mb-3"><label className="fw-bold small">Ghi chú thay đổi</label><textarea className="form-control" rows="3" value={bookingFormData.note} onChange={e => setBookingFormData({...bookingFormData, note: e.target.value})}></textarea></div>
                            </div>
                            <div className="modal-footer bg-light"><button className="btn btn-secondary" onClick={()=>setShowEditBookingModal(false)}>Hủy</button><button className="btn btn-primary fw-bold" onClick={handleSaveBookingChanges}>Lưu</button></div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{position:'fixed', top:0, left:'-10000px'}}><InvoiceTemplate ref={componentRef} booking={selectedBooking} /></div>
        </div>
    );
};

export default TourManagementPage;