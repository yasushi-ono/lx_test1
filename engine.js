/* ========================================
   LX ノベルゲーム エンジン
   ======================================== */

class NovelEngine {
  constructor() {
    // ゲーム状態
    this.scenarioData = null;
    this.currentScene = null;
    this.currentStep = 0;
    this.dangerCount = 0;
    this.choices = { BR1: null, BR2: null, BR3: null, BR4: null };
    this.isAnimating = false;
    this.uiVisible = false;

    // キャラクター状態（左=藤井, 右=中村）
    this.charState = { left: null, right: null, active: null };

    // DOM要素
    this.bgLayer = document.getElementById('bg-layer');
    this.charLayer = document.getElementById('char-layer');
    this.charSpriteLeft = document.getElementById('char-sprite-left');
    this.charSpriteRight = document.getElementById('char-sprite-right');
    this.textbox = document.getElementById('textbox');
    this.speakerName = document.getElementById('speaker-name');
    this.textContent = document.getElementById('text-content');
    this.choiceLayer = document.getElementById('choice-layer');
    this.uiOverlay = document.getElementById('ui-overlay');
    this.dayLabel = document.getElementById('day-label');
    this.clickIndicator = document.getElementById('click-indicator');

    // イベントバインド
    this.textbox.addEventListener('click', () => this.advance());
    this.uiOverlay.addEventListener('click', (e) => {
      // リスタートボタン以外のクリックで閉じる
      if (!e.target.classList.contains('result-restart')) {
        this.advance();
      }
    });
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());

