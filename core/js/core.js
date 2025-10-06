/**
 * 
 * 划词事件
 * 定义划词后要处理的事件
 */

const tip = new Tip();

const DURATION = 100;

/**
 * 检查扩展上下文是否有效
 */
function isExtensionContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

/**
 * 安全地发送消息到 background
 */
function safeSendMessage(message, callback) {
  if (!isExtensionContextValid()) {
    console.warn('Extension context is invalid. Please refresh the page.');
    if (typeof Toast !== 'undefined') {
      Toast.warning('Extension Reloaded', 'Please refresh this page (F5) to use the extension', 5000);
    }
    return false;
  }
  
  try {
    chrome.runtime.sendMessage(message, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Extension communication error:', chrome.runtime.lastError.message);
        if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          if (typeof Toast !== 'undefined') {
            Toast.warning('Extension Reloaded', 'Please refresh this page (F5)', 5000);
          }
        }
        if (callback) callback(null);
        return;
      }
      if (callback) callback(response);
    });
    return true;
  } catch (e) {
    console.error('Failed to send message:', e);
    return false;
  }
}

/**
 * Toast 消息提示功能
 */
const Toast = {
  container: null,
  
  // 初始化容器
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'wordsync-toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  // 显示 Toast
  show(options) {
    this.init();
    
    const {
      type = 'info',  // success, error, info, warning
      title = '',
      message = '',
      duration = 3000,
      closable = true
    } = options;
    
    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `wordsync-toast ${type}`;
    
    // 图标
    const iconMap = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };
    
    // 构建内容
    toast.innerHTML = `
      <div class="wordsync-toast-icon">${iconMap[type] || 'ℹ'}</div>
      <div class="wordsync-toast-content">
        ${title ? `<div class="wordsync-toast-title">${title}</div>` : ''}
        ${message ? `<div class="wordsync-toast-message">${message}</div>` : ''}
      </div>
      ${closable ? '<button class="wordsync-toast-close">×</button>' : ''}
    `;
    
    this.container.appendChild(toast);
    
    // 添加关闭按钮事件
    if (closable) {
      const closeBtn = toast.querySelector('.wordsync-toast-close');
      closeBtn.addEventListener('click', () => {
        this.hide(toast);
      });
    }
    
    // 延迟显示（触发动画）
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // 自动隐藏
    if (duration > 0) {
      setTimeout(() => {
        this.hide(toast);
      }, duration);
    }
    
    return toast;
  },
  
  // 隐藏 Toast
  hide(toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },
  
  // 快捷方法
  success(title, message, duration) {
    return this.show({ type: 'success', title, message, duration });
  },
  
  error(title, message, duration) {
    return this.show({ type: 'error', title, message, duration });
  },
  
  info(title, message, duration) {
    return this.show({ type: 'info', title, message, duration });
  },
  
  warning(title, message, duration) {
    return this.show({ type: 'warning', title, message, duration });
  }
};

const [triggerTranslate, immediatelyStop] = debounce(async () => {

  // 获取选中文字 以及位置、宽高等信息
  let { rect, seleStr = "" } = getSelectPos();
  if (!seleStr.trim()) return tip.hide();

  // 英语单词正则
  let regx = /^[A-Za-z]+$/
  if (!regx.test(seleStr)) return tip.hide();

  // 使用安全的消息发送方法
  const sent = safeSendMessage(
    {type: "translate", msg: seleStr, provider: tip.getProvider()}, 
    function(response) {
      if (!response) return;
      console.log(response);
      const now = Date.now();
      tip.showEmptyView(rect, now);
      if (response && response.provider) {
        tip.showByProvider({ provider: response.provider, payload: response.payload, rect, now });
      } else {
        tip.showByProvider({ provider: 'iciba', payload: response, rect, now });
      }
    }
  );
  
  if (!sent) {
    tip.hide();
  }

});

// 监听 Option + W 快捷键 显示tip
document.addEventListener("keydown", (event) => {
    console.log("键盘事件:", event.key, "Alt:", event.altKey, "Meta:", event.metaKey, "Code:", event.code);
    
    // 严格匹配 Alt/Option + W，避免被页面快捷键覆盖或误拦截 Cmd+W
    const isAltW = event.altKey && !event.metaKey && !event.ctrlKey &&
                   (event.code === 'KeyW' || (event.key && event.key.toLowerCase() === 'w'));
    if (isAltW) {
        console.log("组合键触发！");
        event.preventDefault(); // 阻止默认行为
        triggerTranslate();
    }
    
    // 检查是否按下 Option + A (Mac) 或 Alt + A (Windows/Linux) - 添加单词
    const isAltA = event.altKey && !event.metaKey && !event.ctrlKey &&
                   (event.code === 'KeyA' || (event.key && event.key.toLowerCase() === 'a'));
    if (isAltA) {
        console.log("添加单词快捷键触发！");
        event.preventDefault(); // 阻止默认行为
        addSelectedWord();
    }
    
    // 检查是否按下 Option + Q (Mac) 或 Alt + Q (Windows/Linux) - 输出单词列表
    if ((event.altKey || event.metaKey) && event.code === 'KeyQ') {
        console.log("输出单词列表快捷键触发！");
        event.preventDefault(); // 阻止默认行为
        outputWordsList();
        // 额外：输出 bbdc.cn cookies 便于排查
        if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
            chrome.runtime.sendMessage({type: 'log-bbdc-cookies'}, function(res){
                if (chrome.runtime.lastError) {
                    console.error('读取 bbdc cookies 失败:', chrome.runtime.lastError);
                    return;
                }
                if (res && res.success) {
                    console.log('[来自 background 的 bbdc cookies]', res.cookieString);
                } else {
                    console.log('读取 bbdc cookies 失败:', res ? res.error : '未知错误');
                }
            });
            // 同时获取结构化 payload，便于直接注入到 bbdc.js 客户端
            chrome.runtime.sendMessage({type: 'get-bbdc-cookies'}, function(res){
                if (res && res.success) {
                    console.log('[bbdc cookies object]', res.cookies);
                }
            });
        }
    }
    
    // 检查是否按下 Option + S (Mac) 或 Alt + S (Windows/Linux) - 启动 OCR 截图
    if (event.altKey && !event.metaKey && !event.ctrlKey && event.code === 'KeyS') {
        console.log("OCR 截图快捷键触发！");
        event.preventDefault(); // 阻止默认行为
        if (typeof ocrCapture !== 'undefined') {
            ocrCapture.startCapture();
        } else {
            console.error('OCR module not loaded');
            Toast.error('OCR Not Available', 'OCR module failed to load');
        }
    }
}, true);



// 监听鼠标按下隐藏tip
document.body.addEventListener("mousedown", () => {
	immediatelyStop()
	tip.hide()
});
// 当滑动时隐藏tip
document.addEventListener("scroll", () => {
  tip.hide();
});

function getSelectPos() {
  let selection = window.getSelection();
  if (!selection.rangeCount) return {};
  let range = selection.getRangeAt(0);
  
  // 获取选中的文本
  const seleStr = range.toString();
  
  // 获取上下文：前后各 100 个字符
  const context = getContextAroundSelection(range, 100);
  
  return {
    rect: range.getBoundingClientRect(),
    seleStr: seleStr,
    context: context,
    url: window.location.href
  };
}

// 获取选中文本周围的上下文
function getContextAroundSelection(range, contextLength = 100) {
  try {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    // 获取包含选中文本的完整文本节点
    let fullText = '';
    let selectedStart = 0;
    let selectedEnd = 0;
    
    // 尝试获取父元素的完整文本
    const parentElement = range.commonAncestorContainer;
    if (parentElement.nodeType === Node.TEXT_NODE) {
      fullText = parentElement.textContent || '';
      selectedStart = range.startOffset;
      selectedEnd = range.endOffset;
    } else if (parentElement.textContent) {
      fullText = parentElement.textContent;
      // 近似计算选中位置
      const selectedText = range.toString();
      selectedStart = fullText.indexOf(selectedText);
      selectedEnd = selectedStart + selectedText.length;
    }
    
    // 如果找不到，返回选中的文本本身
    if (selectedStart < 0) {
      return range.toString();
    }
    
    // 提取前后文本
    const before = fullText.substring(
      Math.max(0, selectedStart - contextLength), 
      selectedStart
    );
    const selected = fullText.substring(selectedStart, selectedEnd);
    const after = fullText.substring(
      selectedEnd, 
      Math.min(fullText.length, selectedEnd + contextLength)
    );
    
    return `${before}【${selected}】${after}`;
  } catch (e) {
    console.error('获取上下文失败:', e);
    return range.toString();
  }
}
function debounce(fun) {
    let timer = null;
    return [
      function() {
          clearTimeout(timer);
          timer = setTimeout(function() {
              fun.call();
          }, DURATION);
      }, 
      function () { 
          clearTimeout(timer) 
      }
    ] 
}

function sendMsg(msg){
    safeSendMessage({type: "add-words", msg: msg}, function(response) {
        if (response) {
            console.log(response);
        }
    });
}

// 添加选中单词的函数（用于快捷键）
function addSelectedWord() {
    let { rect, seleStr = "", context = "", url = "" } = getSelectPos();
    
    if (!seleStr.trim()) {
        console.log("没有选中任何文本");
        return;
    }
    
    // 英语单词正则
    let regx = /^[A-Za-z]+$/
    if (!regx.test(seleStr)) {
        console.log("选中的文本不是有效的英文单词:", seleStr);
        return;
    }
    
    console.log('正在使用 AI 分析词形...');
    
    // 发送到 background 进行 AI 处理
    safeSendMessage({
        type: "lemmatize-word",
        word: seleStr,
        context: context,
        url: url
    }, function(response) {
        if (!response) {
            // 扩展上下文失效，直接保存原词
            Toast.error('Add Failed', 'Extension context invalid');
            sendMsg(seleStr);
            
            // 更新高亮显示
            updateHighlightingAfterAdd(seleStr);
        } else if (response.success) {
            console.log(`✅ 词形还原成功: ${seleStr} → ${response.lemma}`);
            console.log(`📝 上下文: ${context}`);
            
            // 显示成功提示
            const displayWord = response.lemma !== seleStr 
                ? `${seleStr} → ${response.lemma}` 
                : response.lemma;
            Toast.success('Word Added', displayWord, 2500);
            
            // 保存还原后的词
            sendMsg(response.lemma);
            
            // 更新高亮显示
            updateHighlightingAfterAdd(response.lemma);
        } else {
            console.warn("AI 词形还原返回异常，保存原词:", response);
            Toast.warning('Word Added', seleStr + ' (original form)', 2500);
            sendMsg(seleStr);
            
            // 更新高亮显示
            updateHighlightingAfterAdd(seleStr);
        }
    });
    
    tip.hide();
}

// 添加单词按钮点击事件
$('#add-words').on('click', function(){
    addSelectedWord();
})

// 播放音频
$('#play-audio').on('click', function(){
    let { seleStr = "" } = getSelectPos();
    if (seleStr.trim()) {
        playAudio(seleStr);
    }
})

// 音频播放函数
function playAudio(word) {
    // 使用 Google TTS API 播放发音
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    
    // 播放音频
    speechSynthesis.speak(utterance);
    
    console.log('播放音频:', word);
}

