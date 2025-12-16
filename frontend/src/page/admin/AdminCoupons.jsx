import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminCoupons = () => {
    // --- STATE ---
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // CẤU HÌNH API
    const API_URL = "http://localhost:8082/api/coupons"; 

    // Form Initial State
    const initialFormState = {
        coupon_id: null,
        code: '',
        description: '',
        discount_amount: 0,
        discount_percent: 0,
        min_order_value: 0,
        service_type: 'ALL',
        start_date: '',
        expiry_date: '',
        image_url: '',
        usage_limit: 100,
        max_usage_per_user: 1,
        is_event: false
    };

    const [formData, setFormData] = useState(initialFormState);

    // --- 1. CALL API: LẤY DANH SÁCH ---
    const fetchCoupons = async () => {
        try {
            const res = await axios.get(API_URL);
            setCoupons(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Lỗi khi tải danh sách coupon:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    // --- 2. HELPER FUNCTIONS ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDateForInput = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toISOString().split('T')[0];
    };

    const getStatus = (expiryDate, limit, used) => {
        const today = new Date();
        const exp = new Date(expiryDate);
        if (used >= limit) return <span className="badge bg-secondary">Hết lượt</span>;
        if (today > exp) return <span className="badge bg-danger">Hết hạn</span>;
        return <span className="badge bg-success">Đang hoạt động</span>;
    };

    // --- 3. HANDLERS ---
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Logic: Nếu đang nhập mã code thì tự động viết hoa
        let finalValue = value;
        if (name === 'code') {
            finalValue = value.toUpperCase();
        }

        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : finalValue
        });
    };

    const handleAddNew = () => {
        setFormData(initialFormState);
        setIsEditing(false);
        setShowModal(true);
    };

    const handleEdit = (coupon) => {
        setFormData({
            ...coupon,
            // Xử lý ngày tháng cẩn thận để tránh lỗi input date
            start_date: coupon.start_date ? formatDateForInput(coupon.start_date) : '',
            expiry_date: coupon.expiry_date ? formatDateForInput(coupon.expiry_date) : '',
            is_event: Boolean(coupon.is_event) 
        });
        setIsEditing(true);
        setShowModal(true);
    };

    // --- 4. CALL API: THÊM / SỬA ---
    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!formData.code || !formData.expiry_date) {
            alert('Vui lòng nhập Mã Coupon và Ngày hết hạn!');
            return;
        }

        try {
            if (isEditing) {
                // UPDATE
                await axios.put(`${API_URL}/${formData.coupon_id}`, formData);
                alert("Cập nhật thành công!");
            } else {
                // CREATE
                await axios.post(API_URL, formData);
                alert("Thêm mới thành công!");
            }
            setShowModal(false);
            fetchCoupons(); // Load lại danh sách mới
        } catch (err) {
            console.error(err);
            // 🔥 NÂNG CẤP: Hiển thị lỗi chính xác từ Backend (vd: Mã trùng)
            const errorMsg = err.response?.data || "Có lỗi xảy ra, vui lòng thử lại!";
            alert(errorMsg); 
        }
    };

    // --- 5. CALL API: XÓA ---
    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa mã giảm giá này không?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                // Cập nhật giao diện ngay lập tức mà không cần gọi lại API fetch
                setCoupons(coupons.filter(c => c.coupon_id !== id));
            } catch (err) {
                console.error(err);
                const errorMsg = err.response?.data || "Không thể xóa coupon này!";
                alert(errorMsg);
            }
        }
    };

    // Lọc tìm kiếm
    const filteredCoupons = coupons.filter(c => 
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER ---
    return (
        <div className="container-fluid p-0">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold text-dark">Quản lý Mã giảm giá</h3>
                <button className="btn btn-primary" onClick={handleAddNew}>
                    <i className="bi bi-plus-lg me-2"></i> Thêm mã mới
                </button>
            </div>

            {/* Search */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="input-group" style={{maxWidth: '400px'}}>
                        <span className="input-group-text bg-white border-end-0">
                            <i className="bi bi-search text-muted"></i>
                        </span>
                        <input 
                            type="text" 
                            className="form-control border-start-0 ps-0" 
                            placeholder="Tìm kiếm mã, mô tả..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">Mã Coupon</th>
                                        <th>Giảm giá</th>
                                        <th>Dịch vụ</th>
                                        <th>Điều kiện</th>
                                        <th>Lượt dùng</th>
                                        <th>Thời hạn</th>
                                        <th>Trạng thái</th>
                                        <th className="text-end pe-4">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCoupons.length > 0 ? filteredCoupons.map((coupon) => (
                                        <tr key={coupon.coupon_id}>
                                            <td className="ps-4">
                                                <div className="fw-bold text-primary">{coupon.code}</div>
                                                <small className="text-muted d-block text-truncate" style={{maxWidth: '200px'}}>
                                                    {coupon.description}
                                                </small>
                                                {coupon.is_event ? <span className="badge bg-warning text-dark mt-1" style={{fontSize:'10px'}}>Sự kiện</span> : null}
                                            </td>
                                            <td>
                                                {coupon.discount_percent > 0 ? (
                                                    <span className="text-danger fw-bold">{coupon.discount_percent}%</span>
                                                ) : (
                                                    <span className="text-success fw-bold">{formatCurrency(coupon.discount_amount)}</span>
                                                )}
                                            </td>
                                            <td><span className="badge bg-info text-dark">{coupon.service_type}</span></td>
                                            <td><small>Min: {formatCurrency(coupon.min_order_value)}</small></td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="progress flex-grow-1 me-2" style={{height: '6px', width: '60px'}}>
                                                        <div className="progress-bar bg-primary" style={{width: `${(coupon.used_count / coupon.usage_limit) * 100}%`}}></div>
                                                    </div>
                                                    <small>{coupon.used_count}/{coupon.usage_limit}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <small className="text-muted">
                                                    {coupon.start_date ? new Date(coupon.start_date).toLocaleDateString('vi-VN') : '...'} <br/>
                                                    ➜ {new Date(coupon.expiry_date).toLocaleDateString('vi-VN')}
                                                </small>
                                            </td>
                                            <td>{getStatus(coupon.expiry_date, coupon.usage_limit, coupon.used_count)}</td>
                                            <td className="text-end pe-4">
                                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(coupon)}>
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(coupon.coupon_id)}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="8" className="text-center py-4 text-muted">Không tìm thấy mã giảm giá nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{isEditing ? 'Cập nhật Coupon' : 'Thêm Coupon Mới'}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Mã Coupon <span className="text-danger">*</span></label>
                                            <input 
                                                type="text" 
                                                className="form-control text-uppercase" 
                                                name="code" 
                                                value={formData.code} 
                                                onChange={handleChange} 
                                                required 
                                                placeholder="VD: SALE50"
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Dịch vụ áp dụng</label>
                                            <select className="form-select" name="service_type" value={formData.service_type} onChange={handleChange}>
                                                <option value="ALL">Tất cả (ALL)</option>
                                                <option value="HOTEL">Khách sạn (HOTEL)</option>
                                                <option value="TOUR">Tour du lịch (TOUR)</option>
                                                <option value="RESTAURANT">Nhà hàng (RESTAURANT)</option>
                                            </select>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Mô tả</label>
                                            <textarea className="form-control" name="description" value={formData.description} onChange={handleChange} placeholder="Mô tả ngắn gọn về mã giảm giá..."></textarea>
                                        </div>
                                        
                                        <div className="col-md-4">
                                            <label className="form-label">Giảm theo %</label>
                                            <div className="input-group">
                                                <input type="number" className="form-control" name="discount_percent" value={formData.discount_percent} onChange={handleChange} min="0" max="100"/>
                                                <span className="input-group-text">%</span>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Giảm tiền mặt</label>
                                            <div className="input-group">
                                                <input type="number" className="form-control" name="discount_amount" value={formData.discount_amount} onChange={handleChange} min="0"/>
                                                <span className="input-group-text">đ</span>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Đơn tối thiểu</label>
                                            <div className="input-group">
                                                <input type="number" className="form-control" name="min_order_value" value={formData.min_order_value} onChange={handleChange} min="0"/>
                                                <span className="input-group-text">đ</span>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label">Ngày bắt đầu</label>
                                            <input type="date" className="form-control" name="start_date" value={formData.start_date} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Ngày hết hạn <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control" name="expiry_date" value={formData.expiry_date} onChange={handleChange} required />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label">Tổng lượt dùng</label>
                                            <input type="number" className="form-control" name="usage_limit" value={formData.usage_limit} onChange={handleChange} min="1"/>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Max/User</label>
                                            <input type="number" className="form-control" name="max_usage_per_user" value={formData.max_usage_per_user} onChange={handleChange} min="1"/>
                                        </div>
                                        <div className="col-md-4 d-flex align-items-center mt-4">
                                            <div className="form-check form-switch">
                                                <input className="form-check-input" type="checkbox" id="isEvent" name="is_event" checked={formData.is_event} onChange={handleChange} />
                                                <label className="form-check-label" htmlFor="isEvent">Sự kiện đặc biệt?</label>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Link ảnh banner</label>
                                            <input type="text" className="form-control" name="image_url" value={formData.image_url} onChange={handleChange} placeholder="https://..." />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary">{isEditing ? 'Cập nhật' : 'Thêm mới'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;