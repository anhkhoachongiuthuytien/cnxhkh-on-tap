# Phòng ôn tập Chủ nghĩa xã hội khoa học

## Mở trên máy Windows

Nhấp đúp **Mo_quiz.cmd**. Trình duyệt mở ở **http://127.0.0.1:8766/**. Dùng cùng địa chỉ và cùng trình duyệt để giữ tiến độ.

Nếu máy không có Python, trình khởi động mở **index.html** trực tiếp. Bạn cũng có thể tự mở file này; câu hỏi và tài liệu vẫn hoạt động offline. Một số trình duyệt có thể hạn chế lưu tiến độ khi mở bằng file: hãy xuất bản sao sau khi học.

Không cần cài thư viện, đăng nhập hay mạng Internet để làm quiz. Các liên kết Google Docs và nguồn sách cần mạng.

## Cách sử dụng

1. Chọn chương và bấm **Bắt đầu luyện tập**. Mặc định là 50 câu, trộn thứ tự, giải thích ngay sau khi chọn đáp án.
2. Chọn **Kiểm tra** để chỉ xem lời giải sau khi nộp. Bạn có thể sửa đáp án trước khi nộp.
3. Dùng **Lưu câu**, **Câu sai** hoặc **Câu chưa làm** để ôn có trọng tâm. Sau mỗi lượt, kết quả chỉ ra các mục cần đọc lại.
4. Tab **Tài liệu** chứa đầy đủ tài liệu ôn tập chương 1–5, đã đóng gói offline.
5. Tab **Tiến độ** cho phép xuất/nhập bản sao JSON và xem lại 60 lượt học gần nhất. Nhập bản sao thay thế tiến độ đang có; hãy xuất trước khi nhập.

Phím **1–4**: chọn đáp án; **← / →**: chuyển câu. Không dùng phím tắt này khi đang thao tác trong hộp chọn.

## Chạy bằng lệnh nếu cần

Mở terminal trong thư mục này rồi chạy `python start_quiz.py`. Dùng `--no-open` nếu không muốn tự mở trình duyệt; `--port 8767` nếu cổng mặc định đang có ứng dụng khác.

Máy chủ chỉ lắng nghe trên 127.0.0.1. Có thể dừng tiến trình `start_quiz.py` của ứng dụng trong Task Manager hoặc Ctrl+C nếu chạy từ terminal. Mở lại bằng Mo_quiz.cmd để học tiếp.

## Nội dung

Đúng 250 câu, mỗi chương 50 câu: 12 nhận biết, 23 thông hiểu, 15 vận dụng. Mỗi câu có bốn lựa chọn, một đáp án đúng, lời giải và dẫn chương/mục. Câu hỏi/ví dụ do người biên soạn xây dựng theo giáo trình Bộ GDĐT, NXB Chính trị quốc gia Sự thật, 2021, hệ đại học không chuyên lý luận chính trị. Đây không phải đề thi chính thức.

Ứng dụng lưu dữ liệu trong localStorage của trình duyệt, không gửi kết quả lên Internet. Xóa dữ liệu trình duyệt hoặc chuyển địa chỉ/cổng sẽ tách kho tiến độ; dùng xuất/nhập để chuyển dữ liệu.

Phông chữ Be Vietnam Pro và Literata từ kho Google Fonts, giấy phép SIL Open Font License kèm trong thư mục fonts. Không dùng tài nguyên CDN.
