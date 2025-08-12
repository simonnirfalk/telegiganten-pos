// src/polyfills/proxyFetchShim.js
// Omskriv gamle fulde WP-kald til relative stier, så Vite-proxyen tager over.
// Berører KUN kald som bruger URL-string. Påvirker ikke allerede proxiede/apiClient-kald.

(function () {
  const WP_HOST_RE = /^https?:\/\/telegiganten\.dk(\/wp-json\/.*)$/i;

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    try {
      // Kun hvis input er en string (ikke Request-objekt)
      if (typeof input === 'string') {
        const m = input.match(WP_HOST_RE);
        if (m && m[1]) {
          // Omskriv fuld URL -> relativ /wp-json/...
          const rewritten = m[1];
          // console.debug('[shim] rewrite', input, '->', rewritten);
          return origFetch.call(this, rewritten, init);
        }
      }
    } catch (e) {
      // fald tilbage til original fetch
    }
    return origFetch.call(this, input, init);
  };
})();
