import React from "react";

export default function TermsPage() {
  // Lấy ngày hiện tại để hiển thị
  const currentDate = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          {/* Tiêu đề trang */}
          <h1 className="fw-bold mb-3">Điều khoản Dịch vụ CanThoTravel</h1>
          <p className="text-muted">Lần cập nhật cuối: {currentDate}</p>
          <hr className="my-4" />

          {/* Nội dung điều khoản */}
          <div className="terms-content">
            <h4 className="fw-bold mt-4">1. Giới thiệu</h4>
            <p>
              Chào mừng quý khách đến với CanThoTravel. Bằng việc truy cập và sử dụng trang web này, quý khách đồng ý tuân thủ và bị ràng buộc bởi các Điều khoản và Điều kiện sử dụng sau đây. Vui lòng đọc kỹ các điều khoản này trước khi sử dụng dịch vụ của chúng tôi.
            </p>

            <h4 className="fw-bold mt-4">2. Sử dụng Dịch vụ</h4>
            <p>
              Quý khách cam kết chỉ sử dụng trang web này cho các mục đích hợp pháp và không vi phạm quyền lợi của bất kỳ bên thứ ba nào. Cụ thể:
            </p>
            <ul>
              <li>Quý khách phải đủ 18 tuổi trở lên để thực hiện các giao dịch đặt phòng/vé.</li>
              <li>Quý khách chịu trách nhiệm về tính chính xác của mọi thông tin cung cấp cho chúng tôi.</li>
              <li>Không sử dụng trang web để thực hiện các hành vi gian lận hoặc giả mạo.</li>
            </ul>

            <h4 className="fw-bold mt-4">3. Đặt phòng và Thanh toán</h4>
            <p>
              Khi quý khách thực hiện đặt phòng hoặc dịch vụ qua CanThoTravel:
            </p>
            <ul>
              <li>
                <strong>Xác nhận:</strong> Đơn đặt chỗ chỉ được coi là hoàn tất khi quý khách nhận được email xác nhận từ chúng tôi.
              </li>
              <li>
                <strong>Giá cả:</strong> Giá hiển thị trên trang web có thể thay đổi tùy theo thời điểm và tình trạng phòng trống. Giá cuối cùng là giá được hiển thị tại bước thanh toán.
              </li>
              <li>
                <strong>Thanh toán:</strong> Chúng tôi chấp nhận các phương thức thanh toán như VNPay, chuyển khoản ngân hàng và tiền mặt tại khách sạn (đối với một số cơ sở lưu trú).
              </li>
            </ul>

            <h4 className="fw-bold mt-4">4. Chính sách Hủy và Hoàn tiền</h4>
            <p>
              Chính sách hủy và hoàn tiền phụ thuộc vào từng nhà cung cấp dịch vụ (khách sạn, hãng hàng không) và loại vé/phòng quý khách đã chọn.
            </p>
            <ul>
              <li>Vui lòng kiểm tra kỹ chính sách hủy trước khi hoàn tất đặt chỗ.</li>
              <li>Các yêu cầu hoàn tiền sẽ được xử lý theo quy định tại mục "Hủy, Hoàn và Đổi" trong Trung tâm Trợ giúp.</li>
            </ul>

            <h4 className="fw-bold mt-4">5. Trách nhiệm của CanThoTravel</h4>
            <p>
              CanThoTravel đóng vai trò là trung gian kết nối quý khách với các nhà cung cấp dịch vụ du lịch. Mặc dù chúng tôi nỗ lực hết sức để đảm bảo chất lượng dịch vụ, chúng tôi không chịu trách nhiệm trực tiếp đối với các hành vi, sai sót hoặc sự cố do nhà cung cấp dịch vụ gây ra, trừ khi được quy định rõ ràng khác.
            </p>

            <h4 className="fw-bold mt-4">6. Quyền sở hữu trí tuệ</h4>
            <p>
              Mọi nội dung trên trang web này, bao gồm văn bản, hình ảnh, logo và phần mềm, đều thuộc sở hữu của CanThoTravel hoặc các bên cấp phép và được bảo vệ bởi luật sở hữu trí tuệ. Quý khách không được sao chép, sửa đổi hoặc phân phối nội dung này mà không có sự cho phép bằng văn bản của chúng tôi.
            </p>

            <h4 className="fw-bold mt-4">7. Thay đổi Điều khoản</h4>
            <p>
              CanThoTravel bảo lưu quyền thay đổi, chỉnh sửa hoặc cập nhật các Điều khoản này bất cứ lúc nào mà không cần báo trước. Việc quý khách tiếp tục sử dụng trang web sau khi có các thay đổi đồng nghĩa với việc quý khách chấp nhận các thay đổi đó.
            </p>

            <h4 className="fw-bold mt-4">8. Luật áp dụng</h4>
            <p>
              Các Điều khoản này được điều chỉnh và giải thích theo pháp luật của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp phát sinh sẽ được giải quyết tại tòa án có thẩm quyền tại Việt Nam.
            </p>

            <h4 className="fw-bold mt-4">9. Liên hệ</h4>
            <p>
              Nếu quý khách có bất kỳ câu hỏi nào về Điều khoản Dịch vụ này, vui lòng liên hệ với chúng tôi qua trang "Liên hệ" hoặc email <a href="mailto:hotro@canthotravel.vn" className="text-decoration-none">hotro@canthotravel.vn</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}