/**
 * 悬浮窗定义
 * 用于显示气泡窗口
 */

class Tip {
  constructor() {
    // 初始化tip 并追加至body
    this.tip = this.createTip();
    this.tipStyle = this.tip.style;
    this.tipContainer = this.tip.querySelector('.tip-content');
    this.loading = this.tip.querySelector('#tip-loading-container')
    this.providerSelect = this.tip.querySelector('#provider-select')
    this.currentProvider = 'iciba'
    this.initProvider()
    window.document.body.append(this.tip);
  }

  /**
   * 百度api 显示tip
   * @param {object} param0 
   */
  showFromBaiduApi({ resList, rect, now }) {
    const eleArr = resList.map(item => {
      item.pre || (item.pre = "");
      let p = document.createElement('p');
      p.innerText = `${item.pre}  ${item.cont}`;
      return p.outerHTML;
    });
    this.opTip({ eleArr, rect, now })
  }

  /**
   * google api 显示tip
   */
  showFromGoogleApi({ result, rect, now }) {
    let elementArr = []
    if (result && result.key && Array.isArray(result.means)) {
      elementArr.push('<h1>'+result.key+'</h1>')
      result.means.forEach(item => {
        let val = item.part+" ";
        let means = [];
        item.means.forEach(m=>{
          means.push(m)
        })
        val = val + means.join(",");
        let elem = '<p>'+val+'</p>';
        elementArr.push(elem)
      });
    } else if (typeof result === 'string') {
      elementArr.push('<p>'+result+'</p>')
    }

    console.log(elementArr)
    this.opTip({
      eleArr: elementArr,
      rect,
      now
    })
  }

  /**
   * iciba 显示tip
   */
  showFromIcibaApi({ result, rect, now }) {
    let elementArr = []
    if (result && (result.key || result.paraphrase)) {
      if (result.key) elementArr.push('<h1>'+result.key+'</h1>')
      if (result.paraphrase) elementArr.push('<p>'+result.paraphrase+'</p>')
    } else if (typeof result === 'string') {
      elementArr.push('<p>'+result+'</p>')
    }
    this.opTip({ eleArr: elementArr, rect, now })
  }

  /**
   * 通用纯文本展示
   */
  showGenericText({ text, rect, now }) {
    const elementArr = [ '<p>'+ (text || '') +'</p>' ]
    this.opTip({ eleArr: elementArr, rect, now })
  }

  showErrorView({msg, now}) {
    this.insertToTip([`<p>${msg}</p>`], now)
    this.loading.style.display = "none"
  }

  opTip({ eleArr, rect, now }) {
    this.loading.style.display = "none"
    this.insertToTip(eleArr, now);
    if (this.rect == rect) return
    this.moveToPos(rect);
  }

  showEmptyView(rect, now) {
    this.moveToPos(rect)
    this.insertToTip([], now)
    this.loading.style.display = "flex"
  }

  /**
   * 隐藏tip
   */
  hide() {
    if (this.tipStyle.display != 'none')
      this.tipStyle.display = 'none'; 
  }

  /**
   * 向tip填充数据
   * @param {array} eleArr 
   */
  insertToTip(eleArr, now) {
    if (this.now === now) {
      this.tipContainer.innerHTML += eleArr.join('')
    } else {
      this.now = now
      this.tipContainer.innerHTML = eleArr.join('')
    }
  }

  /**
   * 移动tip
   * @param {object} rect 
   */
  moveToPos(rect) {
    this.rect = rect
    this.modifyTipPosition(rect);
  }

  /**
   * 修改tip位置
   * @param {object} param0 
   */
  modifyTipPosition({top, left, height, width}) {
    if (!this.tipStyle.display || this.tipStyle.display == 'none') 
      this.tipStyle.display = 'block';
    
    // 先设置一个临时位置，让翻译框渲染出来以获取实际尺寸
    this.tipStyle.top = top + height + 8 + 'px';
    this.tipStyle.left = left + 'px';
    
    // 等待一帧后获取实际尺寸
    requestAnimationFrame(() => {
      this.adjustPositionForBoundaries({top, left, height, width});
    });
  }
  
