import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
// (Hãy chắc chắn rằng bạn đã import CSS của DatePicker trong index.js)
// Và import CSS tùy chỉnh ở bước 2

// --- Component Form con cho Khách sạn / Nhà ---
// Đã cập nhật để giống Agoda hơn
const HotelSearchForm = () => {
  const navigate = useNavigate();
  const [stayType, setStayType] = useState("overnight"); // overnight | dayuse
  const [form, setForm] = useState({
    where: "",
    checkIn: new Date(),
    checkOut: new Date(new Date().setDate(new Date().getDate() + 1)),
    guests: 2,
    rooms: 1,
  });

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.where.trim()) {
      alert("Vui lòng nhập điểm đến của bạn.");
      return;
    }
    // ... (logic submit của bạn giữ nguyên)
  };

  return (
    <form onSubmit={onSubmit}>
      {/* Segmented (Chỗ ở qua đêm / Trong ngày) - Đã đổi sang nav-pills */}
      <ul
        className="nav nav-pills nav-pills-custom-search mb-3"
        role="tablist"
      >
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link ${stayType === "overnight" ? "active" : ""}`}
            onClick={() => setStayType("overnight")}
          >
            Chỗ Ở Qua Đêm
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link ${stayType === "dayuse" ? "active" : ""}`}
            onClick={() => setStayType("dayuse")}
          >
            Chỗ Ở Trong Ngày
          </button>
        </li>
      </ul>

      {/* Hàng input dạng lưới */}
      <div className="search-row mb-3">
        {/* Where */}
        <div>
          <div className="input-group input-lg bg-light px-2 rounded-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-search"></i>
            </span>
            <input
              className="form-control bg-transparent border-0"
              placeholder="Nhập điểm đến (VD: Bến Ninh Kiều...)"
              value={form.where}
              onChange={(e) => setField("where", e.target.value)}
            />
          </div>
        </div>

        {/* Check-in (Sử dụng DatePicker) */}
        <div>
          <div className="input-group input-lg bg-light px-2 rounded-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-calendar3"></i>
            </span>
            <DatePicker
              selected={form.checkIn}
              onChange={(date) => setField("checkIn", date)}
              className="form-control bg-transparent border-0"
              dateFormat="dd/MM/yyyy"
            />
          </div>
        </div>

        {/* Check-out (Sử dụng DatePicker) */}
        <div>
          <div className="input-group input-lg bg-light px-2 rounded-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-calendar3"></i>
            </span>
            <DatePicker
              selected={form.checkOut}
              onChange={(date) => setField("checkOut", date)}
              className="form-control bg-transparent border-0"
              dateFormat="dd/MM/yyyy"
            />
          </div>
        </div>

        {/* Guests/Rooms */}
        <div>
          <div className="input-group input-lg bg-light px-2 rounded-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-people"></i>
            </span>
            <input
              readOnly
              className="form-control bg-transparent border-0"
              value={`${form.guests} khách · ${form.rooms} phòng`}
              onClick={() => alert("TODO: mở popup chọn khách/phòng")}
            />
          </div>
        </div>
      </div>

      {/* Nút TÌM - Đã di chuyển ra ngoài grid và cho full-width */}
      <div className="d-grid">
        <button type="submit" className="btn btn-find btn-lg">
          TÌM
        </button>
      </div>
    </form>
  );
};

// --- Component Form con cho Hoạt động (Dựa trên ảnh) ---
const ActivitySearchForm = () => {
  // ... (Không thay đổi)
  const navigate = useNavigate();
  const [where, setWhere] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    if (!where.trim()) {
      alert("Vui lòng nhập điểm đến hoặc hoạt động.");
      return;
    }
    navigate(`/search?q=${where.trim()}&type=activity`);
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="search-row" style={{ gridTemplateColumns: "1fr auto" }}>
        <div className="input-group input-lg bg-light px-2 rounded-3">
          <span className="input-group-text bg-transparent border-0">
            <i className="bi bi-search"></i>
          </span>
          <input
            className="form-control bg-transparent border-0"
            placeholder="Tìm theo thành phố hoặc tên hoạt động"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
          />
        </div>
        <div className="d-grid">
          <button type="submit" className="btn btn-find btn-lg">
            TÌM
          </button>
        </div>
      </div>
    </form>
  );
};

