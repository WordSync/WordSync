/**
 * 轻量级英文词形还原库
 * 基于规则的词形还原，处理常见的英文变形
 */

class SimpleLemmatizer {
  constructor() {
    // 不规则动词映射表
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
      'held': 'hold', 'holding': 'hold', 'holds': 'hold',
      'wrote': 'write', 'written': 'write', 'writing': 'write', 'writes': 'write',
      'stood': 'stand', 'standing': 'stand', 'stands': 'stand',
      'heard': 'hear', 'hearing': 'hear', 'hears': 'hear',
      'let': 'let', 'letting': 'let', 'lets': 'let',
      'meant': 'mean', 'meaning': 'mean', 'means': 'mean',
      'set': 'set', 'setting': 'set', 'sets': 'set',
      'met': 'meet', 'meeting': 'meet', 'meets': 'meet',
      'ran': 'run', 'running': 'run', 'runs': 'run',
      'paid': 'pay', 'paying': 'pay', 'pays': 'pay',
      'sat': 'sit', 'sitting': 'sit', 'sits': 'sit',
      'spoke': 'speak', 'spoken': 'speak', 'speaking': 'speak', 'speaks': 'speak',
      'lay': 'lie', 'lain': 'lie', 'lying': 'lie', 'lies': 'lie',
      'led': 'lead', 'leading': 'lead', 'leads': 'lead',
      'read': 'read', 'reading': 'read', 'reads': 'read',
      'grew': 'grow', 'grown': 'grow', 'growing': 'grow', 'grows': 'grow',
      'lost': 'lose', 'losing': 'lose', 'loses': 'lose',
      'fell': 'fall', 'fallen': 'fall', 'falling': 'fall', 'falls': 'fall',
      'sent': 'send', 'sending': 'send', 'sends': 'send',
      'built': 'build', 'building': 'build', 'builds': 'build',
      'understood': 'understand', 'understanding': 'understand', 'understands': 'understand',
      'drew': 'draw', 'drawn': 'draw', 'drawing': 'draw', 'draws': 'draw',
      'broke': 'break', 'broken': 'break', 'breaking': 'break', 'breaks': 'break',
      'spent': 'spend', 'spending': 'spend', 'spends': 'spend',
      'cut': 'cut', 'cutting': 'cut', 'cuts': 'cut',
      'rose': 'rise', 'risen': 'rise', 'rising': 'rise', 'rises': 'rise',
      'drove': 'drive', 'driven': 'drive', 'driving': 'drive', 'drives': 'drive',
      'bought': 'buy', 'buying': 'buy', 'buys': 'buy',
      'wore': 'wear', 'worn': 'wear', 'wearing': 'wear', 'wears': 'wear',
      'chose': 'choose', 'chosen': 'choose', 'choosing': 'choose', 'chooses': 'choose',
      'sought': 'seek', 'seeking': 'seek', 'seeks': 'seek',
      'threw': 'throw', 'thrown': 'throw', 'throwing': 'throw', 'throws': 'throw',
      'caught': 'catch', 'catching': 'catch', 'catches': 'catch',
      'dealt': 'deal', 'dealing': 'deal', 'deals': 'deal',
      'won': 'win', 'winning': 'win', 'wins': 'win',
      'bore': 'bear', 'born': 'bear', 'bearing': 'bear', 'bears': 'bear',
      'forgot': 'forget', 'forgotten': 'forget', 'forgetting': 'forget', 'forgets': 'forget',
      'shook': 'shake', 'shaken': 'shake', 'shaking': 'shake', 'shakes': 'shake',
      'flew': 'fly', 'flown': 'fly', 'flying': 'fly', 'flies': 'fly',
      'ate': 'eat', 'eaten': 'eat', 'eating': 'eat', 'eats': 'eat'
    };

