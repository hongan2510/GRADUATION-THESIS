import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const API_BASE_URL = 'http://localhost:8082/api';

const SupportManagementPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filter & Pagination
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal Reply State
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Fetch Data
    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/support-tickets`, {
                params: { page, status: statusFilter, search }
            });
            setTickets(res.data.data || []);
            setTotalPages(res.data.pagination.total_pages);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [page, statusFilter, search]); // Reload khi đổi filter

    // Xử lý mở Modal
    const handleOpenModal = (ticket) => {
        setSelectedTicket(ticket);
        setReplyText(ticket.admin_response || ''); // Nếu đã trả lời thì hiện lại
    };

    // Xử lý Gửi Phản Hồi
    const handleSendReply = async () => {
        if (!replyText.trim()) return Swal.fire('Lỗi', 'Vui lòng nhập nội dung phản hồi', 'warning');

        setIsSending(true);
        try {
            const res = await axios.put(`${API_BASE_URL}/admin/support-tickets/${selectedTicket.ticket_id}/reply`, {
                response: replyText,
                status: 'resolved' // Mặc định chuyển sang Đã xử lý
            });

            if (res.data.success) {
                Swal.fire('Thành công', 'Đã gửi phản hồi và email cho khách!', 'success');
                setSelectedTicket(null); // Đóng modal
                fetchTickets(); // Reload list
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể gửi phản hồi lúc này', 'error');
        } finally {
            setIsSending(false);
        }
    };

    // Helpers UI
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <span className="badge bg-warning text-dark">⏳ Chờ xử lý</span>;
            case 'processing': return <span className="badge bg-info text-white">⚙️ Đang xử lý</span>;
            case 'resolved': return <span className="badge bg-success">✅ Đã xong</span>;
            case 'closed': return <span className="badge bg-secondary">🔒 Đóng</span>;
            default: return <span className="badge bg-light text-dark">{status}</span>;
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            {/* Header */}
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center shadow-sm sticky-top">
                <div className="d-flex align-items-center">
                    <div className="bg-info text-white rounded p-2 me-3"><i className="bi bi-headset fs-5"></i></div>
                    <div><h5 className="fw-bold mb-0 text-dark">Trung Tâm Hỗ Trợ</h5><small className="text-muted">Quản lý phản hồi khách hàng</small></div>
                </div>
                <div className="d-flex gap-3">
                    <input type="text" className="form-control rounded-pill" placeholder="Tìm tên, email..." value={search} onChange={e => setSearch(e.target.value)} style={{width: 300}}/>
                    <Link to="/admin" className="btn btn-outline-dark rounded-pill fw-bold">Dashboard</Link>
                </div>
            </div>

            <div className="container-fluid p-4">
                
                {/* Filter Tabs */}
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-body p-2">
                        <div className="d-flex gap-2">
                            {['all', 'pending', 'resolved'].map(s => (
                                <button 
                                    key={s} 
                                    className={`btn rounded-pill px-4 fw-bold ${statusFilter === s ? 'btn-primary' : 'btn-light text-secondary'}`}
                                    onClick={() => { setStatusFilter(s); setPage(1); }}
                                >
                                    {s === 'all' ? 'Tất cả' : (s === 'pending' ? 'Chưa xử lý' : 'Đã xong')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tickets Table */}
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-secondary small text-uppercase">
                                <tr>
                                    <th>ID</th>
                                    <th>Khách hàng</th>
                                    <th>Chủ đề</th>
                                    <th>Đơn hàng</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày gửi</th>
                                    <th className="text-end pe-4">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                                ) : tickets.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-5 text-muted">Không có yêu cầu nào.</td></tr>
                                ) : (
                                    tickets.map(t => (
                                        <tr key={t.ticket_id} className={t.status === 'pending' ? 'fw-bold bg-white' : 'bg-light bg-opacity-50'}>
                                            <td className="ps-3">#{t.ticket_id}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: 35, height: 35}}>
                                                        {t.customer_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-dark">{t.customer_name}</div>
                                                        <small className="text-muted fw-normal">{t.customer_email}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="badge bg-light text-dark border">{t.topic}</span></td>
                                            <td>
                                                {t.booking_id ? (
                                                    <span className="badge bg-warning bg-opacity-10 text-warning-emphasis border border-warning border-opacity-25">
                                                        {t.booking_type === 'hotel' ? '🏨' : (t.booking_type === 'tour' ? '🗺️' : '🍽️')} #{t.booking_id}
                                                    </span>
                                                ) : <span className="text-muted small">---</span>}
                                            </td>
                                            <td>{getStatusBadge(t.status)}</td>
                                            <td className="text-muted small">{new Date(t.created_at).toLocaleString('vi-VN')}</td>
                                            <td className="text-end pe-4">
                                                <button 
                                                    className={`btn btn-sm rounded-pill px-3 fw-bold ${t.status === 'pending' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                    onClick={() => handleOpenModal(t)}
                                                >
                                                    {t.status === 'pending' ? 'Trả lời' : 'Xem lại'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="card-footer bg-white d-flex justify-content-end py-3">
                            <nav>
                                <ul className="pagination pagination-sm mb-0">
                                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p - 1)}>Trước</button></li>
                                    <li className="page-item disabled"><span className="page-link">{page} / {totalPages}</span></li>
                                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p + 1)}>Sau</button></li>
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL REPLY --- */}
            {selectedTicket && (
                <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)', backdropFilter:'blur(2px)'}}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title fw-bold"><i className="bi bi-reply-all-fill me-2"></i>Phản hồi yêu cầu #{selectedTicket.ticket_id}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedTicket(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="small fw-bold text-muted">Khách hàng</label>
                                        <div className="form-control bg-light">{selectedTicket.customer_name} ({selectedTicket.customer_email})</div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small fw-bold text-muted">SĐT</label>
                                        <div className="form-control bg-light">{selectedTicket.customer_phone || 'Không có'}</div>
                                    </div>
                                    <div className="col-12">
                                        <label className="small fw-bold text-muted">Nội dung yêu cầu</label>
                                        <div className="p-3 bg-light rounded border fst-italic text-secondary" style={{whiteSpace: 'pre-wrap'}}>
                                            "{selectedTicket.message}"
                                        </div>
                                    </div>
                                    {selectedTicket.booking_id && (
                                        <div className="col-12">
                                            <div className="alert alert-warning d-flex align-items-center small mb-0">
                                                <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                                                <div>
                                                    Khách hàng đang hỏi về đơn hàng <strong>{selectedTicket.booking_type?.toUpperCase()} #{selectedTicket.booking_id}</strong>.
                                                    Vui lòng kiểm tra kỹ đơn hàng trước khi trả lời.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-12">
                                        <label className="small fw-bold text-primary">Nội dung trả lời (Sẽ gửi qua email)</label>
                                        <textarea 
                                            className="form-control border-primary" 
                                            rows="6" 
                                            placeholder="Nhập nội dung giải đáp thắc mắc..."
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light">
                                <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>Đóng</button>
                                <button className="btn btn-primary fw-bold px-4" onClick={handleSendReply} disabled={isSending}>
                                    {isSending ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang gửi...</> : <><i className="bi bi-send-fill me-2"></i> Gửi & Hoàn tất</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportManagementPage;