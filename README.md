# Việt phục Remix · Bản chạy trên máy

Bản riêng cho Audition. Khóa Gemini được đọc tự động ở máy chủ, không có nút hoặc ô nhập khóa trong giao diện. Không cần cài thư viện.

## Cách chạy trên Windows

1. Cài Node.js 22 trở lên nếu máy chưa có.
2. Giải nén ZIP hoàn toàn. Không chạy ngay trong cửa sổ xem ZIP.
3. Mở `gemini.env` bằng Notepad hoặc VS Code.
4. Thay **chỉ** `DAN_KHOA_GEMINI_CUA_BAN_VAO_DAY` bằng khóa Gemini của bạn, giữ nguyên `GEMINI_API_KEY=`. Lưu tệp. Không thêm đuôi `.txt`.
5. Bấm đúp `CHAY-WEB.bat`. Trình duyệt tự mở http://localhost:3000.
6. Giữ cửa sổ máy chủ mở trong lúc dùng. Đóng cửa sổ hoặc nhấn Ctrl+C để dừng.

Sau lần đầu chỉ cần chạy `CHAY-WEB.bat`. Thay khóa/model thì tắt máy chủ và chạy lại.

## Cách chạy bằng terminal / macOS / Linux

Điền khóa vào `gemini.env`, mở terminal trong thư mục này, chạy `node local-server.mjs`, rồi mở http://localhost:3000. Tệp cấu hình được đọc theo vị trí mã nguồn, không phụ thuộc thư mục terminal hiện tại.

## Lưu ý khi dùng

- Cần Internet để gọi Gemini. Tải lại trang không cần nhập lại khóa.
- Nhãn “Máy chủ có khóa” mới xác nhận có cấu hình; gửi mô tả để kiểm tra kết nối thật. Chỉ phản hồi hợp lệ mới có nhãn Gemini đã kết nối.
- Chưa điền khóa, khóa sai, hết hạn mức hoặc mất mạng: giao diện báo rõ và dùng gợi ý dự phòng theo quy tắc.
- Nếu cổng 3000 đang được dùng, đóng bản demo đang chạy rồi thử lại.
- Khóa nằm trong `gemini.env`, không được phục vụ cho trình duyệt. Khi chia sẻ mã nguồn/ZIP sau khi đã điền khóa, xóa khóa khỏi tệp này. `.gitignore` loại tệp khỏi Git; dùng `gemini.env.example` để hướng dẫn người khác.
- Đây là máy chủ cục bộ, chỉ nghe trên 127.0.0.1. Muốn nộp URL demo truy cập từ Internet, cần triển khai phần máy chủ và đặt `GEMINI_API_KEY` dạng Secret ở hosting. Chạy localhost không tạo URL công khai.
- Không mở `public/demo.html` bằng nhấp đúp: cần chạy máy chủ để gọi API.

## Mã nguồn và kiểm tra

`public/` chứa giao diện, ảnh, phông chữ và danh mục. `server/gemini.mjs` gọi Gemini và xác thực kết quả; `server/config.mjs` đọc cấu hình. `local-server.mjs` phục vụ giao diện và API. `node --test tests/local.test.mjs` kiểm tra luồng API bằng phản hồi giả lập; không phải kết quả gọi Gemini thật.

Gemini chọn bộ phối trong danh mục đã kiểm tra, trả giải thích và hình xem trước; bấm “Áp dụng vào khung chính” để đổi bộ. Thông tin văn hóa dùng nguồn đối chiếu có sẵn. Giữ nguyên chức năng so sánh, lookbook, xuất PNG/HTML/JSON và phông tiếng Việt của bản demo.

## Nguồn thông tin và ảnh


- Bảo tàng Phụ nữ Việt Nam, “Thời trang và nghệ thuật tạo hoa văn”: https://baotangphunu.org.vn/thoi-trang-va-nghe-thuat-tao-hoa-van/
- Bảo tàng Lịch sử quốc gia, “Bảo tàng Lịch sử quốc gia tiếp nhận áo dài ngũ thân truyền thống”: https://baotanglichsu.vn/vi/Articles/3090/72685/bao-tang-lich-su-quoc-gia-tiep-nhan-ao-dai-ngu-than-truyen-thong.html
- Trường Đại học Sư phạm Nghệ thuật Trung ương, “Di sản văn hóa và sự phục hưng trong đời sống hiện đại của áo Nhật Bình”: https://spnttw.edu.vn/dao-tao/di-san-van-hoa-va-su-phuc-hung-trong-doi-song-hien-dai-cua-ao-nhat-binh/
- Ủy ban Nhà nước về người Việt Nam ở nước ngoài, “Áo bà ba – Trang phục của phụ nữ Nam Bộ”: https://scov.gov.vn/ban-sac-van-hoa/huong-vi-que-nha/ao-ba-ba-trang-phuc-cua-phu-nu-nam-bo.html

Giới thiệu văn hóa là khái quát; minh họa giản lược và phối màu là đề xuất thiết kế. Không suy ra phẩm cấp Nhật Bình từ màu trong demo, không coi cách tân là phục dựng. Demo chưa có tư vấn chuyên gia phục dựng.

Ảnh áo dài, ngũ thân cách tân (dấu DINGDANG), tứ thân cũ và ảnh Nhật Bình cũ lấy từ ZIP người dùng gửi. Ảnh tứ thân cũ không thể hiện rõ đặc trưng mở vạt nên không dùng trong giao diện; ảnh thay thế từ Áo Dài Năm Tuyền: https://namtuyen.com/ao-tu-than-dep-mac-di-le-hoi-chup-anh-bieu-dien. Giữ nguyên dấu nguồn trên ảnh và liên kết nguồn trong cửa sổ tham khảo. Ảnh bà ba và ảnh Nhật Bình mới lấy từ ảnh đính kèm; ảnh bà ba giữ dấu WED COSPLAY. Tác giả và quyền tái sử dụng của các ảnh khác chưa được xác minh. Minh họa SVG được viết riêng cho bản demo.

Đã kiểm tra logic và biên dịch; chưa chạy kiểm thử giao diện trên trình duyệt trong phiên tạo bản này. Chưa có thử đồ bằng ảnh người dùng hoặc tài khoản chia sẻ lookbook; có nhân vật minh họa và chia sẻ qua tệp.
