const WP = process.env.NEXT_PUBLIC_WP_ORIGIN ?? 'https://telegiganten.dk';

export default {
  async rewrites() {
    return {
      // kør INDEN alt andet
      beforeFiles: [
        { source: '/wp-json/:path*', destination: `${WP}/wp-json/:path*` },
      ],
      afterFiles: [],
      // hvis du har en SPA-fallback/catch-all, så lad den ligge her:
      fallback: [
        { source: '/:path*', destination: '/' }, // valgfri
      ],
    };
  },
};
