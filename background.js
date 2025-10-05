/***
 * 
 * 翻译 API
 */
 const baiduApi = 'https://sp1.baidu.com/5b11fzupBgM18t7jm9iCKT-xh_/sensearch/selecttext'
 const googleApi = 'https://translate.google.cn/translate_a/single'
 const icibaApi = 'https://dict-mobile.iciba.com/interface/index.php'

/***
 * 
 * 词形还原库初始化
 */
// 简化版内嵌词形还原器（避免需要额外加载文件）
class SimpleLemmatizer {
  constructor() {
    // 不规则动词映射表（常用的）
    this.irregularVerbs = {
      'was': 'be', 'were': 'be', 'been': 'be', 'being': 'be', 'am': 'be', 'is': 'be', 'are': 'be',
      'had': 'have', 'has': 'have', 'having': 'have',
      'did': 'do', 'does': 'do', 'doing': 'do', 'done': 'do',
      'went': 'go', 'gone': 'go', 'going': 'go', 'goes': 'go',
      'got': 'get', 'gotten': 'get', 'getting': 'get', 'gets': 'get',
      'made': 'make', 'making': 'make', 'makes': 'make',
      'said': 'say', 'saying': 'say', 'says': 'say',
      'took': 'take', 'taken': 'take', 'taking': 'take', 'takes': 'take',
      'came': 'come', 'coming': 'come', 'comes': 'come',
      'saw': 'see', 'seen': 'see', 'seeing': 'see', 'sees': 'see',
      'knew': 'know', 'known': 'know', 'knowing': 'know', 'knows': 'know',
      'thought': 'think', 'thinking': 'think', 'thinks': 'think',
      'found': 'find', 'finding': 'find', 'finds': 'find',
      'gave': 'give', 'given': 'give', 'giving': 'give', 'gives': 'give',
      'told': 'tell', 'telling': 'tell', 'tells': 'tell',
      'became': 'become', 'becoming': 'become', 'becomes': 'become',
      'left': 'leave', 'leaving': 'leave', 'leaves': 'leave',
      'felt': 'feel', 'feeling': 'feel', 'feels': 'feel',
      'brought': 'bring', 'bringing': 'bring', 'brings': 'bring',
      'began': 'begin', 'begun': 'begin', 'beginning': 'begin', 'begins': 'begin',
      'kept': 'keep', 'keeping': 'keep', 'keeps': 'keep',
      'wrote': 'write', 'written': 'write', 'writing': 'write', 'writes': 'write',
      'ran': 'run', 'running': 'run', 'runs': 'run',
      'ate': 'eat', 'eaten': 'eat', 'eating': 'eat', 'eats': 'eat',
      'spoke': 'speak', 'spoken': 'speak', 'speaking': 'speak', 'speaks': 'speak',
      'fell': 'fall', 'fallen': 'fall', 'falling': 'fall', 'falls': 'fall',
      'bought': 'buy', 'buying': 'buy', 'buys': 'buy',
      'caught': 'catch', 'catching': 'catch', 'catches': 'catch',
      'flew': 'fly', 'flown': 'fly', 'flying': 'fly', 'flies': 'fly'
    };
    
    // 不规则复数映射表
    this.irregularPlurals = {
      'children': 'child', 'men': 'man', 'women': 'woman', 'people': 'person',
      'feet': 'foot', 'teeth': 'tooth', 'mice': 'mouse', 'geese': 'goose'
    };
  }