  /**
   * 根据边界调整位置
   * @param {object} param0 
   */
  adjustPositionForBoundaries({top, left, height, width}) {
    // 获取翻译框的实际尺寸
    const tipRect = this.tip.getBoundingClientRect();
    const tipWidth = tipRect.width;
    const tipHeight = tipRect.height;
    
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 计算初始位置
    let tipTop = top + height + 8;
    let tipLeft = left;
    let showArrowUp = false; // 是否显示向上的箭头
    
    // 水平边界检测和调整
    if (tipLeft + tipWidth > viewportWidth) {
      // 如果右侧超出，尝试左对齐
      tipLeft = viewportWidth - tipWidth - 10; // 留10px边距
      
      // 如果左侧也超出，则居中对齐
      if (tipLeft < 10) {
        tipLeft = Math.max(10, (viewportWidth - tipWidth) / 2);
      }
    }
    
    // 确保左侧不超出
    if (tipLeft < 10) {
      tipLeft = 10;
    }
    
    // 垂直边界检测和调整
    if (tipTop + tipHeight > viewportHeight) {
      // 如果下方空间不足，显示在选中文本上方
      tipTop = top - tipHeight - 8;
      showArrowUp = true;
      
      // 如果上方空间也不足，则显示在视口中央
      if (tipTop < 10) {
        tipTop = Math.max(10, (viewportHeight - tipHeight) / 2);
        showArrowUp = false; // 居中时不显示箭头
      }
    }
    
    // 确保顶部不超出
    if (tipTop < 10) {
      tipTop = 10;
      showArrowUp = false;
    }
    
    this.tipStyle.top = tipTop + 'px';
    this.tipStyle.left = tipLeft + 'px';
    
    // 调整气泡口位置
    this.adjustArrowPosition({top, left, height, width}, tipLeft, tipTop, showArrowUp);
  }
  
  /**
   * 调整气泡口位置
   * @param {object} selectionRect 选中文本的位置信息
   * @param {number} tipLeft 翻译框的左边距
   * @param {number} tipTop 翻译框的顶部位置
   * @param {boolean} showArrowUp 是否显示向上的箭头
   */
  adjustArrowPosition(selectionRect, tipLeft, tipTop, showArrowUp) {
    const {top, left, height, width} = selectionRect;
    
    // 计算选中文本的中心位置
    const selectionCenterX = left + width / 2;
    const selectionCenterY = top + height / 2;
    
    // 计算箭头应该指向的位置（相对于翻译框）
    let arrowLeft = selectionCenterX - tipLeft;
    
    // 确保箭头在翻译框范围内（留出边距）
    const arrowMinLeft = 20;
    const arrowMaxLeft = 300; // 翻译框宽度320px - 20px边距
    arrowLeft = Math.max(arrowMinLeft, Math.min(arrowMaxLeft, arrowLeft));
    
    // 获取箭头元素
    const arrowElement = this.tip.querySelector('.tip-arrow');
    if (arrowElement) {
      // 设置箭头位置
      arrowElement.style.left = arrowLeft + 'px';
      
      // 根据箭头方向调整样式
      if (showArrowUp) {
        // 向上箭头：显示在翻译框底部
        arrowElement.style.top = 'auto';
        arrowElement.style.bottom = '-16px';
        arrowElement.style.transform = 'rotate(180deg)';
      } else {
        // 向下箭头：显示在翻译框顶部
        arrowElement.style.top = '-16px';
        arrowElement.style.bottom = 'auto';
        arrowElement.style.transform = 'rotate(0deg)';
      }
    }
  }

  /**
   * 创建tip dom
   */
  createTip() {
    // 创建dom
    let container = `
    <div class="tip-container">
        <div class="tip-toolbar">
          <div class="toolbar-left">
            <select id="provider-select" class="provider-select">
              <option value="iciba">iciba</option>
              <option value="baidu">baidu</option>
              <option value="google">google</option>
            </select>
          </div>
          <div class="toolbar-right">
            <button type="button" class="audio-btn" id="play-audio">发音</button>
            <button type="button" class="add-btn" id="add-words">添加单词 (⌥ + A)</button>
          </div>
        </div>
        
        <div class="tip-content">
        </div>
        <div class="bouncing-loader" id="tip-loading-container">
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div class="tip-arrow">
            <i></i>
            <em></em>
        </div>
    </div>
    `;
    const dom = $(container).addClass('translateX')[0]

    dom.addEventListener('mousedown', (event) => event.stopPropagation())
    dom.addEventListener('mouseup', (event) => event.stopPropagation())

    return dom;
  }

  /**
   * provider 初始化与持久化
   */
  initProvider() {
    const select = this.providerSelect
    if (!select) return
    // 从存储读取
    try {
      chrome.storage.sync.get('ws_provider', (data) => {
        const value = data && data.ws_provider
        if (value) {
          this.currentProvider = value
          select.value = value
        } else {
          this.currentProvider = 'iciba'
          select.value = 'iciba'
        }
      })
    } catch(e) {}

    // 监听变更并写入
    select.addEventListener('change', () => {
      this.currentProvider = select.value
      try {
        chrome.storage.sync.set({ ws_provider: this.currentProvider })
      } catch(e) {}
    })
  }

  getProvider() {
    return this.currentProvider || 'iciba'
  }

  /**
   * 根据 provider 分发渲染
   */
  showByProvider({ provider, payload, rect, now }) {
    switch (provider) {
      case 'baidu':
        return this.showFromBaiduApi({ resList: payload, rect, now })
      case 'iciba':
        return this.showFromIcibaApi({ result: payload, rect, now })
      case 'google':
        if (typeof payload === 'string') return this.showGenericText({ text: payload, rect, now })
        return this.showFromGoogleApi({ result: payload, rect, now })
      default:
        return this.showGenericText({ text: 'No result', rect, now })
    }
  }

 
}