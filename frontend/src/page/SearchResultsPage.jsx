import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import FilterSidebar from '../components/FilterSidebar';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const [allData, setAllData] = useState([]);     
  const [filteredData, setFilteredData] = useState([]); 
  const [cities, setCities] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10); 

  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'hotel';
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const guests = searchParams.get('guests');

  // --- STATE BỘ LỌC ---
  const [filters, setFilters] = useState({
    selectedCities: [],      
    selectedStars: [],       
    selectedPriceRanges: [], 
    selectedTypes: [],       
    sortOrder: 'default'
  });

  // 1. GỌI API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setVisibleCount(10);
        setFilters({ selectedCities: [], selectedStars: [], selectedPriceRanges: [], selectedTypes: [], sortOrder: 'default' });

        let endpoint = '';
        let params = { q };

        if (type === 'hotel') {
            endpoint = 'http://localhost:8082/api/search/hotels';
            params = { ...params, checkIn, checkOut, guests };
        } else if (type === 'restaurant') {
            endpoint = 'http://localhost:8082/api/search/restaurants';
        } else {
            endpoint = 'http://localhost:8082/api/search/activities';
        }

        const [resData, resCities] = await Promise.all([
            axios.get(endpoint, { params }),
            axios.get('http://localhost:8082/api/cities')
        ]);

        const dataList = Array.isArray(resData.data) ? resData.data : (resData.data.results || []);
        setAllData(dataList);
        setFilteredData(dataList);
        setCities(resCities.data);
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [q, type, checkIn, checkOut, guests]);

  // 2. LOGIC LỌC DỮ LIỆU
  useEffect(() => {
    if (!allData) return;
    let temp = [...allData];

    // Lọc theo Quận
    if (filters.selectedCities.length > 0) {
        temp = temp.filter(item => {
            const rawID = item.city_id !== undefined ? item.city_id : (item.dest_id !== undefined ? item.dest_id : 0);
            return filters.selectedCities.includes(parseInt(rawID));
        });
    }

    // Lọc theo Hạng sao
    if (type === 'hotel' && filters.selectedStars.length > 0) {
        temp = temp.filter(item => filters.selectedStars.includes(parseInt(item.star_rating || 0)));
    }

    // Lọc theo Loại hình
    if (type === 'hotel' && filters.selectedTypes.length > 0) {
        temp = temp.filter(item => {
            const name = (item.name || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            return filters.selectedTypes.some(t => name.includes(t.toLowerCase()) || desc.includes(t.toLowerCase()));
        });
    }

    // Lọc theo Giá
    if (filters.selectedPriceRanges.length > 0) {
        const priceRanges = {
            'range1': { min: 0, max: 500000 },
            'range2': { min: 500000, max: 1000000 },
            'range3': { min: 1000000, max: 2000000 },
            'range4': { min: 2000000, max: 99999999 }
        };

        temp = temp.filter(item => {
            let price = 0;
            if (type === 'hotel') price = item.price_per_night ? Number(item.price_per_night) : 999000; 
            else if (item.price) price = Number(item.price);
            else if (item.price_range) {
                const match = item.price_range.replace(/[,.]/g, '').match(/(\d+)/);
                if (match) price = parseInt(match[0]);
            }
            // Destination (Miễn phí)
            else if (item.type === 'destination') price = 0;

            return filters.selectedPriceRanges.some(rangeId => {
                const range = priceRanges[rangeId];
                return price >= range.min && price <= range.max;
            });
        });
    }

    // Sắp xếp
    const getSortPrice = (i) => {
        if (type === 'hotel') return Number(i.price_per_night || 999000);
        if (i.price) return Number(i.price);
        if (i.price_range) {
             const m = i.price_range.replace(/[,.]/g, '').match(/(\d+)/);
             return m ? parseInt(m[0]) : 0;
        }
        return 0;
    };

    if (filters.sortOrder === 'low-to-high') temp.sort((a, b) => getSortPrice(a) - getSortPrice(b));
    else if (filters.sortOrder === 'high-to-low') temp.sort((a, b) => getSortPrice(b) - getSortPrice(a));
    else if (filters.sortOrder === 'star-desc' && type === 'hotel') temp.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0));

    setFilteredData(temp);
    setVisibleCount(10);
  }, [filters, allData, type]);

  const handleLoadMore = () => setVisibleCount(prev => prev + 10);

  // Helper tiêu đề
  const getTitle = () => {
      if (q) return type === 'hotel' ? `Khách sạn tại "${q}"` : type === 'restaurant' ? `Nhà hàng "${q}"` : `Hoạt động "${q}"`;
      return type === 'hotel' ? 'Tất cả Khách sạn & Chỗ ở' : type === 'restaurant' ? 'Tất cả Nhà hàng & Quán ăn' : 'Tất cả Hoạt động & Tham quan';
  };

  // --- HÀM MỚI: XỬ LÝ LINK CHI TIẾT AN TOÀN TUYỆT ĐỐI ---
  const getItemLink = (item) => {
      // 1. Tự động dò tìm ID đúng (dù DB trả về id, hotel_id, tour_id hay restaurant_id)
      const finalId = item.id || item.hotel_id || item.tour_id || item.restaurant_id;

      // Nếu không tìm thấy ID -> Trả về '#' để chặn link hỏng
      if (!finalId) return '#';

      // 2. Phân loại theo Type để tạo link
      if (type === 'hotel') return `/hotel/${finalId}?${searchParams.toString()}`;
      if (type === 'restaurant') return `/restaurant/${finalId}`;
      
      // 3. Xử lý Hoạt động (Tour vs Destination)
      if (item.type === 'tour') {
          return `/tour/${finalId}`; 
      }
      
      // Mặc định còn lại là Destination (Tạm thời dẫn về # nếu chưa có trang này)
      return '#'; 
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <main className="container py-4 flex-grow-1">
        
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="fw-bold m-0 fs-4">{getTitle()}</h2>
            <span className="badge bg-white text-primary border shadow-sm rounded-pill px-3 py-2">
                Tìm thấy {filteredData.length} kết quả
            </span>
        </div>

        <div className="row">
            {/* SIDEBAR */}
            <div className="col-lg-3 mb-4">
                <FilterSidebar type={type} filters={filters} setFilters={setFilters} cities={cities} />
            </div>

            {/* KẾT QUẢ */}
            <div className="col-lg-9">
                {loading ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                ) : (
                    <div className="row g-4">
                        {filteredData.length === 0 ? (
                            <div className="col-12 text-center py-5 bg-white rounded shadow-sm">
                                <i className="bi bi-filter-circle display-1 text-muted opacity-25 mb-3"></i>
                                <h5 className="text-muted">Không có kết quả phù hợp với bộ lọc.</h5>
                                <button className="btn btn-outline-primary btn-sm mt-2" onClick={() => setFilters({ selectedCities: [], selectedStars: [], selectedPriceRanges: [], selectedTypes: [], sortOrder: 'default' })}>Xóa bộ lọc</button>
                            </div>
                        ) : (
                            filteredData.slice(0, visibleCount).map((item) => (
                                <div className="col-12" key={`${type}-${item.id || item.hotel_id || item.restaurant_id || Math.random()}`}>
                                    
                                    <Link 
                                        to={getItemLink(item)} 
                                        className="card shadow-sm border-0 text-decoration-none text-dark overflow-hidden hover-shadow transition h-100"
                                        // Thêm sự kiện onClick để chặn link hỏng
                                        onClick={(e) => {
                                            if (getItemLink(item) === '#') {
                                                e.preventDefault();
                                                alert("Trang chi tiết địa điểm này đang được xây dựng!");
                                            }
                                        }}
                                    >
                                        <div className="row g-0">
                                            <div className="col-md-4 position-relative">
                                                <img src={item.image_url || item.image || 'https://placehold.co/600x400'} className="img-fluid h-100 w-100 object-fit-cover" alt={item.name} style={{ minHeight: '220px' }} onError={(e) => e.target.src='https://placehold.co/600x400'} />
                                                
                                                {type === 'hotel' && <span className="position-absolute top-0 start-0 m-2 badge bg-warning text-dark shadow-sm">{item.star_rating} <i className="bi bi-star-fill"></i></span>}
                                                {type === 'restaurant' && <span className="position-absolute top-0 start-0 m-2 badge bg-danger text-white shadow-sm"><i className="bi bi-shop me-1"></i> NHÀ HÀNG</span>}
                                                {(type !== 'hotel' && type !== 'restaurant') && <span className={`position-absolute top-0 start-0 m-2 badge shadow-sm ${item.type === 'tour' ? 'bg-warning text-dark' : 'bg-success'}`}>{item.type === 'tour' ? 'TOUR' : 'ĐIỂM ĐẾN'}</span>}
                                            </div>
                                            <div className="col-md-8">
                                                <div className="card-body h-100 d-flex flex-column p-3">
                                                    <h5 className="card-title fw-bold mb-1 text-truncate">{item.name}</h5>
                                                    <p className="text-muted small mb-2"><i className="bi bi-geo-alt-fill me-1 text-danger"></i> {item.address || item.location} {item.city_name ? `- ${item.city_name}` : ''}</p>
                                                    <p className="card-text text-muted small line-clamp-2 mb-3">{item.description || item.info}</p>
                                                    
                                                    <div className="mt-auto d-flex align-items-end justify-content-between border-top pt-3">
                                                        <div>
                                                            {type === 'hotel' && <span className="badge bg-success-subtle text-success border border-success-subtle">Miễn phí hủy</span>}
                                                            {type === 'restaurant' && <span className="badge bg-info-subtle text-info-emphasis">Mở cửa</span>}
                                                        </div>
                                                        <div className="text-end">
                                                            {type === 'hotel' && (
                                                                <span className="fw-bold fs-4 text-danger">{Number(item.price_per_night || 999000).toLocaleString('vi-VN')} <small>VND</small></span>
                                                            )}
                                                            {type === 'restaurant' && <span className="fw-bold fs-5 text-primary">{item.price_range || 'Liên hệ'}</span>}
                                                            {type === 'activity' && (
                                                                item.type === 'tour' ? <span className="fw-bold fs-4 text-danger">{Number(item.price).toLocaleString('vi-VN')} <small>VND</small></span> : <span className="fw-bold fs-5 text-success">Miễn phí</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>

                                </div>
                            ))
                        )}
                    </div>
                )}

                {filteredData.length > visibleCount && (
                    <div className="text-center mt-4">
                        <button className="btn btn-outline-primary rounded-pill px-5 fw-bold" onClick={handleLoadMore}>
                            Xem thêm {filteredData.length - visibleCount} kết quả <i className="bi bi-chevron-down"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
      </main>
      
      <style>{`
        .hover-shadow:hover { transform: translateY(-3px); box-shadow: 0 1rem 3rem rgba(0,0,0,.175)!important; }
        .transition { transition: all 0.3s ease; }
        .object-fit-cover { object-fit: cover; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}