  lemmatize(word) {
    if (!word || typeof word !== 'string') return word;
    const lowerWord = word.toLowerCase().trim();
    
    // 检查不规则形式
    if (this.irregularVerbs[lowerWord]) return this.irregularVerbs[lowerWord];
    if (this.irregularPlurals[lowerWord]) return this.irregularPlurals[lowerWord];
    
    // 应用规则
    if (lowerWord.length <= 3) return lowerWord;
    
    // -ies -> -y (studies -> study)
    if (lowerWord.endsWith('ies') && lowerWord.length > 4) {
      return lowerWord.slice(0, -3) + 'y';
    }
    
    // -es -> base (watches -> watch)
    if (lowerWord.endsWith('es') && lowerWord.length > 3) {
      const base = lowerWord.slice(0, -2);
      if (base.endsWith('ch') || base.endsWith('sh') || base.endsWith('x') || base.endsWith('s')) {
        return base;
      }
    }
    
    // -s -> base (cats -> cat)
    if (lowerWord.endsWith('s') && lowerWord.length > 3 && !lowerWord.endsWith('ss')) {
      return lowerWord.slice(0, -1);
    }
    
    // -ed -> base (played -> play)
    if (lowerWord.endsWith('ed') && lowerWord.length > 4) {
      const base = lowerWord.slice(0, -2);
      // 双写辅音 (stopped -> stop)
      if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
        return base.slice(0, -1);
      }
      return base;
    }
    
    // -ing -> base (playing -> play)
    if (lowerWord.endsWith('ing') && lowerWord.length > 5) {
      const base = lowerWord.slice(0, -3);
      // 双写辅音 (running -> run)
      if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
        return base.slice(0, -1);
      }
      return base;
    }
    
    return lowerWord;
  }
}

const lemmatizer = new SimpleLemmatizer();
 
 class Http {
   constructor() {
     this.chineseReg = /^[\u4e00-\u9fa5]+$/
   }

   async fetchFromIciba(word){
        const url = this.getCompleteUrl({baseUrl: icibaApi, params:{
            c: 'word',
            m: 'getsuggest',
            is_need_mean:   '1',
            word: word
        }})
        const response = await fetch(url, {
                method: 'GET'
            })

        return await response.json()
   }

   async fetchFromBaidu(params) {
     !this.baiduApi && (this.baiduApi = baiduApi)
     !params._ && (params._ = Date.now())
     const url = this.getCompleteUrl({ baseUrl: this.baiduApi, params })
     const response = await fetch(url, {
       method: 'GET'
     })
     return await response.json()
   }
 
   async fetchFromGoogle({ word }) {
     if (!this.googleApi) this.googleApi = googleApi
     let [sl, tl] = ['zh-CN', 'en']
     if (!this.chineseReg.test(word.trim())) [sl, tl] = [tl, sl]
     const url = this.getCompleteUrl({ baseUrl: this.googleApi, params: {
       client: 'gtx',
       sl,
       tl,
       hl: 'zh-CN',
       dt: 'at',
       dt: 'bd',
       dt: 'ex',
       dt: 'ld',
       dt: 'md',
       dt: 'qca',
       dt: 'rw',
       dt: 'rm',
       dt: 'ss',
       dt: 't',
       ie: 'UTF-8',
       oe: 'UTF-8',
       source: 'btn',
       ssel: '3',
       tsel: '6',
       kc: '0',
       tk: '984327.619449',
       q: word,
     }})

     console.log(url)
     const response = await fetch(url, {
       method: 'GET'
     })
     return await response.json().catch(() => ({}))
   }
 
   getCompleteUrl({ baseUrl, params }) {
     const url = new URL(baseUrl)
     Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
     return url
   }
 
   async googleRequest(word) {
     const googleResult = await this.fetchFromGoogle({ word }) || []
     let result = 'google翻译结果解析错误'
     try {
       const [resultArray = []] = googleResult
 
       result = resultArray.reduce((pre, cur) => {
         return pre + (cur[0] || '')
       }, "")
 
     } catch(e) {}
 
     return result
    }
 
   async baiduRequest(word, rect, now) {
     const baiduResult = await this.fetchFromBaidu({ q: word})
 
     // if (baiduResult.errno > 0) throw ({msg: baiduResult.error || "请求异常"})
     if (baiduResult.errno > 0) return [{pre: "", cont: baiduResult.error || "请求异常"}]
 
     let resList = baiduResult.data.result;
     if (!Array.isArray(resList)) resList = [{
         pre: "",
         cont: resList
     }]
 
     return resList
    }

    async icibaRequest(word){
        const result = await this.fetchFromIciba(word);
        if (result.status != 1) {
            return "翻译失败"
        }
        return result.message[0];
    }
 
 }
 
 
 
 






