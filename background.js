/***
 * 
 * 翻译 API
 */
 const baiduApi = 'https://sp1.baidu.com/5b11fzupBgM18t7jm9iCKT-xh_/sensearch/selecttext'
 const googleApi = 'https://translate.google.cn/translate_a/single'
 const icibaApi = 'https://dict-mobile.iciba.com/interface/index.php'
 
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