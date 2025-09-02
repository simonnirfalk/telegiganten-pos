/** @type {import('next').NextConfig} */
export default {
  async rewrites() {
    const WP = process.env.NEXT_PUBLIC_WP_ORIGIN || 'https://telegiganten.dk';
    return [
      { source: '/wp-json/:path*', destination: `${WP}/wp-json/:path*` },
    ];
  },
};
