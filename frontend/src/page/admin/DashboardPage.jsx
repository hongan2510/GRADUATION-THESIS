import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DashboardPage = () => {
  const [filter, setFilter] = useState('week'); // Mặc định lọc theo tuần
  
  // State dữ liệu dashboard
  const [data, setData] = useState({
    summary: { revenue: 0, total_hotel_orders: 0, total_tour_orders: 0, total_restaurant_orders: 0, new_users: 0 },
    charts: { revenue: [], orders: [] },
    recent_bookings: []
  });
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Helper Formats
  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  // Badge trạng thái đẹp hơn (Soft UI)
  const getStatusBadge = (statusId, statusName) => {
      const styles = {
          1: { bg: '#fff3cd', text: '#856404', icon: '⏳' }, // Pending - Vàng nhạt
          2: { bg: '#cff4fc', text: '#055160', icon: '✅' }, // Confirmed - Xanh dương nhạt
          3: { bg: '#d1e7dd', text: '#0f5132', icon: '💳' }, // Paid - Xanh lá nhạt
          4: { bg: '#e2e3e5', text: '#41464b', icon: '🏁' }, // Completed - Xám nhạt
          5: { bg: '#f8d7da', text: '#842029', icon: '❌' }, // Cancelled - Đỏ nhạt
      };
      
      const style = styles[statusId] || { bg: '#f8f9fa', text: '#6c757d', icon: '•' };

      return (
          <span className="badge border px-3 py-2 rounded-pill fw-normal" 
                style={{ backgroundColor: style.bg, color: style.text, fontSize: '0.85rem' }}>
              <span className="me-1">{style.icon}</span> {statusName}
          </span>
      );
  };

  // 1. Fetch Dữ liệu Dashboard
  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8082/api/admin/analytics?range=${filter}`)
      .then(res => res.json())
      .then(result => {
        if (result) {
            setData({
                summary: result.summary || { revenue: 0, total_hotel_orders: 0, total_tour_orders: 0, total_restaurant_orders: 0, new_users: 0 },
                charts: result.charts || { revenue: [], orders: [] },
                recent_bookings: result.recent_bookings || []
            });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải dashboard:", err);
        setLoading(false);
      });
  }, [filter]);

  // --- HÀM HỖ TRỢ XUẤT PDF ---
  const removeVN = (str) => {
    if (!str) return '';
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  }

  const formatCurrencyPDF = (val) => new Intl.NumberFormat('de-DE').format(val || 0);

  const exportPDF = async () => {
    setExporting(true);
    try {
        const res = await fetch(`http://localhost:8082/api/admin/report/bookings?range=${filter}`);
        const fullReportData = await res.json();

        if (!Array.isArray(fullReportData) || fullReportData.length === 0) {
            alert("Không có dữ liệu đơn hàng nào trong khoảng thời gian này để xuất báo cáo.");
            setExporting(false);
            return;
        }

        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(`BAO CAO DOANH THU`, 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Thoi gian: ${filter.toUpperCase()}`, 14, 28);
        doc.text(`Ngay xuat: ${new Date().toLocaleString('en-GB')}`, 14, 33);

        // Summary Table
        const summaryData = [
            ['Tong doanh thu', formatCurrencyPDF(data.summary.revenue) + ' VND'],
            ['Don Khach san', data.summary.total_hotel_orders],
            ['Don Tour', data.summary.total_tour_orders],
            ['Don Nha hang', data.summary.total_restaurant_orders],
            ['Khach hang moi', data.summary.new_users]
        ];

        autoTable(doc, {
            startY: 45,
            head: [['CHI SO', 'GIA TRI']],
            body: summaryData,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
            styles: { font: "helvetica", fontSize: 10, cellPadding: 3 }
        });

        // Detail Table
        doc.text("Danh sach chi tiet don hang", 14, doc.lastAutoTable.finalY + 15);
        
        const tableColumn = ["Ma", "Ngay Tao", "Khach Hang", "Dich Vu", "Trang Thai", "Tong Tien"];
        const tableRows = [];
        let totalAmount = 0;

        fullReportData.forEach(ticket => {
            totalAmount += Number(ticket.total_price || 0);
            const ticketData = [
                `#${ticket.booking_id}`,
                ticket.created_at_fmt || '',
                removeVN(ticket.customer_name),
                removeVN(ticket.service_name),
                removeVN(ticket.status_name),
                formatCurrencyPDF(ticket.total_price)
            ];
            tableRows.push(ticketData);
        });

        tableRows.push(['', '', '', 'TONG CONG', '', formatCurrencyPDF(totalAmount)]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            styles: { font: "helvetica", fontSize: 9 },
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: { 0: { fontStyle: 'bold' }, 5: { halign: 'right' } },
            didParseCell: function (data) {
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [230, 230, 230];
                }
            }
        });

        doc.save(`Bao_Cao_${filter}.pdf`);

    } catch (error) {
        console.error("Lỗi xuất PDF:", error);
        alert("Lỗi khi tải dữ liệu báo cáo.");
    } finally {
        setExporting(false);
    }
  };

  const FilterButton = ({ label, value }) => (
    <button 
      className={`btn btn-sm px-3 rounded-pill fw-medium transition-all ${filter === value ? 'btn-dark text-white shadow' : 'btn-light text-muted bg-white border'}`}
      onClick={() => setFilter(value)}
      style={{ transition: 'all 0.3s ease' }}
    >
      {label}
    </button>
  );

  const StatCard = ({ title, value, icon, color, subValue, subLabel }) => (
    <div className="card border-0 shadow-sm h-100 rounded-4 overflow-hidden position-relative">
        <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <p className="text-muted text-uppercase fw-semibold small mb-1 ls-1" style={{fontSize: '0.75rem', letterSpacing: '1px'}}>{title}</p>
                    <h3 className="fw-bold text-dark mb-0">{value}</h3>
                    {subValue && (
                        <div className="mt-3 d-flex align-items-center small">
                            <span className={`badge bg-${color} bg-opacity-10 text-${color} rounded-pill me-2`}>
                                {subValue}
                            </span>
                            <span className="text-muted">{subLabel}</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-4 bg-${color} bg-opacity-10 text-${color}`}>
                    <i className={`bi ${icon} fs-3`}></i>
                </div>
            </div>
        </div>
    </div>
  );

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}} role="status"></div>
    </div>
  );

  const totalOrders = (data.summary?.total_hotel_orders || 0) + (data.summary?.total_tour_orders || 0) + (data.summary?.total_restaurant_orders || 0);

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-1">Tổng quan</h2>
          <p className="text-muted mb-0">Chào mừng trở lại! Dưới đây là tình hình kinh doanh của bạn.</p>
        </div>
        
        <div className="d-flex flex-wrap gap-3 align-items-center">
            <div className="bg-white p-1 rounded-pill shadow-sm d-flex gap-1 border">
                <FilterButton label="Hôm nay" value="today" />
                <FilterButton label="Tuần này" value="week" />
                <FilterButton label="Tháng này" value="month" />
                <FilterButton label="Năm nay" value="year" />
            </div>
            
            <button 
                className="btn btn-primary rounded-pill shadow-sm fw-bold px-4 py-2 d-flex align-items-center border-0" 
                style={{background: 'linear-gradient(45deg, #2563eb, #1d4ed8)'}}
                onClick={exportPDF} 
                disabled={exporting}
            >
                {exporting ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý...</>
                ) : (
                    <><i className="bi bi-download me-2"></i> Xuất Báo Cáo</>
                )}
            </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-md-6 col-xl-3">
            <StatCard 
                title="Tổng Doanh Thu" 
                value={formatCurrency(data.summary?.revenue)} 
                icon="bi-wallet2" 
                color="primary"
                subValue="+12.5%" 
                subLabel="so với kỳ trước"
            />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
            <StatCard 
                title="Tổng Đơn Hàng" 
                value={totalOrders} 
                icon="bi-bag-check" 
                color="success"
                subValue={data.summary?.total_hotel_orders + " Hotel"}
                subLabel={`& ${data.summary?.total_tour_orders} Tour`}
            />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
            <StatCard 
                title="Khách Hàng Mới" 
                value={data.summary?.new_users || 0} 
                icon="bi-people" 
                color="info"
                subValue="Active"
                subLabel="Tài khoản đăng ký"
            />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
            <StatCard 
                title="Đặt Nhà Hàng" 
                value={data.summary?.total_restaurant_orders || 0} 
                icon="bi-shop" 
                color="warning"
                subValue="New"
                subLabel="Yêu cầu đặt bàn"
            />
        </div>
      </div>

      {/* CHARTS */}
      <div className="row g-4 mb-5">
        {/* DOANH THU CHART */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100 rounded-4">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold text-dark mb-0">Biểu Đồ Doanh Thu</h5>
              <div className="badge bg-light text-muted border px-2 py-1 rounded">Đơn vị: VNĐ</div>
            </div>
            <div className="card-body px-2" style={{ height: '380px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts?.revenue || []} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(val) => `${val/1000000}M`} tickLine={false} axisLine={false} dx={-10} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), "Doanh thu"]}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                    itemStyle={{color: '#1e3a8a', fontWeight: 'bold'}}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PHÂN LOẠI CHART */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100 rounded-4">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
              <h5 className="fw-bold text-dark mb-0">Phân Loại Dịch Vụ</h5>
            </div>
            <div className="card-body px-1" style={{ height: '380px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts?.orders || []} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" fontSize={11} stroke="#9ca3af" tickLine={false} axisLine={false} dy={10} />
                  <YAxis fontSize={11} stroke="#9ca3af" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="hotel" stackId="a" fill="#3b82f6" name="Hotel" barSize={12} radius={[0,0,4,4]} />
                  <Bar dataKey="tour" stackId="a" fill="#10b981" name="Tour" barSize={12} />
                  <Bar dataKey="restaurant" stackId="a" fill="#f59e0b" name="Food" barSize={12} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU & QUICK ACTIONS */}
      <div className="row g-4">
        {/* RECENT ORDERS TABLE */}
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white py-4 px-4 d-flex justify-content-between align-items-center border-bottom-0">
              <h5 className="mb-0 fw-bold text-dark">Đơn hàng mới nhất</h5>
              <Link to="/admin/bookings" className="btn btn-light text-primary fw-medium rounded-pill px-3 py-1 small">
                Xem tất cả <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="ps-4 py-3 text-uppercase text-muted small fw-bold border-0 rounded-start-2">Mã đơn</th>
                    <th className="py-3 text-uppercase text-muted small fw-bold border-0">Khách hàng</th>
                    <th className="py-3 text-uppercase text-muted small fw-bold border-0">Dịch vụ</th>
                    <th className="py-3 text-uppercase text-muted small fw-bold border-0">Ngày tạo</th>
                    <th className="py-3 text-uppercase text-muted small fw-bold border-0">Tổng tiền</th>
                    <th className="py-3 text-uppercase text-muted small fw-bold border-0 rounded-end-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_bookings?.length > 0 ? (
                    data.recent_bookings.map((item) => (
                      <tr key={item.booking_id} style={{cursor: 'pointer'}}>
                        <td className="ps-4 fw-bold text-dark">
                            <span className="text-primary opacity-75">#</span>{item.booking_id}
                        </td>
                        <td>
                            <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold" style={{width: '32px', height: '32px', fontSize: '0.8rem'}}>
                                    {item.customer_name?.charAt(0)}
                                </div>
                                <span className="fw-medium">{item.customer_name}</span>
                            </div>
                        </td>
                        <td>
                          <span className="d-inline-block text-truncate text-muted" style={{maxWidth: '180px'}} title={item.service_name}>
                              {item.service_name}
                          </span>
                        </td>
                        <td className="text-muted small">{formatDate(item.created_at)}</td>
                        <td className="fw-bold text-dark">{formatCurrency(item.total_price)}</td>
                        <td>{getStatusBadge(item.status_id, item.status_name)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="text-center py-5 text-muted">Chưa có dữ liệu.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="col-12 col-xl-4">
          <div className="card border-0 shadow-sm bg-white h-100 rounded-4">
             <div className="card-header bg-white border-0 pt-4 px-4 pb-2">
               <h5 className="fw-bold mb-0">Thao tác nhanh</h5>
             </div>
             <div className="card-body px-4">
               <div className="d-flex flex-column gap-3">
                 <Link to="/admin/support" className="text-decoration-none group-hover-action">
                    <div className="p-3 rounded-4 border border-light bg-light bg-opacity-50 d-flex align-items-center transition-all hover-shadow">
                        <div className="bg-white p-3 rounded-3 shadow-sm text-danger me-3">
                            <i className="bi bi-headset fs-4"></i>
                        </div>
                        <div>
                            <h6 className="fw-bold text-dark mb-1">Trung Tâm Hỗ Trợ</h6>
                            <p className="small text-muted mb-0">Xử lý khiếu nại & ticket</p>
                        </div>
                        <i className="bi bi-chevron-right ms-auto text-muted opacity-50"></i>
                    </div>
                 </Link>

                 <Link to="/admin/reviews" className="text-decoration-none">
                    <div className="p-3 rounded-4 border border-light bg-light bg-opacity-50 d-flex align-items-center transition-all hover-shadow">
                        <div className="bg-white p-3 rounded-3 shadow-sm text-warning me-3">
                            <i className="bi bi-star-half fs-4"></i>
                        </div>
                        <div>
                            <h6 className="fw-bold text-dark mb-1">Quản Lý Đánh Giá</h6>
                            <p className="small text-muted mb-0">Duyệt nhận xét khách hàng</p>
                        </div>
                        <i className="bi bi-chevron-right ms-auto text-muted opacity-50"></i>
                    </div>
                 </Link>

                 <Link to="/admin/users" className="text-decoration-none">
                    <div className="p-3 rounded-4 border border-light bg-light bg-opacity-50 d-flex align-items-center transition-all hover-shadow">
                        <div className="bg-white p-3 rounded-3 shadow-sm text-info me-3">
                            <i className="bi bi-people fs-4"></i>
                        </div>
                        <div>
                            <h6 className="fw-bold text-dark mb-1">Quản Lý User</h6>
                            <p className="small text-muted mb-0">Phân quyền & Tài khoản</p>
                        </div>
                        <i className="bi bi-chevron-right ms-auto text-muted opacity-50"></i>
                    </div>
                 </Link>
                 
                 <div className="mt-3 p-3 rounded-3 bg-primary bg-opacity-10 d-flex align-items-center">
                    <i className="bi bi-info-circle-fill text-primary me-2"></i>
                    <span className="small text-primary fw-medium">Hệ thống hoạt động bình thường.</span>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;