/***
 * 
 * 监听事件
 */
 const http = new Http();


chrome.runtime.onInstalled.addListener(function(){
    let words = new Set();
    chrome.storage.sync.set({"words":[...words]}, function(){
        if(!chrome.runtime.lastError){
            console.log("success")
        }else{
            console.log(chrome.runtime.lastError)
        }
    })
    // 安装后安排每日自动同步
    scheduleAutoSyncAt4AM();
    // 安装时也做一次补偿检测
    checkAndRunCatchup();
})

// 浏览器启动时，确保闹钟仍然存在
chrome.runtime.onStartup && chrome.runtime.onStartup.addListener(() => {
    scheduleAutoSyncAt4AM();
    checkAndRunCatchup();
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    console.log(request, sender);
    let type = request.type
    console.log(request)
    switch (type) {
        case "add-words":
            addWords(request.msg,sendResponse)
            break;
        case "get-all-words":
            getAllWords(sendResponse)
            get_cookies()
            break;

        case "translate":
            translate(request, sendResponse)
            break;
        case "log-bbdc-cookies":
            logBbdcCookies(sendResponse)
            break;
        case "get-bbdc-cookies":
            getBbdcCookiesPayload(sendResponse)
            break;
        case "submit-to-bbdc":
            submitToBbdc(request, sendResponse)
            break;
        case "lemmatize-word":
            lemmatizeWord(request, sendResponse)
            break;
        case "capture-screenshot":
            captureScreenshot(request, sender, sendResponse)
            break;
        case "perform-ocr":
            performOCR(request, sendResponse)
            break;
        default:
            console.log("未匹配")
            break;
    }
   
    return true;
});


// 获取 不背单词 cookies
function get_cookies(){
    let url = "https://bbdc.cn/";
    chrome.cookies.getAll({url:url,path:"/",domain:".bbdc.cn"},data => {
        console.log(data);
        console.log(data.map(c => c.name+"="+c.value).join(';'))
    })
}

// 输出 bbdc.cn 的所有 cookies 到控制台
function logBbdcCookies(sendResponse){
    const url = "https://bbdc.cn/";
    chrome.cookies.getAll({url:url,path:"/",domain:".bbdc.cn"}, (cookies) => {
        if (chrome.runtime.lastError) {
            console.error("读取 bbdc cookies 失败:", chrome.runtime.lastError);
            sendResponse({success:false, error: chrome.runtime.lastError.message});
            return;
        }
        const cookieString = cookies.map(c => c.name + "=" + c.value).join('; ');
        console.log("[bbdc.cn cookies - array]", cookies);
        console.log("[bbdc.cn cookies - header]", cookieString);
        sendResponse({success:true, cookies, cookieString});
    })
}

// 以 bbdc.js 预期格式返回 cookies payload（对象 + header 字符串）
function getBbdcCookiesPayload(sendResponse){
    const url = "https://bbdc.cn/";
    chrome.cookies.getAll({url:url,path:"/",domain:".bbdc.cn"}, (cookies) => {
        if (chrome.runtime.lastError) {
            sendResponse({success:false, error: chrome.runtime.lastError.message});
            return;
        }
        const cookieMap = {};
        cookies.forEach(c => { cookieMap[c.name] = c.value; });
        const cookieString = cookies.map(c => c.name + "=" + c.value).join('; ');
        sendResponse({success:true, cookies: cookieMap, cookieString});
    })
}


function addWords(word,sendResponse) {
    chrome.storage.sync.get("words",data=>{
        if (chrome.runtime.lastError) {
            sendResponse('获取失败：'+chrome.runtime.lastError);
        }else{
            let tmpWords = new Set(data.words);
            tmpWords.add(word);
            chrome.storage.sync.set({"words":[...tmpWords]},function(){
                if(chrome.runtime.lastError){
                    sendResponse('添加失败:'+chrome.runtime.lastError);
                }else{
                    sendResponse('【响应】添加成功：'+word);
                }
            });
        }
    })
}

