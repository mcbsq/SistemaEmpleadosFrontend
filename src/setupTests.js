// jsdom no trae IntersectionObserver ni matchMedia; framer-motion
// (whileInView) y ThemeContext los usan. Versiones mínimas para pruebas.
if (typeof window.IntersectionObserver === "undefined") {
  window.IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
  };
}
if (typeof window.matchMedia === "undefined") {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
