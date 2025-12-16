// src/page/BookingDetail.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE_URL = "http://localhost:8082/api";

/* -------------------------
   Helpers
   ------------------------- */
const fmtMoney = (n) => {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n));
};

const tryParseDate = (d) => {
  if (!d) return null;
  try {
    if (d instanceof Date) return isNaN(d) ? null : d;
    const s = String(d);
    if (s.includes("T") || s.includes(" ")) {
      const dt = new Date(s);
      if (!isNaN(dt)) return dt;
    }
    const dateOnly = s.split("T")[0].trim();
    const dt2 = new Date(dateOnly + "T00:00:00");
    return isNaN(dt2) ? null : dt2;
  } catch {
    return null;
  }
};

const fmtDate = (d) => {
  const dt = tryParseDate(d);
  if (!dt) return "—";
  return dt.toLocaleDateString("vi-VN");
};

const fmtTime = (t) => {
  if (!t) return "—";
  const s = String(t);
  // If full datetime
  if (s.includes("T") || s.includes(" ")) {
    const dt = tryParseDate(t);
    if (dt) return dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  // If hh:mm:ss or hh:mm
  if (/\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return "—";
};

const safeText = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    if (v.name) return String(v.name);
    if (v.full_name) return String(v.full_name);
    if (v.email) return String(v.email);
    if (v.phone) return String(v.phone);
    if (v.address) return String(v.address);
    try {
      const s = JSON.stringify(v);
      return s.length > 80 ? s.slice(0, 77) + "..." : s;
    } catch {
      return "—";
    }
  }
  return String(v);
};

// Normalize textual/numeric status into codes 1..5
// 1 = Hold, 2 = Confirmed, 3 = Paid, 4 = Completed, 5 = Cancelled
const normalizeStatus = (s) => {
  const raw = s ?? "";
  const st = String(raw).toLowerCase().trim();

  if (st === "1" || st.includes("hold") || st.includes("pending") || st.includes("chờ")) return 1;
  if (st === "2" || st.includes("confirm") || st.includes("xác nhận") || st.includes("confirmed")) return 2;
  if (st === "3" || st.includes("paid") || st.includes("thanh toán")) return 3;
  if (st === "4" || st.includes("complete") || st.includes("hoàn thành") || st.includes("completed")) return 4;
  if (st === "5" || st.includes("cancel") || st.includes("hủy") || st.includes("huy")) return 5;

  const maybeNum = Number(raw);
  if (!isNaN(maybeNum) && [1, 2, 3, 4, 5].includes(maybeNum)) return maybeNum;

  // default fallback: treat unknown as confirmed (2)
  return 2;
};

const getStatusDisplay = (statusIdOrName) => {
  // prefer numeric codes
  const numeric = Number(statusIdOrName);
  if (!Number.isNaN(numeric) && [1,2,3,4,5].includes(numeric)) {
    switch (numeric) {
      case 1: return { colorClass: "bg-warning text-dark", label: "Đang giữ chỗ" };
      case 2: return { colorClass: "bg-success text-white", label: "Đã xác nhận" };
      case 3: return { colorClass: "bg-info text-dark", label: "Đã thanh toán" };
      case 4: return { colorClass: "bg-primary text-white", label: "Đã hoàn thành" };
      case 5: return { colorClass: "bg-danger text-white", label: "Đã hủy" };
      default: return { colorClass: "bg-secondary text-white", label: "Đang xử lý" };
    }
  }

  // otherwise fallback to textual detection
  const s = (statusIdOrName || "").toString().toLowerCase();
  if (s.includes("confirm") || s.includes("xác nhận")) return { colorClass: "bg-success text-white", label: "Đã xác nhận" };
  if (s.includes("complete") || s.includes("hoàn thành")) return { colorClass: "bg-primary text-white", label: "Đã hoàn thành" };
  if (s.includes("hold") || s.includes("đang chờ")) return { colorClass: "bg-warning text-dark", label: "Đang giữ chỗ" };
  if (s.includes("cancel") || s.includes("hủy")) return { colorClass: "bg-danger text-white", label: "Đã hủy" };
  if (s.includes("paid") || s.includes("thanh toán")) return { colorClass: "bg-info text-dark", label: "Đã thanh toán" };

  return { colorClass: "bg-secondary text-white", label: typeof statusIdOrName === "string" && statusIdOrName ? statusIdOrName : "Đang xử lý" };
};

/* -------------------------
   Resolve service ID helper
   ------------------------- */
const resolveServiceId = (booking) => {
  if (!booking) return null;
  const candidates = [
    booking.item_id,
    booking._raw?.item_id,
    booking.service?.id,
    booking.service?.item_id,
    booking.service?.hotel_id,
    booking.service?.tour_id,
    booking.restaurant_id,
    booking._raw?.hotel_id,
    booking._raw?.tour_id,
    booking._raw?.restaurant_id
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || String(c).trim() === "") continue;
    const num = Number(c);
    if (!Number.isNaN(num) && num > 0) return num;
  }
  return null;
};

