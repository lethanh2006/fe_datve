# Hình ảnh giao diện

- Asset: `public/images/live-stage.webp` (112 KB), dùng trang trí banner trang chủ.
- Tạo bằng công cụ imagegen tích hợp ngày 15/10/2026, chuyển sang WebP chất lượng 82 để giảm dung lượng tải. Không dùng API/CLI dự phòng.
- Đây là cảnh sân khấu minh hoạ, không đại diện cho sự kiện hoặc nghệ sĩ cụ thể. Thông tin sự kiện trên giao diện vẫn lấy từ API.
- Ảnh gốc được giữ trong thư mục `generated_images` của Codex; bản dùng khi triển khai nằm trong repo.

Prompt đã dùng:

```text
Use case: photorealistic-natural. Asset type: decorative hero photograph for a Vietnamese event ticket booking website, no specific real event. Wide panoramic landscape composition, concert audience silhouettes in the lower third, a distant live music stage with elegant violet, lavender and warm amber spotlights cutting through atmospheric haze, a few hands raised, expansive dark midnight purple negative space in the upper left for HTML headline overlay. Cinematic editorial concert photography, credible natural stage lighting, fine film grain, understated premium mood, immersive and joyful. No readable text, no logos, no watermarks, no recognizable celebrities, no UI elements. Main illuminated stage toward the right half, left half dark and quiet. Generate 1536x1024 or wider.
```
