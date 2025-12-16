import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
// 1. Import file CSS bạn vừa tạo
import "./StickySearchHeader.css";

// 2. Component này về cơ bản là logic của HotelSearchForm
// được đặt trong một layout 5 cột
export default function StickySearchHeader({ show }) {
  const navigate = useNavigate();
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
    const params = new URLSearchParams();
    params.append("q", form.where.trim());
    params.append("type", "hotel");
    params.append("checkIn", form.checkIn.toISOString().split("T")[0]);
    params.append("checkOut", form.checkOut.toISOString().split("T")[0]);
    params.append("guests", form.guests);
    params.append("rooms", form.rooms);
    navigate(`/search?${params.toString()}`);
  };

  // 3. Class 'visible' sẽ được thêm vào dựa trên prop 'show'
  return (
    <div className={`sticky-search-header ${show ? "visible" : ""}`}>
      <div className="container">
        <form onSubmit={onSubmit}>
          {/* 4. Dùng grid 5 cột (col) của Bootstrap */}
          <div className="row g-2 align-items-center">
            
            {/* Cột 1: Where (4/12) */}
            <div className="col-lg-4">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Nhập điểm đến..."
                  value={form.where}
                  onChange={(e) => setField("where", e.target.value)}
                />
              </div>
            </div>

            {/* Cột 2: Check-in (2/12) */}
            <div className="col-lg-2">
              <div className="input-group">
                <DatePicker
                  selected={form.checkIn}
                  onChange={(date) => setField("checkIn", date)}
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                />
              </div>
            </div>

            {/* Cột 3: Check-out (2/12) */}
            <div className="col-lg-2">
              <div className="input-group">
                <DatePicker
                  selected={form.checkOut}
                  onChange={(date) => setField("checkOut", date)}
                  className="form-control"
                  dateFormat="dd/MM/yyyy"
                />
              </div>
            </div>

            {/* Cột 4: Guests/Rooms (2/12) */}
            <div className="col-lg-2">
              <div className="input-group">
                 <span className="input-group-text">
                  <i className="bi bi-people"></i>
                </span>
                <input
                  readOnly
                  className="form-control"
                  value={`${form.guests} khách, ${form.rooms} phòng`}
                  onClick={() => alert("TODO: mở popup chọn khách/phòng")}
                />
              </div>
            </div>

            {/* Cột 5: Nút Tìm (2/12) */}
            <div className="col-lg-2 d-grid">
              <button type="submit" className="btn btn-primary btn-lg">
                TÌM
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
