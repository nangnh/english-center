/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Xuất site tĩnh (HTML/CSS/JS) để deploy lên Cloudflare Pages / host tĩnh bất kỳ.
  output: "export",
  // Static export không chạy trình tối ưu ảnh của Next tại runtime.
  images: { unoptimized: true },
  // Thêm dấu "/" cuối URL để host tĩnh phục vụ index.html cho mỗi route.
  trailingSlash: true,
};

export default nextConfig;