// 输出单词列表到控制台并执行bbdc提交
function outputWordsList() {
    safeSendMessage({type: "get-all-words"}, function(response) {
        if (!response) {
            console.error("获取单词列表失败: Extension context invalid");
            return;
        }
            
            if (response && Array.isArray(response)) {
                console.log("=== 我的单词库 ===");
                console.log(`总共有 ${response.length} 个单词:`);
                console.log("🔍 调试信息 - 原始响应:", response);
                
                if (response.length === 0) {
                    console.log("暂无单词，请先添加一些单词！");
                    console.log("💡 提示: 请先选择英文单词，按 Option + W，然后点击'添加单词'按钮");
                    Toast.info('No Words', 'Please add some words first', 3000);
                } else {
                    // 按字母顺序排序
                    const sortedWords = response.sort();
                    
                    // 按照wordList格式输出（逗号分隔）
                    const wordListString = sortedWords.join(',');
                    console.log("📝 单词列表格式:");
                    console.log(wordListString);
                    
                    // 显示提交中提示
                    Toast.info('Submitting', `Submitting ${response.length} words to BBDC...`, 2000);
                    
                    // 执行bbdc提交逻辑
                    submitToBbdc(wordListString);
                }
                console.log("==================");
            } else {
                console.log("获取单词列表失败: 响应格式错误");
            }
    });
}

// 执行bbdc提交逻辑
function submitToBbdc(wordList) {
    console.log("🚀 开始执行bbdc提交逻辑...");
    
    // 生成当前时间戳作为描述和名称
    const timestamp = getCurrentTimestamp();
    const desc = timestamp;
    const name = 'wordsync';
    
    console.log(`📅 使用时间戳: ${timestamp}`);
    console.log(`📝 提交单词列表: ${wordList}`);
    
    // 发送消息到background script执行bbdc提交
    safeSendMessage({
        type: "submit-to-bbdc",
        wordList: wordList,
        desc: desc,
        name: name
    }, function(response) {
        if (!response) {
            console.error("bbdc提交失败: Extension context invalid");
            Toast.error('Submit Failed', 'Please refresh the page');
            return;
        }
            
            if (response && response.success) {
                console.log("✅ bbdc提交成功!");
                console.log("📄 响应数据:", response.data);
                Toast.success('Submit Success', 'Words successfully submitted to BBDC', 3000);
            } else if (response && response.needLogin) {
                console.log("❌ 需要登录bbdc.cn");
                console.log("🔗 请先登录: https://bbdc.cn/index#");
                console.log("💡 登录后请重新按 Option + Q 提交单词");
                
                Toast.warning('Login Required', 'Please login to bbdc.cn first', 4000);
            } else {
                const errMsg = (response && response.error) || 'Unknown error';
                console.log("❌ bbdc提交失败:", errMsg);
                
                // 对常见错误给出更清晰的提示
                if (typeof errMsg === 'string' && /未授权|登录|过期|401|403/.test(errMsg)) {
                    Toast.error('Submit Failed', 'Login expired, please re-login', 4000);
                } else if (response && response.data && response.data.data_kind === 'exception_handler') {
                    const apiMsg = (response.data.error_body && (response.data.error_body.user_message || response.data.error_body.info)) || 'Service error';
                    Toast.error('Submit Failed', apiMsg, 4000);
                } else {
                    Toast.error('Submit Failed', errMsg, 4000);
                }
            }
    });
}

// 生成当前时间戳 (格式: wordsync + Unix时间戳)
function getCurrentTimestamp() {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    return `wordsync${unixTimestamp}`;
}

// === 单词高亮功能 ===
let addedWords = new Set();
let isHighlightingEnabled = true;

