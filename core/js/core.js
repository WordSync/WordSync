/**
 * 
 * 划词事件
 * 定义划词后要处理的事件
 */

const tip = new Tip();

const DURATION = 100;

const [triggerTranslate, immediatelyStop] = debounce(async () => {

  // 获取选中文字 以及位置、宽高等信息
  let { rect, seleStr = "" } = getSelectPos();
  if (!seleStr.trim()) return tip.hide();

  // 英语单词正则
  let regx = /^[A-Za-z]+$/
  if (!regx.test(seleStr)) return tip.hide();

  // 检查扩展上下文是否有效
  if (chrome.runtime && chrome.runtime.id) {
    chrome.runtime.sendMessage({type: "translate",msg:seleStr}, function(response) {
      if (chrome.runtime.lastError) {
        console.error("扩展通信错误:", chrome.runtime.lastError);
        return;
      }
      console.log(response);
      const now = Date.now();
      tip.showEmptyView(rect, now);
      tip.showFromGoogleApi({ result: response, rect, now });
    });
  } else {
    console.error("扩展上下文无效，无法发送消息");
  }

});

// 监听 Option + W 快捷键 显示tip
document.addEventListener("keydown", (event) => {
    console.log("键盘事件:", event.key, "Alt:", event.altKey, "Meta:", event.metaKey, "Code:", event.code);
    
    // 检查是否按下 Option + W (Mac) 或 Alt + W (Windows/Linux)
    if ((event.altKey || event.metaKey) && event.code === 'KeyW') {
        console.log("组合键触发！");
        event.preventDefault(); // 阻止默认行为
        triggerTranslate();
    }
    
    // 备用快捷键: Ctrl + W (Windows/Linux) 或 Cmd + W (Mac)
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyW') {
        console.log("备用组合键触发！");
        event.preventDefault(); // 阻止默认行为
        triggerTranslate();
    }
    
    // 检查是否按下 Option + Q (Mac) 或 Alt + Q (Windows/Linux) - 输出单词列表
    if ((event.altKey || event.metaKey) && event.code === 'KeyQ') {
        console.log("输出单词列表快捷键触发！");
        event.preventDefault(); // 阻止默认行为
        outputWordsList();
        // 额外：输出 bbdc.cn cookies 便于排查
        if (chrome.runtime && chrome.runtime.id) {
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
        }
    }
});



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
  return {
    rect: range.getBoundingClientRect(),
    seleStr: range.toString()
  };
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
    // 检查扩展上下文是否有效
    if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({type: "add-words",msg:msg}, function(response) {
            if (chrome.runtime.lastError) {
                console.error("扩展通信错误:", chrome.runtime.lastError);
                return;
            }
            console.log(response);
        });
    } else {
        console.error("扩展上下文无效，无法发送消息");
    }
}

  // 添加单词
$('#add-words').on('click', function(){
    let { rect, seleStr = "" } = getSelectPos();
    sendMsg(seleStr);
    tip.hide();
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
    // 检查扩展上下文是否有效
    if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({type: "get-all-words"}, function(response) {
            if (chrome.runtime.lastError) {
                console.error("获取单词列表失败:", chrome.runtime.lastError);
                return;
            }
            
            if (response && Array.isArray(response)) {
                console.log("=== 我的单词库 ===");
                console.log(`总共有 ${response.length} 个单词:`);
                console.log("🔍 调试信息 - 原始响应:", response);
                
                if (response.length === 0) {
                    console.log("暂无单词，请先添加一些单词！");
                    console.log("💡 提示: 请先选择英文单词，按 Option + W，然后点击'添加单词'按钮");
                } else {
                    // 按字母顺序排序
                    const sortedWords = response.sort();
                    
                    // 按照wordList格式输出（逗号分隔）
                    const wordListString = sortedWords.join(',');
                    console.log("📝 单词列表格式:");
                    console.log(wordListString);
                    
                    // 执行bbdc提交逻辑
                    submitToBbdc(wordListString);
                }
                console.log("==================");
            } else {
                console.log("获取单词列表失败: 响应格式错误");
            }
        });
    } else {
        console.error("扩展上下文无效，无法获取单词列表");
    }
}

// 执行bbdc提交逻辑
function submitToBbdc(wordList) {
    console.log("🚀 开始执行bbdc提交逻辑...");
    
    // 生成当前时间戳作为描述和名称
    const timestamp = getCurrentTimestamp();
    const desc = timestamp;
    const name = timestamp;
    
    console.log(`📅 使用时间戳: ${timestamp}`);
    console.log(`📝 提交单词列表: ${wordList}`);
    
    // 发送消息到background script执行bbdc提交
    if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
            type: "submit-to-bbdc",
            wordList: wordList,
            desc: desc,
            name: name
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error("bbdc提交失败:", chrome.runtime.lastError);
                return;
            }
            
            if (response && response.success) {
                console.log("✅ bbdc提交成功!");
                console.log("📄 响应数据:", response.data);
            } else if (response && response.needLogin) {
                console.log("❌ 需要登录bbdc.cn");
                console.log("🔗 请先登录: https://bbdc.cn/index#");
                console.log("💡 登录后请重新按 Option + Q 提交单词");
                
                // 可选：显示用户友好的提示
                alert("请先登录不背单词网站 (bbdc.cn)，登录后重新按 Option + Q 提交单词");
            } else {
                const errMsg = (response && response.error) || '未知错误';
                console.log("❌ bbdc提交失败:", errMsg);
                // 对常见错误给出更清晰的提示
                if (typeof errMsg === 'string' && /未授权|登录|过期|401|403/.test(errMsg)) {
                    alert("登录状态失效，请在 bbdc.cn 重新登录后再试。");
                } else if (response && response.data && response.data.data_kind === 'exception_handler') {
                    const apiMsg = (response.data.error_body && (response.data.error_body.user_message || response.data.error_body.info)) || '服务异常，请稍后再试。';
                    alert(`提交失败：${apiMsg}`);
                } else {
                    alert(`提交失败：${errMsg}`);
                }
            }
        });
    } else {
        console.error("扩展上下文无效，无法执行bbdc提交");
    }
}

// 生成当前时间戳 (格式: YYYYMMDDHHMM)
function getCurrentTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
}


