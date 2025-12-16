import React, { useState } from "react";
// (ĐÃ SỬA) Import thêm useNavigate
import { Link, useNavigate } from "react-router-dom";
import HelpContent from "../components/HelpContent"; // Import component nội dung

// ===============================================
//           DỮ LIỆU ĐƯỢC GIỮ TẠI ĐÂY
// ===============================================

// === (ĐÃ SỬA) Component "Đã có đặt chỗ?" (Thêm logic onClick) ===
const BookingLoginPrompt = () => {
  const navigate = useNavigate(); // Khởi tạo hook

  return (
    <div
      className="p-3 mt-3 mb-2 rounded-3"
      style={{ backgroundColor: "#f0f2f5" }}
    >
      <h6 className="fw-bold">Đã có đặt chỗ?</h6>
      <p className="small mb-2">
        Hãy đăng nhập để được trợ giúp nhanh hơn và truy cập tức thì vào
        các đơn đặt phòng hiện có.
      </p>
      <button
        className="btn btn-primary"
        style={{ backgroundColor: "var(--brand-blue)" }}
        onClick={() => navigate("/login")} // Thêm sự kiện onClick
      >
        Đăng nhập Ngay
      </button>
    </div>
  );
};

// === 1A. DỮ LIỆU SIDEBAR "CHỖ Ở" ===
const accommodationHelpTopics = [
  {
    key: "account",
    icon: "bi-person-circle",
    label: "Quản lý tài khoản",
  },
  {
    key: "booking-details",
    icon: "bi-file-earmark-text",
    label: "Thông tin chi tiết đơn đặt phòng",
  },
  { key: "cancellation", icon: "bi-x-circle", label: "Hủy bỏ" },
  {
    key: "payment",
    icon: "bi-credit-card",
    label: "Thông tin về Thanh toán/Hoàn tiền",
  },
  {
    key: "change-booking",
    icon: "bi-calendar-event",
    label: "Thay đổi ngày đặt phòng",
  },
  { key: "property", icon: "bi-building", label: "Quản lý khách" },
  {
    key: "confirmation",
    icon: "bi-check-circle",
    label: "Xác nhận đặt phòng",
  },
  {
    key: "special-request",
    icon: "bi-chat-left-dots",
    label: "Yêu cầu đặc biệt",
  },
  {
    key: "residence-faqs",
    icon: "bi-question-circle",
    label: "Các câu hỏi liên quan đến cơ sở lưu trú",
  },
  {
    key: "price-guarantee",
    icon: "bi-patch-check",
    label: "Đảm bảo Giá tốt nhất",
  },
  {
    key: "customer-service",
    icon: "bi-headset",
    label: "Dịch vụ Khách hàng",
  },
];

