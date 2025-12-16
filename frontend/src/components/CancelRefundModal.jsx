import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; // Nếu bạn dùng toastify, hoặc dùng alert

const CancelRefundModal = ({ isOpen, onClose, booking, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Xác nhận, 2: Điền form (nếu cần)
    const [loading, setLoading] = useState(false);
    
    // State cho form hoàn tiền
    const [bankInfo, setBankInfo] = useState({
        bank_name: '',
        account_number: '',
        account_holder_name: '',
        reason: ''
    });

    if (!isOpen || !booking) return null;

    // Kiểm tra xem đơn này có phải thanh toán online không?
    // Giả sử status_id = 3 là "Đã thanh toán" hoặc payment_id có tồn tại
    const isPrepaid = booking.status_id === 3 || (booking.payment_id !== null);

    const handleInputChange = (e) => {
        setBankInfo({ ...bankInfo, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let url = '';
            let payload = {};

            if (isPrepaid) {
                // API Hủy + Hoàn tiền
                url = 'http://localhost:8082/api/bookings/cancel-refund';
                payload = {
                    booking_id: booking.booking_id,
                    user_id: 6, // ⚠️ Thay bằng user.user_id thực tế từ context
                    ...bankInfo
                };
            } else {
                // API Hủy thường (Thanh toán sau)
                url = 'http://localhost:8082/api/restaurant/bookings/cancel'; // Dùng chung API hủy
                payload = { booking_id: booking.booking_id };
            }

            const res = await axios.post(url, payload);
            
            if (res.data.success) {
                alert(isPrepaid ? "Yêu cầu hoàn tiền đã được gửi! Vui lòng check mail." : "Đã hủy đơn thành công!");
                onSuccess(); // Reload lại danh sách đơn hàng
                onClose();
            } else {
                alert("Lỗi: " + res.data.message);
            }
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi hủy đơn.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow">
                    <div className="modal-header bg-danger text-white">
                        <h5 className="modal-title">
                            {isPrepaid ? "Yêu cầu Hủy & Hoàn tiền" : "Xác nhận Hủy đơn"}
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    
                    <div className="modal-body">
                        {/* TRƯỜNG HỢP 1: ĐÃ THANH TOÁN ONLINE -> HIỆN FORM */}
                        {isPrepaid ? (
                            <>
                                <div className="alert alert-warning">
                                    <small><i className="bi bi-info-circle"></i> Đơn hàng này đã thanh toán. Vui lòng cung cấp thông tin để chúng tôi hoàn tiền (3-7 ngày làm việc).</small>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Tên ngân hàng</label>
                                    <input type="text" className="form-control" name="bank_name" placeholder="VD: Vietcombank" onChange={handleInputChange} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Số tài khoản</label>
                                    <input type="text" className="form-control" name="account_number" placeholder="Số tài khoản nhận tiền" onChange={handleInputChange} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Tên chủ thẻ (Không dấu)</label>
                                    <input type="text" className="form-control" name="account_holder_name" placeholder="VD: NGUYEN VAN A" onChange={handleInputChange} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Lý do hủy</label>
                                    <textarea className="form-control" name="reason" rows="2" onChange={handleInputChange}></textarea>
                                </div>
                            </>
                        ) : (
                            /* TRƯỜNG HỢP 2: THANH TOÁN SAU -> HỎI XÁC NHẬN */
                            <p className="text-center my-3">
                                Bạn có chắc chắn muốn hủy đơn hàng <strong>#{booking.booking_id}</strong> không? 
                                <br/><span className="text-muted small">Hành động này không thể hoàn tác.</span>
                            </p>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
                        <button 
                            type="button" 
                            className="btn btn-danger" 
                            onClick={handleSubmit} 
                            disabled={loading || (isPrepaid && (!bankInfo.bank_name || !bankInfo.account_number))}
                        >
                            {loading ? "Đang xử lý..." : (isPrepaid ? "Gửi yêu cầu hoàn tiền" : "Xác nhận Hủy")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancelRefundModal;