/**
 * Browser API Polyfill
 * 让扩展同时兼容 Chrome 和 Firefox
 * 其实最主要的问题是 mainfest 版本支持问题
 */
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  // Chrome 环境：将 chrome 映射为 browser
  globalThis.browser = chrome;
} else if (typeof chrome === 'undefined' && typeof browser !== 'undefined') {
  // Firefox 环境：将 browser 映射为 chrome（保持代码兼容性）
  globalThis.chrome = browser;
}