// === 1B. DỮ LIỆU NỘI DUNG "CHỖ Ở" ===
const accommodationFaqData = {
  // === 1. Quản lý tài khoản ===
  account: [
    {
      title: "Cách tạo tài khoản",
      content: (
        <div>
          <p className="help-sub-heading">
            <strong>Trên phiên bản web của CanThoTravel</strong>
          </p>
          <ol>
            <li>
              Ở góc trên cùng bên phải trang, quý khách sẽ thấy nút "Đăng nhập".
              Bấm vào nút đó.
            </li>
            <li>
              Ở góc dưới cùng trên trang mới này, quý khách sẽ thấy lựa chọn "Tạo
              tài khoản". Bấm vào nút đó.
            </li>
            <li>
              Quý khách có thể chọn đăng ký bằng cách sử dụng tài khoản Google,
              Facebook hoặc Apple ID hiện có.
            </li>
            <li>
              Hoặc, quý khách có thể đăng ký bằng địa chỉ thư điện tử của mình.
              Điền vào tên, họ và địa chỉ thư điện tử và quý khách sẽ được nhắc
              tạo mật khẩu.
            </li>
            <li>
              Sau khi điền thông tin, hãy nhấp vào "Đăng ký". Quý khách sẽ nhận
              được thư điện tử xác nhận trong hộp thư đến của mình. Nhấp vào
              đường liên kết trong thư điện tử của mình để xác thực tài khoản.
            </li>
          </ol>
          <p className="help-sub-heading">
            <strong>Trên điện thoại di động/ứng dụng</strong>
          </p>
          <ol>
            <li>
              Ở góc dưới cùng bên phải trang, quý khách sẽ thấy nút "Thêm". Bấm
              vào nút đó.
            </li>
            <li>
              Ở góc trên cùng bên phải trang này, quý khách sẽ thấy nút "Đăng
              nhập/Đăng ký". Bấm vào nút đó.
            </li>
            <li>
              Ở góc dưới cùng của trang mới này, dưới nút "Đăng nhập", quý khách
              sẽ thấy lựa chọn "Tạo tài khoản". Bấm vào nút đó.
            </li>
            <li>
              Quý khách có thể chọn đăng ký bằng cách sử dụng tài khoản Google,
              Facebook hoặc Apple ID hiện có. Hoặc, quý khách có thể đăng ký
              bằng địa chỉ thư điện tử của mình. Điền vào tên, họ và địa chỉ thư
              điện tử và quý khách sẽ được nhắc tạo mật khẩu.
            </li>
            <li>
              Sau khi điền thông tin, hãy nhấp vào "Đăng ký". Quý khách sẽ nhận
              được thư điện tử xác nhận trong hộp thư đến của mình. Nhấp vào
              đường liên kết trong thư điện tử của mình để xác thực tài khoản.
            </li>
          </ol>
          <p>
            Xin nhớ rằng, tài khoản CanThoTravel của quý khách cho phép quý khách
            quản lý đơn đặt phòng, bài đánh giá và thiết lập cho một trải nghiệm
            cá nhân hóa. Chào mừng đến với CanThoTravel!
          </p>
        </div>
      ),
    },
    {
      title: "Cách đăng nhập vào CanThoTravel",
      content: (
        <div>
          <p className="help-sub-heading">
            <strong>Trên phiên bản web của CanThoTravel</strong>
          </p>
          <ol>
            <li>
              Nhấp vào "Đăng nhập" ở góc trên cùng bên phải trang.
            </li>
            <li>
              Một trang mới sẽ mở ra và quý khách có thể nhập địa chỉ thư điện tử
              đã đăng ký và mật khẩu. Sau khi điền vào thông tin đăng nhập của
              quý khách, hãy nhấp nút "Đăng nhập".
            </li>
          </ol>
          <p>
            Nếu quý khách đã liên kết tài khoản Google hoặc Facebook của mình với
            CanThoTravel, quý khách cũng có thể chọn đăng nhập bằng cách sử dụng
            những lựa chọn này, chỉ bằng cách nhấp vào các biểu tượng tương ứng.
          </p>
          <p className="help-sub-heading">
            <strong>Trên điện thoại di động/ứng dụng</strong>
          </p>
          <ol>
            <li>
              Ở góc dưới cùng bên phải trang, quý khách sẽ thấy nút "Thêm". Bấm
              vào nút đó.
            </li>
            <li>
              Ở góc trên cùng bên phải trang này, quý khách sẽ thấy nút "Đăng
              nhập/Đăng ký". Bấm vào nút đó.
            </li>
            <li>
              Quý khách có thể nhập địa chỉ thư điện tử đã đăng ký và mật khẩu.
              Sau khi điền vào thông tin đăng nhập của quý khách, hãy nhấp nút
              "Đăng nhập".
            </li>
          </ol>
          <p>
            Nếu quý khách quên mật khẩu, chỉ cần nhấp vào đường liên kết "Quên
            mật khẩu?" và làm theo hướng dẫn để thiết lập lại.
          </p>
        </div>
      ),
    },
    {
      title: "Cách đăng nhập bằng tài khoản Google",
      content: (
        <div>
          <p>
            Khi chọn đăng nhập với tài khoản Google của quý khách, tài khoản này
            sẽ được liên kết với địa chỉ thư điện tử liên kết với tài khoản.
            Hãy làm theo các bước sau:
          </p>
          <p className="help-sub-heading">
            <strong>Trên phiên bản web của CanThoTravel</strong>
          </p>
          <ol>
            <li>
              Nhấp vào nút "Đăng nhập" ở góc trên cùng bên phải trang.
            </li>
            <li>
              Một trang mới sẽ mở ra. Nhấp vào nút "Google" ở dưới phần "hoặc
              đăng nhập bằng".
            </li>
            <li>
              Việc này sẽ mở ra một trang mới để quý khách có thể chọn tài khoản
              Google mình muốn sử dụng để đăng nhập.
            </li>
            <li>
              Sau khi quý khách chọn tài khoản Google, quý khách có thể cần phải
              nhập mật khẩu phụ thuộc vào thiết lập tài khoản Google của quý
              khách.
            </li>
            <li>
              Sau khi quý khách nhập mật khẩu, cửa sổ sẽ đóng lại và quý khách sẽ
              đăng nhập vào tài khoản CanThoTravel của mình.
            </li>
          </ol>
          <p className="help-sub-heading">
            <strong>Trên điện thoại di động/ứng dụng</strong>
          </p>
          <ol>
            <li>
              Ở góc dưới cùng bên phải trang, quý khách sẽ thấy nút "Thêm". Bấm
              vào nút đó.
            </li>
            <li>
              Ở góc trên cùng bên phải trang này, quý khách sẽ thấy nút "Đăng
              nhập/Đăng ký". Bấm vào nút đó.
            </li>
            <li>
              Một trang mới sẽ được mở ra. Nhấp vào nút "Google" ở dưới phần
              "hoặc đăng nhập bằng".
            </li>
            <li>
              Việc này sẽ mở ra một trang mới để quý khách có thể chọn tài khoản
              Google mình muốn sử dụng để đăng nhập.
            </li>
            <li>
              Sau khi quý khách chọn tài khoản Google, quý khách có thể cần phải
              nhập mật khẩu phụ thuộc vào thiết lập tài khoản Google của quý
              khách.
            </li>
            <li>
              Sau khi quý khách nhập mật khẩu, cửa sổ sẽ đóng lại và quý khách sẽ
              đăng nhập vào tài khoản CanThoTravel của mình.
            </li>
          </ol>
          <p>
            Xin nhớ rằng, tài khoản CanThoTravel sẽ được liên kết với địa chỉ thư
            điện tử được sử dụng cho tài khoản Google của quý khách.
          </p>
        </div>
      ),
    },
    {
      title: "Cách đăng nhập bằng tài khoản Facebook",
      content: (
        <div>
          <p>
            Để đăng nhập vào tài khoản CanThoTravel của quý khách bằng tài khoản
            Facebook, vui lòng làm theo các bước sau:
          </p>
          <p className="help-sub-heading">
            <strong>Trên phiên bản web của CanThoTravel</strong>
          </p>
          <ol>
            <li>
              Nhấp vào nút "Đăng nhập" ở góc trên cùng bên phải trang.
            </li>
            <li>
              Một trang mới sẽ được mở ra. Tại trang này, nhấp vào nút
              "Facebook" ở dưới phần "hoặc đăng nhập bằng".
            </li>
            <li>
              Quý khách sẽ được chuyển hướng sang trang đăng nhập Facebook. Vui
              lòng nhập địa chỉ thư điện tử hoặc số điện thoại liên kết với
              Facebook của quý khách, và mật khẩu. Nhấp vào "Đăng nhập".
            </li>
          </ol>
          <p className="help-sub-heading">
            <strong>Trên điện thoại di động/ứng dụng</strong>
          </p>
          <ol>
            <li>
              Ở góc dưới cùng bên phải trang, quý khách sẽ thấy nút "Thêm". Bấm
              vào nút đó.
            </li>
            <li>
              Ở góc trên cùng bên phải trang này, quý khách sẽ thấy nút "Đăng
              nhập/Đăng ký". Bấm vào nút đó.
            </li>
            <li>
              Một trang mới sẽ được mở ra. Tại trang này, hãy nhấp vào nút
              "Facebook" ở dưới phần "hoặc đăng nhập bằng".
            </li>
            <li>
              Quý khách sẽ được chuyển hướng sang trang đăng nhập Facebook. Vui
              lòng nhập địa chỉ thư điện tử hoặc số điện thoại liên kết với
              Facebook của quý khách, và mật khẩu.
            </li>
            <li>Nhấp vào "Đăng nhập".</li>
          </ol>
          <p>
            Sau khi thông tin của quý khách được xác thực, quý khách sẽ được tự
            động chuyển hướng về CanThoTravel và đăng nhập vào tài khoản
            CanThoTravel của quý khách. Xin nhớ rằng, tài khoản CanThoTravel sẽ
            được liên kết với địa chỉ thư điện tử được sử dụng cho tài khoản
            Facebook của quý khách.
          </p>
        </div>
      ),
    },
    {
      title: "Cách đăng nhập bằng Apple ID",
      content: (
        <div>
          <p>
            Việc đăng nhập bằng Apple ID cũng là một cách đơn giản và khả thi để
            đăng nhập vào tài khoản CanThoTravel của quý khách. Cách thực hiện:
          </p>
          <p className="help-sub-heading">
            <strong>Trên phiên bản web của CanThoTravel</strong>
          </p>
          <ol>
            <li>
              Nhấp vào nút "Đăng nhập" ở góc trên cùng bên phải trang.
            </li>
            <li>
              Một trang mới sẽ được mở ra. Tại trang này, hãy nhấp vào nút
              "Apple" ở dưới phần "hoặc đăng nhập bằng".
            </li>
            <li>
              Quý khách sẽ được chuyển hướng đến trang đăng nhập Apple ID. Vui
              lòng nhập Apple ID và mật khẩu của quý khách.
            </li>
            <li>
              Sau khi xác thực Apple ID của quý khách, quý khách sẽ được hỏi nếu
              quý khách có muốn chia sẻ thư điện tử của mình với CanThoTravel.
              Quý khách có thể chọn chia sẻ hoặc ẩn thư điện tử của mình.
            </li>
            <li>
              Sau khi đã xác thực, cửa sổ sẽ đóng lại và quý khách sẽ đăng nhập
              vào tài khoản CanThoTravel của mình.
            </li>
          </ol>
          <p className="help-sub-heading">
            <strong>Trên điện thoại di động/ứng dụng</strong>
          </p>
          <ol>
            <li>
              Ở góc dưới cùng bên phải trang, quý khách sẽ thấy nút "Thêm". Bấm
              vào nút đó.
            </li>
            <li>
              Ở góc trên cùng bên phải trang này, quý khách sẽ thấy nút "Đăng
              nhập/Đăng ký". Bấm vào nút đó.
            </li>
            <li>
              Một trang mới sẽ được mở ra. Tại trang này, nhấp vào nút "Apple" ở
              dưới phần "hoặc đăng nhập bằng".
            </li>
            <li>
              Quý khách sẽ được chuyển hướng đến trang đăng nhập Apple ID.
            </li>
            <li>
              Sau khi xác thực Apple ID của quý khách, quý khách sẽ được hỏi nếu
              quý khách có muốn chia sẻ thư điện tử của mình với CanThoTravel. Quý
              khách có thể chọn chia sẻ hoặc ẩn thư điện tử của mình.
            </li>
            <li>
              Sau khi đã xác thực, cửa sổ sẽ đóng lại và quý khách sẽ đăng nhập
              vào tài khoản CanThoTravel của mình.
            </li>
          </ol>
          <p>
            Đừng quên, tài khoản CanThoTravel sẽ được liên kết với Apple ID của
            quý khách.
          </p>
        </div>
      ),
    },
    {
      title: "Cách thay đổi mật khẩu",
      content: (
        <div>
          <p>
            Để thay đổi mật khẩu trên trang web CanThoTravel, vui lòng làm theo
            các bước sau:
          </p>
          <ol>
            <li>Đăng nhập vào tài khoản CanThoTravel của quý khách.</li>
            <li>
              Di chuột đến ảnh hồ sơ của quý khách ở góc trên cùng bên phải và
              nhấp vào "Hồ sơ của tôi".
            </li>
            <li>
              Trên trang "Hồ sơ của tôi", hãy chọn "Chỉnh sửa" kế bên mục "Mật
              khẩu".
            </li>
            <li>
              Quý khách sẽ cần nhập mật khẩu hiện tại và sau đó là mật khẩu mới.
              Xác nhận mật khẩu mới bằng cách nhập lại.
            </li>
            <li>
              Sau khi quý khách nhập mọi thông tin, hãy nhấp vào "Lưu" để thay
              đổi mật khẩu của quý khách.
            </li>
          </ol>
          <p>
            Xin lưu ý, vì lý do an ninh, chúng tôi khuyến khích mật khẩu của quý
            khách nên bao gồm sự kết hợp của các ký tự, số và ký hiệu. Hãy đảm
            bảo mật khẩu của quý khách là độc nhất và không dễ đoán.
          </p>
        </div>
      ),
    },
    {
      title: "Cách xóa tài khoản của quý khách",
      content: (
        <div>
          <p>
            Để xóa tài khoản của quý khách trên CanThoTravel, vui lòng làm theo
            các bước sau:
          </p>
          <p className="help-sub-heading">
            <strong>Trên phiên bản web của CanThoTravel</strong>
          </p>
          <ol>
            <li>Đăng nhập vào tài khoản CanThoTravel của quý khách.</li>
            <li>
              Di chuột đến ảnh hồ sơ của quý khách ở góc trên cùng bên phải và
              nhấp vào "Hồ sơ của tôi".
            </li>
            <li>
              Tại trang này, hãy cuộn xuống đến dưới cùng và chọn "Xóa bỏ tài
              khoản của tôi".
            </li>
          </ol>
          <p className="help-sub-heading">
            <strong>Trên điện thoại di động/ứng dụng</strong>
          </p>
          <ol>
            <li>Đăng nhập vào tài khoản CanThoTravel của quý khách.</li>
            <li>
              Ở góc dưới cùng bên phải trang, quý khách sẽ thấy nút "Thêm". Bấm
              vào nút đó.
            </li>
            <li>
              Cuộn xuống dưới cùng và chọn "Xóa bỏ tài khoản của tôi".
            </li>
          </ol>
        </div>
      ),
    },
    {
      title: "Để cập nhật đăng ký thư điện tử từ CanThoTravel",
      content: (
        <div>
          <p>
            Để cập nhật đăng ký thư điện tử từ CanThoTravel của quý khách trên
            trang web, quý khách có thể làm theo các bước sau:
          </p>
          <ol>
            <li>Đăng nhập vào tài khoản CanThoTravel của quý khách.</li>
            <li>
              Sau khi đã đăng nhập, hãy di chuột đến ảnh hồ sơ của quý khách ở
              góc trên cùng bên phải trang.
            </li>
            <li>Từ trình đơn thả xuống, chọn "Hồ sơ của tôi".</li>
            <li>
              Cuộn xuống dưới và chọn mục "Đăng ký nhận thư điện tử".
            </li>
            <li>
              Tại đây, quý khách có thể quản lý đăng ký quyền đăng ký của mình và
              chọn loại thư điện tử quý khách muốn nhận. Quý khách có thể chọn
              ưu đãi đặc biệt CanThoTravel, ưu đãi và chiết khấu, xác nhận đặt
              phòng, thông báo đặt phòng và nhiều thông tin khác.
            </li>
            <li>Tùy chỉnh thiết lập dựa theo ý muốn cá nhân.</li>
          </ol>
          <p>
            Quý khách cũng có thể hủy đăng ký nhận thư điện tử từ CanThoTravel
            (chẳng hạn như thư điện tử về chương trình khuyến mãi) bằng cách nhấp
            vào đường liên kết "Hủy theo dõi" ở phía dưới cùng trong thư điện
            tử.
          </p>
        </div>
      ),
    },
  ],

  // === 2. Thông tin chi tiết đơn đặt phòng ===
  "booking-details": [
    {
      title:
        "Tôi có thể kiểm tra chi tiết và trạng thái đặt phòng của mình ở đâu?",
      content: (
        <div>
          <p>
            Quý khách luôn có thể xem chi tiết và trạng thái đặt phòng trực
            tuyến bằng cách đăng nhập và chọn "Đơn đặt phòng của tôi" từ trình
            đơn tài khoản. Nếu quý khách không biết chi tiết đăng nhập của mình
            thì quý khách có thể theo liên kết 'Đơn đặt phòng của tôi' trong thư
            điện tử xác nhận của mình.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
  ],

  // === 3. Hủy bỏ ===
  cancellation: [
    {
      title: "Làm thế nào tôi có thể hủy phòng của mình?",
      content: (
        <div>
          <p>
            Quý khách có thể hủy phòng trực tuyến trên website hoặc ứng dụng
            CanThoTravel. Mọi chi phí hủy do chỗ nghỉ quyết định và được liệt kê
            trong chính sách hủy của quý khách.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
    {
      title: "Tôi có thể tìm chính sách hủy ở đâu?",
      content: (
        <div>
          <p>
            Khi tìm phòng, quý khách có thể thấy các điều kiện đặt phòng và chính
            sách hủy cùng với thông tin khác về phòng. Quý khách cũng có thể tìm
            thấy thông tin này trên chứng từ đặt phòng của mình.
          </p>
        </div>
      ),
    },
    {
      title: "Tôi sẽ bị tính phí nếu tôi hủy phòng của mình chứ?",
      content: (
        <p>
          Nếu quý khách có đơn đặt phòng miễn phí hủy thì quý khách sẽ không phải
          trả phí hủy. Nếu đơn đặt phòng của quý khách không còn được miễn phí
          hủy hoặc thuộc loại "không hoàn tiền" thì quý khách có thể gánh chịu
          chi phí hủy. Mọi chi phí hủy cho việc đặt phòng đều do chỗ nghỉ quyết
          định.
        </p>
      ),
    },
    {
      title: "Làm sao tôi biết việc đặt phòng của mình đã bị hủy bỏ hay chưa?",
      content: (
        <p>
          Sau khi quý khách hủy phòng với chúng tôi, quý khách sẽ nhận được thư
          điện tử xác nhận việc hủy. Hãy kiểm tra hộp thư đến và thư mục rác của
          quý khách.
        </p>
      ),
    },
  ],

  // === 4. Thanh toán / Hoàn tiền ===
  payment: [
    {
      title: "Khi nào tôi sẽ nhận được khoản tiền hoàn lại?",
      content: (
        <div>
          <p>
            <strong>Bắt đầu hoàn tiền:</strong> Một khi việc hủy phòng của quý
            khách được xác nhận, chúng tôi sẽ ngay lập tức bắt đầu quy trình
            hoàn tiền. Việc này thường diễn ra trong vòng 24 đến 48 giờ từ khi
            nhận được yêu cầu hủy.
          </p>
          <p>
            <strong>Thời gian xử lý:</strong> Khung thời gian chính xác để khoản
            hoàn tiền phản ánh trong tài khoản của quý khách phụ thuộc vào phương
            thức thanh toán quý khách sử dụng tại thời điểm đặt phòng:
          </p>
          <ul>
            <li>
              <strong>Thanh toán qua VNPay (bao gồm thẻ tín dụng/ghi nợ):</strong>{" "}
              Với hầu hết các ngân hàng, thời gian này có thể lên đến 30 ngày
              làm việc để khoản hoàn tiền phản ánh trong sao kê của quý khách,
              phụ thuộc vào chính sách của ngân hàng.
            </li>
            <li>
              <strong>Chuyển khoản ngân hàng/Thanh toán trực tuyến:</strong> Quy
              trình hoàn tiền về tài khoản ngân hàng của quý khách thường mất từ
              7 đến 10 ngày làm việc.
            </li>
          </ul>
          <p>
            <strong>Liên lạc và Cập nhật:</strong> Quý khách sẽ nhận được thư
            xác nhận điện tử từ CanThoTravel khi tiến hành hoàn tiền. Tổ chức
            tài chính của quý khách (ngân hàng) cũng có thể gửi thông báo cho quý
            khách. Vui lòng theo dõi thư điện tử và thông báo từ ngân hàng/VNPay
            của quý khách về mọi cập nhật liên quan đến hoàn tiền. Đừng quên kiểm
            tra thư mục rác của quý khách.
          </p>
        </div>
      ),
    },
    {
      title: "Kiểm tra tình đủ điều kiện để nhận hoàn tiền",
      content: (
        <div>
          <p>
            Việc quý khách có đủ điều kiện được hoàn tiền hay không phụ thuộc
            vào các điều khoản và điều kiện cụ thể của cơ sở lưu trú quý khách
            đã đặt và thời điểm quý khách hủy phòng.
          </p>
          <p>
            Xem lại điều kiện của đơn đặt phòng: Chính sách hoàn tiền được nêu
            rõ trong thư xác nhận điện tử và thông tin chi tiết trên tài khoản
            CanThoTravel của quý khách. Từng khách sạn hoặc cơ sở lưu trú có
            chính sách hủy riêng.
          </p>
          <p>
            <strong>Quy trình hoàn tiền:</strong> Nếu đơn đặt phòng của quý
            khách đủ điều kiện để hoàn tiền dựa trên chính sách hủy,
            CanThoTravel sẽ bắt đầu quy trình hoàn tiền một khi việc hủy phòng
            được xác nhận.
          </p>
        </div>
      ),
    },
    {
      title: "Tôi phải làm sao nếu bị thu tiền hai lần?",
      content: (
        <div>
          <p>
            <strong>Kiểm tra hồ sơ thanh toán của quý khách:</strong> Xác thực
            bản sao kê của ngân hàng hoặc lịch sử thanh toán trực tuyến của quý
            khách để chắc chắn rằng quý khách đã bị thu phí hai lần cho cùng một
            đơn đặt phòng.
          </p>
          <p>
            <strong>Tổng hợp thông tin:</strong> Vui lòng chuẩn bị số tham chiếu
            đặt phòng, cùng với thông tin chi tiết giao dịch cho cả hai lần thu
            tiền (ngày, khoản tiền, bằng chứng thanh toán).
          </p>
          <p>
            <strong>Liên hệ với Dịch vụ Khách hàng CanThoTravel:</strong> Liên hệ
            trực tiếp với chúng tôi.
          </p>
          <p>
            <strong>Quy trình điều tra:</strong> Sau khi nhận được thông tin chi
            tiết, chúng tôi sẽ nhanh chóng điều tra ngay. Chúng tôi sẽ xác thực
            khoản thu gắp đôi và bắt đầu hoàn lại khoản phí bị thu trùng.
          </p>
          <p>
            <strong>Xác nhận:</strong> Quý khách sẽ nhận được thư điện tử xác
            nhận một khi chúng tôi xử lý quá trình hoàn tiền.
          </p>
        </div>
      ),
    },
    {
      title: "Các phương thức thanh toán được CanThoTravel chấp nhận",
      content: (
        <div>
          <p>
            CanThoTravel chấp nhận nhiều phương thức thanh toán khác nhau để
            mang lại sự thuận tiện cho khách hàng. Những phương thức thanh toán
            này bao gồm:
          </p>
          <ul>
            <li>
              <strong>Cổng thanh toán VNPay:</strong> Cho phép khách hàng thanh toán
              an toàn qua ứng dụng ngân hàng, thẻ nội địa và thẻ quốc tế (Visa,
              MasterCard).
            </li>
            <li>
              <strong>Chuyển khoản ngân hàng:</strong> Cho phép khách hàng thanh
              toán trực tiếp từ tài khoản ngân hàng của họ.
            </li>
            <li>
              <strong>Thanh toán tại khách sạn (Tiền mặt):</strong> Một số khách
              sạn cho phép quý khách thanh toán trực tiếp tại cơ sở lưu trú bằng
              tiền mặt khi nhận phòng.
            </li>
          </ul>
          <p>
            Vui lòng đảm bảo kiểm tra các phương thức thanh toán hiện được liệt
            kê trên trang thanh toán của chúng tôi.
          </p>
        </div>
      ),
    },
    {
      title: "Các cách thanh toán khác nhau cho đơn đặt phòng khách sạn",
      content: (
        <div>
          <p>
            CanThoTravel cung cấp nhiều cách thanh toán, bao gồm những lựa chọn
            sau:
          </p>
          <p className="help-sub-heading">
            <strong>Lựa chọn Thanh toán Ngay (Thanh toán trực tuyến)</strong>
          </p>
          <p>
            Đây là các thanh toán được xử lý ngay tại thời điểm đặt phòng, bao
            gồm Cổng VNPay và Chuyển khoản ngân hàng.
          </p>
          <p className="help-sub-heading">
            <strong>Lựa chọn Thanh toán Sau (Thanh toán tại khách sạn)</strong>
          </p>
          <p>
            Thường yêu cầu quý khách cung cấp thẻ tín dụng để đảm bảo đơn đặt
            phòng nhưng thanh toán thực tế sẽ được thực hiện tại khách sạn,
            thường bằng Tiền mặt hoặc Thẻ.
          </p>
          <p>
            Luôn đảm bảo xem lại điều kiện thanh toán được hiển thị rõ ràng
            trong suốt quá trình đặt phòng trên CanThoTravel để chọn lựa chọn
            tốt nhất.
          </p>
        </div>
      ),
    },
  ],

  // === 5. Thay đổi ngày đặt phòng ===
  "change-booking": [
    {
      title:
        "Tôi muốn thay đổi ngày đặt phòng của mình. Làm sao tôi có thể làm vậy?",
      content:
        "Bạn có thể yêu cầu thay đổi ngày trong mục 'Đơn đặt phòng của tôi'. Xin lưu ý rằng việc thay đổi có thể phát sinh thêm phí tùy theo chính sách của khách sạn.",
    },
    {
      title: "Làm thế nào để tôi kéo dài thời gian ở?",
      content:
        "Bạn có thể đặt một đơn mới cho các ngày thêm, hoặc liên hệ trực tiếp với khách sạn khi bạn đang ở đó để gia hạn.",
    },
    {
      title: "Làm thế nào để tôi rút ngắn thời gian ở?",
      content:
        "Vui lòng kiểm tra chính sách hủy/thay đổi. Nếu bạn rút ngắn thời gian lưu trú, bạn có thể không được hoàn tiền cho những đêm không sử dụng.",
    },
  ],

  // === 6. Quản lý khách ===
  property: [
    {
      title:
        "Tôi muốn thay đổi tên của khách chính. Làm sao tôi có thể làm vậy?",
      content:
        "Tên khách chính thường không thể thay đổi sau khi đã xác nhận để đảm bảo an ninh. Vui lòng liên hệ Dịch vụ Khách hàng để được hỗ trợ trường hợp đặc biệt.",
    },
  ],

  // === 7. Xác nhận đặt phòng ===
  confirmation: [
    {
      title: "Khi nào tôi có thư điện tử xác nhận?",
      content: (
        <div>
          <p>
            Trong hầu hết các trường hợp, quý khách sẽ nhận được thư điện tử này
            cùng với chứng từ đặt phòng (tệp PDF) trong vòng 30 phút kể từ khi
            đặt phòng. Nếu quý khách vẫn chưa nhận được nó sau thời gian đó thì
            vui lòng kiểm tra thư rác và/hoặc bộ lọc thư rác.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
    {
      title:
        "CanThoTravel có thể gửi lại chứng từ đặt phòng cho tôi không?",
      content: (
        <div>
          <p>
            CanThoTravel hiện cung cấp cho quý khách lựa chọn tự phục vụ. Chỉ
            bằng cách bấm vào liên kết tự phục vụ được cung cấp trong thư điện tử
            xác nhận, quý khách sẽ có thể gửi lại chứng từ đặt phòng.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
    {
      title:
        "Tôi chưa nhận được xác nhận đặt chỗ và không thể xác định vị trí đơn đặt chỗ của mình trực tuyến.",
      content: (
        <div>
          <p>
            Trong hầu hết các trường hợp, quý khách sẽ nhận được xác nhận đặt chỗ
            (tệp PDF) qua thư điện tử trong vòng 30 phút. Nếu vẫn chưa nhận được,
            vui lòng kiểm tra thư rác. Quý khách cũng có thể xem trạng thái đặt
            chỗ bằng cách đăng nhập và chọn "Đơn đặt chỗ của tôi". Nếu sau 24
            giờ vẫn không có, vui lòng liên hệ với chúng tôi.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
    {
      title:
        "Làm sao tôi có thể gửi xác nhận đặt phòng tới địa chỉ thư điện tử khác với địa chỉ tôi đã sử dụng để đặt phòng?",
      content: (
        <p>
          Quý khách sẽ nhận được một thư điện tử xác nhận đặt phòng tới địa chỉ
          thư điện tử mà quý khách đã cung cấp trong quá trình đặt phòng. Ngoài
          ra, quý khách có thể tìm được các đơn đặt phòng trên trang "[Đơn đặt
          chỗ của tôi]".
        </p>
      ),
    },
  ],

  // === 8. Yêu cầu đặc biệt ===
  "special-request": [
    {
      title: "Làm thế nào tôi có thể đưa ra một yêu cầu đặc biệt?",
      content: (
        <div>
          <p>
            Quý khách có thể gửi yêu cầu đặc biệt của mình tới chỗ nghỉ bằng lựa
            chọn tự phục vụ. Xin lưu ý rằng mọi yêu cầu đặc biệt đều lệ thuộc
            vào khả năng cung cấp và không thể được CanThoTravel đảm bảo.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
    {
      title: "Làm thế nào tôi sẽ biết là một yêu cầu đặc biệt được xác nhận?",
      content: (
        <div>
          <p>
            Tất cả các yêu cầu đặc biệt đều lệ thuộc vào khả năng đáp ứng và
            không thể được CanThoTravel bảo đảm. Khi nhận được, CanThoTravel sẽ
            chuyển yêu cầu đến chỗ nghỉ ưa thích của quý khách, và quý khách có
            thể theo dõi với chỗ nghỉ trước hoặc khi đến.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
    {
      title: "Tôi có được yêu cầu nhận phòng sớm/trả phòng muộn không?",
      content: (
        <div>
          <p>
            Quý khách có thể gửi yêu cầu đặc biệt của mình về việc nhận phòng
            sớm/trả phòng muộn tới chỗ nghỉ bằng lựa chọn tự phục vụ. Xin lưu ý
            rằng mọi yêu cầu đặc biệt đều lệ thuộc vào khả năng cung cấp và không
            thể được CanThoTravel đảm bảo.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
    {
      title:
        "Tôi có thể chọn loại giường tôi muốn, yêu cầu phòng hút thuốc hoặc cấm hút thuốc, hoặc yêu cầu phòng nối liền nhau chứ?",
      content: (
        <div>
          <p>
            Tất cả các yêu cầu đặc biệt đều lệ thuộc vào khả năng đáp ứng và
            không thể được CanThoTravel bảo đảm. Khi nhận được, CanThoTravel sẽ
            chuyển yêu cầu đến chỗ nghỉ ưa thích của quý khách, và quý khách có
            thể theo dõi với chỗ nghỉ trước hoặc khi đến.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
  ],

  // === 9. Câu hỏi về cơ sở lưu trú ===
  "residence-faqs": [
    {
      title: "Khách sạn có cho phép vật nuôi không?",
      content:
        "Chính sách vật nuôi tùy thuộc vào từng khách sạn. Vui lòng kiểm tra mục 'Tiện ích' hoặc 'Chính sách Khách sạn' trên trang chi tiết của khách sạn để biết thông tin này trước khi đặt.",
    },
    {
      title: "Giờ nhận/trả phòng là khi nào?",
      content:
        "Thời gian nhận và trả phòng tiêu chuẩn được quy định trên trang chi tiết khách sạn (thường là nhận phòng sau 14:00 và trả phòng trước 12:00). Bạn có thể yêu cầu nhận phòng sớm/trả phòng trễ khi đặt phòng, tuy nhiên điều này tùy thuộc vào tình trạng sẵn có của khách sạn.",
    },
  ],

  // === 10. Đảm bảo giá ===
  "price-guarantee": [
    {
      title: "Đảm bảo Giá tốt nhất hoạt động như thế nào?",
      content:
        "Nếu bạn đã đặt phòng với chúng tôi và tìm thấy giá tốt hơn trên một trang web khác cho cùng loại phòng, cùng ngày, và cùng điều kiện, vui lòng liên hệ Dịch vụ Khách hàng. Chúng tôi sẽ xem xét hoàn lại phần chênh lệch cho bạn nếu yêu cầu của bạn hợp lệ.",
    },
  ],

  // === 11. Dịch vụ Khách hàng ===
  "customer-service": [
    {
      title: "Cách liên hệ với Dịch vụ Khách hàng CanThoTravel",
      content:
        "Bạn có thể liên hệ chúng tôi qua email, chat, hoặc biểu mẫu trên trang Liên hệ. Chúng tôi trực 24/7 để hỗ trợ bạn.",
    },
    {
      title: "CanThoTravel có đường dây nóng Dịch vụ Khách hàng không?",
      content:
        "Có, chúng tôi cung cấp hỗ trợ qua điện thoại cho các trường hợp khẩn cấp. Số điện thoại được cung cấp trong email xác nhận đặt phòng của bạn.",
    },
    {
      title: "Số điện thoại của Dịch vụ Khách hàng CanThoTravel là gì?",
      content:
        "Vì lý do bảo mật và để đảm bảo chúng tôi có đầy đủ thông tin về đơn đặt phòng, số điện thoại hỗ trợ tốt nhất được cung cấp trong email xác nhận và trong mục 'Đơn đặt phòng của tôi'.",
    },
  ],
};

// ===================================================
//           DỮ LIỆU CHO MỤC "CHUYẾN BAY"
// ===================================================

// === 2A. DỮ LIỆU SIDEBAR "CHUYẾN BAY" ===
const flightHelpTopics = [
  {
    key: "travel-guide",
    icon: "bi-map",
    label: "Hướng dẫn du lịch",
  },
  {
    key: "flight-booking-details",
    icon: "bi-file-earmark-text",
    label: "Chi tiết đơn đặt chỗ",
  },
  {
    key: "flight-cancellation",
    icon: "bi-x-circle",
    label: "Hủy, Hoàn và Đổi",
  },
  {
    key: "flight-special-request",
    icon: "bi-chat-left-dots",
    label: "Yêu cầu đặc biệt",
  },
  { key: "check-in", icon: "bi-person-check", label: "Làm thủ tục" },
  {
    key: "travel-insurance",
    icon: "bi-shield-check",
    label: "Bảo hiểm du lịch",
  },
  {
    key: "change-itinerary",
    icon: "bi-calendar-event",
    label: "Thay đổi lịch trình",
  },
  { key: "baggage", icon: "bi-suitcase-lg", label: "Gói" },
  {
    key: "baggage-allowance",
    icon: "bi-bag",
    label: "Hạn mức hành lý",
  },
  {
    key: "flight-payment",
    icon: "bi-credit-card",
    label: "Thanh toán",
  },
];

// === 2B. DỮ LIỆU NỘI DUNG "CHUYẾN BAY" ===
const flightFaqData = {
  "travel-guide": [
    {
      title:
        "Tôi có thể tìm cẩm nang du lịch, mẹo và thủ thuật cho điểm đến tôi sẽ đến ở trang nào?",
      content: (
        <div>
          <p>
            CanThoTravel cung cấp các cẩm nang du lịch chi tiết và mẹo vặt hữu
            ích ngay trên blog và các trang điểm đến của chúng tôi. Bạn có thể
            tìm thấy thông tin về:
          </p>
          <ul>
            <li>Các địa điểm tham quan nổi bật</li>
            <li>Món ăn địa phương không thể bỏ qua</li>
            <li>Mẹo di chuyển và đi lại trong thành phố</li>
            <li>Thời điểm lý tưởng để du lịch</li>
          </ul>
          <p>
            Vui lòng truy cập mục "Blog" hoặc "Cẩm nang du lịch" trên thanh điều
            hướng của chúng tôi để khám phá.
          </p>
        </div>
      ),
    },
  ],
  "flight-booking-details": [
    {
      title: "Làm thế nào tôi có được thêm thông tin về việc đặt chỗ của mình?",
      content: (
        <div>
          <p>
            Tất cả thông tin chi tiết về đơn đặt chỗ chuyến bay của bạn (bao gồm
            mã đặt chỗ hãng hàng không, thông tin hành khách, và chi tiết hành
            trình) đều có sẵn trong:
          </p>
          <ol>
            <li>Email xác nhận chúng tôi đã gửi cho bạn.</li>
            <li>
              Mục "Các chuyến bay của tôi" sau khi bạn đăng nhập vào tài khoản
              CanThoTravel.
            </li>
          </ol>
          <p>
            Nếu bạn cần thông tin chi tiết hơn không có trong các tài liệu này,
            bạn có thể liên hệ trực tiếp với hãng hàng không.
          </p>
          <BookingLoginPrompt />
        </div>
      ),
    },
  ],
  "flight-cancellation": [
    {
      title: "Chính sách Hủy, Hoàn và Đổi chuyến bay như thế nào?",
      content:
        "Chính sách hủy, hoàn và đổi vé phụ thuộc hoàn toàn vào điều kiện giá vé của hãng hàng không mà bạn đã mua. Vui lòng kiểm tra email xác nhận của bạn để xem chi tiết điều kiện vé.",
    },
  ],
  "flight-special-request": [
    {
      title: "Làm thế nào để yêu cầu suất ăn đặc biệt hoặc hỗ trợ xe lăn?",
      content:
        "Các yêu cầu đặc biệt (suất ăn, xe lăn, v.v.) cần được thực hiện trực tiếp với hãng hàng không. Vui lòng sử dụng mã đặt chỗ của hãng (có trong email xác nhận) và liên hệ hãng hàng không ít nhất 48 giờ trước chuyến bay.",
    },
  ],
  "check-in": [
    {
      title: "Tôi cần làm thủ tục (check-in) như thế nào?",
      content:
        "Bạn có thể làm thủ tục trực tuyến trên website của hãng hàng không (thường mở 24 giờ trước chuyến bay) hoặc làm thủ tục tại quầy ở sân bay. Vui lòng kiểm tra email của hãng hàng không để biết hướng dẫn cụ thể.",
    },
  ],
  "travel-insurance": [
    {
      title: "Tôi có thể mua bảo hiểm du lịch ở đâu?",
      content:
        "Bạn có thể được cung cấp tùy chọn mua bảo hiểm du lịch trong quá trình đặt vé trên CanThoTravel, hoặc bạn có thể mua riêng từ các nhà cung cấp bảo hiểm khác.",
    },
  ],
  "change-itinerary": [
    {
      title: "Tôi muốn thay đổi ngày bay, làm thế nào?",
      content:
        "Việc thay đổi ngày bay phụ thuộc vào điều kiện vé. Vui lòng kiểm tra email xác nhận và liên hệ Dịch vụ Khách hàng của chúng tôi để được hỗ trợ. Phí thay đổi và chênh lệch giá vé có thể được áp dụng.",
    },
  ],
  baggage: [
    {
      title: "Làm thế nào để mua thêm hành lý?",
      content:
        "Bạn thường có thể mua thêm hành lý trực tiếp trên website của hãng hàng không sau khi đã có mã đặt chỗ. Việc mua hành lý tại sân bay thường có chi phí cao hơn.",
    },
  ],
  "baggage-allowance": [
    {
      title: "Hạn mức hành lý của tôi là bao nhiêu?",
      content:
        "Hạn mức hành lý (xách tay và ký gửi) được quy định rõ trong email xác nhận đặt vé và trên website của hãng hàng không. Vui lòng kiểm tra kỹ để tránh phát sinh chi phí tại sân bay.",
    },
  ],
  "flight-payment": [
    {
      title: "Thanh toán vé máy bay có giống thanh toán khách sạn không?",
      content:
        "Các phương thức thanh toán vé máy bay tương tự như khách sạn (VNPay, Chuyển khoản). Tuy nhiên, vé máy bay thường yêu cầu thanh toán ngay 100% và không hỗ trợ 'Thanh toán tại sân bay'.",
    },
  ],
};

// === Component nội dung tĩnh DVKH (Dùng chung) ===
const CustomerServiceFooter = () => (
  <div className="help-static-content p-4 rounded-4 mt-4">
    <h4 className="fw-bold">
      Chào mừng đến trang Liên hệ với chúng tôi của CanThoTravel
    </h4>
    <p>
      Chào mừng đến CanThoTravel! Chúng tôi hiểu rằng đôi lúc, quý khách cần sự
      giúp đỡ để đảm bảo một kế hoạch du lịch suôn sẻ. Bộ phận Dịch vụ Khách hàng
      của chúng tôi ở đây để hỗ trợ quý khách trên từng bước.
    </p>
    <h5 className="fw-bold mt-4">Liên lạc một cách dễ dàng</h5>
    <p>
      Mục tiêu của chúng tôi là cung cấp các câu trả lời và giải pháp nhanh, đáng
      tin cậy cho quý khách mà không cần phải chờ đợi.
    </p>
    <h5 className="fw-bold mt-4">Hỗ trợ liền mạch trong tầm tay</h5>
    <p>
      Bộ phận Dịch vụ Khách hàng tận tâm của CanThoTravel sẵn sàng hỗ trợ quý
      khách 24/7 thông qua nền tảng nhắn tin của chúng tôi để giải quyết mọi
      thắc mắc.
    </p>
  </div>
);

// === Component Sidebar (Dùng chung) ===
const HelpSidebar = ({ helpTopics, activeTopic, setActiveTopic }) => (
  <div
    className="nav nav-pills flex-column help-sidebar p-3"
    role="tablist"
  >
    {helpTopics.map((topic) => (
      <button
        key={topic.key}
        type="button"
        role="tab"
        className={`nav-link text-start fw-semibold ${
          activeTopic === topic.key ? "active" : ""
        }`}
        onClick={() => setActiveTopic(topic.key)}
      >
        <i className={`bi ${topic.icon} me-2`}></i>
        {topic.label}
      </button>
    ))}
  </div>
);

// ===============================================
//           COMPONENT CHÍNH CỦA TRANG
// ===============================================
export default function HelpPage() {
  const [helpMode, setHelpMode] = useState("accommodation"); // 'accommodation' | 'flight'
  const [activeTopic, setActiveTopic] = useState("account"); // Chủ đề đang active

  // Lựa chọn data dựa trên 'helpMode'
  const currentHelpTopics =
    helpMode === "flight" ? flightHelpTopics : accommodationHelpTopics;
  const currentFaqData =
    helpMode === "flight" ? flightFaqData : accommodationFaqData;

  // Xử lý khi đổi mode (Chỗ ở <-> Chuyến bay)
  const handleChangeMode = (newMode) => {
    if (helpMode === newMode) return; // Không làm gì nếu bấm vào mode hiện tại
    setHelpMode(newMode);

    // Khi đổi mode, reset active topic về mục đầu tiên của mode đó
    if (newMode === "flight") {
      setActiveTopic("travel-guide");
    } else {
      setActiveTopic("account");
    }
  };

  // === Logic tính toán ===
  let faqsToDisplay = currentFaqData[activeTopic];
  let labelToDisplay = currentHelpTopics.find(
    (t) => t.key === activeTopic
  )?.label;

  // Fallback: Nếu topic không tồn tại trong mode mới, chọn topic đầu tiên
  if (!faqsToDisplay) {
    const firstKey = currentHelpTopics[0].key;
    faqsToDisplay = currentFaqData[firstKey] || [];
    labelToDisplay = currentHelpTopics[0].label;
    // Cập nhật lại state cho đúng
    if (activeTopic !== firstKey) {
      setActiveTopic(firstKey);
    }
  }

  const currentFaqs = faqsToDisplay;
  const currentTopicLabel = labelToDisplay;

  return (
    <div>
      {/* ===== 1. Banner Xanh (Đã thêm onClick) ===== */}
      <div className="help-header">
        <div className="container text-center">
          <h1 className="display-5 fw-bold text-white mb-4">
            Cần giúp đỡ ư? Chúng tôi đến để giúp quý khách đây!
          </h1>
          <div className="d-flex justify-content-center gap-4">
            <button
              className="btn-help-category"
              onClick={() => handleChangeMode("accommodation")}
            >
              <i className="bi bi-building display-4"></i>
              <span className="d-block mt-2">Chỗ ở</span>
            </button>
            <button
              className="btn-help-category"
              onClick={() => handleChangeMode("flight")}
            >
              <i className="bi bi-airplane display-4"></i>
              <span className="d-block mt-2">Chuyến bay</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== 2. Bố cục Sidebar + Nội dung ===== */}
      <div className="container my-5">
        <div className="row g-4">
          {/* --- Cột Sidebar (Trái) --- */}
          <div className="col-lg-4">
            <HelpSidebar
              helpTopics={currentHelpTopics} // Truyền đúng topics
              activeTopic={activeTopic}
              setActiveTopic={setActiveTopic}
            />
          </div>

          {/* --- Cột Nội dung (Phải) --- */}
          <div className="col-lg-8">
            <HelpContent
              activeTopic={activeTopic}
              currentFaqs={currentFaqs}
              currentTopicLabel={currentTopicLabel}
              CustomerServiceFooterComponent={CustomerServiceFooter}
            />
          </div>
        </div>
      </div>
    </div>
  );
}