/**
 * Browser API Polyfill - 兼容 Chrome 和 Firefox
 */
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  globalThis.browser = chrome;
} else if (typeof chrome === 'undefined' && typeof browser !== 'undefined') {
  globalThis.chrome = browser;
}

chrome.runtime.sendMessage({type: "get-all-words"}, (response) => {
    console.log('收到消息',response)
    $('.total').text('共有：'+ response.length + ' 个生词')
    $('.words').text(response)
});