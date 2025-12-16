import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const UserManagementPage = () => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    
    // Filters
    const [roleFilter, setRoleFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        user_id: null, full_name: '', email: '', phone: '', role: 'customer', password: ''
    });

    // --- FETCH DATA ---
    const fetchUsers = () => {
        setLoading(true);
        fetch(`http://localhost:8082/api/admin/users?role=${roleFilter}&search=${search}`)
            .then(res => res.json())
            .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, [roleFilter, search]);

    // --- HANDLERS ---
    const handleOpenModal = (user = null) => {
        if (user) {
            setFormData({ ...user, password: '' }); // Không hiện mật khẩu cũ
            setIsEditing(true);
        } else {
            setFormData({ user_id: null, full_name: '', email: '', phone: '', role: 'customer', password: '' });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleSave = () => {
        if (!formData.full_name || !formData.email) return alert("Vui lòng điền đủ tên và email");
        if (!isEditing && !formData.password) return alert("Vui lòng nhập mật khẩu cho tài khoản mới");

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing 
            ? `http://localhost:8082/api/admin/users/${formData.user_id}` 
            : `http://localhost:8082/api/admin/users`;

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        }).then(res => res.json()).then(data => {
            if (data.success) {
                alert(isEditing ? "Cập nhật thành công!" : "Thêm mới thành công!");
                setShowModal(false);
                fetchUsers();
            } else {
                alert("Lỗi: " + data.message);
            }
        });
    };

    const handleDelete = (id) => {
        if (!window.confirm("Bạn chắc chắn muốn xóa người dùng này? Dữ liệu liên quan có thể bị mất.")) return;
        fetch(`http://localhost:8082/api/admin/users/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) { alert("Đã xóa!"); fetchUsers(); }
                else alert("Lỗi: " + data.error);
            });
    };

    // UI Helpers
    const getRoleBadge = (role) => {
        if (role === 'owner') return <span className="badge bg-purple text-white shadow-sm" style={{backgroundColor: '#6f42c1'}}><i className="bi bi-briefcase-fill me-1"></i> Owner</span>;
        if (role === 'customer') return <span className="badge bg-info text-dark shadow-sm"><i className="bi bi-person-fill me-1"></i> Customer</span>;
        return <span className="badge bg-secondary">{role}</span>;
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            {/* Header */}
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{zIndex:99}}>
                <div className="d-flex align-items-center">
                    <div className="bg-primary text-white rounded p-2 me-3"><i className="bi bi-people-fill fs-5"></i></div>
                    <div><h5 className="fw-bold mb-0 text-dark">Quản Lý Người Dùng</h5><small className="text-muted">Users & Owners</small></div>
                </div>
                <div className="d-flex gap-3">
                    <input type="text" className="form-control rounded-pill" placeholder="Tìm tên, email, sđt..." value={search} onChange={e=>setSearch(e.target.value)} style={{width: 300}}/>
                    <Link to="/admin" className="btn btn-outline-dark rounded-pill fw-bold">Dashboard</Link>
                </div>
            </div>

            <div className="container-fluid p-4">
                {/* Filters & Actions */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="btn-group shadow-sm">
                        <button className={`btn px-4 fw-bold ${roleFilter==='all'?'btn-dark':'btn-white bg-white'}`} onClick={()=>setRoleFilter('all')}>Tất cả</button>
                        <button className={`btn px-4 fw-bold ${roleFilter==='customer'?'btn-dark':'btn-white bg-white'}`} onClick={()=>setRoleFilter('customer')}>Khách hàng</button>
                        <button className={`btn px-4 fw-bold ${roleFilter==='owner'?'btn-dark':'btn-white bg-white'}`} onClick={()=>setRoleFilter('owner')}>Chủ dịch vụ</button>
                    </div>
                    <button className="btn btn-success fw-bold rounded-pill shadow-sm" onClick={() => handleOpenModal(null)}>
                        <i className="bi bi-person-plus-fill me-2"></i>Thêm Người Dùng
                    </button>
                </div>

                {/* Table */}
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-secondary small text-uppercase">
                                <tr>
                                    <th className="ps-4 py-3">ID</th>
                                    <th>Họ và tên</th>
                                    <th>Thông tin liên hệ</th>
                                    <th>Vai trò</th>
                                    <th>Ngày tham gia</th>
                                    <th className="text-end pe-4">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? <tr><td colSpan="6" className="text-center py-5">Đang tải...</td></tr> :
                                users.map(u => (
                                    <tr key={u.user_id}>
                                        <td className="ps-4 fw-bold text-muted">#{u.user_id}</td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div className="bg-light rounded-circle border d-flex justify-content-center align-items-center me-3 fw-bold text-primary" style={{width:'40px', height:'40px'}}>
                                                    {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <span className="fw-bold text-dark">{u.full_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="small"><i className="bi bi-envelope me-2 text-muted"></i>{u.email}</div>
                                            <div className="small"><i className="bi bi-telephone me-2 text-muted"></i>{u.phone || '---'}</div>
                                        </td>
                                        <td>{getRoleBadge(u.role)}</td>
                                        <td className="text-muted small">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                                        <td className="text-end pe-4">
                                            <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm me-2" onClick={()=>handleOpenModal(u)} title="Sửa"><i className="bi bi-pencil-fill"></i></button>
                                            <button className="btn btn-outline-danger btn-sm rounded-circle shadow-sm" onClick={()=>handleDelete(u.user_id)} title="Xóa"><i className="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && !loading && <tr><td colSpan="6" className="text-center py-5 text-muted">Không tìm thấy người dùng nào.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Add/Edit */}
            {showModal && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-dark text-white">
                                <h5 className="modal-title fw-bold">{isEditing ? 'Cập Nhật Người Dùng' : 'Thêm Người Dùng Mới'}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="fw-bold small">Họ và tên</label>
                                        <input type="text" className="form-control" value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="fw-bold small">Email</label>
                                        <input type="email" className="form-control" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="fw-bold small">Số điện thoại</label>
                                        <input type="text" className="form-control" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="fw-bold small">Vai trò (Role)</label>
                                        <select className="form-select" value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})}>
                                            <option value="customer">Khách hàng (Customer)</option>
                                            <option value="owner">Chủ dịch vụ (Owner)</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="fw-bold small">Mật khẩu {isEditing && '(Để trống nếu không đổi)'}</label>
                                        <input type="password" className="form-control" placeholder="******" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light">
                                <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Hủy</button>
                                <button className="btn btn-primary fw-bold" onClick={handleSave}>Lưu thông tin</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;