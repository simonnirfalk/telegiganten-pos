/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const WP = process.env.NEXT_PUBLIC_WP_ORIGIN || 'https://telegiganten.dk';
    return [
      { source: '/wp-json/:path*', destination: `${WP}/wp-json/:path*` },
      { source: '/wp-content/:path*', destination: `${WP}/wp-content/:path*` }, // valgfrit
      { source: '/wp-admin/admin-ajax.php', destination: `${WP}/wp-admin/admin-ajax.php` }, // valgfrit
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'telegiganten.dk' }], // hvis I bruger next/image
  },
};
module.exports = nextConfig;
