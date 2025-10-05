/**
 * OCR 截图识别模块
 * 支持截图选择、OCR 识别、单词提取
 */

class OCRCapture {
  constructor() {
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
    this.overlay = null;
    this.selectionBox = null;
    this.canvas = null;
  }

  /**
   * 启动截图选择
   */
  startCapture() {
    if (this.isSelecting) return;
    
    console.log('🎯 启动 OCR 截图模式...');
    
    // 检测是否是 PDF 页面
    const isPDF = window.location.href.endsWith('.pdf') || 
                  window.location.href.includes('pdf') ||
                  document.querySelector('embed[type="application/pdf"]');
    
    if (isPDF) {
      Toast.info('PDF OCR Mode', 'Drag to select text area in PDF', 4000);
      console.log('📄 检测到 PDF 页面');
    } else {
      Toast.info('Screenshot Mode', 'Drag to select area for OCR', 3000);
    }
    
    this.isSelecting = true;
    this.createOverlay();
    this.attachEvents();
  }

  /**
   * 创建半透明遮罩层
   */
  createOverlay() {
    // 创建遮罩层
    this.overlay = document.createElement('div');
    this.overlay.id = 'wordsync-ocr-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999998;
      cursor: crosshair;
    `;

    // 创建选择框
    this.selectionBox = document.createElement('div');
    this.selectionBox.id = 'wordsync-selection-box';
    this.selectionBox.style.cssText = `
      position: fixed;
      border: 2px solid #2196f3;
      background: rgba(33, 150, 243, 0.1);
      display: none;
      z-index: 999999;
      pointer-events: none;
    `;

    // 添加提示文本
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    hint.textContent = 'Drag to select area • ESC to cancel';
    this.overlay.appendChild(hint);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.selectionBox);
  }

  /**
   * 绑定鼠标事件
   */
  attachEvents() {
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);

    this.overlay.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 鼠标按下事件
   */
  onMouseDown(e) {
    e.preventDefault();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = this.startX + 'px';
    this.selectionBox.style.top = this.startY + 'px';
    this.selectionBox.style.width = '0px';
    this.selectionBox.style.height = '0px';
  }

  /**
   * 鼠标移动事件
   */
  onMouseMove(e) {
    if (!this.selectionBox || this.selectionBox.style.display === 'none') return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);
    const left = Math.min(currentX, this.startX);
    const top = Math.min(currentY, this.startY);

    this.selectionBox.style.left = left + 'px';
    this.selectionBox.style.top = top + 'px';
    this.selectionBox.style.width = width + 'px';
    this.selectionBox.style.height = height + 'px';
  }

  /**
   * 鼠标释放事件
   */
  async onMouseUp(e) {
    if (!this.selectionBox || this.selectionBox.style.display === 'none') return;

    const width = parseInt(this.selectionBox.style.width);
    const height = parseInt(this.selectionBox.style.height);

    // 选择区域太小，取消
    if (width < 50 || height < 50) {
      Toast.warning('Area Too Small', 'Please select a larger area', 2000);
      this.cleanup();
      return;
    }

    // 获取选择区域
    const rect = {
      x: parseInt(this.selectionBox.style.left),
      y: parseInt(this.selectionBox.style.top),
      width: width,
      height: height
    };

    // 清理界面
    this.cleanup();

    // 执行截图和 OCR
    await this.captureAndOCR(rect);
  }

  /**
   * 键盘事件（ESC 取消）
   */
  onKeyDown(e) {
    if (e.key === 'Escape') {
      Toast.info('Cancelled', 'Screenshot cancelled', 1500);
      this.cleanup();
    }
  }

  /**
   * 清理界面
   */
  cleanup() {
    this.isSelecting = false;

    if (this.overlay) {
      this.overlay.removeEventListener('mousedown', this.handleMouseDown);
      this.overlay.remove();
      this.overlay = null;
    }

    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 截图并进行 OCR 识别
   */
  async captureAndOCR(rect) {
    try {
      Toast.info('Processing', 'Capturing screenshot...', 2000);

      // 发送消息给 background 进行截图
      if (typeof safeSendMessage === 'function') {
        safeSendMessage({
          type: 'capture-screenshot',
          rect: rect
        }, async (response) => {
          if (!response) {
            Toast.error('Capture Failed', 'Extension context invalid');
            return;
          }

          if (response.success) {
            // 进行 OCR 识别
            await this.performOCR(response.dataUrl, rect);
          } else {
            Toast.error('Capture Failed', response.error || 'Unknown error');
          }
        });
      } else {
        Toast.error('Error', 'Extension not loaded properly');
      }
    } catch (error) {
      console.error('OCR capture error:', error);
      Toast.error('Error', error.message);
    }
  }

  /**
   * 执行 OCR 识别
   */
  async performOCR(imageDataUrl, rect) {
    Toast.info('Recognizing', 'Performing OCR recognition...', 3000);

    // 发送到 background 进行 OCR 处理
    if (typeof safeSendMessage === 'function') {
      safeSendMessage({
        type: 'perform-ocr',
        imageDataUrl: imageDataUrl
      }, (response) => {
        if (!response) {
          Toast.error('OCR Failed', 'Extension context invalid');
          return;
        }

        if (response.success) {
          this.handleOCRResult(response.text);
        } else {
          Toast.error('OCR Failed', response.error || 'Recognition failed');
        }
      });
    } else {
      Toast.error('Error', 'Extension not loaded properly');
    }
  }

  /**
   * 处理 OCR 识别结果
   */
  handleOCRResult(text) {
    console.log('📝 OCR 识别结果:', text);

    if (!text || !text.trim()) {
      Toast.warning('No Text', 'No text recognized', 2500);
      return;
    }

    // 提取英文单词
    const words = this.extractEnglishWords(text);

    if (words.length === 0) {
      Toast.warning('No Words', 'No English words found', 2500);
      return;
    }

    console.log('📚 提取到的单词:', words);
    Toast.success('OCR Success', `Found ${words.length} words`, 2500);

    // 显示确认对话框
    this.showWordsConfirmation(words);
  }

  /**
   * 从文本中提取英文单词
   */
  extractEnglishWords(text) {
    // 匹配英文单词（至少 2 个字母）
    const wordRegex = /\b[a-zA-Z]{2,}\b/g;
    const matches = text.match(wordRegex) || [];
    
    // 去重并转小写
    const uniqueWords = [...new Set(matches.map(w => w.toLowerCase()))];
    
    // 过滤常见停用词
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as'];
    return uniqueWords.filter(word => !stopWords.includes(word) && word.length >= 3);
  }

  /**
   * 显示单词确认对话框
   */
  showWordsConfirmation(words) {
    // 创建确认对话框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 999999;
      max-width: 500px;
      max-height: 600px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #111;">Extracted Words (${words.length})</h3>
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px; max-height: 300px; overflow-y: auto;">
        ${words.map(word => `<span style="display: inline-block; padding: 4px 8px; margin: 4px; background: white; border-radius: 4px; font-size: 14px;">${word}</span>`).join('')}
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="ocr-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
        <button id="ocr-confirm" style="padding: 8px 16px; border: none; background: #2196f3; color: white; border-radius: 6px; cursor: pointer; font-size: 14px;">Add All Words</button>
      </div>
    `;

    document.body.appendChild(dialog);

    // 绑定事件
    document.getElementById('ocr-cancel').onclick = () => {
      dialog.remove();
      Toast.info('Cancelled', 'No words added', 1500);
    };

    document.getElementById('ocr-confirm').onclick = () => {
      dialog.remove();
      this.addWordsToLibrary(words);
    };
  }

  /**
   * 批量添加单词到词库
   */
  async addWordsToLibrary(words) {
    Toast.info('Adding Words', `Adding ${words.length} words...`, 2000);

    // 逐个进行词形还原并添加
    let successCount = 0;
    
    for (const word of words) {
      try {
        await new Promise((resolve) => {
          if (typeof safeSendMessage === 'function') {
            safeSendMessage({
              type: "lemmatize-word",
              word: word,
              context: '',
              url: window.location.href
            }, (response) => {
              if (response && response.success) {
                // 保存还原后的词
                safeSendMessage({
                  type: "add-words",
                  msg: response.lemma
                }, () => {
                  successCount++;
                  resolve();
                });
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      } catch (e) {
        console.error('Failed to add word:', word, e);
      }
    }

    Toast.success('Words Added', `Successfully added ${successCount}/${words.length} words`, 3000);
  }
}

// 创建全局实例
const ocrCapture = new OCRCapture();