    // キーボード操作
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.advance();
      }
    });
  }

  // --- 初期化 ---
  init() {
    // scenario.js からグローバル変数として読み込み済み
    if (typeof SCENARIO_DATA !== 'undefined') {
      this.scenarioData = SCENARIO_DATA;
      console.log('Scenario loaded:', Object.keys(this.scenarioData.scenes).length, 'scenes');
      this.preloadAssets();
    } else {
      console.error('SCENARIO_DATA not found. Make sure scenario.js is loaded before engine.js');
    }
  }

  // --- アセットプリロード ---
  preloadAssets() {
    const images = new Set();
    // シナリオ内の全画像パスを収集
    for (const scene of Object.values(this.scenarioData.scenes)) {
      if (!scene.steps) continue;
      for (const step of scene.steps) {
        if (step.bg && step.bg !== 'none' && !step.bg.startsWith('result_')) {
          images.add(`assets/backgrounds/${step.bg}.webp`);
        }
        if (step.char && step.char !== 'none') {
          images.add(`assets/characters/${step.char}.webp`);
        }
      }
    }
    // リザルト背景
    images.add('assets/backgrounds/bg_result_good.webp');

    // バックグラウンドで先読み
    let loaded = 0;
    for (const src of images) {
      const img = new Image();
      img.onload = () => { loaded++; };
      img.onerror = () => { console.warn('Preload failed:', src); loaded++; };
      img.src = src;
    }
    console.log(`Preloading ${images.size} assets...`);
  }

  // --- ゲーム開始 ---
  startGame() {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    this.dangerCount = 0;
    this.choices = { BR1: null, BR2: null, BR3: null, BR4: null };
    this.loadScene('S1');
  }

  // --- シーン読み込み ---
  loadScene(sceneId) {
    const scene = this.scenarioData.scenes[sceneId];
    if (!scene) {
      console.error('Scene not found:', sceneId);
      return;
    }

    // NORMAL S9N: 動的に異変ステップを追加
    if (sceneId === 'S9N') {
      scene.steps = this.buildNormalAnomalySteps();
    }

    this.currentScene = scene;
    this.currentSceneId = sceneId;
    this.currentStep = 0;

    // テキストボックスをクリア
    this.textContent.innerHTML = '';
    this.speakerName.style.display = 'none';
    this.clickIndicator.style.display = 'none';

    // キャラクターをリセット（シーン切替時）
    this.hideAllCharacters();

    // 日付トランジション
    if (scene.dayLabel) {
      this.showDayTransition(scene.dayLabel);
    } else {
      this.processStep();
    }
  }

  // --- NORMAL ENDの異変ステップを動的生成 ---
  buildNormalAnomalySteps() {
    const steps = [
      { bg: 'bg_office_tense', day: '木曜日', char: 'nakamura_worried' },
      { type: 'narration', text: '木曜日。フレッシュマルシェのクライアントMTGは無事に終わったが、中村は何か引っかかるものを感じていた。' }
    ];

    if (this.choices.BR1 === 'A') {
      steps.push({ type: 'thought', text: '（なんか今日、PCの動作が重い……。いつもサクサク動くのに、もっさりしてる感じがする）' });
      steps.push({ type: 'narration', text: 'タスクマネージャーを開くと、見覚えのないプロセスがバックグラウンドで動いていた。' });
    }
    if (this.choices.BR2 === 'A') {
      steps.push({
        ui: 'slack',
        uiData: {
          channel: 'DM: 北條健一 → 中村遥',
          messages: [
            { sender: '北條健一', avatarClass: 'houjo', initial: '北', text: '中村さん、ちょっといいかな。フレッシュマルシェの管理画面に、昨日の未明に見覚えのないIPからのログイン記録があるんだけど、心当たりある？' }
          ]
        }
      });
      steps.push({ type: 'thought', text: '（え……昨日の未明？私じゃない。……まさか、火曜日のカフェのWi-Fiが関係してる？）' });
    }
    if (this.choices.BR3 === 'A') {
      steps.push({
        ui: 'slack',
        uiData: {
          channel: 'DM: 藤井翔太 → 中村遥',
          messages: [
            { sender: '藤井翔太', avatarClass: 'fujii', initial: '藤', text: '中村さん、すんません……この前のパスワード、DM消すの忘れてました……今消しますね' }
          ]
        }
      });
      steps.push({ type: 'thought', text: '（そういえば、あのパスワード……まだ変更してない。もしSlackのアカウントに何かあったら……）' });
    }
    if (this.choices.BR4 === 'A') {
      steps.push({
        ui: 'email',
        uiData: {
          subject: 'Re: メールの宛先について',
          from: '佐藤部長 <sato@freshmarche.co.jp>',
          suspicious: false,
          body: '中村様\n\nお世話になっております。先日いただいたメールですが、弊社関係者のメールアドレスが他社の方にも見える状態になっているようです。ご確認いただけますでしょうか。'
        }
      });
      steps.push({ type: 'thought', text: '（……あの時の、宛先の件……やっぱり気づかれた）' });
    }

    return steps;
  }

  // --- 全キャラクター非表示 ---
  hideAllCharacters() {
    this.charSpriteLeft.style.display = 'none';
    this.charSpriteRight.style.display = 'none';
    this.charSpriteLeft.classList.remove('inactive');
    this.charSpriteRight.classList.remove('inactive');
    this.charState = { left: null, right: null, active: null };
  }

  // --- 日付トランジション ---
  showDayTransition(label) {
    // トランジション前にキャラを隠す（チラ見え防止）
    this.charSpriteLeft.style.display = 'none';
    this.charSpriteRight.style.display = 'none';

    const container = document.getElementById('game-container');
    const div = document.createElement('div');
    div.className = 'day-transition active';
    div.textContent = label;
    container.appendChild(div);

    setTimeout(() => {
      div.remove();
      this.processStep();
    }, 2000);
  }

  // --- ステップ処理 ---
  processStep() {
    if (!this.currentScene || this.currentStep >= this.currentScene.steps.length) {
      this.endScene();
      return;
    }

    const step = this.currentScene.steps[this.currentStep];

    // 背景変更（テキストもクリア）
    if (step.bg) {
      this.setBackground(step.bg);
      this.textContent.innerHTML = '';
      this.speakerName.style.display = 'none';
      this.clickIndicator.style.display = 'none';
    }

    // 日付ラベル
    if (step.day) {
      this.dayLabel.textContent = step.day;
      this.dayLabel.style.display = 'block';
    }

    // キャラクター変更
    if (step.char !== undefined) {
      this.setCharacter(step.char);
    }

    // UI表示
    if (step.ui) {
      this.showUI(step.ui, step.uiData);
      return; // UIはクリックで閉じてから次へ
    }

    // 選択肢表示
    if (step.choices) {
      this.showChoices(step.choices);
      return; // 選択肢はクリックしてから次へ
    }

    // テキスト表示
    if (step.text) {
      this.showText(step);
    }
  }

  // --- 背景設定 ---
  setBackground(bgId) {
    if (bgId === 'none') {
      this.bgLayer.style.backgroundImage = 'none';
      this.bgLayer.style.background = '#1a1a2e';
      return;
    }
    if (bgId === 'result_good') {
      this.bgLayer.style.background = 'none';
      this.bgLayer.style.backgroundImage = "url('assets/backgrounds/bg_result_good.webp')";
      this.bgLayer.style.backgroundSize = 'cover';
      this.bgLayer.style.backgroundPosition = 'center';
      return;
    }
    if (bgId === 'result_normal') {
      this.bgLayer.style.backgroundImage = 'none';
      this.bgLayer.style.background = 'linear-gradient(135deg, #2e2a0a, #4a3e1a)';
      return;
    }
    if (bgId === 'result_bad') {
      this.bgLayer.style.backgroundImage = 'none';
      this.bgLayer.style.background = 'linear-gradient(135deg, #2e0a0a, #4a1a1a)';
      return;
    }
    this.bgLayer.style.background = 'none';
    this.bgLayer.style.backgroundImage = `url('assets/backgrounds/${bgId}.webp')`;
    this.bgLayer.style.backgroundSize = 'cover';
    this.bgLayer.style.backgroundPosition = 'center';
  }

  // --- キャラクター設定（2体同時対応） ---
  setCharacter(charId) {
    // 全非表示
    if (!charId || charId === 'none') {
      this.hideAllCharacters();
      return;
    }

    // どちらのスロットか判定（fujii=左, nakamura=右）
    const isFujii = charId.startsWith('fujii');
    const sprite = isFujii ? this.charSpriteLeft : this.charSpriteRight;
    const otherSprite = isFujii ? this.charSpriteRight : this.charSpriteLeft;
    const side = isFujii ? 'left' : 'right';

    // スプライト画像を設定
    sprite.onerror = () => {
      console.warn('Character image not found:', charId);
      sprite.style.display = 'none';
    };
    sprite.src = `assets/characters/${charId}.webp`;
    sprite.style.display = 'block';
    sprite.style.opacity = '0';
    requestAnimationFrame(() => {
      sprite.style.opacity = '1';
    });

    // 状態を更新
    this.charState[side] = charId;
    this.charState.active = side;

    // アクティブ/非アクティブの見た目を更新
    sprite.classList.remove('inactive');
    if (otherSprite.style.display !== 'none') {
      // もう片方が表示中ならinactiveに
      otherSprite.classList.add('inactive');
    }
  }

  // --- テキスト表示 ---
  showText(step) {
    // テキストタイプに応じたスタイル
    this.textbox.className = '';
    if (step.type === 'thought') {
      this.textbox.className = 'thought';
    }

    // 話者名
    if (step.speaker) {
      this.speakerName.textContent = step.speaker;
      this.speakerName.style.display = 'block';

      // 話者に応じてアクティブキャラを切り替え
      this.highlightSpeaker(step.speaker);
    } else {
      this.speakerName.style.display = 'none';

      // ナレーション・心の声は中村（主人公）側をアクティブに
      this.highlightSpeaker('中村');
    }

    // テキスト表示（タイプライター風）
    this.typeText(step.text);
  }

  // --- 話者ハイライト ---
  highlightSpeaker(speaker) {
    // 話者名に応じてどちらをアクティブにするか
    if (speaker === '藤井') {
      this.charSpriteLeft.classList.remove('inactive');
      if (this.charSpriteRight.style.display !== 'none') {
        this.charSpriteRight.classList.add('inactive');
      }
      this.charState.active = 'left';
    } else if (speaker === '中村') {
      this.charSpriteRight.classList.remove('inactive');
      if (this.charSpriteLeft.style.display !== 'none') {
        this.charSpriteLeft.classList.add('inactive');
      }
      this.charState.active = 'right';
    }
  }

  // --- タイプライターエフェクト ---
  typeText(text) {
    this.isAnimating = true;
    this.textContent.innerHTML = '';
    this.clickIndicator.style.display = 'none';
    this.fullText = text;
    // \n を <br> に変換した完成版HTML
    this.fullTextHtml = text.replace(/\n/g, '<br>');

    let i = 0;
    let displayed = '';
    const speed = 30; // ミリ秒/文字
    this.typeTimer = setInterval(() => {
      if (i < text.length) {
        if (text[i] === '\n') {
          displayed += '<br>';
        } else {
          displayed += text[i];
        }
        this.textContent.innerHTML = displayed;
        i++;
      } else {
        clearInterval(this.typeTimer);
        this.isAnimating = false;
        this.clickIndicator.style.display = 'block';
      }
    }, speed);
  }

  // --- テキスト即時表示 ---
  skipTypewriter() {
    clearInterval(this.typeTimer);
    this.textContent.innerHTML = this.fullTextHtml;
    this.isAnimating = false;
    this.clickIndicator.style.display = 'block';
  }

  // --- クリック進行 ---
  advance() {
    // UI表示中は閉じる
    if (this.uiVisible) {
      this.hideUI();
      this.currentStep++;
      this.processStep();
      return;
    }

    // 選択肢表示中は無視
    if (this.choiceLayer.style.display !== 'none') {
      return;
    }

    // タイプライター中は即時表示
    if (this.isAnimating) {
      this.skipTypewriter();
      return;
    }

    // 次のステップへ
    this.currentStep++;
    this.processStep();
  }

  // --- UI表示 ---
  showUI(type, data) {
    this.uiVisible = true;
    this.uiOverlay.innerHTML = '';
    this.uiOverlay.style.display = 'flex';
    this.uiOverlay.className = 'active';

    // リザルト画面ではテキストボックスを隠す＆キャラを右寄せ
    if (type === 'result') {
      this.textbox.style.display = 'none';
      this.uiOverlay.classList.add('result-mode');
      this.charLayer.classList.add('char-right');
      // リザルトではinactiveを外す
      this.charSpriteLeft.classList.remove('inactive');
      this.charSpriteRight.classList.remove('inactive');
    }

    let html = '';

    switch (type) {
      case 'email':
        html = this.buildEmailUI(data);
        break;
      case 'address_compare':
        html = this.buildAddressCompareUI(data);
        break;
      case 'slack':
        html = this.buildSlackUI(data);
        break;
      case 'slack_dm_password':
        html = this.buildSlackDMPasswordUI(data);
        break;
      case 'wifi':
        html = this.buildWifiUI(data);
        break;
      case 'result':
        // 動的アイテムの場合は選択結果に基づいて生成
        if (data.items.some(i => i.status === 'dynamic')) {
          data.items = this.getResultData(data.grade);
        }
        html = this.buildResultUI(data);
        break;
    }

    const closeHint = type === 'result' ? '' : '<div class="ui-close-hint">クリックで閉じる</div>';
    this.uiOverlay.innerHTML = html + closeHint;

    // リザルト画面のリスタートボタン
    const restartBtn = this.uiOverlay.querySelector('.result-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.restart();
      });
    }
  }

  // --- UI非表示 ---
  hideUI() {
    this.uiOverlay.style.display = 'none';
    this.uiOverlay.className = '';
    this.uiOverlay.innerHTML = '';
    this.uiVisible = false;
  }

  // --- メールUI構築 ---
  buildEmailUI(data) {
    const suspiciousClass = data.suspicious ? 'suspicious' : '';
    let html = `<div class="ui-email">
      <div class="email-header">
        <div class="email-subject">${data.subject}</div>
        <div class="email-field"><span class="label">From:</span><span class="${suspiciousClass}">${data.from}</span></div>`;
    if (data.to) {
      html += `<div class="email-field"><span class="label">To:</span><span>${data.to}</span></div>`;
    }
    html += `</div><div class="email-body">${data.body}</div>`;
    if (data.attachment) {
      html += `<div class="email-attachment">${data.attachment}</div>`;
    }
    html += '</div>';
    return html;
  }

  // --- アドレス比較UI構築 ---
  buildAddressCompareUI(data) {
    return `<div class="ui-address-compare">
      <div class="address-compare-title">送信元アドレスの比較</div>
      <div class="address-row real">
        <div class="label">いつものアドレス</div>
        <div class="addr">${data.real}</div>
      </div>
      <div style="margin:12px 0;color:#555;">↕</div>
      <div class="address-row fake">
        <div class="label">今回のアドレス</div>
        <div class="addr">${data.fake}</div>
      </div>
    </div>`;
  }

  // --- SlackUI構築 ---
  buildSlackUI(data) {
    let msgs = '';
    for (const msg of data.messages) {
      const avatarClass = msg.avatarClass || '';
      const initial = msg.initial || msg.sender.charAt(0);
      msgs += `<div class="slack-msg">
        <div class="slack-avatar ${avatarClass}">${initial}</div>
        <div class="slack-msg-content">
          <div class="slack-sender">${msg.sender}</div>
          <div class="slack-text">${msg.text}</div>
        </div>
      </div>`;
    }
    return `<div class="ui-slack">
      <div class="slack-header"><span class="slack-channel">${data.channel || '#general'}</span></div>
      <div class="slack-messages">${msgs}</div>
    </div>`;
  }

  // --- パスワードDM構築 ---
  buildSlackDMPasswordUI(data) {
    return `<div class="ui-slack">
      <div class="slack-header"><span class="slack-channel">DM: 中村遥 → 藤井翔太</span></div>
      <div class="slack-messages">
        <div class="slack-msg">
          <div class="slack-avatar nakamura">中</div>
          <div class="slack-msg-content">
            <div class="slack-sender">中村遥</div>
            <div class="slack-text">フレッシュマルシェ管理画面</div>
            <div class="slack-dm-password">ID: nakamura_bl<br>PW: Bright2024!mar</div>
          </div>
        </div>
        <div class="slack-msg">
          <div class="slack-avatar fujii">藤</div>
          <div class="slack-msg-content">
            <div class="slack-sender">藤井翔太</div>
            <div class="slack-text">ログインできましたー！確認しまーす！</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // --- Wi-FiUI構築 ---
  buildWifiUI(data) {
    return `<div class="ui-wifi">
      <div class="wifi-header">Wi-Fi</div>
      <div class="wifi-list">
        <div class="wifi-item no-lock">
          <span class="wifi-name">Cafe_FreeWiFi</span>
          <span class="wifi-icon">📶 🔓</span>
        </div>
        <div class="wifi-item locked">
          <span class="wifi-name">iPhone（テザリング）</span>
          <span class="wifi-icon">📶 🔒</span>
        </div>
      </div>
    </div>`;
  }

  // --- リザルトUI構築 ---
  buildResultUI(data) {
    const items = data.items.map(item => {
      const icon = item.status === 'ok' ? '✅' : item.status === 'warn' ? '⚠️' : '❌';
      return `<div class="result-item"><span class="result-icon">${icon}</span><span>${item.text}</span></div>`;
    }).join('');

    return `<div class="ui-result ${data.grade}">
      <div class="result-title">${data.title}</div>
      ${items}
      <div class="result-message">${data.message}</div>
      <button class="result-restart">もう一度プレイ</button>
    </div>`;
  }

  // --- 選択肢表示 ---
  showChoices(choices) {
    this.choiceLayer.innerHTML = '';
    this.choiceLayer.style.display = 'flex';
    this.textbox.style.display = 'none';

    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      const label = document.createElement('div');
      label.className = 'choice-label';
      label.textContent = String.fromCharCode(65 + i); // A, B, C, D
      btn.appendChild(label);
      const text = document.createElement('div');
      text.textContent = choice.text;
      btn.appendChild(text);

      btn.addEventListener('click', () => {
        this.selectChoice(choice);
      });

      this.choiceLayer.appendChild(btn);
    });
  }

  // --- 選択肢決定 ---
  selectChoice(choice) {
    this.choiceLayer.style.display = 'none';
    this.textbox.style.display = 'flex';

    // 危険選択カウント
    if (choice.danger) {
      this.dangerCount++;
    }

    // 選択記録
    if (choice.branchId) {
      this.choices[choice.branchId] = choice.danger ? 'A' : (choice.value || 'B');
    }

    // 次のシーンへ
    if (choice.next) {
      this.loadScene(choice.next);
    }
  }

  // --- シーン終了 ---
  endScene() {
    const scene = this.currentScene;

    // 動的ルート判定
    if (scene.nextRoute) {
      const nextSceneId = this.resolveRoute(scene.nextRoute);
      if (nextSceneId) {
        this.loadScene(nextSceneId);
        return;
      }
    }

    // 通常の次シーンへ
    if (scene.next) {
      this.loadScene(scene.next);
    }
  }

  // --- ルート判定 ---
  resolveRoute(routeConfig) {
    if (routeConfig.type === 'danger_count') {
      if (this.dangerCount === 0) return routeConfig.good;
      if (this.dangerCount <= 2) return routeConfig.normal;
      return routeConfig.bad;
    }
    if (routeConfig.type === 'dynamic_normal') {
      // NORMAL ENDの異変内容を動的に生成
      return routeConfig.target;
    }
    return null;
  }

  // --- リザルトデータ生成 ---
  getResultData(grade) {
    const items = [
      { key: 'BR1', text: '標的型攻撃メール → 送信元を確認し、情シスに報告', textBad: '標的型攻撃メール → 添付ファイルを開いてしまった' },
      { key: 'BR2', text: '公共Wi-Fi → テザリングで安全に作業', textBad: '公共Wi-Fi → フリーWi-Fiで業務データにアクセス' },
      { key: 'BR3', text: 'パスワード共有 → 画面共有で対応', textBad: 'パスワード共有 → Slackでパスワードを送信' },
      { key: 'BR4', text: 'メール誤送信 → 送信前に宛先を確認', textBad: 'メール誤送信 → 宛先を確認せず送信' },
    ];

    return items.map(item => {
      const isDanger = this.choices[item.key] === 'A';
      return {
        status: isDanger ? (grade === 'bad' ? 'ng' : 'warn') : 'ok',
        text: isDanger ? item.textBad : item.text
      };
    });
  }

  // --- リスタート ---
  restart() {
    this.hideUI();
    this.hideAllCharacters();
    this.charLayer.classList.remove('char-right');
    this.dayLabel.style.display = 'none';
    this.textbox.style.display = 'flex';
    this.bgLayer.style.backgroundImage = 'none';
    this.bgLayer.style.background = '#1a1a2e';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
  }
}

// --- レスポンシブスケーリング ---
function fitToScreen() {
  const container = document.getElementById('game-container');
  const BASE_W = 1280;
  const BASE_H = 720;
  const scaleX = window.innerWidth / BASE_W;
  const scaleY = window.innerHeight / BASE_H;
  const scale = Math.min(scaleX, scaleY);
  container.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitToScreen);
window.addEventListener('orientationchange', () => {
  setTimeout(fitToScreen, 100);
});
fitToScreen();

// --- 起動 ---
const engine = new NovelEngine();
engine.init();