    // 不规则复数映射表
    this.irregularPlurals = {
      'children': 'child',
      'men': 'man',
      'women': 'woman',
      'people': 'person',
      'feet': 'foot',
      'teeth': 'tooth',
      'mice': 'mouse',
      'geese': 'goose',
      'oxen': 'ox',
      'sheep': 'sheep',
      'deer': 'deer',
      'fish': 'fish',
      'species': 'species',
      'series': 'series',
      'means': 'mean',
      'criteria': 'criterion',
      'phenomena': 'phenomenon',
      'data': 'datum',
      'analyses': 'analysis',
      'theses': 'thesis',
      'crises': 'crisis',
      'hypotheses': 'hypothesis'
    };
  }

  /**
   * 词形还原主函数
   * @param {string} word - 需要还原的单词
   * @returns {string} - 还原后的词根
   */
  lemmatize(word) {
    if (!word || typeof word !== 'string') return word;
    
    const lowerWord = word.toLowerCase().trim();
    
    // 1. 检查不规则动词
    if (this.irregularVerbs[lowerWord]) {
      return this.irregularVerbs[lowerWord];
    }
    
    // 2. 检查不规则复数
    if (this.irregularPlurals[lowerWord]) {
      return this.irregularPlurals[lowerWord];
    }
    
    // 3. 应用规则处理
    return this.applyRules(lowerWord);
  }

  /**
   * 应用规则进行词形还原
   */
  applyRules(word) {
    // 太短的词不处理
    if (word.length <= 3) return word;

    // 处理 -ies 结尾 (studies -> study)
    if (word.endsWith('ies') && word.length > 4) {
      return word.slice(0, -3) + 'y';
    }

    // 处理 -es 结尾 (watches -> watch, boxes -> box)
    if (word.endsWith('es') && word.length > 3) {
      const base = word.slice(0, -2);
      // 检查是否是 -ches, -shes, -xes, -ses, -zes
      if (base.endsWith('ch') || base.endsWith('sh') || 
          base.endsWith('x') || base.endsWith('s') || base.endsWith('z')) {
        return base;
      }
    }

    // 处理 -s 结尾的复数 (cats -> cat, runs -> run)
    if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss') && !word.endsWith('us')) {
      return word.slice(0, -1);
    }

    // 处理 -ed 结尾的过去式 (played -> play, stopped -> stop)
    if (word.endsWith('ed') && word.length > 4) {
      const base = word.slice(0, -2);
      // 处理双写辅音字母 (stopped -> stop)
      if (base.length >= 3 && 
          base[base.length - 1] === base[base.length - 2] &&
          this.isConsonant(base[base.length - 1])) {
        return base.slice(0, -1);
      }
      return base;
    }

    // 处理 -ing 结尾的进行时 (playing -> play, running -> run)
    if (word.endsWith('ing') && word.length > 5) {
      const base = word.slice(0, -3);
      // 处理双写辅音字母 (running -> run)
      if (base.length >= 2 && 
          base[base.length - 1] === base[base.length - 2] &&
          this.isConsonant(base[base.length - 1])) {
        return base.slice(0, -1);
      }
      // 处理 -e 结尾 (making -> make)
      if (!base.endsWith('e') && this.mightNeedE(base)) {
        return base + 'e';
      }
      return base;
    }

    // 处理 -er 比较级 (bigger -> big, faster -> fast)
    if (word.endsWith('er') && word.length > 4) {
      const base = word.slice(0, -2);
      // 处理双写辅音字母 (bigger -> big)
      if (base.length >= 2 && 
          base[base.length - 1] === base[base.length - 2] &&
          this.isConsonant(base[base.length - 1])) {
        return base.slice(0, -1);
      }
    }

    // 处理 -est 最高级 (biggest -> big, fastest -> fast)
    if (word.endsWith('est') && word.length > 5) {
      const base = word.slice(0, -3);
      // 处理双写辅音字母 (biggest -> big)
      if (base.length >= 2 && 
          base[base.length - 1] === base[base.length - 2] &&
          this.isConsonant(base[base.length - 1])) {
        return base.slice(0, -1);
      }
    }

    // 处理 -ly 副词 (quickly -> quick)
    if (word.endsWith('ly') && word.length > 4) {
      return word.slice(0, -2);
    }

    return word;
  }

  /**
   * 判断是否是辅音字母
   */
  isConsonant(char) {
    return char && /[bcdfghjklmnpqrstvwxyz]/.test(char.toLowerCase());
  }

  /**
   * 判断词根是否可能需要 e
   */
  mightNeedE(base) {
    // 简单规则：以辅音+元音+辅音结尾的短词可能需要 e
    if (base.length < 3) return false;
    const pattern = /[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/;
    return pattern.test(base);
  }

  /**
   * 批量处理多个单词
   * @param {string[]} words - 单词数组
   * @returns {string[]} - 还原后的单词数组
   */
  lemmatizeBatch(words) {
    return words.map(word => this.lemmatize(word));
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimpleLemmatizer;
}
