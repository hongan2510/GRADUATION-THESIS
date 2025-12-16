import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // <--- ĐÃ BỔ SUNG DÒNG NÀY

const HotelManagementPage = () => {
    // --- STATES ---
    const [activeTab, setActiveTab] = useState('hotels'); 
    const [hotels, setHotels] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal Hotel Detail
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    
    // Modal Owner (Add/Edit)
    const [showOwnerModal, setShowOwnerModal] = useState(false);
    const [ownerFormData, setOwnerFormData] = useState({ owner_id: null, owner_name: '', owner_email: '', owner_phone: '' });
    const [isEditingOwner, setIsEditingOwner] = useState(false);
    const [isSaving, setIsSaving] = useState(false); 

    // --- FETCH DATA ---
    const fetchData = () => {
        setLoading(true);
        if (activeTab === 'hotels') {
            fetch(`http://localhost:8082/api/admin/hotels-manager?search=${search}`)
                .then(res => res.json())
                .then(data => { 
                    setHotels(Array.isArray(data) ? data : []); 
                    setLoading(false); 
                })
                .catch(() => { setHotels([]); setLoading(false); });
        } else {
            fetch(`http://localhost:8082/api/admin/owners-manager`)
                .then(res => res.json())
                .then(data => { 
                    setOwners(Array.isArray(data) ? data : []); 
                    setLoading(false); 
                })
                .catch(() => { setOwners([]); setLoading(false); });
        }
    };

    useEffect(() => { fetchData(); }, [activeTab, search]);

    // --- ACTIONS KHÁCH SẠN ---
    const handleViewDetail = (id) => {
        setLoadingDetail(true);
        setShowDetailModal(true);
        
        fetch(`http://localhost:8082/api/admin/hotels/${id}/full-details`)
            .then(res => res.json())
            .then(data => {
                setSelectedHotel(data);
                setLoadingDetail(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingDetail(false);
            });
    };

    // --- ACTIONS CHỦ SỞ HỮU ---
    const handleAddOwner = () => {
        setOwnerFormData({ owner_id: null, owner_name: '', owner_email: '', owner_phone: '' });
        setIsEditingOwner(false);
        setShowOwnerModal(true);
    };

    const handleEditOwner = (owner) => {
        setOwnerFormData({ ...owner });
        setIsEditingOwner(true);
        setShowOwnerModal(true);
    };

    const handleDeleteOwner = (id) => {
        if(!window.confirm("Bạn có chắc muốn xóa chủ sở hữu này? Tài khoản đăng nhập của họ cũng sẽ bị xóa.")) return;
        fetch(`http://localhost:8082/api/admin/owners/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    alert("Đã xóa thành công!");
                    fetchData();
                } else {
                    alert("Lỗi: " + data.message);
                }
            });
    };

    const handleSaveOwner = () => {
        const url = isEditingOwner 
            ? `http://localhost:8082/api/admin/owners/${ownerFormData.owner_id}`
            : `http://localhost:8082/api/admin/owners-create-account`;
        const method = isEditingOwner ? 'PUT' : 'POST';

        setIsSaving(true);

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ownerFormData)
        }).then(res => res.json()).then(data => {
            setIsSaving(false);
            if(data.success) {
                alert(isEditingOwner ? "Cập nhật thành công!" : `Đã tạo tài khoản thành công!\nThông tin đăng nhập đã được gửi tới email.`);
                setShowOwnerModal(false);
                fetchData();
            } else {
                alert("Lỗi: " + (data.message || data.error));
            }
        }).catch(() => {
            setIsSaving(false);
            alert("Lỗi kết nối server");
        });
    };

    // Helper: Stars
    const renderStars = (count) => [...Array(5)].map((_, i) => <i key={i} className={`bi bi-star-fill small ${i < count ? 'text-warning' : 'text-secondary opacity-25'}`}></i>);

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            
            {/* Header */}
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{zIndex: 999}}>
                <div className="d-flex align-items-center">
                    <div className="bg-primary text-white rounded p-2 me-3"><i className="bi bi-buildings-fill fs-5"></i></div>
                    <div><h5 className="fw-bold mb-0 text-dark">Quản Lý Khách Sạn</h5><small className="text-muted">Hotels & Owners</small></div>
                </div>
                <div className="d-flex gap-3">
                    <input type="text" className="form-control rounded-pill" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} disabled={activeTab === 'owners'} />
                    <Link to="/admin" className="btn btn-outline-dark rounded-pill fw-bold"><i className="bi bi-grid me-2"></i>Dashboard</Link>
                </div>
            </div>

            <div className="container-fluid p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex gap-3">
                        <button className={`btn rounded-pill px-4 fw-bold ${activeTab === 'hotels' ? 'btn-dark' : 'btn-white bg-white border'}`} onClick={() => setActiveTab('hotels')}><i className="bi bi-building me-2"></i>Khách sạn</button>
                        <button className={`btn rounded-pill px-4 fw-bold ${activeTab === 'owners' ? 'btn-dark' : 'btn-white bg-white border'}`} onClick={() => setActiveTab('owners')}><i className="bi bi-person-badge me-2"></i>Chủ sở hữu</button>
                    </div>
                    {activeTab === 'owners' && (
                        <button className="btn btn-success rounded-pill px-4 shadow-sm" onClick={handleAddOwner}>
                            <i className="bi bi-plus-lg me-2"></i>Thêm Chủ Mới
                        </button>
                    )}
                </div>

                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    {/* TAB HOTEL */}
                    {activeTab === 'hotels' && (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light text-secondary small text-uppercase">
                                    <tr>
                                        <th className="ps-4 py-3">ID</th>
                                        <th>Khách sạn</th>
                                        <th>Khu vực</th>
                                        <th>Chủ sở hữu</th>
                                        <th>Giá từ</th>
                                        <th>Đánh giá</th>
                                        <th className="text-end pe-4">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr> :
                                    hotels.length > 0 ? hotels.map(h => (
                                        <tr key={h.hotel_id} style={{cursor: 'pointer'}} onClick={() => handleViewDetail(h.hotel_id)}>
                                            <td className="ps-4 fw-bold text-primary">#{h.hotel_id}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <img src={h.image_url || 'https://via.placeholder.com/50'} className="rounded-3 me-3 border" width="50" height="50" style={{objectFit:'cover'}} alt="" />
                                                    <div><div className="fw-bold text-dark">{h.name}</div><div className="small text-muted">{h.total_rooms || 0} phòng</div></div>
                                                </div>
                                            </td>
                                            <td><span className="badge bg-light text-dark border">{h.city_name || 'Cần Thơ'}</span></td>
                                            <td><div className="fw-semibold text-dark">{h.owner_name || '---'}</div><div className="small text-muted">{h.owner_email}</div></td>
                                            <td className="fw-bold text-success">{h.min_price ? new Intl.NumberFormat('vi-VN').format(h.min_price) + ' đ' : 'Liên hệ'}</td>
                                            <td>{renderStars(h.star_rating)}</td>
                                            <td className="text-end pe-4"><button className="btn btn-light btn-sm rounded-circle border"><i className="bi bi-eye"></i></button></td>
                                        </tr>
                                    )) : <tr><td colSpan="7" className="text-center py-5 text-muted">Không có dữ liệu</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB OWNERS */}
                    {activeTab === 'owners' && (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light text-secondary small text-uppercase">
                                    <tr>
                                        <th className="ps-4 py-3">ID</th>
                                        <th>Họ tên & Tài khoản</th>
                                        <th>Liên hệ</th>
                                        <th>Số lượng KS</th>
                                        <th>Danh sách KS</th>
                                        <th className="text-end pe-4">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="6" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr> :
                                    owners.length > 0 ? owners.map(o => (
                                        <tr key={o.owner_id}>
                                            <td className="ps-4 fw-bold text-primary">#{o.owner_id}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-info bg-opacity-10 text-info rounded-circle p-2 me-2"><i className="bi bi-person-fill fs-5"></i></div>
                                                    <div>
                                                        <div className="fw-bold">{o.owner_name}</div>
                                                        {o.username && <small className="text-success fw-bold bg-success bg-opacity-10 px-2 rounded-pill">User: {o.username}</small>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div><i className="bi bi-telephone me-2 text-muted"></i>{o.owner_phone}</div>
                                                <div><i className="bi bi-envelope me-2 text-muted"></i>{o.owner_email}</div>
                                            </td>
                                            <td><span className="badge bg-primary rounded-pill px-3">{o.total_hotels} KS</span></td>
                                            <td><div className="text-truncate" style={{maxWidth: '300px'}}>{o.hotel_names || 'Chưa có'}</div></td>
                                            <td className="text-end pe-4">
                                                <button className="btn btn-outline-primary btn-sm me-2" onClick={() => handleEditOwner(o)}><i className="bi bi-pencil"></i></button>
                                                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteOwner(o.owner_id)}><i className="bi bi-trash"></i></button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="6" className="text-center py-5 text-muted">Chưa có dữ liệu chủ sở hữu</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL CHI TIẾT KHÁCH SẠN --- */}
            {showDetailModal && selectedHotel && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-xl">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header border-bottom px-4">
                                <h5 className="modal-title fw-bold">Chi tiết: {selectedHotel.name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)}></button>
                            </div>
                            <div className="modal-body p-0">
                                {loadingDetail ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                ) : (
                                    <div className="row g-0">
                                        <div className="col-md-4 bg-light border-end">
                                            <div className="p-4 text-center border-bottom">
                                                <img src={selectedHotel.image_url || 'https://via.placeholder.com/300'} className="w-100 rounded-3 shadow-sm mb-3" style={{height:'200px', objectFit:'cover'}} alt="" />
                                                <h4 className="fw-bold mb-1">{selectedHotel.name}</h4>
                                                <div className="mb-2">{renderStars(selectedHotel.star_rating)}</div>
                                                <p className="text-muted small"><i className="bi bi-geo-alt-fill me-1"></i>{selectedHotel.address}</p>
                                            </div>
                                            <div className="p-4">
                                                <h6 className="fw-bold small text-muted mb-3">CHỦ SỞ HỮU</h6>
                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="bg-white p-2 rounded-circle shadow-sm me-3"><i className="bi bi-person-circle fs-4"></i></div>
                                                    <div>
                                                        <div className="fw-bold">{selectedHotel.owner_name || 'Chưa cập nhật'}</div>
                                                        <div className="small text-muted">{selectedHotel.owner_email}</div>
                                                    </div>
                                                </div>
                                                <hr className="opacity-25"/>
                                                <h6 className="fw-bold small text-muted mb-3">TIỆN ÍCH</h6>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {selectedHotel.amenities?.length > 0 ? selectedHotel.amenities.map((am, i) => (
                                                        <span key={i} className="badge bg-white text-dark border shadow-sm">{am.amenity_name}</span>
                                                    )) : <span className="text-muted small">Chưa có tiện ích</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-8">
                                            <div className="p-4">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <h5 className="fw-bold mb-0">Danh sách phòng ({selectedHotel.rooms ? selectedHotel.rooms.length : 0})</h5>
                                                    <span className="badge bg-light text-muted border">Real-time Availability</span>
                                                </div>
                                                <div className="card border shadow-sm rounded-3 overflow-hidden">
                                                    <table className="table table-hover align-middle mb-0">
                                                        <thead className="bg-light text-secondary small">
                                                            <tr>
                                                                <th className="ps-3">Loại phòng</th>
                                                                <th>Kích thước</th>
                                                                <th>Sức chứa</th>
                                                                <th>Giá đêm</th>
                                                                <th>Tồn kho</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedHotel.rooms && selectedHotel.rooms.map(room => {
                                                                const available = (room.total_inventory || 0) - (room.booked_count || 0);
                                                                return (
                                                                    <tr key={room.room_id}>
                                                                        <td className="ps-3 fw-bold text-primary">{room.room_type_name}</td>
                                                                        <td className="small text-muted">{room.size} m²</td>
                                                                        <td className="small text-muted">{room.max_guests} người</td>
                                                                        <td className="text-success fw-bold">{new Intl.NumberFormat('vi-VN').format(room.price_per_night)} đ</td>
                                                                        <td>
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <span className={`badge ${available > 0 ? 'bg-success' : 'bg-danger'} rounded-pill`}>Trống: {Math.max(0, available)}</span>
                                                                                <span className="badge bg-light text-muted border" title="Tổng số phòng">Tổng: {room.total_inventory}</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="mt-4 p-3 bg-white border rounded">
                                                    <h6 className="fw-bold mb-2">Mô tả & Chính sách</h6>
                                                    <p className="text-muted small mb-2">{selectedHotel.description}</p>
                                                    <small className="d-block text-primary"><strong>Check-in:</strong> {selectedHotel.check_in_time} | <strong>Check-out:</strong> {selectedHotel.check_out_time}</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-0 bg-light">
                                <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL THÊM/SỬA CHỦ SỞ HỮU --- */}
            {showOwnerModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold">{isEditingOwner ? 'Cập nhật Chủ sở hữu' : 'Thêm Chủ sở hữu mới'}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowOwnerModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="alert alert-info small border-0 bg-info bg-opacity-10 text-info">
                                    <i className="bi bi-info-circle me-2"></i>
                                    {isEditingOwner ? "Bạn đang chỉnh sửa thông tin liên hệ." : "Hệ thống sẽ tự động tạo tài khoản đăng nhập và gửi email cho chủ sở hữu."}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Họ tên</label>
                                    <input type="text" className="form-control" value={ownerFormData.owner_name} onChange={e => setOwnerFormData({...ownerFormData, owner_name: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Email (Dùng để nhận TK)</label>
                                    <input type="email" className="form-control" value={ownerFormData.owner_email} onChange={e => setOwnerFormData({...ownerFormData, owner_email: e.target.value})} disabled={isEditingOwner} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Số điện thoại</label>
                                    <input type="text" className="form-control" value={ownerFormData.owner_phone} onChange={e => setOwnerFormData({...ownerFormData, owner_phone: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-footer border-0">
                                <button className="btn btn-light" onClick={() => setShowOwnerModal(false)} disabled={isSaving}>Hủy</button>
                                <button className="btn btn-primary px-4" onClick={handleSaveOwner} disabled={isSaving}>
                                    {isSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang xử lý...</> : "Lưu thông tin"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HotelManagementPage;