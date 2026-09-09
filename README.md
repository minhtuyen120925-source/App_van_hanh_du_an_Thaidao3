# Web vận hành Dự án Khu đô thị số 3 Thái Đào

Website dashboard theo dõi, quản lý và vận hành Dự án Khu đô thị số 3 Thái Đào.
Toàn bộ chạy tĩnh (HTML/CSS/JS thuần + Chart.js qua CDN), không cần backend.

## Cấu trúc

```
index.html                       Trang chính – 13 tab dashboard
assets/css/dashboard.css         Toàn bộ giao diện trang chính
assets/js/dashboard.js           Dữ liệu + logic dựng biểu đồ, bảng, Gantt
pages/hieu-qua-thi-cong.html     Tab "Hiệu quả thi công"
pages/thu-vien-bao-cao.html      Tab "Thư viện BC gửi CQNN"
pages/san-luong-chi-tiet.html    Tab "Sản lượng chi tiết" (618 công tác)
pages/lai-lo-thuc-chi.html       Tab "Lãi/Lỗ PP Thực chi"
```

Bốn trang trong `pages/` là các trang độc lập, mở trực tiếp được, đồng thời
được nhúng vào trang chính bằng `<iframe>`.

## Chạy tại máy

```bash
python -m http.server 5173
```

Mở http://localhost:5173

## Cập nhật số liệu

Sửa các mảng dữ liệu ở đầu `assets/js/dashboard.js`. Ô nền vàng trên dashboard
là dữ liệu đang chờ cập nhật.

## Xuất bản

Repo đã sẵn sàng cho GitHub Pages: bật Pages với nguồn là nhánh `main`, thư mục
gốc `/`. File `.nojekyll` giữ nguyên cấu trúc thư mục khi build.
