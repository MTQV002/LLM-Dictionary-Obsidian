# Hướng dẫn khắc phục lỗi Cambridge Audio

Nếu bạn gặp vấn đề khi tải xuống audio từ Cambridge Dictionary, đây là một số bước khắc phục:

## Nguyên nhân thường gặp

1. **CORS Restrictions**: Cambridge Dictionary chặn request từ ứng dụng Obsidian
2. **Anti-bot Protection**: Cambridge Dictionary phát hiện request tự động
3. **Rate Limiting**: Bạn đã tải quá nhiều audio trong một thời gian ngắn
4. **Network Issues**: Vấn đề kết nối mạng

## Cách khắc phục

### Phương pháp 1: Thử lại với delay

1. Đóng và mở lại Obsidian
2. Đợi khoảng 5-10 phút
3. Thử lại với tốc độ chậm hơn (1-2 từ/phút)

### Phương pháp 2: Kiểm tra mạng

1. Đảm bảo bạn không sử dụng VPN hoặc proxy
2. Truy cập Cambridge Dictionary trong trình duyệt để kiểm tra kết nối

### Phương pháp 3: Tải xuống thủ công

1. Mở Cambridge Dictionary trong trình duyệt
2. Tìm từ bạn cần
3. Nhấp chuột phải vào biểu tượng loa
4. Chọn "Inspect Element" (Kiểm tra phần tử)
5. Tìm thẻ `<source type="audio/mpeg" src="..."`
6. Sao chép URL âm thanh (chuỗi trong thuộc tính src)
7. Mở URL trong tab mới để tải xuống

### Phương pháp 4: Báo lỗi với file debug

1. Kiểm tra thư mục `audio_dictionary` trong vault
2. Tìm file bắt đầu bằng `debug_`
3. Gửi nội dung file này khi báo lỗi

## Cấu hình thay thế

Nếu Cambridge Audio liên tục thất bại, bạn có thể chuyển sang TTS:

1. Mở plugin settings
2. Chọn "Audio Source" -> "TTS APIs Only"
3. Lưu cài đặt

## Liên hệ hỗ trợ

Nếu vấn đề vẫn tồn tại, vui lòng cung cấp:

1. Phiên bản Obsidian
2. Phiên bản plugin
3. Hệ điều hành
4. Từ gặp lỗi
5. Thông tin debug

*Lưu ý: Cambridge Dictionary có thể cập nhật cấu trúc trang web của họ định kỳ, khiến phương pháp trích xuất của chúng tôi gặp sự cố. Chúng tôi cố gắng cập nhật plugin nhanh nhất có thể khi những thay đổi này xảy ra.*
