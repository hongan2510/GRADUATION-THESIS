import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const ReviewManagementPage = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState('all'); 
    const [filterRating, setFilterRating] = useState('all');
    const [search, setSearch] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    // --- REPLY MODAL STATES ---
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // --- FETCH DATA ---
    const fetchReviews = () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: currentPage,
            limit: LIMIT,
            type: filterType,
            rating: filterRating,
            search: search
        });

        fetch(`http://localhost:8082/api/admin/reviews?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                setReviews(data.data || []);
                setTotalPages(data.pagination?.total_pages || 1);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchReviews();
    }, [currentPage, filterType, filterRating]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchReviews();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // --- ACTIONS ---
    const handleDelete = (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa đánh giá này không?")) return;
        fetch(`http://localhost:8082/api/admin/reviews/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Đã xóa đánh giá!");
                    fetchReviews();
                } else alert("Lỗi: " + data.message);
            });
    };

    // --- HANDLE REPLY ---
    const handleOpenReply = (review) => {
        setSelectedReview(review);
        setReplyText(review.admin_reply || ''); // Load nội dung cũ nếu có để sửa
        setShowReplyModal(true);
    };

    const handleSubmitReply = () => {
        if (!replyText.trim()) return alert("Vui lòng nhập nội dung phản hồi!");
        
        setSendingReply(true);
        fetch(`http://localhost:8082/api/admin/reviews/${selectedReview.review_id}/reply`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: replyText })
        })
        .then(res => res.json())
        .then(data => {
            setSendingReply(false);
            if (data.success) {
                alert("Đã gửi phản hồi thành công!");
                setShowReplyModal(false);
                fetchReviews(); // Reload lại danh sách để hiện phản hồi mới
            } else {
                alert("Lỗi: " + (data.message || "Không thể gửi phản hồi"));
            }
        })
        .catch(() => {
            setSendingReply(false);
            alert("Lỗi kết nối server!");
        });
    };

    // --- HELPER RENDER STARS ---
    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) stars.push(<i key={i} className="bi bi-star-fill text-warning me-1"></i>);
            else stars.push(<i key={i} className="bi bi-star text-secondary opacity-25 me-1"></i>);
        }
        return <div className="small">{stars}</div>;
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'hotel': return <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">Khách sạn</span>;
            case 'tour': return <span className="badge bg-success bg-opacity-10 text-success border border-success">Tour</span>;
            case 'restaurant': return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">Nhà hàng</span>;
            default: return <span className="badge bg-secondary">Khác</span>;
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{zIndex: 99}}>
                <div className="d-flex align-items-center">
                    <div className="bg-warning text-dark rounded p-2 me-3"><i className="bi bi-star-half fs-5"></i></div>
                    <div><h5 className="fw-bold mb-0 text-dark">Quản Lý Đánh Giá</h5><small className="text-muted">Kiểm duyệt & Phản hồi</small></div>
                </div>
                <div className="d-flex gap-3">
                    <Link to="/admin" className="btn btn-outline-dark rounded-pill fw-bold"><i className="bi bi-grid me-2"></i>Dashboard</Link>
                </div>
            </div>

            <div className="container-fluid p-4">
                {/* Filter Toolbar */}
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-body p-3">
                        <div className="row g-3">
                            <div className="col-md-4">
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                                    <input type="text" className="form-control bg-light border-start-0" placeholder="Tìm theo tên user, dịch vụ..." value={search} onChange={(e) => setSearch(e.target.value)}/>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <select className="form-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                                    <option value="all">-- Tất cả dịch vụ --</option>
                                    <option value="hotel">Khách sạn</option>
                                    <option value="tour">Tour du lịch</option>
                                    <option value="restaurant">Nhà hàng</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <select className="form-select" value={filterRating} onChange={(e) => { setFilterRating(e.target.value); setCurrentPage(1); }}>
                                    <option value="all">-- Tất cả số sao --</option>
                                    <option value="5">5 Sao (Tuyệt vời)</option>
                                    <option value="4">4 Sao (Tốt)</option>
                                    <option value="3">3 Sao (Bình thường)</option>
                                    <option value="2">2 Sao (Tệ)</option>
                                    <option value="1">1 Sao (Rất tệ)</option>
                                </select>
                            </div>
                            <div className="col-md-2 text-end">
                                <button className="btn btn-secondary w-100" onClick={() => { setSearch(''); setFilterType('all'); setFilterRating('all'); }}><i className="bi bi-arrow-counterclockwise me-1"></i> Reset</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews List */}
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-secondary small text-uppercase">
                                <tr>
                                    <th style={{width: '20%'}}>Người dùng</th>
                                    <th style={{width: '20%'}}>Dịch vụ</th>
                                    <th style={{width: '10%'}}>Đánh giá</th>
                                    <th style={{width: '40%'}}>Nội dung & Phản hồi</th>
                                    <th style={{width: '10%'}} className="text-end pe-4">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                                ) : reviews.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-5 text-muted">Không tìm thấy đánh giá nào.</td></tr>
                                ) : (
                                    reviews.map(item => (
                                        <tr key={item.review_id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <img src={item.user_avatar || 'https://via.placeholder.com/40'} alt="avt" className="rounded-circle border me-2" style={{width:'40px', height:'40px', objectFit:'cover'}}/>
                                                    <div>
                                                        <div className="fw-bold text-dark small">{item.user_name || 'Người dùng ẩn'}</div>
                                                        <div className="text-muted smaller" style={{fontSize: '0.75rem'}}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <img src={item.service_image || 'https://via.placeholder.com/50'} alt="svc" className="rounded me-2" style={{width:'50px', height:'35px', objectFit:'cover'}}/>
                                                    <div>
                                                        <div className="fw-bold text-truncate" style={{maxWidth: '150px'}} title={item.service_name}>{item.service_name}</div>
                                                        <div className="mt-1">{getTypeBadge(item.review_type)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className={`fw-bold fs-5 ${item.rating >= 4 ? 'text-success' : (item.rating >= 3 ? 'text-warning' : 'text-danger')}`}>{item.rating}/5</span>
                                                    {renderStars(item.rating)}
                                                </div>
                                            </td>
                                            <td>
                                                {/* User Comment */}
                                                <div className="bg-light p-2 rounded small text-dark fst-italic border mb-2">
                                                    "{item.comment || 'Không có nội dung'}"
                                                </div>
                                                
                                                {/* Admin Reply (Nếu có) */}
                                                {item.admin_reply && (
                                                    <div className="d-flex align-items-start mt-2 ms-3">
                                                        <i className="bi bi-arrow-return-right text-primary me-2"></i>
                                                        <div className="bg-primary bg-opacity-10 p-2 rounded small text-primary border border-primary w-100">
                                                            <strong>Admin: </strong> {item.admin_reply}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    {/* Nút Reply */}
                                                    <button 
                                                        className={`btn btn-sm rounded-circle shadow-sm border ${item.admin_reply ? 'btn-primary text-white' : 'btn-outline-primary'}`}
                                                        title={item.admin_reply ? "Sửa phản hồi" : "Phản hồi đánh giá"}
                                                        onClick={() => handleOpenReply(item)}
                                                    >
                                                        <i className="bi bi-reply-fill"></i>
                                                    </button>
                                                    {/* Nút Delete */}
                                                    <button 
                                                        className="btn btn-outline-danger btn-sm rounded-circle shadow-sm" 
                                                        title="Xóa đánh giá này"
                                                        onClick={() => handleDelete(item.review_id)}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="card-footer bg-white py-3 d-flex justify-content-end">
                            <nav>
                                <ul className="pagination pagination-sm mb-0 shadow-sm">
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(c => c - 1)}>Trước</button></li>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}><button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button></li>
                                    ))}
                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(c => c + 1)}>Sau</button></li>
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL PHẢN HỒI --- */}
            {showReplyModal && selectedReview && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold"><i className="bi bi-reply-fill me-2"></i>Phản hồi đánh giá</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowReplyModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="mb-3">
                                    <label className="small text-muted fw-bold mb-1">Nội dung đánh giá của khách:</label>
                                    <div className="p-3 bg-light rounded border fst-italic text-secondary">
                                        "{selectedReview.comment}"
                                    </div>
                                </div>
                                <div>
                                    <label className="small text-muted fw-bold mb-1">Câu trả lời của bạn:</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="4" 
                                        placeholder="Nhập nội dung phản hồi (Cảm ơn khách hàng, giải thích vấn đề...)"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        autoFocus
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer bg-light">
                                <button className="btn btn-secondary" onClick={() => setShowReplyModal(false)}>Hủy</button>
                                <button className="btn btn-primary fw-bold px-4" onClick={handleSubmitReply} disabled={sendingReply}>
                                    {sendingReply ? 'Đang gửi...' : 'Gửi Phản Hồi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewManagementPage;