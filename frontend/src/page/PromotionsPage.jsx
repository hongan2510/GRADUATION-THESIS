import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';

// Hàm định dạng tiền tệ Việt Nam (VND)
const formatCurrency = (amount) => {
    const numericAmount = typeof amount === 'number' ? amount : parseInt(amount) || 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericAmount);
};

// Hàm kiểm tra trạng thái voucher (Sử dụng user_used_count)
const checkCouponStatus = (coupon) => {
    const now = new Date();
    const expiryDate = coupon && coupon.expiry_date ? new Date(coupon.expiry_date) : null;
    const startDate = coupon && coupon.start_date ? new Date(coupon.start_date) : null;

    // 1. Kiểm tra Hết hạn
    if (expiryDate && expiryDate < now) {
        return { status: 'HẾT HẠN', color: 'danger', enabled: false };
    }

    // 2. Kiểm tra Chưa đến ngày dùng
    if (startDate && startDate > now) {
        const startString = startDate.toLocaleDateString('vi-VN');
        return { status: `DÙNG TỪ ${startString}`, color: 'secondary', enabled: false };
    }

    // 3. Kiểm tra Hết số lượng tổng
    const usageLimit = coupon && coupon.usage_limit ? coupon.usage_limit : 0;
    const usedCount = coupon && coupon.used_count ? coupon.used_count : 0; 

    if (usageLimit > 0 && usedCount >= usageLimit) {
        return { status: 'HẾT SỐ LƯỢNG', color: 'dark', enabled: false };
    }
    
    // --- KIỂM TRA ĐÃ DÙNG CÁ NHÂN (QUAN TRỌNG) ---
    const maxUsagePerUser = coupon && coupon.max_usage_per_user ? coupon.max_usage_per_user : 1;
    const userUsedCount = coupon && coupon.user_used_count ? coupon.user_used_count : 0; 

    if (maxUsagePerUser > 0 && userUsedCount >= maxUsagePerUser) {
        // TRẠNG THÁI ĐÃ DÙNG
        return { status: 'ĐÃ SỬ DỤNG', color: 'info', enabled: false, isUsedByUser: true }; 
    }
    // -------------------------------

    // 4. Hợp lệ
    const remaining = usageLimit > 0 ? Math.max(0, usageLimit - usedCount) : 'Không giới hạn';

    return {
        status: 'CÒN HẠN',
        color: 'success',
        enabled: true,
        remaining: remaining,
        isUsedByUser: false // Mặc định không phải Đã dùng
    };
};

