import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const RestaurantManagementPage = () => {
    const [activeTab, setActiveTab] = useState('bookings');
    const [loading, setLoading] = useState(false);
    
    // Data
    const [bookings, setBookings] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    // --- STATES CHO MODAL NHÀ HÀNG ---
    const [showResModal, setShowResModal] = useState(false);
    const [isEditingRes, setIsEditingRes] = useState(false);
    const [modalTab, setModalTab] = useState('info');
    
    // Dữ liệu Form Nhà hàng
    const [resFormData, setResFormData] = useState({
        name: '', address: '', description: '', price_range: '', 
        city_id: 1, latitude: null, longitude: null,
        features: [], 
        hours: [], 
        menu: [] 
    });
    
    const [featureInput, setFeatureInput] = useState('');
    const [imageFile, setImageFile] = useState(null); // Ảnh đại diện nhà hàng
    const [imagePreview, setImagePreview] = useState(null);

    // --- STATES CHO BOOKING ---
    const [showBookingModal, setShowBookingModal] = useState(false);     
    const [showDetailModal, setShowDetailModal] = useState(false);       
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [bookingFormData, setBookingFormData] = useState({});

    // --- FETCH DATA ---
    const fetchBookings = () => {
        setLoading(true);
        fetch(`http://localhost:8082/api/admin/restaurant-bookings?status=${statusFilter}&search=${search}`)
            .then(res => res.json())
            .then(data => { setBookings(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const fetchRestaurants = () => {
        fetch(`http://localhost:8082/api/admin/restaurants?search=${search}`)
            .then(res => res.json())
            .then(data => setRestaurants(Array.isArray(data) ? data : []));
    };

    const fetchRestaurantDetail = (id) => {
        fetch(`http://localhost:8082/api/admin/restaurants/${id}`)
            .then(res => res.json())
            .then(data => {
                setResFormData({ 
                    ...data, 
                    features: data.features.map(f => f.feature_name || f), // Xử lý nếu API trả về object hoặc string
                    hours: data.hours || [], 
                    menu: data.menu || [] 
                });
                setImagePreview(data.image); 
                setIsEditingRes(true); 
                setShowResModal(true);
            });
    };

    useEffect(() => {
        if (activeTab === 'bookings') fetchBookings();
        else fetchRestaurants();
    }, [activeTab, statusFilter, search]);

    // --- HANDLERS: RESTAURANT FORM ---
    const handleOpenAddRes = () => {
        setResFormData({
            name: '', address: '', description: '', price_range: '', 
            city_id: 1, latitude: null, longitude: null,
            features: [], 
            hours: [
                { day_of_week: 'Mon', open_time: '08:00', close_time: '22:00' }, 
                { day_of_week: 'Tue', open_time: '08:00', close_time: '22:00' },
                { day_of_week: 'Wed', open_time: '08:00', close_time: '22:00' }, 
                { day_of_week: 'Thu', open_time: '08:00', close_time: '22:00' },
                { day_of_week: 'Fri', open_time: '08:00', close_time: '22:00' }, 
                { day_of_week: 'Sat', open_time: '08:00', close_time: '22:00' },
                { day_of_week: 'Sun', open_time: '08:00', close_time: '22:00' }
            ], 
            menu: []
        });
        setImagePreview(null); 
        setIsEditingRes(false); 
        setModalTab('info'); 
        setShowResModal(true);
    };

    // Upload Ảnh Đại Diện Nhà Hàng
    const handleImageChange = (e) => { 
        const file = e.target.files[0]; 
        if(file) { 
            setImageFile(file); 
            setImagePreview(URL.createObjectURL(file)); 
        } 
    };
    
    // Feature Handlers
    const addFeature = () => { 
        if(featureInput.trim()) { 
            setResFormData({...resFormData, features: [...resFormData.features, featureInput.trim()]}); 
            setFeatureInput(''); 
        } 
    };
    const removeFeature = (index) => { 
        const newFeatures = [...resFormData.features]; 
        newFeatures.splice(index, 1); 
        setResFormData({...resFormData, features: newFeatures}); 
    };
    
    // Hour Handlers
    const handleHourChange = (index, field, value) => { 
        const newHours = resFormData.hours.map((h, i) => i === index ? { ...h, [field]: value } : h);
        setResFormData({...resFormData, hours: newHours}); 
    };

    // --- MENU HANDLERS (ĐÃ SỬA LỖI STATE) ---
    const addDish = () => {
        setResFormData({
            ...resFormData,
            menu: [...resFormData.menu, { dish_name: '', price: '', description: '', image_url: '' }]
        });
    };

    const removeDish = (index) => {
        const newMenu = resFormData.menu.filter((_, i) => i !== index);
        setResFormData({ ...resFormData, menu: newMenu });
    };

    const handleMenuChange = (index, field, value) => {
        const newMenu = resFormData.menu.map((dish, i) => 
            i === index ? { ...dish, [field]: value } : dish
        );
        setResFormData({ ...resFormData, menu: newMenu });
    };

    // 🔥 Xử lý upload ảnh cho từng món ăn
    const handleMenuImageUpload = async (index, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('http://localhost:8082/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            
            if (data.url) {
                const newMenu = resFormData.menu.map((dish, i) => 
                    i === index ? { ...dish, image_url: data.url } : dish
                );
                setResFormData({ ...resFormData, menu: newMenu });
            }
        } catch (e) {
            alert("Lỗi khi upload ảnh món ăn!");
        }
    };

    // Save Restaurant
    const handleSaveRes = async () => {
        let finalImage = resFormData.image;
        if(imageFile) {
            const formData = new FormData(); formData.append('image', imageFile);
            try {
                const res = await fetch('http://localhost:8082/api/upload', { method: 'POST', body: formData });
                const data = await res.json(); if(data.url) finalImage = data.url;
            } catch(e) { return alert("Lỗi upload ảnh đại diện"); }
        }
        const method = isEditingRes ? 'PUT' : 'POST';
        const url = isEditingRes ? `http://localhost:8082/api/admin/restaurants/${resFormData.restaurant_id}` : `http://localhost:8082/api/admin/restaurants`;
        
        fetch(url, { 
            method, 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ ...resFormData, image: finalImage }) 
        })
        .then(res => res.json()).then(data => { 
            if(data.success) { 
                alert("Lưu thành công!"); 
                setShowResModal(false); 
                fetchRestaurants(); 
            } else alert("Lỗi: " + data.message); 
        });
    };

    const handleDeleteRes = (id) => {
        if(!window.confirm("Xóa nhà hàng này?")) return;
        fetch(`http://localhost:8082/api/admin/restaurants/${id}`, { method: 'DELETE' })
        .then(res => res.json()).then(data => { 
            if(data.success) { alert("Đã xóa!"); fetchRestaurants(); } 
            else alert(data.message); 
        });
    };

    // --- HANDLERS: BOOKING ACTIONS ---
    const handleViewBooking = (booking) => { setSelectedBooking(booking); setShowDetailModal(true); };

    const handleEditBooking = (booking) => {
        setSelectedBooking(booking);
        const formattedTime = new Date(booking.booking_time).toISOString().slice(0, 16);
        setBookingFormData({ id: booking.id, booking_time: formattedTime, guest_count: booking.guest_count, status: booking.status, note: booking.note || '' });
        setShowBookingModal(true);
    };

    const handleSaveBooking = () => {
        if(!window.confirm("Lưu thay đổi và gửi mail?")) return;
        fetch(`http://localhost:8082/api/admin/restaurant-bookings/${bookingFormData.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(bookingFormData)
        }).then(res => res.json()).then(data => {
            if(data.success) { alert("Cập nhật thành công!"); setShowBookingModal(false); fetchBookings(); } else alert(data.error);
        });
    };

    const handleQuickCancel = (booking) => {
        const reason = prompt("Nhập lý do hủy (Gửi mail cho khách):", "Nhà hàng quá tải");
        if (reason === null) return;
        const updateData = { booking_time: new Date(booking.booking_time).toISOString().slice(0, 19).replace('T', ' '), guest_count: booking.guest_count, status: 'cancelled', note: reason };
        fetch(`http://localhost:8082/api/admin/restaurant-bookings/${booking.id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(updateData)
        }).then(res => res.json()).then(data => {
            if(data.success) { alert("Đã hủy đơn!"); fetchBookings(); } else alert("Lỗi: " + data.error);
        });
    };

    // UI Helpers
    const getBadge = (status) => {
        const map = { 'pending': 'warning', 'confirmed': 'success', 'completed': 'primary', 'cancelled': 'danger' };
        const text = { 'pending': 'Chờ xác nhận', 'confirmed': 'Đã xác nhận', 'completed': 'Hoàn thành', 'cancelled': 'Đã hủy' };
        return <span className={`badge bg-${map[status] || 'secondary'}`}>{text[status] || status}</span>;
    };

    const isToday = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    };
    
    const isPast = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0,0,0,0);
        return date < today;
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            {/* Header */}
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{zIndex:99}}>
                <div className="d-flex align-items-center"><div className="bg-danger text-white rounded p-2 me-3"><i className="bi bi-shop fs-5"></i></div><div><h5 className="fw-bold mb-0 text-dark">Quản Lý Nhà Hàng</h5><small className="text-muted">Full Database System</small></div></div>
                <div className="d-flex gap-3"><input type="text" className="form-control rounded-pill" placeholder="Tìm kiếm..." value={search} onChange={e=>setSearch(e.target.value)} style={{width: 300}}/><Link to="/admin" className="btn btn-outline-dark rounded-pill fw-bold">Dashboard</Link></div>
            </div>

            <div className="container-fluid p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="btn-group shadow-sm">
                        <button className={`btn px-4 fw-bold ${activeTab==='bookings'?'btn-dark':'btn-white bg-white'}`} onClick={()=>setActiveTab('bookings')}>Đơn Đặt Bàn</button>
                        <button className={`btn px-4 fw-bold ${activeTab==='restaurants'?'btn-dark':'btn-white bg-white'}`} onClick={()=>setActiveTab('restaurants')}>Danh Sách Nhà Hàng</button>
                    </div>
                    {activeTab === 'restaurants' && <button className="btn btn-success fw-bold rounded-pill shadow-sm" onClick={handleOpenAddRes}><i className="bi bi-plus-lg me-2"></i>Thêm Nhà Hàng</button>}
                </div>

                {/* === TAB 1: BOOKINGS === */}
                {activeTab === 'bookings' && (
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div className="card-header bg-white py-3 px-4 border-bottom-0">
                            <div className="d-flex gap-2">
                                {[{id:'all', label:'Tất cả'}, {id:'pending', label:'Chờ xác nhận'}, {id:'confirmed', label:'Đã xác nhận'}, {id:'cancelled', label:'Đã hủy'}].map(s => (
                                    <button key={s.id} className={`btn btn-sm rounded-pill px-3 fw-bold ${statusFilter===s.id?'btn-primary':'btn-light'}`} onClick={()=>setStatusFilter(s.id)}>{s.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light text-secondary small text-uppercase"><tr><th>Mã</th><th>Khách hàng</th><th>Nhà hàng</th><th>Thời gian</th><th>Khách</th><th>Trạng thái</th><th className="text-end pe-4">Thao tác</th></tr></thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="7" className="text-center py-5">Đang tải...</td></tr> :
                                    bookings.map(b => {
                                        const isTodayOrder = isToday(b.booking_time);
                                        const isPastOrder = isPast(b.booking_time);
                                        const rowStyle = isPastOrder ? { opacity: 0.6, backgroundColor: '#f9f9f9' } : (isTodayOrder ? { backgroundColor: '#fffbeb' } : {});
                                        
                                        return (
                                            <tr key={b.id} style={rowStyle}>
                                                <td className="fw-bold text-primary ps-4">#{b.id}</td>
                                                <td><div className="fw-bold text-dark">{b.customer_name}</div><small className="text-muted">{b.phone}</small></td>
                                                <td><div className="d-flex align-items-center"><img src={b.restaurant_image} width="40" height="40" className="rounded me-2" style={{objectFit:'cover'}} alt=""/><span>{b.restaurant_name}</span></div></td>
                                                <td>
                                                    {isTodayOrder && <span className="badge bg-warning text-dark border shadow-sm mb-1">HÔM NAY</span>}
                                                    {isPastOrder && <span className="badge bg-secondary mb-1" style={{fontSize:'0.65rem'}}>ĐÃ QUA</span>}
                                                    <div className="fw-bold">{new Date(b.booking_time).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</div>
                                                    <small className="text-muted">{new Date(b.booking_time).toLocaleDateString('vi-VN')}</small>
                                                </td>
                                                <td className="fw-bold text-center">{b.guest_count}</td>
                                                <td>{getBadge(b.status)}</td>
                                                <td className="text-end pe-4">
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button className="btn btn-light btn-sm rounded-circle shadow-sm border" title="Xem chi tiết" onClick={() => handleViewBooking(b)}><i className="bi bi-eye"></i></button>
                                                        {(b.status !== 'cancelled' && !isPastOrder) && (
                                                            <>
                                                                <button className="btn btn-primary btn-sm rounded-circle shadow-sm" title="Sửa đơn" onClick={() => handleEditBooking(b)}><i className="bi bi-pencil-fill"></i></button>
                                                                <button className="btn btn-outline-danger btn-sm rounded-circle shadow-sm border" title="Hủy đơn" onClick={() => handleQuickCancel(b)}><i className="bi bi-x-lg"></i></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* === TAB 2: RESTAURANTS === */}
                {activeTab === 'restaurants' && (
                    <div className="row g-4">
                        {restaurants.map(r => (
                            <div className="col-md-6 col-xl-4" key={r.restaurant_id}>
                                <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                                    <div className="position-relative"><img src={r.image} className="w-100" style={{height:'200px', objectFit:'cover'}} alt=""/><span className="position-absolute top-0 end-0 badge bg-warning text-dark m-2 shadow-sm"><i className="bi bi-star-fill me-1"></i>{Number(r.avg_rating || 0).toFixed(1)}</span></div>
                                    <div className="card-body p-4"><h5 className="fw-bold mb-2 text-truncate">{r.name}</h5><p className="text-muted small mb-2 text-truncate"><i className="bi bi-geo-alt me-1"></i> {r.address}</p><div className="d-flex justify-content-between small text-secondary mb-3"><span className="fw-bold text-success">{r.price_range}</span></div><div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm flex-fill rounded-pill" onClick={() => fetchRestaurantDetail(r.restaurant_id)}>Sửa chi tiết</button><button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={()=>handleDeleteRes(r.restaurant_id)}>Xóa</button></div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- MODAL 1: XEM CHI TIẾT ĐƠN (ĐẸP) --- */}
            {showDetailModal && selectedBooking && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)', backdropFilter:'blur(3px)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header bg-success text-white px-4"><h5 className="modal-title fw-bold"><i className="bi bi-receipt me-2"></i>Chi Tiết Đơn #{selectedBooking.id}</h5><button type="button" className="btn-close btn-close-white" onClick={()=>setShowDetailModal(false)}></button></div>
                            <div className="modal-body p-0">
                                <div className="bg-light p-4 border-bottom d-flex align-items-center">
                                    <img src={selectedBooking.restaurant_image} className="rounded-3 shadow-sm me-3" style={{width:'80px', height:'80px', objectFit:'cover'}} alt=""/>
                                    <div><h5 className="fw-bold text-dark mb-1">{selectedBooking.restaurant_name}</h5><div className="text-muted small"><i className="bi bi-geo-alt me-1"></i>{selectedBooking.restaurant_address}</div></div>
                                </div>
                                <div className="p-4">
                                    <div className="row g-4">
                                        <div className="col-md-6"><h6 className="fw-bold text-uppercase small text-muted mb-3">Thông tin khách hàng</h6><p className="mb-1"><i className="bi bi-person me-2 text-primary"></i><strong>{selectedBooking.customer_name}</strong></p><p className="mb-1"><i className="bi bi-telephone me-2 text-primary"></i>{selectedBooking.phone}</p><p className="mb-0"><i className="bi bi-envelope me-2 text-primary"></i>{selectedBooking.email || 'Không có email'}</p></div>
                                        <div className="col-md-6 border-start ps-4"><h6 className="fw-bold text-uppercase small text-muted mb-3">Thông tin đặt bàn</h6><p className="mb-1"><i className="bi bi-calendar-event me-2 text-success"></i>{new Date(selectedBooking.booking_time).toLocaleDateString('vi-VN')}</p><p className="mb-1"><i className="bi bi-clock me-2 text-success"></i>{new Date(selectedBooking.booking_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</p><p className="mb-0"><i className="bi bi-people me-2 text-success"></i>{selectedBooking.guest_count} Khách</p></div>
                                    </div>
                                    <hr className="my-4 opacity-10"/>
                                    <div className="d-flex justify-content-between align-items-center"><div><span className="d-block small text-muted mb-1">Ghi chú:</span><span className="fst-italic text-dark">{selectedBooking.note || 'Không có ghi chú'}</span></div><div className="text-end"><span className="d-block small text-muted mb-1">Trạng thái:</span>{getBadge(selectedBooking.status)}</div></div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light px-4"><button className="btn btn-secondary w-100 fw-bold" onClick={()=>setShowDetailModal(false)}>Đóng</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: SỬA ĐƠN --- */}
            {showBookingModal && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-primary text-white"><h5 className="modal-title fw-bold">Chỉnh Sửa Đơn #{bookingFormData.id}</h5><button type="button" className="btn-close btn-close-white" onClick={()=>setShowBookingModal(false)}></button></div>
                            <div className="modal-body p-4">
                                <div className="mb-3"><label className="fw-bold small">Thời gian đặt</label><input type="datetime-local" className="form-control" value={bookingFormData.booking_time} onChange={e=>setBookingFormData({...bookingFormData,booking_time:e.target.value})}/></div>
                                <div className="mb-3"><label className="fw-bold small">Số khách</label><input type="number" className="form-control" value={bookingFormData.guest_count} onChange={e=>setBookingFormData({...bookingFormData,guest_count:e.target.value})}/></div>
                                <div className="mb-3"><label className="fw-bold small">Trạng thái</label><select className="form-select" value={bookingFormData.status} onChange={e=>setBookingFormData({...bookingFormData,status:e.target.value})}><option value="pending">Chờ xác nhận</option><option value="confirmed">Xác nhận</option><option value="cancelled">Hủy đơn</option><option value="completed">Hoàn thành</option></select></div>
                                <div className="mb-3"><label className="fw-bold small">Ghi chú (Gửi mail)</label><textarea className="form-control" rows="3" value={bookingFormData.note} onChange={e=>setBookingFormData({...bookingFormData,note:e.target.value})}/></div>
                            </div>
                            <div className="modal-footer bg-light"><button className="btn btn-secondary" onClick={()=>setShowBookingModal(false)}>Hủy</button><button className="btn btn-primary fw-bold" onClick={handleSaveBooking}>Lưu & Gửi Mail</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 3: NHÀ HÀNG (ĐÃ CẬP NHẬT: XÓA VỊ TRÍ + UPLOAD MENU) --- */}
            {showResModal && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header bg-danger text-white"><h5 className="modal-title fw-bold">{isEditingRes?'Cập nhật Nhà Hàng':'Thêm Nhà Hàng Mới'}</h5><button type="button" className="btn-close btn-close-white" onClick={()=>setShowResModal(false)}></button></div>
                            <div className="bg-light px-4 pt-3 border-bottom"><ul className="nav nav-tabs border-bottom-0">{[{id:'info',label:'Thông tin chung'}, {id:'hours',label:'Giờ mở cửa'}, {id:'features',label:'Tiện ích & Menu'}].map(t => (<li className="nav-item" key={t.id}><button className={`nav-link fw-bold ${modalTab===t.id?'active text-danger border-bottom-0':'text-secondary'}`} onClick={()=>setModalTab(t.id)}>{t.label}</button></li>))}</ul></div>
                            
                            <div className="modal-body p-4" style={{maxHeight:'70vh', overflowY:'auto'}}>
                                
                                {/* TAB 1: THÔNG TIN CHUNG (Đã xóa ID City, Lat, Long) */}
                                {modalTab === 'info' && (<div className="row g-3"><div className="col-md-4"><label className="fw-bold small mb-1">Hình ảnh đại diện</label><div className="border rounded p-2 text-center bg-light">{imagePreview ? <img src={imagePreview} className="img-fluid rounded mb-2" style={{maxHeight:'200px'}} alt=""/> : <div className="py-5 text-muted">Chưa có ảnh</div>}<input type="file" className="form-control form-control-sm" onChange={handleImageChange}/></div></div><div className="col-md-8"><div className="row g-3"><div className="col-12"><label className="fw-bold small">Tên Nhà Hàng</label><input className="form-control" value={resFormData.name} onChange={e=>setResFormData({...resFormData,name:e.target.value})}/></div><div className="col-12"><label className="fw-bold small">Địa chỉ</label><input className="form-control" value={resFormData.address} onChange={e=>setResFormData({...resFormData,address:e.target.value})}/></div><div className="col-md-6"><label className="fw-bold small">Khoảng giá</label><input className="form-control" placeholder="100.000đ - 500.000đ" value={resFormData.price_range} onChange={e=>setResFormData({...resFormData,price_range:e.target.value})}/></div><div className="col-12"><label className="fw-bold small">Mô tả</label><textarea className="form-control" rows="3" value={resFormData.description} onChange={e=>setResFormData({...resFormData,description:e.target.value})}/></div></div></div></div>)}
                                
                                {/* TAB 2: GIỜ MỞ CỬA */}
                                {modalTab === 'hours' && (<div><div className="alert alert-info small py-2 mb-3">Cấu hình giờ mở cửa cho từng ngày trong tuần.</div><div className="table-responsive border rounded"><table className="table table-sm mb-0 align-middle"><thead className="bg-light"><tr><th>Ngày</th><th>Giờ mở</th><th>Giờ đóng</th></tr></thead><tbody>{resFormData.hours && resFormData.hours.map((h, idx) => (<tr key={idx}><td className="fw-bold text-primary">{h.day_of_week}</td><td><input type="time" className="form-control form-control-sm" value={h.open_time} onChange={(e)=>handleHourChange(idx, 'open_time', e.target.value)}/></td><td><input type="time" className="form-control form-control-sm" value={h.close_time} onChange={(e)=>handleHourChange(idx, 'close_time', e.target.value)}/></td></tr>))}</tbody></table></div></div>)}
                                
                                {/* TAB 3: FEATURES & MENU (ĐÃ THÊM FORM MENU CHI TIẾT & UPLOAD ẢNH) */}
                                {modalTab === 'features' && (
                                    <div className="row g-4">
                                            {/* Cột Trái: Features */}
                                            <div className="col-md-5 border-end">
                                                <h6 className="fw-bold border-bottom pb-2">Tiện ích (Features)</h6>
                                                <div className="input-group mb-3"><input type="text" className="form-control" placeholder="Ví dụ: Wifi, Có chỗ đậu xe..." value={featureInput} onChange={e=>setFeatureInput(e.target.value)}/><button className="btn btn-outline-secondary" onClick={addFeature}>Thêm</button></div>
                                                <div className="d-flex flex-wrap gap-2">{resFormData.features.map((f, i) => (<span key={i} className="badge bg-secondary rounded-pill pe-1">{f} <i className="bi bi-x-circle ms-1 cursor-pointer" style={{cursor:'pointer'}} onClick={()=>removeFeature(i)}></i></span>))}</div>
                                            </div>
                                            
                                            {/* Cột Phải: Menu Form Mới */}
                                            <div className="col-md-7">
                                                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                                                    <h6 className="fw-bold mb-0">Thực đơn (Menu)</h6>
                                                    <button className="btn btn-sm btn-outline-success" onClick={addDish}><i className="bi bi-plus-lg me-1"></i>Thêm món</button>
                                                </div>
                                                <div style={{maxHeight:'400px', overflowY:'auto'}}>
                                                    {resFormData.menu.length === 0 && <div className="text-center text-muted py-4 small">Chưa có món ăn nào. Hãy thêm mới.</div>}
                                                    {resFormData.menu.map((dish, idx) => (
                                                        <div key={idx} className="card p-3 mb-3 border-light shadow-sm bg-white">
                                                            <div className="d-flex justify-content-between mb-2">
                                                                <span className="fw-bold text-primary">Món #{idx+1}</span>
                                                                <button className="btn btn-sm text-danger p-0" onClick={()=>removeDish(idx)}><i className="bi bi-trash"></i></button>
                                                            </div>
                                                            <div className="row g-2">
                                                                <div className="col-8"><input className="form-control form-control-sm" placeholder="Tên món ăn (Vd: Lẩu mắm)" value={dish.dish_name} onChange={e=>handleMenuChange(idx,'dish_name',e.target.value)}/></div>
                                                                <div className="col-4"><input className="form-control form-control-sm" type="number" placeholder="Giá (VNĐ)" value={dish.price} onChange={e=>handleMenuChange(idx,'price',e.target.value)}/></div>
                                                                <div className="col-12"><input className="form-control form-control-sm" placeholder="Mô tả ngắn (Tùy chọn)" value={dish.description} onChange={e=>handleMenuChange(idx,'description',e.target.value)}/></div>
                                                                
                                                                {/* 🔥 CỤM UPLOAD ẢNH MÓN ĂN */}
                                                                <div className="col-12 d-flex gap-2 align-items-center">
                                                                    <div className="border rounded d-flex align-items-center justify-content-center bg-light" style={{width:'40px', height:'40px', overflow:'hidden'}}>
                                                                            {dish.image_url ? <img src={dish.image_url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/> : <i className="bi bi-image text-muted"></i>}
                                                                    </div>
                                                                    <div className="flex-grow-1">
                                                                            <div className="input-group input-group-sm">
                                                                                <input type="text" className="form-control" placeholder="Link ảnh hoặc upload..." value={dish.image_url} readOnly />
                                                                                <label className="btn btn-outline-secondary">
                                                                                    <i className="bi bi-upload"></i> <input type="file" hidden onChange={(e) => handleMenuImageUpload(idx, e.target.files[0])} />
                                                                                </label>
                                                                            </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light"><button className="btn btn-secondary" onClick={()=>setShowResModal(false)}>Hủy</button><button className="btn btn-danger fw-bold" onClick={handleSaveRes}>Lưu Tất Cả</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantManagementPage;