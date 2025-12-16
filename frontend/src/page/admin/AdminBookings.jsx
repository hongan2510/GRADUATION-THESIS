import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// 1. INVOICE TEMPLATE (Form chuẩn A4)
const InvoiceTemplate = React.forwardRef(({ booking }, ref) => (
  <div ref={ref} style={{ padding: '40px', fontFamily: 'Times New Roman', color: '#000', backgroundColor: '#fff', width: '794px', minHeight: '1123px' }}>
    <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
      <h1 style={{ margin: 0, textTransform: 'uppercase', fontSize: '28px', fontWeight: 'bold' }}>HÓA ĐƠN DỊCH VỤ</h1>
      <p style={{ margin: '5px 0', fontSize: '16px', fontStyle: 'italic' }}>CanTho Travel - Hệ thống đặt vé trực tuyến</p>
      <p style={{ margin: 0, fontSize: '14px' }}>Hotline: 1900 1234 | Email: support@canthotravel.com</p>
    </div>

    {/* Thông tin chung */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '16px', textDecoration: 'underline', marginBottom: '10px', fontWeight: 'bold' }}>KHÁCH HÀNG:</h3>
        <p style={{ margin: '5px 0' }}>Họ tên: <strong>{booking?.customer_name || '---'}</strong></p>
        <p style={{ margin: '5px 0' }}>SĐT: {booking?.customer_phone || '---'}</p>
        <p style={{ margin: '5px 0' }}>Email: {booking?.customer_email || '---'}</p>
      </div>
      <div style={{ flex: 1, textAlign: 'right' }}>
        <h3 style={{ fontSize: '16px', textDecoration: 'underline', marginBottom: '10px', fontWeight: 'bold' }}>THÔNG TIN ĐƠN:</h3>
        <p style={{ margin: '5px 0' }}>Mã đơn: <strong>#{booking?.booking_id}</strong></p>
        <p style={{ margin: '5px 0' }}>Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        <p style={{ margin: '5px 0' }}>Trạng thái: {booking?.status_name}</p>
      </div>
    </div>

    {/* Bảng chi tiết */}
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '15px' }}>
      <thead>
        <tr style={{ backgroundColor: '#f0f0f0' }}>
          <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'left' }}>Dịch vụ</th>
          <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>Chi tiết</th>
          <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'right' }}>Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ border: '1px solid #000', padding: '12px', verticalAlign: 'top' }}>
            <strong style={{ fontSize: '16px' }}>{booking?.service_name}</strong>
            <br />
            <span style={{ fontSize: '13px', fontStyle: 'italic', color: '#555' }}>
              {booking?.booking_type === 'hotel' ? 'Khách sạn' : booking?.booking_type === 'restaurant' ? 'Nhà hàng' : 'Tour du lịch'}
            </span>
            <div style={{fontSize: '13px', marginTop: '5px'}}>{booking?.service_address}</div>
          </td>
          <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', verticalAlign: 'top' }}>
            {booking?.booking_type === 'hotel' && <div>Phòng: {booking.room_type_name || 'Tiêu chuẩn'}</div>}
            {booking?.booking_type === 'tour' && <div>Khởi hành: {booking.start_location}</div>}
            {booking?.booking_type === 'restaurant' && <div>Đặt bàn trước</div>}
            
            <div style={{marginTop: '5px'}}>
               Thời gian: {booking?.start_date ? new Date(booking.start_date).toLocaleDateString('vi-VN') : booking?.booking_time}
            </div>
            <div>Số lượng: {booking?.guests_count || booking?.guest_count || 1} khách</div>
          </td>
          <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>
            {booking?.total_price > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking?.total_price) : '0 đ'}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="2" style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>TỔNG THANH TOÁN</td>
          <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px', color: '#d32f2f' }}>
            {booking?.total_price > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking?.total_price) : '0 đ'}
          </td>
        </tr>
      </tfoot>
    </table>

    {/* Footer */}
    <div style={{ textAlign: 'center', marginTop: '80px', fontSize: '14px', color: '#666' }}>
      <p style={{marginBottom: '5px'}}>Cảm ơn quý khách đã sử dụng dịch vụ!</p>
      <p><i>(Hóa đơn điện tử - Giá trị pháp lý tương đương bản cứng)</i></p>
    </div>
  </div>
));