function getAllWords(sendResponse){
    chrome.storage.sync.get(null,data=>{
        if(chrome.runtime.lastError){
            sendResponse('获取失败:',chrome.runtime.lastError);
        }else {
            sendResponse(data.words);
        }
    })
}

function translate(request, sendResponse){
    const word = request && request.msg;
    const provider = (request && request.provider) || 'iciba';
    if (!word || typeof word !== 'string' || !word.trim()) {
        sendResponse({ provider, payload: 'Invalid word' });
        return;
    }
    switch (provider) {
        case 'google':
            http.googleRequest(word).then(result => {
                console.log('[google]', result)
                sendResponse({ provider: 'google', payload: result })
            })
            break;
        case 'baidu':
            http.baiduRequest(word).then(result => {
                console.log('[baidu]', result)
                sendResponse({ provider: 'baidu', payload: result })
            })
            break;
        case 'iciba':
        default:
            http.icibaRequest(word).then(result => {
                console.log('[iciba]', result)
                sendResponse({ provider: 'iciba', payload: result })
            })
            break;
    }
}

// 提交到bbdc的函数
function submitToBbdc(request, sendResponse) {
    console.log("🚀 开始执行bbdc提交...");
    
    const { wordList, desc, name } = request;
    
    // 先检查登录状态
    checkBbdcLoginStatus(function(loginStatus) {
        if (!loginStatus.isLoggedIn) {
            console.log("❌ 用户未登录，需要重新登录");
            // 跳转到登录页面
            chrome.tabs.create({ url: "https://bbdc.cn/index#" });
            sendResponse({ 
                success: false, 
                error: "用户未登录", 
                needLogin: true,
                loginUrl: "https://bbdc.cn/index#"
            });
            return;
        }
        
        console.log("✅ 用户已登录，开始提交单词列表");

        (async () => {
            // 1) 先获取列表，删除与 name 相同的词书
            const listRes = await listBbdcBooks(loginStatus.cookieString);
            if (!listRes.success) {
                sendResponse({ success:false, error: listRes.error, data: listRes.data });
                return;
            }
            const duplicated = (listRes.list || []).filter(item => item && item.name === (name || ''));
            for (const book of duplicated) {
                const delRes = await deleteBbdcBook(loginStatus.cookieString, book.code).catch(err => ({ success:false, error: err.message }));
                if (!delRes || !delRes.success) {
                    sendResponse({ success:false, error: (delRes && delRes.error) || 'delete failed', data: { code: book.code } });
                    return;
                }
            }

            // 2) 组装最终 wordList（追加 19 个指定词）
            const extraWords = [
                'timerring','cry0404','zenthri','quorbix','meldara','nufelin','drathic','solvexia','tirnoth','vakumi',
                'yelqara','brendax','corthil','ximora','javelyn','norveth','ulthara','krellin','aerdox'
            ];
            const finalWordList = (wordList && wordList.trim().length > 0)
                ? (wordList.endsWith(',') ? (wordList + extraWords.join(',')) : (wordList + ',' + extraWords.join(',')))
                : extraWords.join(',');
            console.log('[wordList->final]', finalWordList);

            // 3) 提交保存
            const saveRes = await saveBbdcWordList(loginStatus.cookieString, {
                wordList: finalWordList,
                desc: desc || '',
                name: name || '',
                exam: ''
            });
            if (!saveRes.success) {
                sendResponse({ success:false, error: saveRes.error, data: saveRes.data });
                return;
            }
            sendResponse({ success:true, data: saveRes.data });
        })().catch(err => {
            console.error('❌ 提交流程异常:', err);
            sendResponse({ success:false, error: err.message });
        });
    });
}

