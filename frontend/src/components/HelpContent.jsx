import React from "react";
import { Link } from "react-router-dom";

// Component này chỉ nhận props và hiển thị
export default function HelpContent({
  activeTopic,
  currentFaqs,
  currentTopicLabel,
  CustomerServiceFooterComponent, // Nhận component footer qua prop
}) {
  return (
    <>
      {/* Box CTA Liên hệ */}
      <div className="cta-box d-flex align-items-center p-4 mb-4">
        <i className="bi bi-emoji-smile display-4 me-3"></i>
        <div>
          <h5 className="mb-1 fw-bold">
            Cần hỗ trợ ư? Đã có chúng tôi ở đây!
          </h5>
          <p className="mb-0 small">
            Nhận câu trả lời nhanh, liên hệ với cơ sở lưu trú hoặc chăm sóc
            khách hàng CanThoTravel...
          </p>
        </div>
        <Link to="/contact" className="btn btn-light ms-auto text-nowrap">
          Liên hệ Dịch vụ
        </Link>
      </div>

      {/* Tiêu đề và Accordion */}
      <h2 className="mb-3 fw-bold">{currentTopicLabel}</h2>

      <div className="accordion" id="helpAccordion">
        {currentFaqs.length > 0 ? (
          currentFaqs.map((faq, index) => (
            <div className="accordion-item" key={index}>
              <h2 className="accordion-header" id={`heading-${index}`}>
                <button
                  className={`accordion-button ${
                    index > 0 ? "collapsed" : ""
                  }`}
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#collapse-${index}`}
                  aria-expanded={index === 0 ? "true" : "false"}
                  aria-controls={`collapse-${index}`}
                >
                  {faq.title}
                </button>
              </h2>
              <div
                id={`collapse-${index}`}
                className={`accordion-collapse collapse ${
                  index === 0 ? "show" : ""
                }`}
                aria-labelledby={`heading-${index}`}
                data-bs-parent="#helpAccordion"
              >
                <div className="accordion-body">{faq.content}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted">Chưa có câu hỏi nào cho mục này.</p>
        )}
      </div>

      {/* Nội dung tĩnh cho DịchVụ Khách Hàng */}
      {activeTopic === "customer-service" && (
        <CustomerServiceFooterComponent />
      )}
    </>
  );
}