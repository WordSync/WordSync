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
})

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
            translate(request.msg,sendResponse)
            break;
        case "log-bbdc-cookies":
            logBbdcCookies(sendResponse)
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

function translate(word,sendResponse){
    Promise.all([http.googleRequest(word),http.baiduRequest(word),http.icibaRequest(word)]).then(([google,baidu,iciba]) => {
        console.log(google)
        console.log(baidu)
        console.log(iciba)
        sendResponse(iciba)
      })
    
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
        
        // 构建请求数据
        const formData = new URLSearchParams({
            'wordList': wordList,
            'desc': desc || '',
            'name': name || '',
            'exam': ''
        });
        
        // 发送请求到bbdc.cn
        fetch('https://bbdc.cn/lexis/book/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://bbdc.cn',
                'Referer': 'https://bbdc.cn/lexis_book_index',
                'Cookie': loginStatus.cookieString,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
            },
            body: formData.toString()
        })
        .then(async (response) => {
            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                // 非 JSON 响应
            }

            // HTTP 层错误（含 401/403）
            if (!response.ok) {
                const status = response.status;
                const msg = `HTTP ${status}`;
                if (status === 401 || status === 403) {
                    console.log("❌ bbdc未授权/会话过期，需重新登录", status);
                    sendResponse({ success: false, needLogin: true, loginUrl: 'https://bbdc.cn/index#', error: msg, data });
                    return;
                }
                sendResponse({ success: false, error: msg, data });
                return;
            }

            // 业务层错误：识别常见字段
            const resultCode = data && (data.result_code ?? data.code);
            const isException = data && data.data_kind === 'exception_handler';
            if (isException || (typeof resultCode === 'number' && resultCode !== 0 && resultCode !== 200)) {
                const errMsg = (data && data.error_body && (data.error_body.user_message || data.error_body.info))
                  || (data && data.message)
                  || '服务返回错误';
                console.error('❌ bbdc业务错误:', errMsg, data);
                sendResponse({ success: false, error: errMsg, data });
                return;
            }

            console.log("✅ bbdc提交成功:", data);
            sendResponse({ success: true, data });
        })
        .catch(error => {
            console.error("❌ bbdc提交失败:", error);
            sendResponse({ success: false, error: error.message });
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