// 获取单词的各种变体形式（正向生成）
function getWordVariants(word) {
    const variants = new Set([word.toLowerCase()]);
    
    // 添加原词
    variants.add(word);
    variants.add(word.toLowerCase());
    variants.add(word.toUpperCase());
    
    // 处理常见的词形变化
    const lowerWord = word.toLowerCase();
    
    // 复数形式 (简单规则)
    if (!lowerWord.endsWith('s')) {
        variants.add(lowerWord + 's');
        variants.add(lowerWord + 'es');
    }
    
    // 过去式/过去分词 (简单规则)
    if (lowerWord.endsWith('e')) {
        variants.add(lowerWord + 'd');
    } else if (lowerWord.endsWith('y')) {
        variants.add(lowerWord.slice(0, -1) + 'ied');
    } else if (lowerWord.endsWith('c')) {
        variants.add(lowerWord + 'ked');
    } else {
        variants.add(lowerWord + 'ed');
    }
    
    // 现在分词
    if (lowerWord.endsWith('e')) {
        variants.add(lowerWord + 'ing');
    } else if (lowerWord.endsWith('y')) {
        variants.add(lowerWord + 'ing');
    } else if (lowerWord.endsWith('c')) {
        variants.add(lowerWord + 'king');
    } else {
        variants.add(lowerWord + 'ing');
    }
    
    // 比较级/最高级
    if (lowerWord.endsWith('y')) {
        variants.add(lowerWord.slice(0, -1) + 'ier');
        variants.add(lowerWord.slice(0, -1) + 'iest');
    } else if (lowerWord.endsWith('e')) {
        variants.add(lowerWord + 'r');
        variants.add(lowerWord + 'st');
    } else {
        variants.add(lowerWord + 'er');
        variants.add(lowerWord + 'est');
    }
    
    // 第三人称单数
    if (lowerWord.endsWith('s') || lowerWord.endsWith('sh') || lowerWord.endsWith('ch') || lowerWord.endsWith('x') || lowerWord.endsWith('z')) {
        variants.add(lowerWord + 'es');
    } else if (lowerWord.endsWith('y')) {
        variants.add(lowerWord.slice(0, -1) + 'ies');
    } else {
        variants.add(lowerWord + 's');
    }
    
    return Array.from(variants);
}

// 获取单词的原始形式（反向推导）
function getWordRoots(word) {
    const roots = new Set([word.toLowerCase()]);
    const lowerWord = word.toLowerCase();
    
    // 处理复数形式还原
    if (lowerWord.endsWith('ies')) {
        // studies -> study
        roots.add(lowerWord.slice(0, -3) + 'y');
    } else if (lowerWord.endsWith('es')) {
        // 检查是否是复数形式
        const withoutEs = lowerWord.slice(0, -2);
        if (withoutEs.endsWith('s') || withoutEs.endsWith('sh') || withoutEs.endsWith('ch') || 
            withoutEs.endsWith('x') || withoutEs.endsWith('z')) {
            // classes -> class, boxes -> box
            roots.add(withoutEs);
        } else {
            // 普通复数形式
            roots.add(withoutEs);
        }
    } else if (lowerWord.endsWith('s') && lowerWord.length > 3) {
        // 简单复数形式：traders -> trader
        roots.add(lowerWord.slice(0, -1));
    }
    
    // 处理过去式还原
    if (lowerWord.endsWith('ied')) {
        // studied -> study
        roots.add(lowerWord.slice(0, -3) + 'y');
    } else if (lowerWord.endsWith('ed')) {
        const withoutEd = lowerWord.slice(0, -2);
        if (withoutEd.endsWith('e')) {
            // played -> play
            roots.add(withoutEd);
        } else {
            // worked -> work
            roots.add(withoutEd);
        }
    }
    
    // 处理现在分词还原
    if (lowerWord.endsWith('ying')) {
        // studying -> study
        roots.add(lowerWord.slice(0, -4) + 'y');
    } else if (lowerWord.endsWith('ing')) {
        const withoutIng = lowerWord.slice(0, -3);
        if (withoutIng.endsWith('e')) {
            // playing -> play
            roots.add(withoutIng);
        } else {
            // working -> work
            roots.add(withoutIng);
        }
    }
    
    // 处理比较级/最高级还原
    if (lowerWord.endsWith('iest')) {
        // happiest -> happy
        roots.add(lowerWord.slice(0, -4) + 'y');
    } else if (lowerWord.endsWith('ier')) {
        // happier -> happy
        roots.add(lowerWord.slice(0, -3) + 'y');
    } else if (lowerWord.endsWith('est')) {
        // biggest -> big
        roots.add(lowerWord.slice(0, -3));
    } else if (lowerWord.endsWith('er')) {
        // bigger -> big
        roots.add(lowerWord.slice(0, -2));
    }
    
    return Array.from(roots);
}

