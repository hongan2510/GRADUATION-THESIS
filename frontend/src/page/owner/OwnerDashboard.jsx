import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- 1. GLOBAL CSS ---
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  
  body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F3F4F6; color: #334155; }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

  /* Animations */
  .fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* Hover Effects */
  .hover-card { transition: all 0.3s ease; }
  .hover-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
  
  .nav-item { transition: all 0.2s; border-radius: 12px; margin-bottom: 4px; }
  .nav-item:hover { background-color: rgba(255,255,255,0.1); }
  
  .table-row { transition: background-color 0.2s; }
  .table-row:hover { background-color: #F8FAFC; }

  .btn-hover { transition: all 0.2s; opacity: 0.95; }
  .btn-hover:hover { opacity: 1; transform: translateY(-1px); }
  .btn-hover:active { transform: scale(0.98); }

  /* MODAL STYLES */
  .modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5); z-index: 50;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px); animation: fadeIn 0.2s;
  }
  .modal-box {
    background: white; padding: 24px; border-radius: 16px;
    width: 90%; max-width: 800px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: 90vh; overflow-y: auto;
  }
  .invoice-paper {
    background: #fff; padding: 32px; max-width: 700px; width: 90%;
    border-radius: 8px; font-family: 'Courier New', Courier, monospace;
    border-top: 8px solid #6366F1;
  }
  .invoice-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .invoice-divider { border-bottom: 2px dashed #E2E8F0; margin: 16px 0; }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const OwnerDashboard = () => {
    const navigate = useNavigate();
    const API_URL = 'http://localhost:8082';

    // --- STATE ---
    const [user, setUser] = useState(null);
    
    // 🔥 SỬA: Lấy tab từ localStorage để giữ trạng thái khi reload
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ownerActiveTab') || 'DASHBOARD');
    
    const [selectedHotelId, setSelectedHotelId] = useState('');
    const [timeFilter, setTimeFilter] = useState('week');
    
    // Data
    const [myHotels, setMyHotels] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ total_bookings: 0, active_bookings: 0, revenue: 0, cancelled: 0 });
    const [chartData, setChartData] = useState([]);
    const [hotelRooms, setHotelRooms] = useState([]);
    
    // UI Control
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [filterStatus, setFilterStatus] = useState('ALL');

    // Modal State - Booking Actions
    const [invoiceData, setInvoiceData] = useState(null);
    const [assignData, setAssignData] = useState(null);
    const [refundData, setRefundData] = useState(null); 
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [roomInput, setRoomInput] = useState('');

    // Modal State - Hotel Management
    const [showHotelModal, setShowHotelModal] = useState(false);
    const [hotelForm, setHotelForm] = useState(null);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [roomForm, setRoomForm] = useState(null);
    
    // Hotel Summary View State
    const [summaryData, setSummaryData] = useState(null); 
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    // PDF Print State
    const [isPrinting, setIsPrinting] = useState(false);
    const invoiceRef = useRef(null);

    // --- EFFECT: LƯU TAB KHI THAY ĐỔI ---
    useEffect(() => {
        localStorage.setItem('ownerActiveTab', activeTab);
    }, [activeTab]);

    // --- INITIALIZATION ---
    useEffect(() => {
        const username = localStorage.getItem('owner_user');
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
            navigate('/owner');
        } else {
            setUser(username || 'Đối tác');
            fetchHotels(userId);
        }
    }, [navigate]);

    const fetchHotels = async (userId) => {
        try {
            const res = await axios.get(`${API_URL}/api/owner/hotels`, { headers: { 'user-id': userId } });
            setMyHotels(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchRooms = async (hotelId) => {
        const userId = localStorage.getItem('user_id');
        try {
            const res = await axios.get(`${API_URL}/api/owner/rooms`, { params: { hotel_id: hotelId }, headers: { 'user-id': userId } });
            setHotelRooms(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {};
                if (selectedHotelId) params.hotel_id = selectedHotelId;

                // 1. Stats
                const resStats = await axios.get(`${API_URL}/api/owner/stats`, { headers: { 'user-id': userId }, params });
                setStats(resStats.data);

                // 2. Data based on Tab
                if (activeTab === 'DASHBOARD') {
                    const resBooking = await axios.get(`${API_URL}/api/owner/bookings`, { headers: { 'user-id': userId }, params: { ...params, limit: 5 } });
                    setBookings(resBooking.data);
                    
                    const resChart = await axios.get(`${API_URL}/api/owner/stats/chart`, { headers: { 'user-id': userId }, params: { ...params, period: timeFilter } });
                    setChartData(resChart.data);
                }
                if (activeTab === 'BOOKINGS') {
                    const resBookingFull = await axios.get(`${API_URL}/api/owner/bookings`, { headers: { 'user-id': userId }, params: { ...params, status: filterStatus } });
                    setBookings(resBookingFull.data);
                }
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, [selectedHotelId, activeTab, timeFilter, filterStatus, refreshKey]);

    // --- LOGIC FUNCTIONS ---
    const handleSwitchHotel = (e) => {
        const val = e.target.value;
        setSelectedHotelId(val ? parseInt(val) : ''); 
    };

    const updateBookingStatus = async (bookingId, newStatus) => {
        const userId = localStorage.getItem('user_id');
        let confirmMsg = "";
        
        if(newStatus === 5) confirmMsg = "Xác nhận HỦY đơn này? (Sau khi hủy, trạng thái sẽ chuyển sang Đã hủy và bạn có thể thực hiện hoàn tiền)";
        else if(newStatus === 4) confirmMsg = "Xác nhận khách đã TRẢ PHÒNG (Check-out)?";
        else confirmMsg = "Xác nhận thay đổi trạng thái?";

        if(!window.confirm(confirmMsg)) return;

        try {
            await axios.put(`${API_URL}/api/owner/bookings/${bookingId}/status`, { status_id: newStatus }, { headers: { 'user-id': userId } });
            alert("Cập nhật trạng thái thành công!");
            setRefreshKey(prev => prev + 1); 
        } catch (err) { alert("Lỗi: " + err.message); }
    };

    const handleOpenAssign = (booking) => {
        setAssignData(booking);
        setRoomInput(booking.assigned_room_number || '');
    };

    const submitAssignRoom = async () => {
        if (!roomInput) return alert("Vui lòng nhập số phòng!");
        const userId = localStorage.getItem('user_id');
        try {
            await axios.put(`${API_URL}/api/owner/bookings/${assignData.booking_id}/assign`, 
                { room_number: roomInput },
                { headers: { 'user-id': userId } }
            );
            alert(`✅ Đã gán phòng ${roomInput} thành công!`);
            setRefreshKey(prev => prev + 1);
            setAssignData(null);
        } catch (err) { alert("Lỗi: " + err.message); }
    };

    // --- REFUND LOGIC ---
    const handleOpenRefund = (booking) => {
        setRefundData({
            booking_id: booking.booking_id,
            total_price: booking.total_price,
            refund_amount: booking.requested_amount || booking.total_price, 
            reason: booking.refund_reason || 'Khách yêu cầu hủy', 
            bank_name: booking.bank_name || '',
            account_number: booking.account_number || '',
            account_holder_name: booking.account_holder_name || ''
        });
        setShowRefundModal(true);
    };

    const submitRefund = async () => {
        const userId = localStorage.getItem('user_id');
        if (!refundData.refund_amount || refundData.refund_amount <= 0) return alert("Số tiền hoàn không hợp lệ");
        if (refundData.refund_amount > refundData.total_price) return alert("Số tiền hoàn không được lớn hơn tổng tiền");
        if (!refundData.reason) return alert("Vui lòng nhập lý do hoàn tiền");

        if(!window.confirm(`Xác nhận HOÀN TIỀN ${Number(refundData.refund_amount).toLocaleString()}đ cho đơn #${refundData.booking_id}?`)) return;

        try {
            await axios.put(`${API_URL}/api/owner/bookings/${refundData.booking_id}/refund`, refundData, { headers: { 'user-id': userId } });
            alert("✅ Hoàn tiền thành công!");
            setRefreshKey(prev => prev + 1);
            setShowRefundModal(false);
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.error || err.message));
        }
    };

    // --- LOGIC: QUẢN LÝ KHÁCH SẠN ---
    const handleOpenAddHotel = () => {
        setHotelForm({
            name: '', address: '', image_url: '', 
            star_rating: 3, check_in_time: '14:00', check_out_time: '12:00', 
            hotel_policy: '', description: '', amenities: []
        });
        setHotelRooms([]);
        setShowHotelModal(true);
    };

    const handleOpenEditHotel = (hotel) => {
        let parsedAmenities = [];
        try {
            if (typeof hotel.amenities === 'string') parsedAmenities = JSON.parse(hotel.amenities);
            else if (Array.isArray(hotel.amenities)) parsedAmenities = hotel.amenities;
        } catch(e) { parsedAmenities = []; }

        setHotelForm({
            ...hotel, 
            amenities: parsedAmenities,
            name: hotel.name || '',
            address: hotel.address || '',
            description: hotel.description || '',
            image_url: hotel.image_url || '',
            star_rating: hotel.star_rating || 3,
            hotel_policy: hotel.hotel_policy || '',
            check_in_time: hotel.check_in_time || '14:00',
            check_out_time: hotel.check_out_time || '12:00'
        });
        fetchRooms(hotel.hotel_id);
        setShowHotelModal(true);
    };

    const handleDeleteHotel = async (id) => {
        if(!window.confirm("CẢNH BÁO: Hành động này sẽ xóa khách sạn và toàn bộ phòng liên quan! Bạn có chắc chắn muốn xóa?")) return;
        const userId = localStorage.getItem('user_id');
        try {
            await axios.delete(`${API_URL}/api/owner/hotels/${id}`, { headers: { 'user-id': userId } });
            alert("Đã xóa thành công!");
            fetchHotels(userId);
        } catch (err) { alert("Lỗi: " + (err.response?.data?.error || err.message)); }
    };

    const submitHotelForm = async () => {
        const userId = localStorage.getItem('user_id');
        try {
            if (hotelForm.hotel_id) {
                await axios.put(`${API_URL}/api/owner/hotels/${hotelForm.hotel_id}`, hotelForm, { headers: { 'user-id': userId } });
                alert("Cập nhật thành công!");
            } else {
                await axios.post(`${API_URL}/api/owner/hotels`, hotelForm, { headers: { 'user-id': userId } });
                alert("Thêm mới thành công!");
            }
            setShowHotelModal(false);
            fetchHotels(userId);
        } catch (err) { alert("Lỗi: " + (err.response?.data?.error || err.message)); }
    };

    // --- LOGIC: QUẢN LÝ PHÒNG ---
    const handleOpenAddRoom = () => {
        setRoomForm({
            room_type_name: '', price_per_night: 0, total_inventory: 5, max_guests: 2,
            size: 20, bed_type: '', view_type: '', image_url: '', facilities: []
        });
        setShowRoomModal(true);
    };

    const handleOpenEditRoom = (room) => {
        let parsedFacilities = [];
        try {
            if (typeof room.facilities === 'string') parsedFacilities = JSON.parse(room.facilities);
            else if (Array.isArray(room.facilities)) parsedFacilities = room.facilities;
        } catch(e) { parsedFacilities = []; }

        setRoomForm({ ...room, facilities: parsedFacilities });
        setShowRoomModal(true);
    };

    const handleDeleteRoom = async (roomId) => {
        if(!window.confirm("Xóa loại phòng này?")) return;
        const userId = localStorage.getItem('user_id');
        try {
            await axios.delete(`${API_URL}/api/owner/rooms/${roomId}`, { headers: { 'user-id': userId } });
            fetchRooms(hotelForm.hotel_id);
        } catch(err) { alert(err.message); }
    };

    const submitRoomForm = async () => {
        const userId = localStorage.getItem('user_id');
        try {
            const payload = { ...roomForm, hotel_id: hotelForm.hotel_id };
            if (roomForm.room_id) {
                await axios.put(`${API_URL}/api/owner/rooms/${roomForm.room_id}`, payload, { headers: { 'user-id': userId } });
            } else {
                await axios.post(`${API_URL}/api/owner/rooms`, payload, { headers: { 'user-id': userId } });
            }
            setShowRoomModal(false);
            fetchRooms(hotelForm.hotel_id);
        } catch (err) { alert("Lỗi: " + (err.response?.data?.error || err.message)); }
    };

    // --- HOTEL SUMMARY LOGIC ---
    const handleOpenManage = async (hotelId) => {
        const userId = localStorage.getItem('user_id');
        try {
            const res = await axios.get(`${API_URL}/api/owner/hotels/${hotelId}/summary`, { headers: { 'user-id': userId } });
            setSummaryData(res.data);
            setShowSummaryModal(true);
        } catch (err) {
            alert("Lỗi tải thông tin chi tiết: " + err.message);
        }
    };

    const calculateNights = (d1, d2) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        const diffTime = Math.abs(date2 - date1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
    };

    const handlePrintInvoice = async () => {
        const input = invoiceRef.current;
        if (!input) return;
        setIsPrinting(true);
        try {
            const canvas = await html2canvas(input, { scale: 2, logging: false, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${invoiceData.booking_id}.pdf`);
        } catch (err) {
            console.error("Lỗi in PDF:", err);
            alert("Lỗi khi xuất PDF");
        } finally {
            setIsPrinting(false);
        }
    };

    // --- SUB-COMPONENTS & RENDERS ---

    const renderChartSection = () => (
        <div style={{ ...styles.card, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>Biểu đồ Doanh thu</h3>
                <div style={styles.segmentedControl}>
                    {['day', 'week', 'month', 'year'].map((t) => (
                        <button key={t} onClick={() => setTimeFilter(t)}
                            style={{ ...styles.segmentBtn, ...(timeFilter === t ? styles.segmentBtnActive : {}) }}>
                            {t === 'day' ? 'Hôm nay' : t === 'week' ? 'Tuần này' : t === 'month' ? 'Tháng' : 'Năm'}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ height: 320, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} style={{ fontSize: 12, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={val => `${val/1000}k`} style={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(val) => new Intl.NumberFormat('vi-VN').format(val) + ' đ'} />
                        <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const renderAssignModal = () => {
        if (!assignData) return null;
        return (
            <div className="modal-overlay" onClick={() => setAssignData(null)}>
                <div className="modal-box" onClick={e => e.stopPropagation()}>
                    <h3 style={{marginTop:0, fontSize:20}}>🔑 Gán phòng</h3>
                    <p style={{color:'#64748B'}}>Khách: <b>{assignData.customer_name}</b> • {assignData.room_type_name}</p>
                    <div style={{margin: '20px 0'}}>
                        <label style={{display:'block', marginBottom:8, fontWeight:600}}>Nhập số phòng:</label>
                        <input autoFocus type="text" value={roomInput} onChange={(e) => setRoomInput(e.target.value)} placeholder="VD: 301..." style={styles.inputModal} />
                    </div>
                    <div style={{display:'flex', gap: 12, justifyContent:'flex-end'}}>
                        <button style={styles.btnOutline} onClick={() => setAssignData(null)}>Hủy</button>
                        <button style={styles.btnPrimary} onClick={submitAssignRoom}>Lưu</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderRefundModal = () => {
        if (!showRefundModal) return null;
        return (
            <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
                <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth: 550}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                        <h3 style={{margin:0, fontSize:20, color:'#DC2626'}}>💸 Xác nhận Hoàn tiền</h3>
                        <button onClick={() => setShowRefundModal(false)} style={{border:'none', background:'transparent', fontSize:20, cursor:'pointer'}}>✕</button>
                    </div>
                    
                    <div style={{background:'#FEF2F2', color:'#B91C1C', padding:12, borderRadius:8, fontSize:14, marginBottom:16}}>
                        Đơn hàng <b>#{refundData.booking_id}</b> đã thanh toán. <br/>
                        Tổng tiền: <b>{Number(refundData.total_price).toLocaleString()} VNĐ</b>
                    </div>

                    <div style={{display:'flex', flexDirection:'column', gap: 16}}>
                        <div>
                            <label style={styles.label}>Số tiền hoàn (VNĐ) <span style={{color:'red'}}>*</span></label>
                            <div style={{display:'flex', gap: 8}}>
                                <input type="number" style={styles.inputModal} value={refundData.refund_amount} 
                                    onChange={(e) => setRefundData({...refundData, refund_amount: e.target.value})} />
                                <button style={styles.btnOutline} onClick={() => setRefundData({...refundData, refund_amount: refundData.total_price})}>Hoàn 100%</button>
                            </div>
                        </div>

                        <div>
                            <label style={styles.label}>Lý do hoàn tiền <span style={{color:'red'}}>*</span></label>
                            <textarea rows="2" style={styles.inputModal} placeholder="VD: Khách yêu cầu hủy..." 
                                value={refundData.reason} 
                                onChange={(e) => setRefundData({...refundData, reason: e.target.value})} />
                        </div>

                        <div style={{borderTop: '1px solid #eee', paddingTop: 16}}>
                            <h4 style={{fontSize:14, fontWeight:700, color:'#3B82F6', marginBottom: 12}}>🏦 Thông tin nhận tiền (Tùy chọn)</h4>
                            <div style={{display:'grid', gap: 10}}>
                                <input type="text" style={styles.inputModal} placeholder="Tên Ngân hàng (VD: Vietcombank)" 
                                    value={refundData.bank_name} onChange={(e) => setRefundData({...refundData, bank_name: e.target.value})} />
                                <input type="text" style={styles.inputModal} placeholder="Số tài khoản" 
                                    value={refundData.account_number} onChange={(e) => setRefundData({...refundData, account_number: e.target.value})} />
                                <input type="text" style={styles.inputModal} placeholder="Tên chủ tài khoản" 
                                    value={refundData.account_holder_name} onChange={(e) => setRefundData({...refundData, account_holder_name: e.target.value})} />
                            </div>
                            <p style={{fontSize:12, color:'#64748B', marginTop:8, fontStyle:'italic'}}>*Chủ khách sạn lưu ý kiểm tra kỹ trước khi chuyển khoản.</p>
                        </div>
                    </div>

                    <div style={{display:'flex', gap: 12, justifyContent:'flex-end', marginTop:24}}>
                        <button style={styles.btnOutline} onClick={() => setShowRefundModal(false)}>Hủy bỏ</button>
                        <button style={{...styles.btnPrimary, background:'#DC2626'}} onClick={submitRefund}>Xác nhận Hoàn tiền</button>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER INVOICE MODAL ---
    const renderInvoiceModal = () => {
        if (!invoiceData) return null;
        const nights = calculateNights(invoiceData.check_in_date, invoiceData.check_out_date);
        
        // Format dates
        const checkIn = new Date(invoiceData.check_in_date).toLocaleDateString('vi-VN');
        const checkOut = new Date(invoiceData.check_out_date).toLocaleDateString('vi-VN');

        return (
            <div className="modal-overlay" onClick={() => setInvoiceData(null)}>
                <div className="modal-box invoice-paper" ref={invoiceRef} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{textAlign:'center', marginBottom: 30}}>
                        <h2 style={{margin:0, letterSpacing: 3, fontSize: 28, textTransform: 'uppercase'}}>HÓA ĐƠN</h2>
                        <p style={{color:'#64748B', fontSize: 13, marginTop: 5}}>#{invoiceData.booking_id} • {new Date().toLocaleDateString('vi-VN')}</p>
                    </div>

                    {/* Hotel Info */}
                    <div style={{marginBottom: 30, borderBottom: '1px solid #e2e8f0', paddingBottom: 15}}>
                        <div style={{fontWeight:'bold', fontSize: 20, color: '#1e293b'}}>{invoiceData.hotel_name}</div>
                    </div>

                    {/* Customer & Booking Info Grid */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30}}>
                        <div>
                            <p style={{fontSize: 12, color: '#94a3b8', margin: '0 0 4px 0', textTransform: 'uppercase'}}>Khách hàng</p>
                            <div style={{fontWeight: 600, fontSize: 15}}>{invoiceData.customer_name}</div>
                            <div style={{fontSize: 14, color: '#475569'}}>{invoiceData.customer_phone}</div>
                            <div style={{fontSize: 14, color: '#475569'}}>{invoiceData.customer_email}</div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <p style={{fontSize: 12, color: '#94a3b8', margin: '0 0 4px 0', textTransform: 'uppercase'}}>Thông tin lưu trú</p>
                            <div style={{fontSize: 14}}>
                                <span>Check-in:</span> <strong>{checkIn}</strong>
                            </div>
                            <div style={{fontSize: 14}}>
                                <span>Check-out:</span> <strong>{checkOut}</strong>
                            </div>
                            {/* 🔥 HIỂN THỊ SỐ PHÒNG NẾU CÓ */}
                            {invoiceData.assigned_room_number ? (
                                <div style={{marginTop: 8, padding: '4px 8px', background: '#f0fdf4', color: '#166534', display: 'inline-block', borderRadius: 4, fontWeight: 'bold', fontSize: 13}}>
                                    Phòng số: {invoiceData.assigned_room_number}
                                </div>
                            ) : (
                                <div style={{marginTop: 8, fontStyle: 'italic', color: '#94a3b8', fontSize: 13}}>
                                    (Chưa gán số phòng)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service Table */}
                    <table style={{width:'100%', marginBottom: 30, borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{borderBottom:'2px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase'}}>
                                <th style={{textAlign:'left', padding:'10px 0'}}>Dịch vụ / Loại phòng</th>
                                <th style={{textAlign:'center', padding:'10px 0'}}>Số đêm</th>
                                <th style={{textAlign:'center', padding:'10px 0'}}>Khách</th>
                                <th style={{textAlign:'right', padding:'10px 0'}}>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody style={{fontSize: 14}}>
                            <tr style={{borderBottom:'1px solid #f1f5f9'}}>
                                <td style={{padding:'15px 0'}}>
                                    <div style={{fontWeight: 600, color: '#1e293b'}}>{invoiceData.room_type_name}</div>
                                    <div style={{fontSize: 12, color: '#64748b'}}>Booking ID: #{invoiceData.booking_id}</div>
                                </td>
                                <td style={{textAlign:'center', padding:'15px 0'}}>{nights} đêm</td>
                                <td style={{textAlign:'center', padding:'15px 0'}}>{invoiceData.guests_count}</td>
                                <td style={{textAlign:'right', padding:'15px 0', fontWeight: 600}}>{Number(invoiceData.total_price).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Total */}
                    <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '2px solid #e2e8f0', paddingTop: 15}}>
                        <span style={{fontSize: 16, fontWeight: 'bold', marginRight: 20}}>TỔNG CỘNG</span>
                        <span style={{fontSize: 24, fontWeight: 'bold', color: '#6366F1'}}>{Number(invoiceData.total_price).toLocaleString()} VND</span>
                    </div>
                    
                    {/* Footer / Buttons */}
                    <div className="no-print" style={{marginTop: 40, display:'flex', gap: 12, justifyContent:'center'}}>
                         <button style={styles.btnOutline} onClick={handlePrintInvoice} disabled={isPrinting}>
                            {isPrinting ? '⏳ Đang tạo...' : '🖨️ In hóa đơn'}
                         </button>
                         <button style={{...styles.btnPrimary, background:'#EF4444'}} onClick={() => setInvoiceData(null)}>Đóng</button>
                    </div>
                </div>
            </div>
        );
    };
    // --- FORM QUẢN LÝ PHÒNG (Room Modal) ---
    const renderRoomModal = () => {
        if(!showRoomModal || !roomForm) return null;
        const commonFacilities = ["Máy lạnh", "TV", "Tủ lạnh", "Ban công", "Bồn tắm", "Wifi"];
        const toggleFacility = (item) => {
            const current = roomForm.facilities || [];
            if(current.includes(item)) setRoomForm({...roomForm, facilities: current.filter(i => i !== item)});
            else setRoomForm({...roomForm, facilities: [...current, item]});
        };
        const val = (v) => (v === null || v === undefined) ? '' : v;

        return (
            <div className="modal-overlay" style={{zIndex:60}}>
                <div className="modal-box" style={{maxWidth:600}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                        <h3 style={{margin:0, fontSize:18}}>{roomForm.room_id ? '✏️ Sửa loại phòng' : '➕ Thêm loại phòng'}</h3>
                        <button onClick={() => setShowRoomModal(false)} style={{background:'none', border:'none', fontSize:24, cursor:'pointer'}}>×</button>
                    </div>
                    <div className="row g-3">
                        <div className="col-12">
                            <label style={styles.label}>Tên loại phòng</label>
                            <input type="text" style={styles.inputModal} value={val(roomForm.room_type_name)} onChange={e=>setRoomForm({...roomForm, room_type_name: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label style={styles.label}>Giá/đêm</label>
                            <input type="number" style={styles.inputModal} value={val(roomForm.price_per_night)} onChange={e=>setRoomForm({...roomForm, price_per_night: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label style={styles.label}>Số lượng (Tổng)</label>
                            <input type="number" style={styles.inputModal} value={val(roomForm.total_inventory)} onChange={e=>setRoomForm({...roomForm, total_inventory: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label style={styles.label}>Số khách tối đa</label>
                            <input type="number" style={styles.inputModal} value={val(roomForm.max_guests)} onChange={e=>setRoomForm({...roomForm, max_guests: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label style={styles.label}>Diện tích (m2)</label>
                            <input type="number" style={styles.inputModal} value={val(roomForm.size)} onChange={e=>setRoomForm({...roomForm, size: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label style={styles.label}>Loại giường</label>
                            <input type="text" style={styles.inputModal} value={val(roomForm.bed_type)} onChange={e=>setRoomForm({...roomForm, bed_type: e.target.value})} placeholder="VD: 1 Giường đôi" />
                        </div>
                        <div className="col-6">
                            <label style={styles.label}>Hướng nhìn (View)</label>
                            <input type="text" style={styles.inputModal} value={val(roomForm.view_type)} onChange={e=>setRoomForm({...roomForm, view_type: e.target.value})} placeholder="VD: Hướng phố" />
                        </div>
                        <div className="col-12">
                            <label style={styles.label}>Tiện nghi phòng</label>
                            <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                                {commonFacilities.map(item => (
                                    <button key={item} onClick={() => toggleFacility(item)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 16, border: '1px solid #ddd',
                                            background: (roomForm.facilities || []).includes(item) ? '#10B981' : 'white',
                                            color: (roomForm.facilities || []).includes(item) ? 'white' : '#333',
                                            cursor: 'pointer', fontSize: 12
                                        }}>
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{marginTop:20, display:'flex', justifyContent:'flex-end', gap:10}}>
                        <button style={styles.btnOutline} onClick={() => setShowRoomModal(false)}>Hủy</button>
                        <button style={styles.btnPrimary} onClick={submitRoomForm}>Lưu</button>
                    </div>
                </div>
            </div>
        );
    };

    // --- FORM QUẢN LÝ KHÁCH SẠN (Modal - Đã Update UI & Logic) ---
    const renderHotelModal = () => {
        if (!showHotelModal || !hotelForm) return null;
        
        const commonAmenities = ["Wifi", "Hồ bơi", "Spa", "Gym", "Nhà hàng", "Chỗ đậu xe", "Lễ tân 24h", "Thang máy", "Điều hòa"];
        const toggleAmenity = (item) => {
            const current = hotelForm.amenities || [];
            if (current.includes(item)) setHotelForm({...hotelForm, amenities: current.filter(i => i !== item)});
            else setHotelForm({...hotelForm, amenities: [...current, item]});
        };

        const val = (v) => (v === null || v === undefined) ? '' : v;

        return (
            <div className="modal-overlay">
                <div className="modal-box" style={{maxWidth: 900, width:'95%', maxHeight:'90vh', overflowY:'auto'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, borderBottom:'1px solid #f0f0f0', paddingBottom:16}}>
                        <h3 style={{margin:0, fontSize:22, fontWeight:700, color:'#1e293b'}}>
                            {hotelForm.hotel_id ? '✏️ Chỉnh sửa Khách sạn & Phòng' : '🏨 Thêm Khách sạn mới'}
                        </h3>
                        <button onClick={() => setShowHotelModal(false)} style={{background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#94a3b8'}}>×</button>
                    </div>

                    <div className="row g-4">
                        {/* Hàng 1: Tên & Hạng sao */}
                        <div className="col-md-8">
                            <label style={styles.label}>Tên khách sạn <span style={{color:'red'}}>*</span></label>
                            <input type="text" style={styles.inputModal} 
                                value={val(hotelForm.name)} 
                                onChange={e => setHotelForm({...hotelForm, name: e.target.value})} 
                                placeholder="Nhập tên khách sạn..."
                            />
                        </div>
                        <div className="col-md-4">
                            <label style={styles.label}>Hạng sao (1-5)</label>
                            <select style={styles.inputModal} 
                                value={val(hotelForm.star_rating)} 
                                onChange={e => setHotelForm({...hotelForm, star_rating: e.target.value})}
                            >
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Sao</option>)}
                            </select>
                        </div>

                        {/* Hàng 2: Địa chỉ & Ảnh */}
                        <div className="col-md-12">
                            <label style={styles.label}>Địa chỉ chi tiết <span style={{color:'red'}}>*</span></label>
                            <input type="text" style={styles.inputModal} 
                                value={val(hotelForm.address)} 
                                onChange={e => setHotelForm({...hotelForm, address: e.target.value})} 
                                placeholder="Số nhà, đường, phường, quận..."
                            />
                        </div>
                        <div className="col-md-12">
                            <label style={styles.label}>Link Hình ảnh (URL)</label>
                            <input type="text" style={styles.inputModal} 
                                value={val(hotelForm.image_url)} 
                                onChange={e => setHotelForm({...hotelForm, image_url: e.target.value})} 
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        {/* Hàng 3: Giờ giấc */}
                        <div className="col-md-6">
                            <label style={styles.label}>Giờ Check-in</label>
                            <input type="time" style={styles.inputModal} 
                                value={val(hotelForm.check_in_time)} 
                                onChange={e => setHotelForm({...hotelForm, check_in_time: e.target.value})} 
                            />
                        </div>
                        <div className="col-md-6">
                            <label style={styles.label}>Giờ Check-out</label>
                            <input type="time" style={styles.inputModal} 
                                value={val(hotelForm.check_out_time)} 
                                onChange={e => setHotelForm({...hotelForm, check_out_time: e.target.value})} 
                            />
                        </div>

                        {/* Hàng 4: Mô tả & Chính sách */}
                        <div className="col-12">
                            <label style={styles.label}>Mô tả tổng quan</label>
                            <textarea rows="4" style={{...styles.inputModal, resize:'vertical'}} 
                                value={val(hotelForm.description)} 
                                onChange={e => setHotelForm({...hotelForm, description: e.target.value})} 
                                placeholder="Mô tả về không gian, vị trí, điểm nổi bật..."
                            />
                        </div>
                        <div className="col-12">
                            <label style={styles.label}>Chính sách khách sạn</label>
                            <textarea rows="6" style={{...styles.inputModal, resize:'vertical', fontFamily:'monospace', fontSize:13}} 
                                value={val(hotelForm.hotel_policy)} 
                                onChange={e => setHotelForm({...hotelForm, hotel_policy: e.target.value})} 
                                placeholder="- Quy định nhận/trả phòng&#10;- Quy định trẻ em&#10;- Quy định hủy phòng..."
                            />
                        </div>

                        {/* Hàng 5: Tiện nghi */}
                        <div className="col-12">
                            <label style={styles.label}>Tiện nghi khách sạn</label>
                            <div style={{display:'flex', flexWrap:'wrap', gap:10, padding: 10, background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0'}}>
                                {commonAmenities.map(item => (
                                    <button key={item} onClick={() => toggleAmenity(item)}
                                        style={{
                                            padding: '8px 16px', borderRadius: 20, border: '1px solid',
                                            borderColor: (hotelForm.amenities || []).includes(item) ? '#003580' : '#cbd5e1',
                                            background: (hotelForm.amenities || []).includes(item) ? '#003580' : 'white',
                                            color: (hotelForm.amenities || []).includes(item) ? 'white' : '#64748b',
                                            cursor: 'pointer', fontSize: 13, fontWeight:500, transition:'all 0.2s'
                                        }}>
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* QUẢN LÝ PHÒNG */}
                        {hotelForm.hotel_id && (
                            <div className="col-12 mt-4">
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'2px solid #e2e8f0', paddingBottom:12, marginBottom:16}}>
                                    <label style={{...styles.label, margin:0, fontSize:18, color:'#0f172a'}}>🏡 Danh sách phòng</label>
                                    <button className="btn-hover" style={{...styles.btnPrimary, padding:'8px 16px', fontSize:13}} onClick={handleOpenAddRoom}>
                                        + Thêm loại phòng
                                    </button>
                                </div>
                                {hotelRooms.length === 0 ? 
                                    <div style={{textAlign:'center', padding:30, background:'#f8fafc', borderRadius:8, color:'#94a3b8', border:'1px dashed #cbd5e1'}}>
                                        Chưa có loại phòng nào được tạo.
                                    </div> 
                                : (
                                    <div style={{overflowX:'auto'}}>
                                        <table style={{width:'100%', fontSize:14, borderCollapse:'collapse'}}>
                                            <thead>
                                                <tr style={{background:'#f1f5f9', textAlign:'left', color:'#475569'}}>
                                                    <th style={{padding:'12px 16px', borderRadius:'8px 0 0 8px'}}>Tên phòng</th>
                                                    <th style={{padding:'12px 16px'}}>Giá/đêm</th>
                                                    <th style={{padding:'12px 16px', textAlign:'center'}}>SL</th>
                                                    <th style={{padding:'12px 16px', textAlign:'center'}}>Khách</th>
                                                    <th style={{padding:'12px 16px', textAlign:'right', borderRadius:'0 8px 8px 0'}}>Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {hotelRooms.map(r => (
                                                    <tr key={r.room_id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                                        <td style={{padding:'12px 16px', fontWeight:600, color:'#334155'}}>{r.room_type_name}</td>
                                                        <td style={{padding:'12px 16px', color:'#10b981', fontWeight:700}}>{Number(r.price_per_night).toLocaleString()}đ</td>
                                                        <td style={{padding:'12px 16px', textAlign:'center'}}>{r.total_inventory}</td>
                                                        <td style={{padding:'12px 16px', textAlign:'center'}}>{r.max_guests}</td>
                                                        <td style={{padding:'12px 16px', textAlign:'right'}}>
                                                            <button style={{marginRight:12, border:'none', background:'#eff6ff', padding:'6px', borderRadius:6, cursor:'pointer', color:'#3b82f6'}} title="Sửa" onClick={()=>handleOpenEditRoom(r)}>✏️</button>
                                                            <button style={{border:'none', background:'#fef2f2', padding:'6px', borderRadius:6, cursor:'pointer', color:'#ef4444'}} title="Xóa" onClick={()=>handleDeleteRoom(r.room_id)}>🗑️</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{marginTop: 32, display:'flex', gap: 12, justifyContent:'flex-end', borderTop:'1px solid #f0f0f0', paddingTop:20}}>
                         <button style={{...styles.btnOutline, padding:'10px 24px'}} onClick={() => setShowHotelModal(false)}>Hủy bỏ</button>
                         <button style={{...styles.btnPrimary, padding:'10px 24px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}} onClick={submitHotelForm}>
                            {hotelForm.hotel_id ? 'Lưu thay đổi' : 'Tạo mới'}
                         </button>
                    </div>
                </div>
            </div>
        );
    };

    // 🔥 FORM TÓM TẮT KHÁCH SẠN (Nút Quản Lý)
    const renderHotelSummaryModal = () => {
        if (!showSummaryModal || !summaryData) return null;
        return (
            <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
                <div className="modal-box" onClick={e => e.stopPropagation()}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                        <h3 style={{margin:0, fontSize:22}}>📊 Tóm tắt: {summaryData.hotel.name}</h3>
                        <button onClick={() => setShowSummaryModal(false)} style={{background:'none', border:'none', fontSize:24, cursor:'pointer'}}>×</button>
                    </div>

                    <div style={{marginBottom: 24}}>
                        <h4 style={{fontSize:16, fontWeight:600, color:'#3B82F6', borderBottom:'1px solid #E2E8F0', paddingBottom:8}}>🛏️ Tình trạng phòng hôm nay</h4>
                        <table style={{width:'100%', fontSize:14}}>
                            <thead>
                                <tr style={{color:'#64748B'}}>
                                    <th style={{padding:8, textAlign:'left'}}>Loại phòng</th>
                                    <th style={{padding:8, textAlign:'center'}}>Tổng</th>
                                    <th style={{padding:8, textAlign:'center'}}>Giá</th>
                                    <th style={{padding:8, textAlign:'right', color:'#10B981'}}>Còn trống</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryData.rooms.map(r => (
                                    <tr key={r.room_id} style={{borderBottom:'1px solid #F8FAFC'}}>
                                        <td style={{padding:8}}>{r.room_type_name}</td>
                                        <td style={{padding:8, textAlign:'center'}}>{r.total_inventory}</td>
                                        <td style={{padding:8, textAlign:'center'}}>{Number(r.price_per_night).toLocaleString()}đ</td>
                                        <td style={{padding:8, textAlign:'right', fontWeight:700, color: r.available > 0 ? '#10B981' : '#EF4444'}}>
                                            {r.available}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h4 style={{fontSize:16, fontWeight:600, color:'#F59E0B', borderBottom:'1px solid #E2E8F0', paddingBottom:8}}>📅 5 Đơn đặt gần nhất</h4>
                        <div style={{maxHeight: 300, overflowY:'auto'}}>
                            {summaryData.bookings.length === 0 ? <p style={{color:'#94a3b8', fontStyle:'italic'}}>Chưa có đơn đặt nào.</p> : (
                                <table style={{width:'100%', fontSize:13}}>
                                    <thead>
                                        <tr style={{color:'#64748B'}}>
                                            <th style={{padding:8, textAlign:'left'}}>ID</th>
                                            <th style={{padding:8, textAlign:'left'}}>Khách</th>
                                            <th style={{padding:8, textAlign:'left'}}>Phòng</th>
                                            <th style={{padding:8, textAlign:'right'}}>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryData.bookings.map(b => (
                                            <tr key={b.booking_id} style={{borderBottom:'1px solid #F8FAFC'}}>
                                                <td style={{padding:8}}>#{b.booking_id}</td>
                                                <td style={{padding:8}}>{b.customer_name}</td>
                                                <td style={{padding:8}}>{b.room_type_name}</td>
                                                <td style={{padding:8, textAlign:'right'}}>{getStatusBadge(b.status_id, true)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN RENDERERS ---
    const renderDashboard = () => (
        <div className="fade-in">
            <div style={styles.grid4}>
                <StatCard title="Tổng Đơn" value={stats.total_bookings} color="#3B82F6" icon="📅" />
                <StatCard title="Doanh thu" value={`${Number(stats.revenue).toLocaleString()} đ`} color="#10B981" icon="💰" />
                
                {/* 🔥 SỬA: Đổi "Đang lưu trú" -> "Tổng khách sạn" */}
                <StatCard title="Tổng khách sạn" value={myHotels.length} color="#F59E0B" icon="🏨" />
                
                <StatCard title="Đã hủy" value={stats.cancelled} color="#EF4444" icon="❌" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
                {renderChartSection()}
                <div style={styles.card}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Đơn mới nhất</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {bookings.length === 0 && <p style={{color:'#94a3b8'}}>Chưa có dữ liệu.</p>}
                        {bookings.map(b => (
                            <div key={b.booking_id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                                <div style={{ background: '#F1F5F9', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748B' }}>#{b.booking_id}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                                    <div style={{ fontSize: 12, color: '#64748B' }}>{b.room_type_name}</div>
                                </div>
                                <div>{getStatusBadge(b.status_id, true)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBookings = () => (
        <div className="fade-in" style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Quản lý Đặt phòng</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                    <select style={styles.selectInput} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="1">⏳ Chờ xác nhận</option>
                        <option value="2">✅ Đã xác nhận</option>
                        <option value="3">💰 Đã thanh toán</option>
                        <option value="4">🏁 Đã hoàn thành</option>
                        <option value="5">❌ Đã hủy</option>
                        <option value="6">💸 Đã hoàn tiền</option>
                    </select>
                    <button style={styles.btnOutline} className="btn-hover" onClick={() => setRefreshKey(k => k+1)}>🔄 Làm mới</button>
                </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Khách hàng</th>
                            <th style={styles.th}>Khách sạn & Phòng</th>
                            <th style={styles.th}>Thời gian</th>
                            <th style={styles.th}>Tổng tiền</th>
                            <th style={styles.th}>Trạng thái</th>
                            <th style={styles.th}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map(b => (
                            <tr key={b.booking_id} className="table-row">
                                <td style={styles.td}><b>#{b.booking_id}</b></td>
                                <td style={styles.td}>
                                    <div style={{fontWeight:600}}>{b.customer_name}</div>
                                    <div style={{fontSize:12, color:'#64748B'}}>{b.customer_phone}</div>
                                </td>
                                <td style={styles.td}>
                                    <div style={{color:'#6366F1', fontWeight:600, fontSize: 13}}>🏨 {b.hotel_name}</div>
                                    <div style={{fontSize:13}}>{b.room_type_name}</div>
                                    {b.assigned_room_number ? 
                                        <span style={styles.badgeRoom}>P. {b.assigned_room_number}</span> : 
                                        <span style={{fontSize:11, color:'#EF4444', background:'#FEF2F2', padding:'2px 6px', borderRadius:4}}>⚠ Chưa gán</span>
                                    }
                                </td>
                                <td style={styles.td}>
                                    <div style={{fontSize:13}}>In: {new Date(b.check_in_date).toLocaleDateString('vi-VN')}</div>
                                    <div style={{fontSize:13, color:'#64748B'}}>Out: {new Date(b.check_out_date).toLocaleDateString('vi-VN')}</div>
                                </td>
                                <td style={{...styles.td, fontWeight:700, color:'#059669'}}>{Number(b.total_price).toLocaleString()}đ</td>
                                <td style={styles.td}>{getStatusBadge(b.status_id)}</td>
                                <td style={styles.td}>
                                    <div style={{display:'flex', gap:6}}>
                                        {/* Nút Hóa Đơn (Luôn hiện) */}
                                        <button className="btn-hover" style={{...styles.iconBtn, background:'#F1F5F9', color:'#334155'}} onClick={() => setInvoiceData(b)} title="Hóa đơn">📄</button>
                                        
                                        {/* Nút Gán Phòng (Cho đơn Chờ (1), Xác nhận (2), Đã thanh toán (3)) */}
                                        {[1, 2, 3].includes(b.status_id) && (
                                            <button className="btn-hover" style={{...styles.iconBtn, background:'#10B981'}} onClick={() => handleOpenAssign(b)} title="Gán phòng">🔑</button>
                                        )}

                                        {/* Nút Check-out (Cho đơn Đã xác nhận (2) hoặc Đã thanh toán (3)) */}
                                        {[2, 3].includes(b.status_id) && (
                                            <button className="btn-hover" style={{...styles.iconBtn, background:'#3B82F6'}} onClick={() => updateBookingStatus(b.booking_id, 4)} title="Check-out">🏁</button>
                                        )}

                                        {/* Nút Hủy (Cho đơn Chờ (1), Xác nhận (2) VÀ Đã thanh toán (3)) */}
                                        {[1, 2, 3].includes(b.status_id) && (
                                            <button className="btn-hover" style={{...styles.iconBtn, background:'#EF4444'}} onClick={() => updateBookingStatus(b.booking_id, 5)} title="Hủy">✕</button>
                                        )}

                                        {/* 🔥 Nút Hoàn Tiền (Chỉ hiện khi ĐÃ HỦY (5) và Có Tiền) */}
                                        {b.status_id === 5 && b.total_price > 0 && (
                                            <button className="btn-hover" style={{...styles.iconBtn, background:'#F59E0B'}} onClick={() => handleOpenRefund(b)} title="Hoàn tiền">💸</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderHotels = () => (
        <div className="fade-in">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin:0 }}>Tài sản của tôi</h3>
                <button style={styles.btnPrimary} onClick={handleOpenAddHotel}>+ Thêm khách sạn</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {myHotels.map(h => (
                    <div key={h.hotel_id} style={styles.card} className="hover-card">
                        <div style={{position:'relative'}}>
                            <img src={h.image_url || 'https://placehold.co/600x400/e2e8f0/94a3b8?text=Hotel'} alt="" style={{ width:'100%', height:180, objectFit:'cover', borderRadius: 8, marginBottom: 16 }} />
                            <div style={{position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 8px', borderRadius:4, fontSize:12}}>
                                ID: {h.hotel_id}
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <h4 style={{ margin: 0, fontSize: 16, fontWeight:700 }}>{h.name}</h4>
                            <span style={{ color: '#F59E0B', fontSize:14 }}>{'★'.repeat(h.star_rating)}</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px 0', height: 40, overflow: 'hidden' }}>
                            <i className="bi bi-geo-alt-fill me-1"></i>{h.address}
                        </p>
                        
                        <div style={{display:'flex', gap:8, marginTop:'auto'}}>
                            <button className="btn-hover" style={{...styles.btnOutline, flex:1, borderColor:'#3B82F6', color:'#3B82F6'}} onClick={() => handleOpenManage(h.hotel_id)}>
                                <i className="bi bi-graph-up me-1"></i> Quản lý
                            </button>
                            <button className="btn-hover" style={{...styles.btnOutline, width:40, padding:0, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={() => handleOpenEditHotel(h)}>
                                <i className="bi bi-pencil-square"></i>
                            </button>
                            <button className="btn-hover" style={{...styles.btnOutline, width:40, padding:0, display:'flex', alignItems:'center', justifyContent:'center', borderColor:'#EF4444', color:'#EF4444'}} onClick={() => handleDeleteHotel(h.hotel_id)}>
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={styles.layout}>
            <style>{GLOBAL_CSS}</style>
            
            <aside style={styles.sidebar}>
                <div style={styles.brand}><span style={{fontSize: 24}}>👑</span> Owner<span style={{color:'#6366F1'}}>Portal</span></div>
                <div style={styles.userSection}>
                    <div style={styles.avatar}>{user ? user.charAt(0) : 'U'}</div>
                    <div style={{ overflow:'hidden' }}>
                        <div style={{ fontWeight: 600 }}>{user}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>ID: {localStorage.getItem('user_id')}</div>
                    </div>
                </div>
                <nav style={{ flex: 1 }}>
                    {[
                        { id: 'DASHBOARD', label: 'Tổng quan', icon: '📊' },
                        { id: 'BOOKINGS', label: 'Đặt phòng', icon: '📅' },
                        { id: 'HOTELS', label: 'Khách sạn', icon: '🏨' }
                    ].map(item => (
                        <div key={item.id} className="nav-item" style={activeTab === item.id ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab(item.id)}>
                            <span style={{ width: 24 }}>{item.icon}</span> {item.label}
                        </div>
                    ))}
                </nav>
                <button style={styles.logoutBtn} className="btn-hover" onClick={() => { if(window.confirm("Đăng xuất?")) { localStorage.clear(); navigate('/owner'); } }}>🚪 Đăng xuất</button>
            </aside>

            <main style={styles.main}>
                <header style={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <h2 style={{ margin: 0, fontSize: 20 }}>{activeTab === 'DASHBOARD' ? 'Tổng quan' : activeTab === 'BOOKINGS' ? 'Booking' : 'Khách sạn'}</h2>
                        <span style={{ width: 1, height: 24, background: '#E2E8F0' }}></span>
                        <select style={styles.selectHeader} value={selectedHotelId} onChange={handleSwitchHotel}>
                            <option value="">🌐 Toàn bộ hệ thống</option>
                            {myHotels.map(h => <option key={h.hotel_id} value={h.hotel_id}>{h.name}</option>)}
                        </select>
                    </div>
                </header>
                <div style={styles.content}>
                    {activeTab === 'DASHBOARD' && renderDashboard()}
                    {activeTab === 'BOOKINGS' && renderBookings()}
                    {activeTab === 'HOTELS' && renderHotels()}
                </div>
            </main>

            {renderAssignModal()}
            {renderInvoiceModal()}
            {renderRefundModal()}
            {renderHotelModal()}
            {renderRoomModal()}
            {renderHotelSummaryModal()}
        </div>
    );
};

// --- HELPER & STYLES ---
const StatCard = ({ title, value, color, icon }) => (
    <div style={styles.card} className="hover-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>{title}</span>
            <span style={{ background: `${color}20`, color: color, padding: 8, borderRadius: 10, fontSize: 18 }}>{icon}</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1E293B' }}>{value}</div>
    </div>
);

// ✅ Cập nhật đúng trạng thái Database
const getStatusBadge = (statusId, mini = false) => {
    const config = {
        1: { label: 'Chờ xác nhận', bg: '#FFF7ED', color: '#C2410C' },
        2: { label: 'Đã xác nhận', bg: '#ECFDF5', color: '#047857' },
        3: { label: 'Đã thanh toán', bg: '#F0F9FF', color: '#0284C7' },
        4: { label: 'Hoàn thành', bg: '#EFF6FF', color: '#1D4ED8' },
        5: { label: 'Đã hủy', bg: '#FEF2F2', color: '#B91C1C' },
        6: { label: 'Đã hoàn tiền', bg: '#F3E8FF', color: '#7E22CE' }
    };
    const s = config[statusId] || { label: 'Unknown', bg: '#F1F5F9', color: '#64748B' };
    return <span style={{ background: s.bg, color: s.color, padding: mini ? '2px 8px' : '4px 12px', borderRadius: 20, fontSize: mini ? 11 : 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>;
};

const styles = {
    layout: { display: 'flex', minHeight: '100vh', background: '#F3F4F6' },
    sidebar: { width: 260, background: '#111827', color: '#F3F4F6', display: 'flex', flexDirection: 'column', padding: 24, position: 'fixed', height: '100vh', zIndex: 20 },
    brand: { fontSize: 20, fontWeight: '800', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.5px' },
    userSection: { display: 'flex', gap: 12, alignItems: 'center', padding: '16px', background: '#1F2937', borderRadius: 12, marginBottom: 24 },
    avatar: { width: 36, height: 36, background: '#6366F1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, color: 'white' },
    navItem: { padding: '12px 16px', borderRadius: 12, cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 },
    navItemActive: { padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: '#6366F1', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' },
    logoutBtn: { padding: '12px', background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 12, cursor: 'pointer', fontWeight:'600', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
    main: { flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column' },
    header: { height: 70, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'sticky', top: 0, zIndex: 10 },
    content: { padding: 32, maxWidth: 1400, margin: '0 auto', width: '100%' },
    card: { background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 },
    selectHeader: { padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', outline: 'none', background: '#fff', fontSize: 14, minWidth: 200, color: '#334155', cursor: 'pointer' },
    selectInput: { padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none', fontSize: 14 },
    iconButton: { width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#F1F5F9', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems:'center', justifyContent:'center' },
    btnPrimary: { background: '#111827', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
    btnOutline: { background: '#fff', color: '#334155', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
    iconBtn: { width: 32, height: 32, borderRadius: 8, border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
    inputModal: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 16, boxSizing: 'border-box' },
    label: { display:'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' },
    segmentedControl: { display: 'flex', background: '#F1F5F9', padding: 4, borderRadius: 8 },
    segmentBtn: { border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'transparent', color: '#64748B', fontWeight: 600 },
    segmentBtnActive: { background: '#fff', color: '#6366F1', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0' },
    th: { textAlign: 'left', padding: '16px', borderBottom: '2px solid #F1F5F9', color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' },
    td: { padding: '16px', borderBottom: '1px solid #F1F5F9', fontSize: 14, verticalAlign: 'middle' },
    badgeRoom: { background: '#F0F9FF', color: '#0369A1', padding: '2px 6px', borderRadius: 6, fontSize: 12, border: '1px solid #BAE6FD', fontWeight: 600 }
};

export default OwnerDashboard;