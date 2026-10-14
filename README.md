# ĐặtVé - Frontend

Giao diện đặt vé sự kiện cho backend NestJS ([BE_datve](https://github.com/lethanh2006/BE_datve)).
React 19 + TypeScript + Vite, React Router, TanStack Query; CSS thuần, hỗ trợ chế độ tối theo hệ điều hành.

## Tính năng

**Khách**
- Danh sách sự kiện: tìm kiếm, lọc thể loại, phân trang (trạng thái nằm trên URL nên Back/Forward và chia sẻ link đều đúng)
- Chi tiết sự kiện và các suất diễn kèm số ghế còn lại, giá thấp nhất
- Sơ đồ chọn ghế theo hàng và hạng ghế, tự làm mới 8 giây/lần; ghế vừa bị người khác giữ sẽ tự bỏ khỏi lựa chọn
- Giữ ghế 5 phút, đồng hồ đếm ngược chính xác theo giờ server (bù lệch đồng hồ máy)
- Thanh toán với `Idempotency-Key` (thử lại sau mất mạng dùng lại cùng key nên không bị trừ tiền hai lần), huỷ đơn
- Vé điện tử có mã QR (vẽ bằng SVG, đã kiểm chứng giải mã ra đúng mã vé) và mã đặt vé, in được; danh sách đơn của tôi theo trạng thái
- Đăng ký, đăng nhập (JWT); tự đăng xuất khi token hết hạn

**Quản trị** (tài khoản `ADMIN`)
- Tổng quan: doanh thu, vé đã bán, biểu đồ 14 ngày, đơn theo trạng thái, sự kiện bán chạy
- Thêm/sửa/xoá sự kiện; thêm suất diễn kèm sinh ghế theo khu (`A-D`, số ghế/hàng, giá); thêm ghế; xoá suất
- Danh sách mọi đơn kèm thông tin khách, lọc theo trạng thái và khách hàng
- Soát vé: nhập hoặc quét mã QR bằng máy quét (gõ phím + Enter), báo cho vào / vé đã quét / mã sai, lưu lịch sử lượt quét
- Giờ suất diễn luôn nhập/hiển thị theo múi giờ của sự kiện (mặc định `Asia/Ho_Chi_Minh`), không phụ thuộc múi giờ máy

## Chạy

Cần backend đang chạy (xem README của BE_datve), mặc định ở `http://localhost:8080`.

```bash
cp .env.example .env     # tuỳ chọn
npm install
npm run dev              # http://localhost:5173, tự chuyển tiếp /api sang backend
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server (proxy `/api` và `/actuator` sang `BACKEND_URL`) |
| `npm run build` | Kiểm tra kiểu rồi build ra `dist/` |
| `npm test` | Unit/component test (Vitest + Testing Library) |
| `npm run lint` | oxlint |

Tài khoản mẫu khi backend chạy `npm run seed`: `admin@datve.local / Admin@12345`, `user@datve.local / User@12345`.

## Docker

```bash
docker build -t datve-web .
docker run -p 8081:80 -e BACKEND_URL=http://host.docker.internal:8080 datve-web   # http://localhost:8081
```

Image gồm nginx phục vụ bản build, trả `index.html` cho mọi đường dẫn SPA, chuyển tiếp `/api/` sang `BACKEND_URL`, cache vô thời hạn cho `/assets/`, kèm header bảo mật và CSP (script chỉ từ chính site). Nếu FE và API ở hai domain khác nhau, build với `--build-arg VITE_API_BASE_URL=https://api.example.com` và đặt `CORS_ORIGINS` ở backend.

## Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `VITE_API_BASE_URL` | URL backend khi deploy tách domain (để trống = cùng origin). Backend cần cho phép origin của FE trong `CORS_ORIGINS` |
| `VITE_TIME_ZONE` | Múi giờ hiển thị giờ diễn, mặc định `Asia/Ho_Chi_Minh` |
| `BACKEND_URL` | Chỉ cho dev server: backend để proxy tới |

Khi deploy bản build tĩnh, web server cần (1) trả `index.html` cho mọi đường dẫn không phải file (SPA fallback) và (2) chuyển tiếp `/api` sang backend, hoặc đặt `VITE_API_BASE_URL`.

## Cấu trúc

```
src/
  api/         fetch client (ApiError, token, bù lệch giờ), kiểu dữ liệu, các endpoint
  auth/        AuthProvider, RequireAuth (chặn theo đăng nhập/vai trò)
  components/  SeatMap, Countdown, Modal, Pagination, Toast...
  pages/       trang công khai, đặt vé, vé của tôi; pages/admin/ (tách chunk riêng)
  lib/         định dạng tiền/ngày, xử lý ghế, parse hàng ghế... (có test)
  styles/      design token, thành phần, trang
  test/        tiện ích test (mock fetch, render có đủ provider)
```

## Ghi chú thiết kế

- Token JWT lưu ở `localStorage` để giữ phiên khi tải lại trang; mọi dữ liệu hiển thị đều được React escape, không dùng `dangerouslySetInnerHTML`.
- Ghế và giá hiển thị chỉ để xem; số tiền thật do server tính từ DB khi giữ ghế và khi thanh toán.
- Ô "Giả lập thanh toán thất bại" chỉ có ở dev server (`import.meta.env.DEV`) và chỉ có tác dụng khi backend bật `PAYMENT_ALLOW_SIMULATION`.