// 检查bbdc登录状态
function checkBbdcLoginStatus(callback) {
    console.log("🔍 检查bbdc登录状态...");
    
    // 获取bbdc.cn的cookies
    chrome.cookies.getAll({url: "https://bbdc.cn/", path: "/", domain: ".bbdc.cn"}, function(cookies) {
        if (chrome.runtime.lastError) {
            console.error("获取cookies失败:", chrome.runtime.lastError);
            callback({ isLoggedIn: false, cookieString: "" });
            return;
        }
        
        console.log("🍪 获取到的cookies:", cookies);
        
        // 检查是否有有效的登录cookies
        const hasValidCookies = cookies.some(cookie => {
            // 检查关键的登录cookie（根据实际需要调整）
            return cookie.name === 'JSESSIONID' || 
                   cookie.name === 'hanhan' || 
                   cookie.name === 'HMACCOUNT';
        });
        
        if (!hasValidCookies || cookies.length === 0) {
            console.log("❌ 没有找到有效的登录cookies");
            callback({ isLoggedIn: false, cookieString: "" });
            return;
        }
        
        // 构建cookie字符串
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log("✅ 找到有效的登录cookies:", cookieString);
        
        // 验证cookies是否有效（可选：发送一个测试请求）
        verifyCookiesValidity(cookieString, function(isValid) {
            if (isValid) {
                callback({ isLoggedIn: true, cookieString: cookieString });
            } else {
                console.log("❌ cookies已过期");
                callback({ isLoggedIn: false, cookieString: "" });
            }
        });
    });
}

// 验证cookies有效性
function verifyCookiesValidity(cookieString, callback) {
    // 发送一个简单的请求来验证cookies是否有效
    fetch('https://bbdc.cn/lexis_book_index', {
        method: 'GET',
        headers: {
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
        }
    })
    .then(response => {
        if (response.ok) {
            console.log("✅ cookies验证成功");
            callback(true);
        } else {
            console.log("❌ cookies验证失败，状态码:", response.status);
            callback(false);
        }
    })
    .catch(error => {
        console.error("❌ cookies验证出错:", error);
        callback(false);
    });
}

// === 自动同步（每日 04:00） ===
const AUTO_ALARM_NAME = 'bbdc-autosync-4am';

function getLocalNext4AMTimeMs(){
    const now = new Date();
    const next = new Date(now);
    next.setHours(4, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
        // 已过今天 4 点，安排明天
        next.setDate(next.getDate() + 1);
    }
    return next.getTime();
}

function getMostRecent4AMTimeMs(){
    const now = new Date();
    const recent = new Date(now);
    recent.setHours(4, 0, 0, 0);
    if (recent.getTime() > now.getTime()) {
        // 还没到今天4点，则回退到昨天4点
        recent.setDate(recent.getDate() - 1);
    }
    return recent.getTime();
}

function scheduleAutoSyncAt4AM(){
    const when = getLocalNext4AMTimeMs();
    // 每天触发一次
    try {
        // 先清除可能存在的旧闹钟
        chrome.alarms.clear(AUTO_ALARM_NAME);
        // 创建重复闹钟，使用 delayInMinutes 而不是 when
        const delayInMinutes = Math.round((when - Date.now()) / (1000 * 60));
        chrome.alarms.create(AUTO_ALARM_NAME, { 
            delayInMinutes: delayInMinutes,
            periodInMinutes: 24 * 60 
        });
        console.log('[autosync] alarm scheduled in', delayInMinutes, 'minutes, then every 24h');
    } catch (e) {
        console.warn('[autosync] schedule failed:', e);
    }
}

chrome.alarms && chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm && alarm.name === AUTO_ALARM_NAME) {
        console.log('[autosync] alarm fired');
        performAutoSync();
    }
});

function getCurrentTimestampForBg(){
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
}

function performAutoSync(){
    // 读取已保存的单词并走与手动相同的提交流程
    chrome.storage.sync.get('words', (data) => {
        const words = Array.isArray(data && data.words) ? data.words : [];
        const sorted = words.slice().sort();
        const wordList = sorted.join(',');
        const payload = {
            wordList,
            desc: getCurrentTimestampForBg(),
            name: 'wordsync'
        };
        submitToBbdc(payload, (res) => {
            console.log('[autosync] submit result:', res);
            // 记录本次自动同步时间，用于启动时补偿判断
            const nowMs = Date.now();
            chrome.storage.local.set({ autosyncLastRunMs: nowMs }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('[autosync] record last run failed:', chrome.runtime.lastError);
                }
            });
        });
    });
}

// 启动时检查是否错过了最近一次计划（4点）——若错过则立即补偿执行一次
function checkAndRunCatchup(){
    const recent4am = getMostRecent4AMTimeMs();
    chrome.storage.local.get('autosyncLastRunMs', (data) => {
        const lastRun = (data && data.autosyncLastRunMs) || 0;
        if (lastRun < recent4am) {
            console.log('[autosync] missed last 4AM run, running catch-up now');
            performAutoSync();
        } else {
            console.log('[autosync] no catch-up needed. lastRun=', new Date(lastRun).toString());
        }
    });
}

// === bbdc helpers ===
async function listBbdcBooks(cookieString){
    try {
        const resp = await fetch('https://bbdc.cn/lexis/book/list', {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'Referer': 'https://bbdc.cn/lexis_book_index',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
            }
        });
        const data = await resp.json().catch(() => (null));
        if (!resp.ok) {
            return { success:false, error: `HTTP ${resp.status}`, data };
        }
        const resultCode = data && (data.result_code ?? data.code);
        if (typeof resultCode === 'number' && resultCode !== 0 && resultCode !== 200) {
            const err = (data && data.error_body && (data.error_body.user_message || data.error_body.info)) || 'list failed';
            return { success:false, error: err, data };
        }
        const list = (data && data.data_body && Array.isArray(data.data_body.list)) ? data.data_body.list : [];
        return { success:true, data, list };
    } catch (e) {
        return { success:false, error: e.message };
    }
}

async function deleteBbdcBook(cookieString, bookCode){
    try {
        const form = new URLSearchParams({ bookCode: String(bookCode) });
        const resp = await fetch('https://bbdc.cn/lexis/book/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://bbdc.cn',
                'Referer': 'https://bbdc.cn/lexis_book_index',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
            },
            body: form.toString()
        });
        const data = await resp.json().catch(() => (null));
        if (!resp.ok) return { success:false, error: `HTTP ${resp.status}`, data };
        const resultCode = data && (data.result_code ?? data.code);
        if (typeof resultCode === 'number' && resultCode !== 0 && resultCode !== 200) {
            const err = (data && data.error_body && (data.error_body.user_message || data.error_body.info)) || 'delete failed';
            return { success:false, error: err, data };
        }
        return { success:true, data };
    } catch (e) {
        return { success:false, error: e.message };
    }
}

async function saveBbdcWordList(cookieString, { wordList, desc, name, exam }){
    try {
        const form = new URLSearchParams({ wordList, desc, name, exam });
        const resp = await fetch('https://bbdc.cn/lexis/book/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://bbdc.cn',
                'Referer': 'https://bbdc.cn/lexis_book_index',
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
            },
            body: form.toString()
        });
        const data = await resp.json().catch(() => (null));
        if (!resp.ok) return { success:false, error: `HTTP ${resp.status}`, data };
        const resultCode = data && (data.result_code ?? data.code);
        if (typeof resultCode === 'number' && resultCode !== 0 && resultCode !== 200) {
            const err = (data && data.error_body && (data.error_body.user_message || data.error_body.info)) || 'save failed';
            return { success:false, error: err, data };
        }
        return { success:true, data };
    } catch (e) {
        return { success:false, error: e.message };
    }
}

// 词形还原处理函数
function lemmatizeWord(request, sendResponse) {
    console.log("🔍 开始词形还原处理...");
    
    const { word, context, url } = request;
    
    if (!word || typeof word !== 'string') {
        sendResponse({ success: false, error: 'Invalid word', lemma: word });
        return;
    }
    
    try {
        // 使用本地词形还原库
        const lemma = lemmatizer.lemmatize(word.trim());
        
        console.log(`✅ 词形还原完成: ${word} → ${lemma}`);
        if (context) {
            console.log(`📝 上下文: ${context.substring(0, 100)}...`);
        }
        if (url) {
            console.log(`🔗 来源: ${url}`);
        }
        
        sendResponse({ 
            success: true, 
            lemma: lemma,
            original: word,
            context: context,
            url: url
        });
    } catch (e) {
        console.error("❌ 词形还原失败:", e);
        // 失败时返回原词
        sendResponse({ 
            success: true, 
            lemma: word.toLowerCase(), 
            original: word,
            error: e.message 
        });
    }
}