/* -------------------------
   ReviewForm (embedded) - unchanged
   (kept for full component)
   ------------------------- */
const TRAVELER_TYPES = ["Cặp đôi", "Một mình", "Gia đình", "Nhóm bạn", "Công tác", "Khác"];

function ReviewForm({ type = "hotel", itemId, userId = null, bookingId = null, defaultRoomType = "", defaultStayDuration = "", onClose = () => {}, onSubmitted = () => {} }) {
  const isHotel = type === "hotel";
  const isRestaurant = type === "restaurant";
  const isTour = type === "tour";

  const [rating, setRating] = useState(isHotel ? 8 : 5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [cleanliness, setCleanliness] = useState(9.0);
  const [comfort, setComfort] = useState(9.0);
  const [locationRating, setLocationRating] = useState(9.0);
  const [service, setService] = useState(9.0);
  const [valueForMoney, setValueForMoney] = useState(9.0);
  const [travelerType, setTravelerType] = useState(TRAVELER_TYPES[0]);
  const [stayDuration, setStayDuration] = useState(defaultStayDuration || "");
  const [roomTypeBooked, setRoomTypeBooked] = useState(defaultRoomType || "");
  const [country, setCountry] = useState("Việt Nam");
  const [foodQuality, setFoodQuality] = useState(5);
  const [restService, setRestService] = useState(5);
  const [restCleanliness, setRestCleanliness] = useState(5);
  const [atmosphere, setAtmosphere] = useState(5);
  const [restValueForMoney, setRestValueForMoney] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    setError(null);
    if (!itemId) {
      setError("Không xác định dịch vụ (item_id thiếu).");
      return false;
    }
    if (isHotel) {
      if (typeof rating !== "number" || rating < 1 || rating > 10) { setError("Rating (hotel) phải từ 1 đến 10."); return false; }
      const subs = [cleanliness, comfort, locationRating, service, valueForMoney];
      if (subs.some((s) => typeof s !== "number" || s < 1 || s > 10)) { setError("Các điểm con phải trong khoảng 1–10."); return false; }
    } else {
      if (typeof rating !== "number" || rating < 1 || rating > 5) { setError("Rating phải từ 1 đến 5."); return false; }
    }
    if (title && title.length > 255) { setError("Tiêu đề không dài quá 255 ký tự."); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const effectiveItemId = Number(itemId);
      if (!effectiveItemId || Number.isNaN(effectiveItemId)) { setError("ID dịch vụ không hợp lệ."); setSubmitting(false); return; }
      const payload = {
        user_id: userId ? Number(userId) : null,
        item_id: effectiveItemId,
        booking_id: bookingId ? Number(bookingId) : null,
        review_type: type,
        rating: Number(rating),
        title: title ? String(title).trim() : null,
        comment: comment ? String(comment).trim() : null
      };
      if (isHotel) payload.hotel_id = effectiveItemId;
      if (isTour) payload.tour_id = effectiveItemId;
      if (isRestaurant) payload.restaurant_id = effectiveItemId;
      if (isHotel) {
        payload.cleanliness = Number(cleanliness) || 9.0;
        payload.comfort = Number(comfort) || 9.0;
        payload.location_rating = Number(locationRating) || 9.0;
        payload.service_score = Number(service) || 9.0;
        payload.value_for_money = Number(valueForMoney) || 9.0;
        payload.traveler_type = travelerType || "Cặp đôi";
        payload.stay_duration = stayDuration || defaultStayDuration || null;
        payload.room_type_booked = roomTypeBooked || null;
        payload.country = country || "Việt Nam";
      }
      if (isRestaurant) {
        payload.food_quality = Number(foodQuality) || 5;
        payload.rest_service = Number(restService) || 5;
        payload.rest_cleanliness = Number(restCleanliness) || 5;
        payload.atmosphere = Number(atmosphere) || 5;
        payload.rest_value_for_money = Number(restValueForMoney) || 5;
      }
      let endpoint = `${API_BASE_URL}/reviews/${type}`;
      const res = await axios.post(endpoint, payload);
      onSubmitted(res.data || {});
      onClose();
    } catch (err) {
      console.error("Submit review failed", err);
      const msg = err?.response?.data?.message || err?.message || "Gửi nhận xét thất bại";
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const NumericRow = ({ label, value, min = 1, max = 10, step = 1, onChange }) => (
    <div className="mb-2">
      <label className="form-label">{label} <small className="text-muted">({min}–{max})</small></label>
      <div className="d-flex gap-2 align-items-center">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="form-range" />
        <div style={{ minWidth: 60 }} className="text-end fw-bold">{value}</div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <strong className="d-block mb-1">Bạn đang đánh giá: <span className="text-primary">{type.toUpperCase()}</span></strong>
        <div className="small text-muted">Dịch vụ ID: {itemId}</div>
        {bookingId && <div className="small text-muted">Mã đơn (đã liên kết): #{bookingId}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">Điểm tổng ({isHotel ? '1–10' : '1–5'})</label>
        <div className="d-flex gap-2 align-items-center">
          <input type="range" min={isHotel ? 1 : 1} max={isHotel ? 10 : 5} step={isHotel ? 0.5 : 1} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="form-range" />
          <div style={{ minWidth: 50 }} className="fw-bold text-end">{rating}</div>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Tiêu đề (tùy chọn)</label>
        <input className="form-control" maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Phòng sạch, nhân viên thân thiện" />
      </div>

      <div className="mb-3">
        <label className="form-label">Bình luận</label>
        <textarea className="form-control" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Viết cảm nhận của bạn..." />
      </div>

      {isHotel && (
        <>
          <h6 className="mt-3">Điểm chi tiết (khách sạn)</h6>
          <NumericRow label="Sạch sẽ" min={1} max={10} step={0.5} value={cleanliness} onChange={setCleanliness} />
          <NumericRow label="Tiện nghi" min={1} max={10} step={0.5} value={comfort} onChange={setComfort} />
          <NumericRow label="Vị trí" min={1} max={10} step={0.5} value={locationRating} onChange={setLocationRating} />
          <NumericRow label="Phục vụ" min={1} max={10} step={0.5} value={service} onChange={setService} />
          <NumericRow label="Đáng tiền" min={1} max={10} step={0.5} value={valueForMoney} onChange={setValueForMoney} />

          <div className="mb-2">
            <label className="form-label">Loại khách</label>
            <select className="form-select" value={travelerType} onChange={(e) => setTravelerType(e.target.value)}>
              {TRAVELER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="mb-2">
            <label className="form-label">Loại phòng đã đặt</label>
            <input className="form-control" value={roomTypeBooked} onChange={(e) => setRoomTypeBooked(e.target.value)} placeholder="Ví dụ: Phòng Tiêu Chuẩn" />
          </div>

          <div className="mb-2">
            <label className="form-label">Thời gian lưu trú (mô tả)</label>
            <input className="form-control" value={stayDuration} onChange={(e) => setStayDuration(e.target.value)} placeholder={defaultStayDuration || 'Ví dụ: Đã ở 2 đêm vào Tháng 12 2025'} />
          </div>

          <div className="mb-2">
            <label className="form-label">Quốc gia</label>
            <input className="form-control" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </>
      )}

      {isRestaurant && (
        <>
          <h6 className="mt-3">Điểm chi tiết (nhà hàng)</h6>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label">Chất lượng món</label>
              <input type="range" className="form-range" min={1} max={5} step={1} value={foodQuality} onChange={(e) => setFoodQuality(Number(e.target.value))} />
              <div className="text-end fw-bold">{foodQuality}</div>
            </div>
            <div className="col-6">
              <label className="form-label">Phục vụ</label>
              <input type="range" className="form-range" min={1} max={5} step={1} value={restService} onChange={(e) => setRestService(Number(e.target.value))} />
              <div className="text-end fw-bold">{restService}</div>
            </div>
            <div className="col-6">
              <label className="form-label">Sạch sẽ</label>
              <input type="range" className="form-range" min={1} max={5} step={1} value={restCleanliness} onChange={(e) => setRestCleanliness(Number(e.target.value))} />
              <div className="text-end fw-bold">{restCleanliness}</div>
            </div>
            <div className="col-6">
              <label className="form-label">Không khí</label>
              <input type="range" className="form-range" min={1} max={5} step={1} value={atmosphere} onChange={(e) => setAtmosphere(Number(e.target.value))} />
              <div className="text-end fw-bold">{atmosphere}</div>
            </div>
            <div className="col-12">
              <label className="form-label">Đáng tiền</label>
              <input type="range" className="form-range" min={1} max={5} step={1} value={restValueForMoney} onChange={(e) => setRestValueForMoney(Number(e.target.value))} />
              <div className="text-end fw-bold">{restValueForMoney}</div>
            </div>
          </div>
        </>
      )}

      <div className="mt-3 d-flex gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => onClose()} disabled={submitting}>Hủy</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Đang gửi..." : "Gửi nhận xét"}</button>
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}
    </form>
  );
}
  const CancelRefundModal = ({ isOpen, onClose, booking, onSuccess, userId }) => {
  const [loading, setLoading] = useState(false);
  const [bankInfo, setBankInfo] = useState({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    reason: ''
  });

  if (!isOpen || !booking) return null;

  // Kiểm tra loại dịch vụ để chọn đúng API hủy
  // Tour/Hotel dùng: /api/bookings/cancel
  // Nhà hàng dùng: /api/restaurant/bookings/cancel
  const isRestaurant = booking.booking_type === 'restaurant';
  
  // Status 3 = Đã thanh toán
  const isPrepaid = booking.status_id === 3 || (booking.payment && booking.payment.amount > 0);

  const handleInputChange = (e) => {
    setBankInfo({ ...bankInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let url = '';
      let payload = {};

      if (isPrepaid) {
        // --- TRƯỜNG HỢP 1: ĐÃ THANH TOÁN ONLINE (Gửi yêu cầu hoàn tiền) ---
        url = `${API_BASE_URL}/bookings/cancel-refund`;
        payload = {
          booking_id: booking.booking_id,
          user_id: userId,
          ...bankInfo
        };
      } else {
        // --- TRƯỜNG HỢP 2: THANH TOÁN SAU (Hủy thường) ---
        if (isRestaurant) {
             url = `${API_BASE_URL}/restaurant/bookings/cancel`;
        } else {
             url = `${API_BASE_URL}/bookings/cancel`;
        }
        payload = { booking_id: booking.booking_id };
      }

      const res = await axios.post(url, payload);

      if (res.data.success) {
        alert(isPrepaid ? "✅ Đã gửi yêu cầu hoàn tiền! Vui lòng kiểm tra email." : "✅ Đã hủy đơn thành công!");
        onSuccess(); // Refresh trang
        onClose();
      } else {
        alert("❌ Lỗi từ server: " + res.data.message);
      }
    } catch (error) {
      console.error(error);
      alert("❌ Có lỗi xảy ra. Vui lòng kiểm tra lại kết nối hoặc Database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title fw-bold">
              {isPrepaid ? "Yêu cầu Hủy & Hoàn tiền" : "Xác nhận Hủy đơn"}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {isPrepaid ? (
              <>
                <div className="alert alert-warning small">
                  <i className="bi bi-info-circle-fill me-2"></i>
                  Đơn hàng <strong>đã thanh toán</strong>. Vui lòng cung cấp thông tin để hoàn tiền (3-7 ngày làm việc).
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
              <div className="text-center py-3">
                <p className="fs-5">Bạn chắc chắn muốn hủy đơn <strong>#{booking.booking_id}</strong>?</p>
                <p className="text-muted small">Hành động này không thể hoàn tác.</p>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
            <button
              type="button"
              className="btn btn-danger fw-bold"
              onClick={handleSubmit}
              disabled={loading || (isPrepaid && (!bankInfo.bank_name || !bankInfo.account_number))}
            >
              {loading ? "Đang xử lý..." : (isPrepaid ? "Gửi yêu cầu" : "Xác nhận Hủy")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
/* -------------------------
   Main BookingDetail component
   ------------------------- */
export default function BookingDetail() {
  const { type: urlType, id } = useParams();
  const { currentUser } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchInvoice = async (bookingId, hintType) => {
    setLoading(true);
    setError("");
    try {
      const lower = (hintType || "").toString().toLowerCase();
      const url = lower === "restaurant"
        ? `${API_BASE_URL}/bookings/invoice/restaurant/${bookingId}`
        : `${API_BASE_URL}/bookings/invoice/${bookingId}`;
      const res = await axios.get(url);
      const inv = res.data || {};

      const normalized = {
        booking_id: inv.booking_id || inv.id || bookingId,
        booking_type: inv.booking_type || inv.type || lower || "hotel",
        status_id: inv.status_id ?? inv.status ?? null,
        status_name: inv.status_name || inv.status || null,
        created_at: inv.created_at || inv.created || null,
        updated_at: inv.updated_at || inv.updated || null,
        customer_name: inv.customer?.name || inv.customer_name || null,
        customer_email: inv.customer?.email || inv.customer_email || null,
        customer_phone: inv.customer?.phone || inv.customer_phone || null,
        total_price: inv.total_price ?? inv.totals?.grand_total ?? inv.total ?? 0,
        payment: inv.payment || inv.payments || inv._raw?.payment || null,
        coupon_code: inv.coupon_code || null,
        note: inv.note || null,
        service: inv.service || {},
        detail: inv.detail || inv.details || {},
        totals: inv.totals || {},
        _raw: inv
      };

      normalized.check_in = normalized.detail?.check_in_date || normalized.detail?.check_in_datetime || normalized.detail?.tour_date || normalized.detail?.tour_datetime || normalized.service?.check_in_date || null;
      normalized.check_out = normalized.detail?.check_out_date || normalized.detail?.check_out_datetime || normalized.detail?.end_date || null;
      normalized.check_in_time = normalized.service?.check_in_time || normalized.detail?.check_in_time || "14:00";
      normalized.check_out_time = normalized.service?.check_out_time || normalized.detail?.check_out_time || "12:00";
      normalized.total_rooms = Number(normalized.detail?.total_rooms ?? inv.total_rooms ?? inv.total_rooms_booked ?? 0);
      normalized.total_guests = Number(normalized.detail?.total_guests ?? inv.total_guests ?? inv.guests_count ?? 1);

      normalized.service.name = normalized.service.name || inv.service_name || inv.name || null;
      normalized.service.address = normalized.service.address || inv.service_address || inv.address || null;
      normalized.service.image = normalized.service.image || inv.service_image || inv.image || null;

      // keep item_id if backend provides unified item_id OR fall back to service.id
      normalized.item_id = inv.item_id ?? inv.service_id ?? inv.service?.id ?? inv._raw?.item_id ?? null;

      // restaurant specific fallback
      normalized.restaurant_id = inv.restaurant_id ?? inv._raw?.restaurant_id ?? null;

      // Normalize status code using text or numeric
      let status = normalizeStatus(normalized.status_id ?? normalized.status_name ?? null);

      // Detect payment evidence -> mark as paid (3)
      try {
        const p = normalized.payment ?? normalized._raw?.payment ?? normalized._raw?.payments ?? null;
        const paidEvidence = (
          normalized._raw?.is_paid === true ||
          String(normalized._raw?.is_paid) === "1" ||
          normalized._raw?.paid_at ||
          normalized._raw?.paid_on ||
          normalized._raw?.payment_date ||
          (p && (p.paid_at || p.paid_on || (p.status && String(p.status).toLowerCase().includes("paid"))))
        );

        // If total_paid or payment amount >0
        const paidAmount = Number(p?.amount ?? p?.paid_amount ?? normalized._raw?.paid_amount ?? normalized._raw?.amount_paid ?? 0);
        if (paidEvidence || (!isNaN(paidAmount) && paidAmount > 0)) {
          status = 3;
        } else {
          // Also detect payment method strings indicating online -> if payment method present and amount >0 then paid
          const pm = (p?.method || p?.payment_method || p?.payment_method_id || normalized._raw?.payment_method || normalized._raw?.payment)?.toString?.() ?? "";
          const lowerPm = String(pm).toLowerCase();
          if (lowerPm && (lowerPm.includes("card") || lowerPm.includes("stripe") || lowerPm.includes("vnpay") || lowerPm.includes("momo") || lowerPm.includes("paypal") || lowerPm.includes("online"))) {
            const tot = Number(normalized.total_price ?? normalized.totals?.grand_total ?? 0);
            if (!isNaN(tot) && tot > 0) status = 3;
          }
        }
      } catch (e) {
        // ignore detection errors
      }

      // If hold expired -> mark cancelled
      try {
        const expires = normalized._raw?.expires_at ?? normalized._raw?.expire_at ?? normalized._raw?.expired_at ?? null;
        if (Number(status) === 1 && expires) {
          const expDate = new Date(expires);
          if (!isNaN(expDate) && expDate < new Date()) status = 5;
        }
      } catch (e) {}

      normalized.status_id = status;

      setBooking(normalized);
      setLoading(false);
    } catch (err) {
      console.error("[BookingDetail] fetchInvoice error:", err?.response?.data ?? err.message ?? err);
      setError("Không thể tải chi tiết hóa đơn. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setError("Booking ID không hợp lệ");
      setLoading(false);
      return;
    }
    fetchInvoice(id, urlType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, urlType]);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, windowWidth: document.documentElement.offsetWidth, windowHeight: document.documentElement.offsetHeight });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      pdf.save(`Invoice-${booking?.booking_id || id}.pdf`);
    } catch (e) {
      console.error("PDF export error", e);
      alert("Lỗi khi tạo PDF.");
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    if (!window.confirm("Bạn có chắc muốn hủy đơn này?")) return;
    setSubmittingCancel(true);
    try {
      const endpoint = booking.booking_type === "restaurant" ? `${API_BASE_URL}/restaurant/bookings/cancel` : `${API_BASE_URL}/bookings/cancel`;
      await axios.post(endpoint, { booking_id: booking.booking_id || booking.id });
      setBooking((prev) => (prev ? { ...prev, status_id: 5, status_name: "Đã hủy" } : prev));
      showToast("Đã hủy đơn thành công", "success");
    } catch (e) {
      console.error("Cancel error", e);
      showToast("Hủy đơn thất bại", "error");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border text-primary" role="status" aria-hidden="true"></div></div>;
  if (error) return <div className="container py-5 text-danger">{error}</div>;
  if (!booking) return <div className="container py-5">Không tìm thấy hóa đơn.</div>;

  const type = (booking.booking_type || "hotel").toLowerCase();
  const { colorClass, label: statusLabel } = getStatusDisplay(booking.status_id ?? booking.status_name ?? "");
  const isHotel = type === "hotel";
  const isTour = type === "tour";
  const isRestaurant = type === "restaurant";

  const bookingId = booking.booking_id;
  const serviceName = safeText(booking.service?.name || booking.service_name || booking.service?.title || (isHotel ? "Khách sạn" : isTour ? "Tour" : "Nhà hàng"));
  const serviceAddress = safeText(booking.service?.address || booking.service_address || "");
  const serviceImage = booking.service?.image || booking.service_image || "";

  const checkInDate = booking.detail?.check_in_date || booking.detail?.check_in_datetime || booking.check_in || null;
  const checkOutDate = booking.detail?.check_out_date || booking.detail?.check_out_datetime || booking.check_out || null;
  const checkInTime = booking.service?.check_in_time || booking.check_in_time || "14:00";
  const checkOutTime = booking.service?.check_out_time || booking.check_out_time || "12:00";

  // --- compute totalRooms reliably ---
  const computeTotalRooms = () => {
    const rs = booking.detail?.rooms_summary;
    if (Array.isArray(rs) && rs.length > 0) {
      let sum = 0;
      for (const r of rs) {
        const q = Number(r.quantity ?? r.count ?? r.total ?? r.rooms ?? r.qty ?? 0);
        if (!Number.isNaN(q)) sum += q;
      }
      return sum;
    }
    if (booking.total_rooms !== undefined && booking.total_rooms !== null) {
      const num = Number(booking.total_rooms);
      if (!Number.isNaN(num)) return num;
    }
    if (booking.detail?.total_rooms !== undefined && booking.detail?.total_rooms !== null) {
      const num = Number(booking.detail.total_rooms);
      if (!Number.isNaN(num)) return num;
    }
    return undefined;
  };

  const totalRoomsRaw = computeTotalRooms();
  const totalRoomsDisplay = totalRoomsRaw === undefined ? "—" : String(totalRoomsRaw);

  const guestsCount = Number(booking.total_guests ?? booking.detail?.total_guests ?? 1) || 1;

  const subtotal = booking.totals?.subtotal ?? booking.total_price ?? 0;
  const discount = booking.totals?.discount ?? 0;
  const grandTotal = booking.totals?.grand_total ?? booking.total_price ?? subtotal;

  const customerName = safeText(booking.customer_name || booking._raw?.customer?.name || "—");
  const customerEmail = safeText(booking.customer_email || booking._raw?.customer?.email || "");
  const customerPhone = safeText(booking.customer_phone || booking._raw?.customer?.phone || "");

  const qrText = `${isHotel ? "H" : isTour ? "T" : "R"}-${bookingId}-${String(booking.status_id ?? booking.status_name ?? "").slice(0, 10)}`;

  const statusId = Number(booking.status_id ?? 0);
  const isCancelled = statusId === 5 || String(booking.status_name || "").toLowerCase().includes("hủy");
  const checkOutParsed = tryParseDate(checkOutDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Completed if explicit 4 OR (status 2 or 3) and checkout date < today
  const isCompleted = (statusId === 4) || ((statusId === 2 || statusId === 3) && checkOutParsed && checkOutParsed < today);

  const canCancel = !isCancelled && !isCompleted && statusId !== 4 && statusId !== 5;
  const canReview = isCompleted && !booking.reviewed && !isRestaurant && !isCancelled;

  const resolvedServiceId = resolveServiceId(booking);

  // Payment method display: detect online vs pay-later
  const detectPaymentMethodLabel = (payment, raw) => {
    if (!payment && !raw) return "Thanh toán tại quầy";
    const pm = (payment?.method || payment?.payment_method || payment?.method_name || payment?.payment_method_id || raw?.payment_method || raw?.payment)?.toString?.() ?? "";
    const pmText = (pm || "").toLowerCase();
    if (pmText.includes("card") || pmText.includes("stripe") || pmText.includes("vnpay") || pmText.includes("momo") || pmText.includes("paypal") || pmText.includes("online") || pmText.includes("gateway")) {
      return "Thanh toán online";
    }
    const paidAmt = Number(payment?.amount ?? payment?.paid_amount ?? raw?.paid_amount ?? raw?.amount_paid ?? 0);
    if (!isNaN(paidAmt) && paidAmt > 0) return "Thanh toán online";
    return "Thanh toán tại quầy";
  };

  const paymentLabel = detectPaymentMethodLabel(booking.payment, booking._raw);

  // If backend provides a payment URL for completing payment, show a button
  const paymentUrl = booking.payment?.payment_url || booking._raw?.payment_url || booking._raw?.payment?.payment_url || null;
  const needsPayment = statusId !== 3 && statusId !== 4 && statusId !== 5 && paymentUrl;

  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      {toast.show && (
        <div style={{ position: "fixed", right: 20, top: 20, zIndex: 2000 }}>
          <div className={`p-3 rounded shadow ${toast.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>{toast.message}</div>
        </div>
      )}

      <Link to="/my-bookings" className="d-inline-block mb-3 text-decoration-none text-primary fw-bold">&larr; Quay lại</Link>

      <div ref={printRef}>
        <div className="d-flex align-items-center justify-content-between bg-white shadow-sm p-4 rounded-3 mb-4 border">
          <div>
            <h3 className="mb-0 text-primary">{serviceName}</h3>
            <div className="text-muted small">Mã đơn: <strong>#{bookingId}</strong></div>
            <div className="text-muted small">Đặt ngày: {fmtDate(booking.created_at)}</div>
          </div>
          <div className="text-end">
            <div className="text-muted small mb-1">Trạng thái</div>
            <div className={`d-inline-block px-3 py-2 rounded-2 ${colorClass}`} style={{ minWidth: 130, fontWeight: 700 }}>{statusLabel}</div>
          </div>
        </div>

        <div className="row gx-4 gy-4">
          <div className="col-lg-8">
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-light border-bottom fw-bold text-primary">{isHotel ? "🏠 Thông tin Khách sạn" : isTour ? "🧭 Thông tin Tour" : "🍽 Thông tin Đặt bàn"}</div>
              <div className="row g-0">
                <div className="col-md-5">
                  <img src={serviceImage || "https://placehold.co/800x600?text=Service+Image"} alt={serviceName} className="img-fluid h-100 w-100 rounded-start" style={{ objectFit: "cover", minHeight: 200 }} />
                </div>
                <div className="col-md-7">
                  <div className="card-body">
                    <h5 className="card-title mb-1">{serviceName}</h5>
                    <div className="mb-3 text-muted small">📍 {serviceAddress || "Đang cập nhật địa chỉ"}</div>

                    {isHotel && (
                      <>
                        <div className="mb-2 small text-muted fw-bold">Thời gian lưu trú</div>
                        <div className="mb-1">Nhận: <strong>{fmtDate(checkInDate)}</strong> • <strong>{fmtTime(checkInTime)}</strong></div>
                        <div className="mb-2">Trả: <strong>{fmtDate(checkOutDate)}</strong> • <strong>{fmtTime(checkOutTime)}</strong></div>
                        <div className="mb-1">Số phòng: <strong>{totalRoomsDisplay}</strong> • Khách: <strong>{guestsCount}</strong></div>
                        {booking.detail?.rooms_summary && booking.detail.rooms_summary.length > 0 && (
                          <div className="text-primary fw-bold mt-1">
                            {booking.detail.rooms_summary.map((r, i) => {
                              const qty = Number(r.quantity ?? r.count ?? r.total ?? r.rooms ?? r.qty ?? 0);
                              const name = r.room_type_name || r.name || r.title || "Phòng";
                              return <span key={i}>{name}{typeof qty === "number" && !Number.isNaN(qty) ? ` x${qty}` : ''}{i < booking.detail.rooms_summary.length - 1 ? ", " : ""}</span>;
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {isTour && (
                      <>
                        <div className="mb-2 small text-muted fw-bold">Chi tiết tour</div>

                        {/* Ngày & giờ */}
                        <div className="mb-1">Ngày: <strong>{fmtDate(booking.detail?.tour_date)}</strong></div>

                        {/* If detail.tour_datetime is full datetime show time, else fallback to service.start_time */}
                        <div className="mb-1">Giờ khởi hành: <strong>{fmtTime(booking.detail?.tour_datetime || booking.service?.start_time)}</strong></div>

                        {/* end time: prefer service.end_time, then try detail.end_time */}
                        <div className="mb-1">Giờ kết thúc (dự kiến): <strong>{fmtTime(booking.service?.end_time || booking.detail?.end_time)}</strong></div>

                        {/* Start / End locations */}
                        <div className="mb-1">Điểm đón: <strong>{safeText(booking.service?.start_location || booking.detail?.start_location || "Đang cập nhật")}</strong></div>
                        <div className="mb-1">Điểm trả: <strong>{safeText(booking.service?.end_location || booking.detail?.end_location || "Đang cập nhật")}</strong></div>

                        {/* duration if available */}
                        {booking.service?.duration_hours && (
                          <div className="mb-1">Thời lượng: <strong>{String(booking.service.duration_hours)} giờ</strong></div>
                        )}

                        <div className="mb-1">Số khách: <strong>{guestsCount}</strong></div>

                        {/* Optional: show price per person if available */}
                        {booking.detail?.tour_price_per_person && (
                          <div className="mt-2 small text-muted">Giá/khách: <strong>{fmtMoney(booking.detail.tour_price_per_person)}</strong></div>
                        )}
                      </>
                    )}

                    {isRestaurant && (
                      <>
                        <div className="mb-2 small text-muted fw-bold">Chi tiết đặt bàn</div>
                        <div className="mb-1">Thời gian: <strong>{fmtDate(booking.check_in)}</strong> lúc <strong>{fmtTime(booking.check_in)}</strong></div>
                        <div className="mb-1">Số khách: <strong>{guestsCount}</strong> người</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-light border-bottom fw-bold text-secondary">👤 Thông tin người đặt</div>
              <div className="card-body">
                <div className="mb-1"><strong>Người đặt:</strong> {customerName}</div>
                <div className="mb-1"><strong>Email:</strong> {customerEmail}</div>
                <div className="mb-1"><strong>SĐT:</strong> {customerPhone}</div>
                {booking.note && <div className="mt-3"><strong>Ghi chú:</strong><div className="mt-1 p-2 bg-light rounded" style={{ whiteSpace: "pre-wrap" }}>{safeText(booking.note)}</div></div>}
              </div>
            </div>

            {booking.service?.hotel_policy && isHotel && (
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-light border-bottom fw-bold text-info">💡 Chính sách Khách sạn</div>
                <div className="card-body small" style={{ whiteSpace: "pre-wrap" }}>{safeText(booking.service.hotel_policy)}</div>
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="card mb-4 shadow-sm">
              <div className="card-header bg-primary text-white fw-bold">💰 Tóm tắt thanh toán</div>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2"><div>Giá cơ bản</div><div>{fmtMoney(subtotal)}</div></div>
                <div className="d-flex justify-content-between mb-2"><div>Giảm</div><div>{fmtMoney(discount)}</div></div>
                <hr />
                <div className="d-flex justify-content-between align-items-center mb-3"><div className="fw-bold fs-6">Tổng cộng</div><div className="fw-bolder fs-5 text-danger">{fmtMoney(grandTotal)}</div></div>
                <div className="small text-muted mb-3">**Phương thức:** {paymentLabel}</div>
                <div className="d-grid gap-2">
                  <button className="btn btn-primary" onClick={() => window.print()}><i className="bi bi-printer me-2" /> In hóa đơn</button>
                  <button className="btn btn-outline-primary" onClick={handleExportPDF}><i className="bi bi-download me-2" /> Tải PDF</button>
                  <button className="btn btn-outline-secondary" onClick={() => { navigator.clipboard?.writeText(window.location.href); alert("Đã sao chép đường dẫn"); }}><i className="bi bi-link me-2" /> Sao chép link</button>
                </div>
              </div>
            </div>

            <div className="card shadow-sm text-center mb-3">
              <div className="card-body">
                <div className="small text-muted mb-2">Mã QR dùng để check-in</div>
                <div className="d-flex justify-content-center mb-3"><div style={{ background: "#fff", padding: 8, borderRadius: 8, border: "1px solid #e9ecef" }}><QRCodeSVG value={qrText} size={150} /></div></div>
                <div className="fw-bold">{qrText}</div>

                <div className="mt-3 d-flex justify-content-center gap-2">
                  <button className="btn btn-sm btn-outline-dark" onClick={() => { navigator.clipboard?.writeText(qrText); alert("Đã sao chép mã"); }}>Sao chép mã</button>
                  <button className="btn btn-sm btn-outline-dark" onClick={() => alert("Tải QR chưa bật")}>Tải QR</button>
                </div>
              </div>
            </div>

            <div className="d-grid gap-2">
              {canCancel && (
    <button 
        className="btn btn-danger fw-bold" 
        onClick={() => setShowCancelModal(true)} // <--- Sửa dòng này để mở Modal
    >
        <i className="bi bi-x-circle me-1" /> Hủy đơn
    </button>
)}
              {needsPayment && <a href={paymentUrl} target="_blank" rel="noreferrer" className="btn btn-success fw-bold"><i className="bi bi-credit-card me-1" /> Thanh toán online</a>}
              {canReview && <button className="btn btn-warning text-dark fw-bold" onClick={() => setShowReviewModal(true)}><i className="bi bi-star-fill me-1" /> Viết nhận xét</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal (embedded ReviewForm) */}
      {showReviewModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Viết nhận xét - {isHotel ? "Khách sạn" : isTour ? "Tour" : "Nhà hàng"}</h5>
                <button type="button" className="btn-close" onClick={() => setShowReviewModal(false)}></button>
              </div>
              <div className="modal-body">
                <ReviewForm
                  type={booking.booking_type}
                  itemId={resolvedServiceId}
                  userId={currentUser?.user_id || currentUser?.id || booking._raw?.user_id || null}
                  bookingId={bookingId}
                  defaultRoomType={booking.detail?.rooms_summary?.[0]?.room_type_name || ""}
                  defaultStayDuration={booking.detail?.nights ? `Đã ở ${booking.detail?.nights} đêm` : ""}
                  onClose={() => setShowReviewModal(false)}
                  onSubmitted={(resp) => {
                    setShowReviewModal(false);
                    setBooking((prev) => prev ? ({ ...prev, reviewed: true }) : prev);
                    showToast("Cảm ơn bạn đã gửi nhận xét!", "success");
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL HỦY & HOÀN TIỀN --- */}
      {showCancelModal && (
        <CancelRefundModal 
            isOpen={showCancelModal}
            booking={booking}
            userId={currentUser?.user_id} // Truyền user_id để backend gửi thông báo đúng người
            onClose={() => setShowCancelModal(false)}
            onSuccess={() => {
                fetchInvoice(id, urlType); // Load lại trang để thấy trạng thái "Đã hủy"
            }}
        />
      )}
    </div>
  );
}
