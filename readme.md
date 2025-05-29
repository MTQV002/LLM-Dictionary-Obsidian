# LLM Dictionary - Obsidian Plugin

LLM Dictionary là một plugin trên Obsidian hỗ trợ tra cứu từ vựng thông minh. Một trong những tính năng thú vị nhất của LLM Dictionary so với các từ điển thông thường là khả năng tra cứu từ vựng theo ngữ cảnh bằng AI. Thay vì chỉ đưa ra các định nghĩa cho sẵn trong từ điển, LLM Dictionary có thể đưa ra các định nghĩa dựa trên ngữ cảnh, giúp người dùng hiểu được nghĩa của từ một cách chính xác và sát với thực tế.

## Tính năng chính

### ✅ Free Text-to-Speech (TTS)
- Sử dụng Microsoft Edge Speech API
- Hỗ trợ nhiều giọng đọc tự nhiên
- Tùy chỉnh tốc độ đọc, cao độ và âm lượng
- Hoạt động offline sau khi tải voice

### ✅ AI Dictionary Lookup
- Sử dụng Groq API (llama3-70b-8192) - miễn phí
- Hỗ trợ tiếng Anh với định nghĩa theo ngữ cảnh
- Cung cấp phiên âm IPA
- 3 câu ví dụ cho mỗi từ
- Tra cứu trực tiếp trong PDF

### ✅ Anki Integration
- Xuất flashcards tự động sang Anki
- Template note có thể tùy chỉnh
- Tự động tạo file âm thanh
- Đồng bộ hai chiều với Anki

### ✅ Obsidian Integration
- Lưu từ vựng thành notes trong vault
- Liên kết nguồn tự động
- Hỗ trợ internal links
- Template system linh hoạt

## Cài đặt

### Bước 1: Cài đặt plugin BRAT
1. Mở Obsidian Settings
2. Vào Community Plugins và tắt Safe Mode
3. Tìm và cài đặt plugin "BRAT"
4. Enable BRAT plugin

### Bước 2: Cài đặt LLM Dictionary qua BRAT
1. Mở BRAT settings
2. Click "Add Beta Plugin"
3. Paste URL: `https://github.com/MTQV002/LLM-Dictionary-Obsidian`
4. Click "Add Plugin"
5. Enable LLM Dictionary trong Community Plugins

### Bước 3: Cấu hình API
1. Đăng ký tài khoản miễn phí tại [Groq](https://console.groq.com/)
2. Tạo API key
3. Vào LLM Dictionary settings trong Obsidian
4. Paste API key vào trường "LLM API"

### Bước 4: Cài đặt hotkey
1. Vào Settings > Hotkeys
2. Tìm "LLM Dictionary: Look up"
3. Thiết lập phím tắt (khuyến nghị: Ctrl+D)

## Sử dụng

### Tra cứu từ vựng
1. Bôi đen từ/cụm từ cần tra
2. Nhấn phím tắt đã thiết lập
3. Kết quả hiển thị trong sidebar bên phải

### Lưu từ vựng
1. Sau khi tra cứu, chuyển sang tab "Save"
2. Cấu hình template và đường dẫn lưu
3. Click "Save" để tạo note

### Đồng bộ Anki (tùy chọn)
1. Cài đặt [AnkiConnect](https://ankiweb.net/shared/info/2055492159)
2. Bật "Save to Anki" trong settings
3. Cấu hình deck và note type
4. Click "Save to Anki"

## Template Fields

Các field có sẵn để tạo template:
- `{{Term}}` - Từ vựng
- `{{Definition}}` - Định nghĩa
- `{{IPA}}` - Phiên âm
- `{{Part_of_speech}}` - Từ loại
- `{{Example 1}}`, `{{Example 2}}`, `{{Example 3}}` - Ví dụ
- `{{Source}}` - Nguồn (link đến note gốc)
- `{{Audio}}` - File âm thanh
- `{{Example Audio 1}}`, `{{Example Audio 2}}`, `{{Example Audio 3}}` - Âm thanh ví dụ

## Yêu cầu hệ thống

- Obsidian v0.15.0+
- Kết nối internet (cho AI lookup)
- Anki + AnkiConnect (nếu sử dụng Anki sync)

## License

MIT License

## Đóng góp

Pull requests và issues được hoan nghênh tại [GitHub repository](https://github.com/MTQV002/LLM-Dictionary-Obsidian).