// 截图功能
async function captureScreenshot(request, sender, sendResponse) {
    console.log("📸 开始截图...");
    
    try {
        // 获取当前标签页
        const tab = sender.tab;
        
        // 检查是否是 PDF 页面
        const isPDF = tab.url && (tab.url.endsWith('.pdf') || tab.url.includes('pdf'));
        
        if (isPDF) {
            console.log("检测到 PDF 页面，使用特殊截图方式");
        }
        
        // 截取整个标签页 - 对于 PDF 也可以工作
        chrome.tabs.captureVisibleTab(tab.windowId, { 
            format: 'png',
            quality: 100  // 最高质量，对 OCR 识别有帮助
        }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error("截图失败:", chrome.runtime.lastError);
                
                // 如果是权限问题，给出更友好的提示
                if (chrome.runtime.lastError.message.includes('Cannot access')) {
                    sendResponse({ 
                        success: false, 
                        error: 'Cannot capture this page. Try refreshing the page (F5) first.' 
                    });
                } else {
                    sendResponse({ 
                        success: false, 
                        error: chrome.runtime.lastError.message 
                    });
                }
                return;
            }
            
            console.log("✅ 截图成功");
            
            // 如果有指定的截图区域，裁剪图片
            if (request.rect && request.rect.width > 0 && request.rect.height > 0) {
                cropImage(dataUrl, request.rect).then(croppedDataUrl => {
                    sendResponse({ success: true, dataUrl: croppedDataUrl });
                }).catch(err => {
                    console.error("裁剪图片失败:", err);
                    // 裁剪失败时返回原图
                    sendResponse({ success: true, dataUrl: dataUrl });
                });
            } else {
                sendResponse({ success: true, dataUrl: dataUrl });
            }
        });
    } catch (e) {
        console.error("❌ 截图失败:", e);
        sendResponse({ success: false, error: e.message });
    }
}

// 裁剪图片函数
async function cropImage(dataUrl, rect) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = new OffscreenCanvas(rect.width, rect.height);
                const ctx = canvas.getContext('2d');
                
                // 绘制裁剪后的图片
                ctx.drawImage(
                    img, 
                    rect.x, rect.y, rect.width, rect.height,  // 源区域
                    0, 0, rect.width, rect.height              // 目标区域
                );
                
                // 转换为 dataUrl
                canvas.convertToBlob({ type: 'image/png' }).then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                }).catch(reject);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// OCR 识别功能
async function performOCR(request, sendResponse) {
    console.log("🔍 开始 OCR 识别...");
    
    const { imageDataUrl } = request;
    
    if (!imageDataUrl) {
        sendResponse({ success: false, error: 'No image provided' });
        return;
    }
    
    try {
        // 使用免费的 OCR.space API
        const apiKey = 'K87899142388957'; // 免费公共 API key
        
        // 将 base64 转换为 blob
        const base64Data = imageDataUrl.split(',')[1];
        
        // 调用 OCR.space API
        const formData = new FormData();
        formData.append('base64Image', 'data:image/png;base64,' + base64Data);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2');
        
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'apikey': apiKey
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.IsErroredOnProcessing) {
            console.error("OCR API 错误:", result.ErrorMessage);
            sendResponse({ 
                success: false, 
                error: result.ErrorMessage || 'OCR processing failed' 
            });
            return;
        }
        
        // 提取识别的文本
        const text = result.ParsedResults && result.ParsedResults[0] 
            ? result.ParsedResults[0].ParsedText 
            : '';
        
        console.log("✅ OCR 识别完成");
        console.log("识别结果:", text);
        
        sendResponse({ 
            success: true, 
            text: text,
            confidence: result.ParsedResults[0]?.TextOverlay?.Lines?.length || 0
        });
        
    } catch (e) {
        console.error("❌ OCR 识别失败:", e);
        sendResponse({ 
            success: false, 
            error: e.message || 'OCR recognition failed' 
        });
    }
}