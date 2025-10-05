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

    // 获取选择区域（相对于视口）
    const x = parseInt(this.selectionBox.style.left);
    const y = parseInt(this.selectionBox.style.top);
    
    // 注意：getBoundingClientRect() 返回的是相对于视口的坐标
    // 截图也是当前可见视口，所以坐标直接使用即可
    const rect = {
      x: x,
      y: y,
      width: width,
      height: height
    };

    console.log('🎯 选择的区域（相对视口）:', rect);
    console.log('   视口尺寸:', window.innerWidth, 'x', window.innerHeight);
    console.log('   页面滚动:', window.scrollX, window.scrollY);
    console.log('   设备像素比:', window.devicePixelRatio);

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
      console.log('📸 准备截图，区域参数:', rect);
      Toast.info('Processing', 'Capturing screenshot...', 2000);

      // 发送消息给 background 进行截图（不裁剪）
      if (typeof safeSendMessage === 'function') {
        safeSendMessage({
          type: 'capture-screenshot-full'  // 只截取整个页面
        }, async (response) => {
          console.log('📸 截图响应:', response ? 'success' : 'failed');
          
          if (!response) {
            Toast.error('Capture Failed', 'Extension context invalid');
            return;
          }

          if (response.success) {
            // 在前端进行裁剪（有 DOM 环境）
            console.log('🔪 在前端裁剪图片...');
            
            try {
              const croppedDataUrl = await this.cropImageInFrontend(response.dataUrl, rect);
              
              if (croppedDataUrl) {
                console.log('✅ 裁剪成功，开始 OCR 识别');
                // 进行 OCR 识别
                await this.performOCR(croppedDataUrl, rect);
                console.log('✅ OCR 识别流程已启动');
              } else {
                console.warn('⚠️ 裁剪失败，使用原图');
                await this.performOCR(response.dataUrl, rect);
              }
            } catch (err) {
              console.error('❌ 裁剪或 OCR 过程出错:', err);
              Toast.error('Error', err.message);
            }
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
   * 在前端裁剪图片（有 DOM 环境）
   */
  async cropImageInFrontend(dataUrl, rect) {
    return new Promise((resolve, reject) => {
      console.log('🔪 开始前端裁剪');
      console.log('   选择区域:', rect);
      
      const img = new Image();
      
      img.onload = () => {
        try {
          console.log(`   截图尺寸: ${img.width}x${img.height}`);
          console.log(`   视口尺寸: ${window.innerWidth}x${window.innerHeight}`);
          console.log(`   设备像素比: ${window.devicePixelRatio}`);
          
          // 计算实际的裁剪坐标
          // Chrome截图会根据设备像素比进行缩放
          const dpr = window.devicePixelRatio || 1;
          const scale = img.width / window.innerWidth;
          
          console.log(`   缩放比例: ${scale.toFixed(3)}`);
          
          // 调整裁剪坐标
          const adjustedRect = {
            x: Math.round(rect.x * scale),
            y: Math.round(rect.y * scale),
            width: Math.round(rect.width * scale),
            height: Math.round(rect.height * scale)
          };
          
          console.log(`   调整后坐标: (${adjustedRect.x}, ${adjustedRect.y}) ${adjustedRect.width}x${adjustedRect.height}`);
          
          // 边界检查
          if (adjustedRect.x + adjustedRect.width > img.width) {
            adjustedRect.width = img.width - adjustedRect.x;
            console.warn('   ⚠️ 宽度超出，已调整');
          }
          if (adjustedRect.y + adjustedRect.height > img.height) {
            adjustedRect.height = img.height - adjustedRect.y;
            console.warn('   ⚠️ 高度超出，已调整');
          }
          
          // 创建 canvas（使用原始选择的尺寸，不缩放）
          const canvas = document.createElement('canvas');
          canvas.width = adjustedRect.width;
          canvas.height = adjustedRect.height;
          const ctx = canvas.getContext('2d');
          
          // 白色背景
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // 绘制裁剪区域（使用调整后的坐标）
          ctx.drawImage(
            img,
            adjustedRect.x, adjustedRect.y, adjustedRect.width, adjustedRect.height,
            0, 0, adjustedRect.width, adjustedRect.height
          );
          
          // 转换为 dataUrl
          const croppedDataUrl = canvas.toDataURL('image/png', 1.0);
          
          // 计算大小
          const originalSize = dataUrl.length;
          const croppedSize = croppedDataUrl.length;
          console.log(`✅ 裁剪完成`);
          console.log(`   原图: ${(originalSize / 1024).toFixed(1)} KB`);
          console.log(`   裁剪后: ${(croppedSize / 1024).toFixed(1)} KB`);
          console.log(`   压缩比: ${((1 - croppedSize / originalSize) * 100).toFixed(1)}%`);
          
          resolve(croppedDataUrl);
        } catch (err) {
          console.error('❌ 裁剪失败:', err);
          resolve(null);
        }
      };
      
      img.onerror = (err) => {
        console.error('❌ 图片加载失败:', err);
        resolve(null);
      };
      
      img.src = dataUrl;
    });
  }

  /**
   * 执行 OCR 识别
   */
  async performOCR(imageDataUrl, rect) {
    console.log('🔍 performOCR 被调用');
    console.log('   图片大小:', (imageDataUrl.length / 1024).toFixed(1), 'KB');
    
    Toast.info('Recognizing', 'Performing OCR recognition...', 3000);

    // 发送到 background 进行 OCR 处理
    if (typeof safeSendMessage === 'function') {
      console.log('📤 发送 OCR 请求到 background...');
      
      safeSendMessage({
        type: 'perform-ocr',
        imageDataUrl: imageDataUrl
      }, (response) => {
        console.log('📥 收到 OCR 响应:', response);
        
        if (!response) {
          console.error('❌ OCR 响应为空');
          Toast.error('OCR Failed', 'Extension context invalid');
          return;
        }

        if (response.success) {
          console.log('✅ OCR 识别成功，开始处理结果');
          this.handleOCRResult(response.text);
        } else {
          console.error('❌ OCR 识别失败:', response.error);
          Toast.error('OCR Failed', response.error || 'Recognition failed');
        }
      });
    } else {
      console.error('❌ safeSendMessage 不可用');
      Toast.error('Error', 'Extension not loaded properly');
    }
  }

  /**
   * 处理 OCR 识别结果
   */
  handleOCRResult(text) {
    console.log('📝 handleOCRResult 被调用');
    console.log('   识别文本:', text);
    console.log('   文本长度:', text ? text.length : 0);

    if (!text || !text.trim()) {
      console.warn('⚠️ 识别结果为空');
      Toast.warning('No Text', 'No text recognized', 2500);
      return;
    }

    // 提取英文单词
    console.log('🔤 开始提取英文单词...');
    const words = this.extractEnglishWords(text);

    if (words.length === 0) {
      console.warn('⚠️ 未找到英文单词');
      Toast.warning('No Words', 'No English words found', 2500);
      return;
    }

    console.log('📚 提取到的单词:', words);
    console.log('   单词数量:', words.length);
    Toast.success('OCR Success', `Found ${words.length} words`, 2500);

    // 显示确认对话框
    console.log('💬 显示单词确认对话框...');
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
    dialog.id = 'ocr-word-dialog';
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
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // 构建单词列表，每个单词带复选框
    const wordItems = words.map((word, index) => `
      <label style="display: inline-flex; align-items: center; padding: 6px 10px; margin: 4px; background: white; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; transition: all 0.2s;" data-word-item>
        <input type="checkbox" checked class="word-checkbox" data-word="${word}" style="margin-right: 8px; cursor: pointer; width: 16px; height: 16px;">
        <span style="font-size: 14px; user-select: none;">${word}</span>
      </label>
    `).join('');

    dialog.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; color: #111;">Extracted Words (<span id="selected-count">${words.length}</span>/${words.length})</h3>
        <button id="toggle-all" style="padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 13px;">Unselect All</button>
      </div>
      <div id="words-container" style="flex: 1; margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px; max-height: 400px; overflow-y: auto;">
        ${wordItems}
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="ocr-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
        <button id="ocr-confirm" style="padding: 8px 16px; border: none; background: #2196f3; color: white; border-radius: 6px; cursor: pointer; font-size: 14px;">Add Selected Words</button>
      </div>
    `;

    document.body.appendChild(dialog);

    // 获取元素
    const checkboxes = dialog.querySelectorAll('.word-checkbox');
    const selectedCountEl = dialog.querySelector('#selected-count');
    const toggleAllBtn = dialog.querySelector('#toggle-all');
    const confirmBtn = dialog.querySelector('#ocr-confirm');
    
    // 更新选中数量
    const updateSelectedCount = () => {
      const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
      selectedCountEl.textContent = selectedCount;
      confirmBtn.disabled = selectedCount === 0;
      confirmBtn.style.opacity = selectedCount === 0 ? '0.5' : '1';
      confirmBtn.style.cursor = selectedCount === 0 ? 'not-allowed' : 'pointer';
      
      // 更新切换按钮文本
      if (selectedCount === 0) {
        toggleAllBtn.textContent = 'Select All';
      } else if (selectedCount === words.length) {
        toggleAllBtn.textContent = 'Unselect All';
      } else {
        toggleAllBtn.textContent = 'Select All';
      }
    };
    
    // 监听复选框变化
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectedCount);
      
      // 点击整个标签时切换复选框
      const label = checkbox.closest('[data-word-item]');
      label.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          updateSelectedCount();
        }
      });
      
      // hover 效果
      label.addEventListener('mouseenter', () => {
        label.style.background = '#f0f0f0';
      });
      label.addEventListener('mouseleave', () => {
        label.style.background = 'white';
      });
    });
    
    // 全选/取消全选
    toggleAllBtn.onclick = () => {
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => cb.checked = !allChecked);
      updateSelectedCount();
    };

    // 取消按钮
    document.getElementById('ocr-cancel').onclick = () => {
      dialog.remove();
      Toast.info('Cancelled', 'No words added', 1500);
    };

    // 确认添加选中的单词
    confirmBtn.onclick = () => {
      const selectedWords = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.word);
      
      if (selectedWords.length === 0) {
        Toast.warning('No Selection', 'Please select at least one word', 2000);
        return;
      }
      
      dialog.remove();
      this.addWordsToLibrary(selectedWords);
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