export default function PromotionsPage() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null); 

    useEffect(() => {
        let mounted = true;
        const storedUser = localStorage.getItem('user');
        let userId = null;

        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setUser(userData);
                userId = userData.user_id; // Lấy ID người dùng
            } catch (e) {
                console.error("Lỗi parse user storage:", e);
            }
        }
        
        // --- GỌI API VỚI user_id ---
        const url = `http://localhost:8082/api/coupons?user_id=${userId || ''}`; 

        axios.get(url)
            .then(res => {
                if (!mounted) return;
                
                let fetchedData = res.data;
                if (fetchedData && !Array.isArray(fetchedData)) {
                    fetchedData = fetchedData.data || fetchedData.coupons || [];
                }

                setCoupons(Array.isArray(fetchedData) ? fetchedData : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Lỗi Fetch Coupons:", err);
                setCoupons([]); 
                setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const handleSaveCoupon = (coupon) => {
        const status = checkCouponStatus(coupon || {});

        if (!status.enabled) {
            toast.error(`❌ Mã ${coupon.code}: ${status.status}. Không thể lưu.`, { autoClose: 3000 });
            return;
        }

        if(status.isUsedByUser) {
             toast.info(`Mã ${coupon.code} đã được bạn sử dụng tối đa.`, { autoClose: 3000 });
             return;
        }

        // --- Logic Copy Clipboard an toàn ---
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(coupon.code).then(() => {
                toast.success(`✅ Đã lưu mã: ${coupon.code}. Hãy sử dụng khi thanh toán!`, {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
            }).catch(() => {
                toast.error('Không thể sao chép vào clipboard.', { autoClose: 3000 });
            });
        } else {
            // fallback cho trình duyệt cũ
            const ta = document.createElement('textarea');
            ta.value = coupon.code;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                toast.success(`✅ Đã lưu mã: ${coupon.code}. Hãy sử dụng khi thanh toán!`, { autoClose: 3000 });
            } catch {
                toast.error('Không thể sao chép vào clipboard.', { autoClose: 3000 });
            } finally {
                document.body.removeChild(ta);
            }
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100 bg-light"> 
            <div className="bg-primary text-white py-5 text-center" style={{ background: 'linear-gradient(45deg, #2563eb, #60a5fa)' }}>
                <h1 className="fw-bold mb-3">Săn Ưu Đãi - Du Lịch Thả Ga</h1>
                <p className="fs-5">Khám phá các mã giảm giá độc quyền dành riêng cho bạn</p>
            </div>

            <main className="container py-5 flex-grow-1">
                {loading ? (
                    <div className="text-center"><div className="spinner-border text-primary" role="status" /></div>
                ) : (
                    <div className="row g-4">
                        {(!coupons || coupons.length === 0) ? (
                            <div className="text-center text-muted">Hiện tại chưa có mã giảm giá nào.</div>
                        ) : (
                            coupons.map((coupon) => {
                                const status = checkCouponStatus(coupon || {});
                                const key = coupon && (coupon.coupon_id ?? coupon.id ?? coupon.code) || Math.random();
                                const imageUrl = coupon && (coupon.image_url || coupon.image) || 'https://via.placeholder.com/400x180?text=Coupon';
                                const expiry = coupon && coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString('vi-VN') : 'Không rõ';

                                // --- XÁC ĐỊNH CLASS LÀM MỜ VÀ ĐÃ SỬ DỤNG ---
                                // Làm mờ toàn bộ thẻ và ảnh nếu đã sử dụng cá nhân hoặc không enabled
                                const isFinalDisabled = !status.enabled || status.isUsedByUser;

                                const cardClass = `card h-100 border-0 shadow-sm transition overflow-hidden 
                                                   ${isFinalDisabled ? 'opacity-50 bg-light-subtle' : 'hover-shadow'}
                                                  `;

                                return (
                                    <div className="col-md-6 col-lg-4" key={key}>
                                        <div className={cardClass}>
                                            {/* Ảnh Voucher */}
                                            <div className="position-relative">
                                                <img
                                                    src={imageUrl}
                                                    className="card-img-top object-fit-cover"
                                                    alt={coupon && coupon.code ? coupon.code : 'Voucher'}
                                                    style={{ height: '180px', objectFit: 'cover', filter: isFinalDisabled ? 'grayscale(100%)' : 'none' }}
                                                />
                                                {/* Trạng thái và Hạn sử dụng */}
                                                <div className={`position-absolute top-0 start-0 m-2 badge bg-${status.isUsedByUser ? 'info' : status.color} shadow`}>
                                                    {status.isUsedByUser ? 'ĐÃ SỬ DỤNG' : status.status} 
                                                </div>
                                                <div className="position-absolute top-0 end-0 m-2 badge bg-dark shadow">
                                                    HSD: {expiry}
                                                </div>
                                            </div>

                                            <div className="card-body d-flex flex-column">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <h5 className={`card-title fw-bold m-0 ${status.isUsedByUser ? 'text-info' : (status.enabled ? 'text-primary' : 'text-muted')}`}>{coupon && coupon.code ? coupon.code : '---'}</h5>

                                                    {/* Hiển thị mức giảm */}
                                                    {coupon && (coupon.discount_percent > 0) ? (
                                                        <span className="badge bg-warning text-dark">Giảm {coupon.discount_percent}%</span>
                                                    ) : (
                                                        <span className="badge bg-success">Giảm {formatCurrency(coupon && coupon.discount_amount ? coupon.discount_amount : 0)}</span>
                                                    )}
                                                </div>

                                                <p className="card-text text-muted small flex-grow-1">{coupon && coupon.description ? coupon.description : 'Không có mô tả'}</p>

                                                {/* Hiển thị số lượng còn lại */}
                                                <div className="text-end small mt-2">
                                                    <strong className={status.enabled ? 'text-danger' : 'text-muted'}>
                                                        {status.remaining !== undefined && status.remaining !== 'Không giới hạn' ? `CÒN LẠI: ${status.remaining} MÃ` : ''}
                                                    </strong>
                                                    {status.remaining === 'Không giới hạn' && <strong className="text-success">SỐ LƯỢNG: Không giới hạn</strong>}
                                                </div>

                                                {/* Nút Lưu Mã */}
                                                <div className="d-grid mt-3">
                                                    <button
                                                        className={`btn fw-bold border-2 border-dashed ${status.isUsedByUser ? 'btn-info' : (status.enabled ? 'btn-outline-primary' : 'btn-secondary')}`}
                                                        onClick={() => handleSaveCoupon(coupon)}
                                                        disabled={isFinalDisabled} // Vô hiệu hóa nút nếu đã sử dụng cá nhân hoặc không enabled
                                                    >
                                                        {status.isUsedByUser ? (
                                                            <> <i className="bi bi-check-circle-fill me-2" /> ĐÃ SỬ DỤNG </> // NỘI DUNG NÚT ĐÃ SỬ DỤNG
                                                        ) : (
                                                            status.enabled ? (
                                                                <> <i className="bi bi-scissors me-2" />Lưu Mã Ngay </>
                                                            ) : (
                                                                <> <i className="bi bi-x-circle me-2" /> {status.status} </>
                                                            )
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </main>

            <ToastContainer />

            <style>{`
                .hover-shadow:hover { transform: translateY(-5px); box-shadow: 0 1rem 3rem rgba(0,0,0,.175)!important; }
                .transition { transition: all 0.3s ease; }
                .border-dashed { border-style: dashed !important; }
                /* Thêm style cho nút Đã Dùng */
                .btn-info { 
                    color: white; 
                    border-color: #0d6efd !important; 
                    background-color: #0d6efd; 
                    cursor: not-allowed;
                }
                .opacity-50 { opacity: 0.5; }
            `}</style>
        </div>
    );
}