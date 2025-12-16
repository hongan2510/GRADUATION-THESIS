import React from 'react';

const FilterSidebar = ({ type, filters, setFilters, cities }) => {
  
  // Hàm xử lý check/uncheck chung
  const handleCheckboxChange = (category, value) => {
    setFilters(prev => {
      const currentList = prev[category];
      // Kiểm tra nếu đã có thì bỏ ra, chưa có thì thêm vào
      const newList = currentList.includes(value)
        ? currentList.filter(item => item !== value)
        : [...currentList, value];
      return { ...prev, [category]: newList };
    });
  };

  // Cấu hình khoảng giá
  const priceRanges = [
    { id: 'range1', label: 'Dưới 500.000đ', min: 0, max: 500000 },
    { id: 'range2', label: '500.000đ - 1.000.000đ', min: 500000, max: 1000000 },
    { id: 'range3', label: '1.000.000đ - 2.000.000đ', min: 1000000, max: 2000000 },
    { id: 'range4', label: 'Trên 2.000.000đ', min: 2000000, max: 99999999 },
  ];

  // Cấu hình loại hình
  const accommodationTypes = [
    { id: 'Hotel', label: 'Khách sạn' },
    { id: 'Resort', label: 'Resort nghỉ dưỡng' },
    { id: 'Homestay', label: 'Homestay / Nhà dân' },
  ];

  return (
    <div className="bg-white p-4 rounded-4 shadow-sm border sticky-top" style={{top: '90px', zIndex: 10}}>
      
      {/* Header Bộ lọc */}
      <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold m-0"><i className="bi bi-funnel-fill text-primary"></i> Bộ lọc</h5>
          <button 
            className="btn btn-link text-decoration-none p-0 small"
            onClick={() => setFilters({ selectedCities: [], selectedStars: [], selectedPriceRanges: [], selectedTypes: [], sortOrder: 'default' })}
          >
            Xóa lọc
          </button>
      </div>

      {/* 1. KHOẢNG GIÁ (Hiện cho Hotel, Restaurant, Tour) */}
      <div className="mb-4">
        <h6 className="fw-bold small text-uppercase text-muted mb-2">Khoảng giá</h6>
        {priceRanges.map(range => (
            <div className="form-check" key={range.id}>
            <input 
                className="form-check-input" 
                type="checkbox" 
                id={range.id}
                checked={filters.selectedPriceRanges.includes(range.id)}
                onChange={() => handleCheckboxChange('selectedPriceRanges', range.id)}
            />
            <label className="form-check-label small cursor-pointer" htmlFor={range.id}>{range.label}</label>
            </div>
        ))}
      </div>

      <hr className="my-3 opacity-25" />

      {/* 2. HẠNG SAO (Chỉ hiện cho Hotel) */}
      {type === 'hotel' && (
        <>
            <div className="mb-4">
            <h6 className="fw-bold small text-uppercase text-muted mb-2">Hạng sao</h6>
            {[5, 4, 3, 2, 1].map(star => (
                <div className="form-check" key={star}>
                <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id={`star-${star}`}
                    checked={filters.selectedStars.includes(star)}
                    onChange={() => handleCheckboxChange('selectedStars', star)}
                />
                <label className="form-check-label small cursor-pointer" htmlFor={`star-${star}`}>
                    {[...Array(star)].map((_, i) => <i key={i} className="bi bi-star-fill text-warning"></i>)}
                </label>
                </div>
            ))}
            </div>
            <hr className="my-3 opacity-25" />
        </>
      )}

      {/* 3. LOẠI HÌNH (Chỉ hiện cho Hotel) */}
      {type === 'hotel' && (
          <>
          <div className="mb-4">
            <h6 className="fw-bold small text-uppercase text-muted mb-2">Loại hình</h6>
            {accommodationTypes.map(acc => (
                <div className="form-check" key={acc.id}>
                <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id={acc.id}
                    checked={filters.selectedTypes.includes(acc.id)}
                    onChange={() => handleCheckboxChange('selectedTypes', acc.id)}
                />
                <label className="form-check-label small cursor-pointer" htmlFor={acc.id}>{acc.label}</label>
                </div>
            ))}
          </div>
          <hr className="my-3 opacity-25" />
          </>
      )}

      {/* 4. KHU VỰC (QUAN TRỌNG: Đã ép kiểu Number) */}
      <div className="mb-4">
        <h6 className="fw-bold small text-uppercase text-muted mb-2">Khu vực</h6>
        {cities && cities.length > 0 ? cities.map(city => (
          <div className="form-check" key={city.city_id}>
            <input 
              className="form-check-input" 
              type="checkbox" 
              id={`city-${city.city_id}`}
              // ÉP KIỂU VỀ SỐ ĐỂ SO SÁNH CHÍNH XÁC
              checked={filters.selectedCities.includes(Number(city.city_id))}
              onChange={() => handleCheckboxChange('selectedCities', Number(city.city_id))}
            />
            <label className="form-check-label small cursor-pointer" htmlFor={`city-${city.city_id}`}>
              {city.name}
            </label>
          </div>
        )) : <p className="text-muted small">Đang tải khu vực...</p>}
      </div>

      {/* 5. SẮP XẾP */}
      <div className="mb-2">
         <h6 className="fw-bold small text-uppercase text-muted mb-2">Sắp xếp</h6>
         <select 
            className="form-select form-select-sm cursor-pointer" 
            value={filters.sortOrder}
            onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
         >
             <option value="default">Đề xuất</option>
             <option value="low-to-high">Giá tăng dần</option>
             <option value="high-to-low">Giá giảm dần</option>
             {type === 'hotel' && <option value="star-desc">Sao: Cao đến thấp</option>}
         </select>
      </div>
    </div>
  );
};

export default FilterSidebar;