// --- Component Form con cho Máy bay + Khách sạn (Dựa trên ảnh) ---
const FlightHotelSearchForm = () => {
  // ... (Không thay đổi)
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div
        className="search-row mb-3"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        <input
          className="form-control form-control-lg bg-light border-0"
          placeholder="Bay từ"
        />
        <input
          className="form-control form-control-lg bg-light border-0"
          placeholder="Bay đến"
        />
      </div>
      <div
        className="search-row mb-3"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        <input
          type="date"
          className="form-control form-control-lg bg-light border-0"
        />
        <input
          type="date"
          className="form-control form-control-lg bg-light border-0"
        />
      </div>
      <div
        className="search-row mb-3"
        style={{ gridTemplateColumns: "1fr" }}
      >
        <input
          className="form-control form-control-lg bg-light border-0"
          placeholder="Nhập điểm đến khách sạn (VD: Bến Ninh Kiều...)"
        />
      </div>
      <div className="search-row">
        <input
          type="date"
          className="form-control form-control-lg bg-light border-0"
          placeholder="Nhận phòng"
        />
        <input
          type="date"
          className="form-control form-control-lg bg-light border-0"
          placeholder="Trả phòng"
        />
        <input
          className="form-control form-control-lg bg-light border-0"
          placeholder="1 khách, 1 phòng"
        />
        <div className="d-grid">
          <button
            type="submit"
            className="btn btn-find btn-lg"
            onClick={() => alert("Chức năng này chưa hỗ trợ")}
          >
            TÌM
          </button>
        </div>
      </div>
    </form>
  );
};

// --- Form mặc định cho các tab chưa làm ---
const DefaultForm = ({ tabName }) => (
  // ... (Không thay đổi)
  <div className="text-center p-5">
    <h4 className="text-muted">Chức năng "{tabName}" hiện chưa được hỗ trợ.</h4>
    <p className="text-muted">Vui lòng quay lại sau.</p>
  </div>
);

// --- Component SEARCHBOX Chính ---
// *** ĐÃ CẬP NHẬT CẤU TRÚC ***
export default function SearchBox() {
  const [activeTab, setActiveTab] = useState("hotel");

  const renderActiveForm = () => {
    switch (activeTab) {
      case "hotel":
      case "home":
        return <HotelSearchForm />;
      case "activity":
        return <ActivitySearchForm />;
      case "flight_hotel":
        return <FlightHotelSearchForm />;
      case "flight":
        return <DefaultForm tabName="Vé máy bay" />;
      case "transfer":
        return <DefaultForm tabName="Đưa đón sân bay" />;
      default:
        return <HotelSearchForm />;
    }
  };

  return (
    <div className="position-relative z-2">
      {/* Card tìm kiếm (Bọc tất cả) */}
      <div className="search-card bg-white p-3 p-md-4 rounded-4 shadow-sm">
        {/* Tabs (ĐÃ DI CHUYỂN VÀO TRONG và dùng nav-tabs) */}
        <ul className="nav nav-tabs border-0 mb-3" role="tablist">
          {[
            { key: "hotel", label: "Khách sạn", icon: "bi-building" },
            { key: "home", label: "Nhà & Căn hộ", icon: "bi-house-door" },
            {
              key: "flight_hotel",
              label: "Máy bay + K.sạn",
              icon: "bi-airplane",
            },
            { key: "activity", label: "Hoạt động", icon: "bi-balloon" },
            {
              key: "transfer",
              label: "Đưa đón sân bay",
              icon: "bi-taxi-front",
            },
          ].map((t) => (
            <li className="nav-item" key={t.key} role="presentation">
              <button
                type="button"
                role="tab"
                onClick={() => setActiveTab(t.key)}
                className={`nav-link border-0 fw-semibold ${
                  activeTab === t.key ? "active" : ""
                }`}
              >
                <i className={`bi ${t.icon} me-2`}></i>
                {t.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Nội dung Form động */}
        {renderActiveForm()}
      </div>
    </div>
  );
}