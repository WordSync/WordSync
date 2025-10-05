/**
 * 不背单词同步
 */

const https = require('https');
const { URLSearchParams } = require('url');
const FormData = require('form-data');

class SyncWordsClient {
    constructor() {
        this.baseUrl = 'https://bbdc.cn';
        
        this.commonHeaders = {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Origin': 'https://bbdc.cn',
            'Pragma': 'no-cache',
            'Referer': 'https://bbdc.cn/lexis_book_index',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"'
        };
        
        // get Cookies (todo)

    }

    /**
     * 生成Cookie字符串
     */
    getCookieString(additionalCookies = {}) {
        const allCookies = { ...this.cookies, ...additionalCookies };
        return Object.entries(allCookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
    }

    /**
     * 发送HTTPS请求的通用方法
     */
    makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data,
                            parseError: e
                        });
                    }
                });
            });
            
            req.on('error', (err) => {
                reject(err);
            });
            
            if (postData) {
                if (typeof postData === 'string') {
                    req.write(postData);
                } else if (postData instanceof FormData) {
                    postData.pipe(req);
                    return; // FormData会自动调用req.end()
                }
            }
            
            req.end();
        });
    }

    async saveWordList(wordList, desc = '', name = '', exam = '') {
        console.log('💾 正在保存词汇列表...');
        
        try {
            const formData = new URLSearchParams({
                'wordList': wordList,
                'desc': desc,
                'name': name,
                'exam': exam
            });

            const additionalCookies = {
                'acw_tc': '0a47318317558848677271668e95809b1f3c42a027939b6f122b886e475763'
            };

            const headers = {
                ...this.commonHeaders,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Content-Length': Buffer.byteLength(formData.toString()),
                'Cookie': this.getCookieString(additionalCookies)
            };

            const options = {
                hostname: 'bbdc.cn',
                port: 443,
                path: '/lexis/book/save',
                method: 'POST',
                headers: headers
            };

            const response = await this.makeRequest(options, formData.toString());
            
            if (response.statusCode === 200 && response.data && !response.parseError) {
                console.log('✅ 词汇列表保存成功');
                console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
                return response.data;
            } else {
                console.log(`❌ 词汇列表保存失败: HTTP ${response.statusCode}`);
                console.log('响应内容:', response.data);
                return null;
            }
            
        } catch (error) {
            console.log(`❌ 词汇列表保存失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 生成当前时间戳 (格式: YYYYMMDDHHMM)
     */
    getCurrentTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}${hour}${minute}`;
    }

    async syncWords(fileContent = '', filename = '/Users/jonghowe/Repo/syncwords/random_words.txt', desc = null, name = null, exam = '') {
        console.log('🔄 开始词汇同步流程...');
        
        // 如果没有提供desc和name，使用当前时间戳
        const timestamp = this.getCurrentTimestamp();
        const finalDesc = desc || timestamp;
        const finalName = name || timestamp;
        
        console.log(`📅 使用时间戳: ${timestamp}`);
        
        let wordList;
        wordList = 'good,better,bridge,candle,dolphin,emerald,feather,galaxy,harbor,island,jungle,kingdom,lantern,meadow,nebula,ocean,prairie,quartz,raven,Saturn,thunder,umbrella,voyage,willow,xenon,yonder,zephyr,blossom,comet,drift,ember';
        console.log(wordList);
        
        // 第二步：保存词汇列表
        const saveResult = await this.saveWordList(wordList, finalDesc, finalName, exam);
        if (!saveResult) {
            console.log('❌ 同步失败：词汇保存步骤失败');
            return false;
        }
        
        console.log('🎉 词汇同步流程完成!');
        return true;
    }
}

/**
 * 主函数 - 演示使用
 */
async function main() {
    try {
        // 创建客户端
        const client = new SyncWordsClient();
        
        // 执行完整的同步流程（使用当前时间戳）
        const success = await client.syncWords(
            '',  // 空文件内容，模拟原始请求
            '/Users/jonghowe/Repo/syncwords/random_words.txt'
            // desc和name参数留空，将自动使用当前时间戳
        );
        
        if (success) {
            console.log('\n✅ 所有操作完成!');
        } else {
            console.log('\n❌ 操作失败!');
        }
        
    } catch (error) {
        console.error('❌ 程序执行出错:', error);
    }
}

// 导出类和主函数
module.exports = SyncWordsClient;

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main();
}