// 检查单词是否在已添加列表中
function isWordAdded(word) {
    const lowerWord = word.toLowerCase();
    
    // 直接检查
    if (addedWords.has(lowerWord)) {
        return true;
    }
    
    // 检查当前单词的变体是否在已添加列表中
    const variants = getWordVariants(word);
    if (variants.some(variant => addedWords.has(variant.toLowerCase()))) {
        return true;
    }
    
    // 检查当前单词的原始形式是否在已添加列表中
    const roots = getWordRoots(word);
    if (roots.some(root => addedWords.has(root.toLowerCase()))) {
        return true;
    }
    
    // 检查已添加单词的变体是否包含当前单词
    for (const addedWord of addedWords) {
        const addedVariants = getWordVariants(addedWord);
        if (addedVariants.includes(lowerWord)) {
            return true;
        }
    }
    
    return false;
}

// 高亮页面中的单词
function highlightWords() {
    if (!isHighlightingEnabled) return;
    
    // 获取页面中的所有文本节点
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // 跳过已经在高亮元素内的文本节点
                if (node.parentElement && node.parentElement.classList.contains('bbdc-highlighted')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // 跳过脚本和样式标签
                const tagName = node.parentElement?.tagName?.toLowerCase();
                if (tagName === 'script' || tagName === 'style' || tagName === 'code' || tagName === 'pre') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const words = text.match(/\b[A-Za-z]+\b/g);
        
        if (words && words.length > 0) {
            let hasHighlightedWords = false;
            let newHTML = text;
            
            words.forEach(word => {
                if (isWordAdded(word)) {
                    hasHighlightedWords = true;
                    newHTML = newHTML.replace(
                        new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                        `<span class="bbdc-highlighted">${word}</span>`
                    );
                }
            });
            
            if (hasHighlightedWords) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = newHTML;
                textNode.parentNode.replaceChild(wrapper, textNode);
            }
        }
    });
}

// 加载已添加的单词
function loadAddedWords() {
    if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({type: "get-all-words"}, function(response) {
            if (chrome.runtime.lastError) {
                console.error("获取单词列表失败:", chrome.runtime.lastError);
                return;
            }
            
            if (response && Array.isArray(response)) {
                addedWords.clear();
                response.forEach(word => {
                    if (word && typeof word === 'string') {
                        addedWords.add(word.toLowerCase());
                    }
                });
                console.log(`[单词高亮] 加载了 ${addedWords.size} 个单词`);
                
                // 重新高亮页面
                highlightWords();
            }
        });
    }
}

// 添加单词后更新高亮
function updateHighlightingAfterAdd(word) {
    if (word && typeof word === 'string') {
        addedWords.add(word.toLowerCase());
        console.log(`[单词高亮] 添加新单词: ${word}`);
        
        // 重新高亮页面
        setTimeout(() => {
            highlightWords();
        }, 100);
    }
}

// 页面加载完成后初始化高亮功能
function initWordHighlighting() {
    // 加载已添加的单词
    loadAddedWords();
    
    // 监听页面变化（动态内容）
    const observer = new MutationObserver(function(mutations) {
        let shouldRehighlight = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldRehighlight = true;
            }
        });
        
        if (shouldRehighlight) {
            setTimeout(() => {
                highlightWords();
            }, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('[单词高亮] 初始化完成');
}

// 在页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWordHighlighting);
} else {
    initWordHighlighting();
}