const AdminBookings = () => {
    // --- STATES ---
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
    const [typeCounts, setTypeCounts] = useState({ all: 0, hotel: 0, tour: 0, restaurant: 0 });

    const [mainTab, setMainTab] = useState('all'); 
    const [subTab, setSubTab] = useState('all');
    const [search, setSearch] = useState('');

    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    
    // State Form Hoàn Tiền (Có thêm request_id và bank info)
    const [refundData, setRefundData] = useState({ 
        amount: 0, 
        reason: '',
        bank_name: '', 
        account_number: '', 
        account_holder_name: '',
        request_id: null 
    });
    
    const [isPrinting, setIsPrinting] = useState(false); 

    const componentRef = useRef(null);

    // --- HÀM XUẤT PDF ---
    const handleDownloadPDF = async () => {
        const input = componentRef.current;
        if (!input) {
            alert("Không tìm thấy dữ liệu hóa đơn để xuất.");
            return;
        }
        setIsPrinting(true); 
        try {
            const canvas = await html2canvas(input, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4'); 
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Hoa_don_${selectedBooking?.booking_id || 'invoice'}.pdf`);
        } catch (error) {
            console.error("Lỗi xuất PDF:", error);
            alert("Đã xảy ra lỗi khi xuất PDF.");
        } finally {
            setIsPrinting(false);
        }
    };

    // Helper functions
    const safeDate = (dateStr) => {
        if (!dateStr) return '---';
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? '---' : date.toLocaleDateString('vi-VN');
    };
    
    const safeTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
    };

    const tabsConfig = {
        all: { label: 'Tất cả', icon: 'grid', subTabs: [] },
        hotel: { label: 'Khách sạn', icon: 'building', subTabs: [{ id: 'all', label: 'Tất cả' }, { id: '2', label: 'Đã xác nhận' }, { id: '3', label: 'Đã thanh toán' }, { id: '5', label: 'Đã hủy' }] },
        tour: { label: 'Tour', icon: 'map', subTabs: [{ id: 'all', label: 'Tất cả' }, { id: '2', label: 'Đã xác nhận' }, { id: '3', label: 'Đã thanh toán' }, { id: '5', label: 'Đã hủy' }] },
        restaurant: { label: 'Nhà hàng', icon: 'shop', subTabs: [{ id: 'all', label: 'Tất cả' }, { id: '2', label: 'Đã đặt' }, { id: '5', label: 'Đã hủy' }] }
    };

    // API Calls
    const fetchTypeCounts = () => {
        fetch('http://localhost:8082/api/admin/bookings-count-by-type')
            .then(res => res.json())
            .then(data => setTypeCounts(data))
            .catch(err => console.error(err));
    };

    const fetchBookings = (page = 1) => {
        setLoading(true);
        const statusParam = subTab === 'all' ? '' : `&status=${subTab}`;
        const typeParam = mainTab === 'all' ? '' : `&type=${mainTab}`;
        const searchParam = search ? `&search=${search}` : '';

        fetch(`http://localhost:8082/api/admin/bookings-advanced?page=${page}&limit=8${typeParam}${statusParam}${searchParam}`)
            .then(res => res.json())
            .then(data => {
                setBookings(data.data || []);
                setPagination({ page: data.page, total_pages: data.total_pages, total: data.total });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchTypeCounts(); setSubTab('all'); }, [mainTab]);
    useEffect(() => { fetchBookings(1); }, [mainTab, subTab, search]);

    // Actions
    const handleUpdateStatus = (id, newStatus) => {
        // Nếu chuyển từ Đã thanh toán (3) -> Hủy (5): Mở modal hoàn tiền và pre-fill dữ liệu từ khách
        if (selectedBooking.status_id === 3 && newStatus === 5) {
            setRefundData({ 
                amount: selectedBooking.requested_amount || selectedBooking.total_price, // Ưu tiên số tiền khách yêu cầu 
                reason: selectedBooking.user_refund_reason || 'Khách yêu cầu hủy',       // Ưu tiên lý do của khách
                
                // 🔥 TỰ ĐỘNG ĐIỀN THÔNG TIN NGÂN HÀNG CỦA KHÁCH
                bank_name: selectedBooking.bank_name || '',
                account_number: selectedBooking.account_number || '',
                account_holder_name: selectedBooking.account_holder_name || '',
                
                request_id: selectedBooking.request_id || null // Quan trọng: Gửi ID để update
            });
            setShowModal(false);
            setShowRefundModal(true);
            return;
        }

        if(!window.confirm("Xác nhận thay đổi trạng thái?")) return;
        
        fetch(`http://localhost:8082/api/admin/bookings/${id}/status`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status_id: newStatus })
        }).then(() => {
            alert("Thành công!");
            setShowModal(false);
            fetchBookings(pagination.page);
            fetchTypeCounts();
        });
    };

    const confirmRefund = () => {
        // 1. Validation
        if (refundData.amount <= 0) {
            alert("Số tiền hoàn phải lớn hơn 0");
            return;
        }
        if (refundData.amount > selectedBooking.total_price) {
            alert(`Số tiền hoàn không được vượt quá tổng đơn hàng (${new Intl.NumberFormat('vi-VN').format(selectedBooking.total_price)}đ)`);
            return;
        }
        if (!refundData.reason) {
            alert("Vui lòng nhập lý do hoàn tiền");
            return;
        }

        // 2. Call API (Gửi kèm request_id để Backend biết là update hay insert mới)
        fetch(`http://localhost:8082/api/admin/process-refund`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                request_id: refundData.request_id, // <--- ID phiếu yêu cầu (nếu có)
                booking_id: selectedBooking.booking_id,
                status: 'processed', 
                refund_amount: refundData.amount,
                reason: refundData.reason,
                bank_name: refundData.bank_name,
                account_number: refundData.account_number,
                account_holder_name: refundData.account_holder_name,
                customer_email: selectedBooking.customer_email
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                alert("Đã xử lý hoàn tiền thành công!");
                setShowRefundModal(false);
                fetchBookings(pagination.page);
                fetchTypeCounts();
            } else {
                alert("Lỗi: " + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Lỗi kết nối server");
        });
    };

    const handleViewDetail = (item) => {
        const apiUrl = item.booking_type === 'restaurant'
            ? `http://localhost:8082/api/bookings/invoice/restaurant/${item.booking_id}`
            : `http://localhost:8082/api/admin/bookings/${item.booking_id}`;

        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                // Backend trả về full info gồm cả rr.* (refund request)
                setSelectedBooking({
                    ...data,
                    service_image: data.service_image || 'https://via.placeholder.com/150',
                    guests_count: data.guests_count || data.guest_count || 1
                });
                setShowModal(true);
            })
            .catch(() => alert("Không tải được chi tiết đơn này."));
    };

    const getBadge = (id) => {
        const map = { 1: 'warning', 2: 'primary', 3: 'success', 4: 'secondary', 5: 'danger', 6: 'info' };
        const text = { 1: 'Chờ duyệt', 2: 'Đã xác nhận', 3: 'Đã thanh toán', 4: 'Hoàn thành', 5: 'Đã hủy', 6: 'Đã hoàn tiền' };
        return <span className={`badge bg-${map[id] || 'secondary'} rounded-pill px-3`}>{text[id] || 'N/A'}</span>;
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            
            {/* 🛑 VÙNG HÓA ĐƠN ẨN */}
            <div style={{ position: "fixed", top: 0, left: "-10000px", zIndex: -100 }}>
                <InvoiceTemplate ref={componentRef} booking={selectedBooking} />
            </div>

            {/* Header */}
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{zIndex: 999}}>
                <div className="d-flex align-items-center">
                    <div className="bg-dark text-white rounded p-2 me-3"><i className="bi bi-shield-lock-fill fs-5"></i></div>
                    <div><h5 className="fw-bold mb-0 text-dark">Quản Lý Đặt Chỗ</h5><small className="text-muted">Admin System</small></div>
                </div>
                <div className="d-flex gap-3">
                    <input 
                        type="text" 
                        className="form-control rounded-pill" 
                        placeholder="Tìm: Mã đơn, Tên khách, SĐT, Email..." 
                        style={{width: 300}} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                    <Link to="/admin" className="btn btn-outline-dark rounded-pill fw-bold"><i className="bi bi-grid me-2"></i>Dashboard</Link>
                </div>
            </div>

            {/* Content */}
            <div className="container-fluid p-4">
                {/* Tabs */}
                <div className="d-flex gap-2 mb-4 overflow-auto">
                    {Object.keys(tabsConfig).map(key => (
                        <button key={key} onClick={() => setMainTab(key)}
                            className={`btn rounded-pill px-4 fw-bold border-0 d-flex align-items-center ${mainTab === key ? 'bg-dark text-white shadow' : 'bg-white text-muted shadow-sm'}`}>
                            <i className={`bi bi-${tabsConfig[key].icon} me-2`}></i>{tabsConfig[key].label}
                            <span className={`badge ms-2 rounded-pill ${mainTab === key ? 'bg-white text-dark' : 'bg-light text-dark border'}`}>
                                {typeCounts[key] || 0}
                            </span>
                        </button>
                    ))}
                </div>
                
                {/* Sub Tabs */}
                {tabsConfig[mainTab].subTabs.length > 0 && (
                    <div className="mb-4 btn-group shadow-sm bg-white rounded-pill p-1 border">
                        {tabsConfig[mainTab].subTabs.map(sub => (
                            <button key={sub.id} onClick={() => setSubTab(sub.id)}
                                className={`btn btn-sm rounded-pill px-3 fw-bold ${subTab === sub.id ? 'btn-primary' : 'btn-white text-secondary'}`}>
                                {sub.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Table */}
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-secondary small text-uppercase">
                                <tr>
                                    <th className="ps-4 py-3">Mã đơn</th>
                                    <th>Khách hàng</th>
                                    <th>Dịch vụ</th>
                                    <th>Thời gian</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th className="text-end pe-4">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                                ) : bookings.length > 0 ? (
                                    bookings.map(item => (
                                        <tr key={item.booking_id} onClick={() => handleViewDetail(item)} style={{cursor:'pointer'}}>
                                            <td className="ps-4 fw-bold text-primary">#{item.booking_id}</td>
                                            <td>
                                                <div className="fw-bold text-dark">{item.customer_name}</div>
                                                <div className="small text-muted">{item.customer_phone || '---'}</div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <img src={item.service_image} className="rounded me-2 border" width="40" height="40" style={{objectFit:'cover'}} alt="" />
                                                    <div className="d-inline-block text-truncate" style={{maxWidth:200}}>
                                                        <span className="fw-bold text-dark">{item.service_name}</span>
                                                        <div className="small text-uppercase text-muted" style={{fontSize:'0.7rem'}}>{item.booking_type}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="small text-muted">
                                                {safeDate(item.updated_at || item.created_at)} <br/>
                                                {safeTime(item.updated_at || item.created_at)}
                                            </td>
                                            <td className="fw-bold text-success">
                                                {item.total_price > 0 ? new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'}).format(item.total_price) : <span className="text-muted small">Thanh toán sau</span>}
                                            </td>
                                            <td>{getBadge(item.status_id)}</td>
                                            <td className="text-end pe-4">
                                                <button className="btn btn-light btn-sm rounded-circle" onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }}>
                                                    <i className="bi bi-chevron-right"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7" className="text-center py-5 text-muted">Không có dữ liệu</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="card-footer bg-white border-0 py-3 d-flex justify-content-end">
                        <button className="btn btn-sm btn-outline-secondary me-2" disabled={pagination.page===1} onClick={()=>fetchBookings(pagination.page-1)}>Prev</button>
                        <span className="btn btn-sm btn-light disabled text-dark fw-bold">{pagination.page} / {pagination.total_pages}</span>
                        <button className="btn btn-sm btn-outline-secondary ms-2" disabled={pagination.page===pagination.total_pages} onClick={()=>fetchBookings(pagination.page+1)}>Next</button>
                    </div>
                </div>
            </div>

            {/* --- MODAL CHI TIẾT --- */}
            {showModal && selectedBooking && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header border-bottom-0 bg-white pt-4 px-4 pb-0">
                                <h5 className="modal-title fw-bold">Chi Tiết Đơn #{selectedBooking.booking_id}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4 bg-white">
                                <div className="row g-4">
                                    <div className="col-md-7">
                                        <div className="p-3 bg-light rounded-4 h-100 border">
                                            <h6 className="fw-bold text-uppercase text-muted small mb-3">Thông tin dịch vụ</h6>
                                            <div className="d-flex mb-3">
                                                <img src={selectedBooking.service_image} className="rounded-3 shadow-sm me-3" width="80" height="80" style={{objectFit:'cover'}} alt="" />
                                                <div>
                                                    <h6 className="fw-bold text-primary mb-1">{selectedBooking.service_name}</h6>
                                                    <p className="small text-muted mb-0"><i className="bi bi-geo-alt me-1"></i>{selectedBooking.service_address}</p>
                                                    <span className="badge bg-white border text-dark mt-2 text-uppercase">{selectedBooking.booking_type}</span>
                                                </div>
                                            </div>
                                            <hr className="opacity-25"/>
                                            <div className="row g-3">
                                                {selectedBooking.booking_type === 'hotel' && (
                                                    <>
                                                        <div className="col-6"><small className="d-block text-muted">Nhận phòng</small><strong>{safeDate(selectedBooking.check_in_date || selectedBooking.start_date)}</strong></div>
                                                        <div className="col-6"><small className="d-block text-muted">Trả phòng</small><strong>{safeDate(selectedBooking.check_out_date || selectedBooking.end_date)}</strong></div>
                                                        <div className="col-12 mt-2"><div className="p-2 bg-white border rounded"><small className="d-block text-muted">Loại phòng</small><strong className="text-primary">{selectedBooking.room_type_name || 'Phòng tiêu chuẩn'}</strong></div></div>
                                                    </>
                                                )}
                                                {selectedBooking.booking_type === 'tour' && (
                                                    <>
                                                        <div className="col-6"><small className="d-block text-muted">Ngày đi</small><strong>{safeDate(selectedBooking.start_date)}</strong></div>
                                                        <div className="col-6"><small className="d-block text-muted">Giờ đi</small><strong>{selectedBooking.start_time ? selectedBooking.start_time.slice(0,5) : '07:00'}</strong></div>
                                                        <div className="col-12 mt-2"><div className="p-2 bg-white border rounded"><small className="d-block text-muted">Điểm đón</small><strong className="text-primary">{selectedBooking.start_location || 'Văn phòng công ty'}</strong></div></div>
                                                    </>
                                                )}
                                                <div className="col-6 mt-2"><small className="d-block text-muted">Số lượng</small><strong>{selectedBooking.guests_count} người</strong></div>
                                                <div className="col-12 mt-2"><small className="d-block text-muted">Ghi chú</small><div className="p-2 bg-white rounded border small fst-italic text-muted">{selectedBooking.note || 'Không có ghi chú'}</div></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-5">
                                        <div className="border rounded-4 p-3 mb-3 h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
                                            <div>
                                                <h6 className="fw-bold text-uppercase text-muted small mb-3">Khách hàng</h6>
                                                <div className="fw-bold fs-5 mb-1">{selectedBooking.customer_name}</div>
                                                <div className="text-muted"><i className="bi bi-telephone me-2"></i>{selectedBooking.customer_phone}</div>
                                                <div className="text-muted mb-3"><i className="bi bi-envelope me-2"></i>{selectedBooking.customer_email}</div>
                                            </div>
                                            <div className="mt-4 p-3 bg-light rounded text-center border">
                                                <small className="text-uppercase text-muted fw-bold">Tổng thanh toán</small>
                                                <h3 className="fw-bold text-success mb-0">{selectedBooking.total_price > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedBooking.total_price) : 'Thanh toán sau'}</h3>
                                                <div className="mt-2">{getBadge(selectedBooking.status_id)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-0 px-4 pb-4 bg-white justify-content-between">
                                <button className="btn btn-outline-dark" onClick={handleDownloadPDF} disabled={isPrinting}>
                                    {isPrinting ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang tạo PDF...</> : <><i className="bi bi-file-earmark-pdf me-2"></i>Xuất PDF</>}
                                </button>
                                
                                <div className="d-flex gap-2">
                                    {selectedBooking.status_id === 1 && <button className="btn btn-primary px-4" onClick={() => handleUpdateStatus(selectedBooking.booking_id, 2)}>Duyệt Đơn</button>}
                                    {[1, 2, 3].includes(selectedBooking.status_id) && <button className={`btn ${selectedBooking.status_id === 3 ? 'btn-danger' : 'btn-outline-danger'} px-4`} onClick={() => handleUpdateStatus(selectedBooking.booking_id, 5)}>{selectedBooking.status_id === 3 ? 'Hủy & Hoàn Tiền' : 'Hủy Đơn'}</button>}
                                    
                                    {/* Nút Hoàn tiền bổ sung (nếu đã hủy nhưng chưa hoàn tiền xong) */}
                                    {selectedBooking.status_id === 5 && selectedBooking.total_price > 0 && selectedBooking.booking_type !== 'restaurant' && (
                                        <button className="btn btn-warning fw-bold text-dark" onClick={() => { 
                                            // 🔥 PRE-FILL THÔNG TIN TỪ KHÁCH KHI BẤM NÚT NÀY
                                            setRefundData({ 
                                                amount: selectedBooking.requested_amount || selectedBooking.total_price, 
                                                reason: selectedBooking.user_refund_reason || 'Hoàn tiền bổ sung',
                                                bank_name: selectedBooking.bank_name || '',
                                                account_number: selectedBooking.account_number || '',
                                                account_holder_name: selectedBooking.account_holder_name || '',
                                                request_id: selectedBooking.request_id || null 
                                            }); 
                                            setShowModal(false); 
                                            setShowRefundModal(true); 
                                        }}>
                                            <i className="bi bi-cash-coin me-2"></i>Hoàn tiền lại
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL HOÀN TIỀN (FORM CHUẨN ĐẦY ĐỦ) --- */}
            {showRefundModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title fw-bold"><i className="bi bi-wallet2 me-2"></i>Xác Nhận Hoàn Tiền</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRefundModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="alert alert-warning border-0 d-flex align-items-center">
                                    <i className="bi bi-exclamation-triangle-fill fs-4 me-2"></i>
                                    <div>
                                        Đơn hàng <strong>#{selectedBooking?.booking_id}</strong> đã thanh toán.
                                        <br/>Tổng tiền: <strong>{new Intl.NumberFormat('vi-VN').format(selectedBooking?.total_price || 0)}đ</strong>
                                    </div>
                                </div>

                                <div className="row g-3">
                                    {/* Số tiền hoàn */}
                                    <div className="col-12">
                                        <label className="fw-bold mb-1 text-danger">Số tiền hoàn (VNĐ) <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <input 
                                                type="number" 
                                                className="form-control form-control-lg fw-bold text-danger" 
                                                value={refundData.amount} 
                                                onChange={e => setRefundData({...refundData, amount: Number(e.target.value)})} 
                                            />
                                            <button className="btn btn-outline-secondary" type="button" onClick={() => setRefundData({...refundData, amount: selectedBooking.total_price})}>
                                                Hoàn 100%
                                            </button>
                                        </div>
                                        <div className="form-text text-end">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(refundData.amount || 0)}
                                        </div>
                                    </div>

                                    {/* Lý do hoàn */}
                                    <div className="col-12">
                                        <label className="fw-bold mb-1">Lý do hoàn tiền <span className="text-danger">*</span></label>
                                        <textarea className="form-control" rows="2" placeholder="VD: Khách yêu cầu hủy, Lỗi hệ thống..." value={refundData.reason} onChange={e => setRefundData({...refundData, reason: e.target.value})}></textarea>
                                    </div>

                                    {/* Thông tin ngân hàng (Quan trọng cho Admin chuyển khoản) */}
                                    <div className="col-12">
                                        <hr className="my-2 text-muted"/>
                                        <h6 className="fw-bold text-primary mb-2"><i className="bi bi-bank me-1"></i>Thông tin nhận tiền (Tùy chọn)</h6>
                                        <div className="bg-light p-3 rounded border">
                                            <div className="mb-2">
                                                <label className="small text-muted">Ngân hàng</label>
                                                <input type="text" className="form-control form-control-sm" placeholder="VD: Vietcombank" value={refundData.bank_name} onChange={e => setRefundData({...refundData, bank_name: e.target.value})} />
                                            </div>
                                            <div className="mb-2">
                                                <label className="small text-muted">Số tài khoản</label>
                                                <input type="text" className="form-control form-control-sm" placeholder="Số tài khoản" value={refundData.account_number} onChange={e => setRefundData({...refundData, account_number: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="small text-muted">Tên chủ tài khoản</label>
                                                <input type="text" className="form-control form-control-sm" placeholder="NGUYEN VAN A" value={refundData.account_holder_name} onChange={e => setRefundData({...refundData, account_holder_name: e.target.value})} />
                                            </div>
                                            <small className="text-muted fst-italic mt-1 d-block">*Admin lưu ý kiểm tra kỹ trước khi chuyển khoản.</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-0 bg-light rounded-bottom-4">
                                <button className="btn btn-light" onClick={() => setShowRefundModal(false)}>Hủy bỏ</button>
                                <button className="btn btn-danger px-4 fw-bold shadow-sm" onClick={confirmRefund}>
                                    <i className="bi bi-check-circle-fill me-2"></i>Xác nhận Hoàn Tiền
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBookings;