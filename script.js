    // =====================
    // 特殊記号SVG
    // =====================
    const symbols = {
      "√": `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M 8.1 57.041 C 20.013 56.949 21.085 57.686 24 62 C 39.193 84.484 33.775 76.807 39.353 83.329 C 41.278 4.323 37.28 3.892 40.609 3.884 C 100.082 3.742 97.135 3.378 99.357 3.667"
            fill="none"
            stroke="black"
            stroke-width="7.2"
            stroke-linecap="round"
            stroke-linejoin="round"/>
        </svg>
      `,
      "⟌": `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M 26.417 88.494 C 65.613 93.927 71.751 9.542 28.157 3.499 L 98.958 3.292"
            fill="none"
            stroke="black"
            stroke-width="7.2"
            stroke-linecap="round"
            stroke-linejoin="round"/>
        </svg>
      `
    };

    // =====================
    // 基本データ
    // =====================
    let rows = 5;
    let cols = 5;
    let cellsData = [];
    let selectedPos = null;
    let inputMode = "main";

    // =====================
    // ヒントウィザード
    // =====================

    // 現在どの種類のセルを選択しているか
    // "main" = メインボード
    // "hint" = ヒントセル
    let selectedTarget = null;

    // ヒントセルに入力されている値
    let hintValue = "";

    // 上線・斜線などのラインステータス
    // [{type: 'topline'|'slash', row: number, col: number}]
    let lines = [];

    // 「.」専用データ
    // [{row: number, col: number}]
    let dots = [];

    // 最後にタップした日時（タイムスタンプ）
    let lastTapTime = 0;

    // 最後にタップしたセル位置（{r: 行番号, c: 列番号} または null）
    let lastTapPos = null;


    // =====================
    // 初期化
    // =====================
    function init() {
      cellsData = [];

      for (let r = 0; r < rows; r++) {
        cellsData[r] = [];
        for (let c = 0; c < cols; c++) {
          cellsData[r][c] = {
            main: "",
            small: ""
          };
        }
      }

      lines = [];
      dots = [];
      render();
    }

    // =====================
    // 描画
    // =====================
    function render() {
      let grid = document.getElementById("grid");
      grid.innerHTML = "";

      let size = getComputedStyle(document.documentElement).getPropertyValue("--cell-size");
      grid.style.gridTemplateColumns = `repeat(${cols},${size})`;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let cell = document.createElement("div");
          cell.className = "cell";
          cell.dataset.row = r;
          cell.dataset.col = c;

          // =====================
          // 選択ハイライト
          // =====================
          if (selectedPos && selectedPos.r === r && selectedPos.c === c) {
            cell.classList.add(inputMode === "small" ? "smallSelected" : "selected");
          }

          // =====================
          // 右上小文字
          // =====================
          let smallDisplay = cellsData[r][c].small;

          if (inputMode === "small" && selectedPos && selectedPos.r === r && selectedPos.c === c && !smallDisplay) {
            smallDisplay = `
              <svg viewBox="0 0 100 100" style="width:85%; height:85%;">
                <rect x="8" y="8" width="84" height="84" fill="rgba(26, 115, 232, 0.15)" stroke="#1a73e8" stroke-width="10" rx="8" />
              </svg>
            `;
          }

          // =====================
          // セル内容
          // =====================
          cell.innerHTML = `
            ${renderSymbol(cellsData[r][c].main)}
            <span class="smallText">${smallDisplay}</span>
          `;

          // =====================
          // タップ処理
          // =====================
          cell.onpointerdown = (e) => {
            let now = Date.now();

            // メインボードのセルを選択
            selectedTarget = { type: "main" };
            selectedPos = { r, c };

            // 300ms以内の同一セルダブルタップで「上線（計算線）」の追加/削除
            if (lastTapPos && lastTapPos.r === r && lastTapPos.c === c && (now - lastTapTime < 300)) {
              let index = lines.findIndex(l => l.row === r && l.col === c && l.type === "topline");

              if (index >= 0) {
                lines.splice(index, 1);
              } else {
                lines.push({ type: "topline", row: r, col: c });
              }

              lastTapTime = 0;
              lastTapPos = null;
            } else {
              lastTapTime = now;
              lastTapPos = { r, c };
            }

            render();
          };

          grid.appendChild(cell);
        }
      }

      drawLines();
    }

    // =====================
    // 通常記号の描画
    // =====================
    function renderSymbol(value) {
      if (symbols[value]) {
        return symbols[value];
      }
      return `<span class="mainText">${value}</span>`;
    }

    // =====================
    // 入力・消去・斜線追加
    // =====================
    function input(value) {
      // =====================
      // ヒントセルが選択されている
      // =====================
      if (selectedTarget && selectedTarget.type === "hint") {
        // 数字だけ連続入力
        if (/^\d$/.test(value)) {
          hintValue += value;
          renderHintCell();
          renderHint();
        }
        return;
      }

      // =====================
      // メインボード
      // =====================
      if (!selectedPos) return;

      let { r, c } = selectedPos;

      if (inputMode === "main") {
        // メインボードに入力
        cellsData[r][c].main = value;

        // =====================
        // 入力後、右のセルへ移動
        // =====================
        if (c < cols - 1) {
          selectedPos.c++;
        }
      } else {
        cellsData[r][c].small = value;
        inputMode = "main";
      }

      render();
    }

    // =====================
    // 「.」を独立して追加
    // =====================
    function addDot() {
      if (!selectedPos) return;

      let { r, c } = selectedPos;

      // 同じセルには1つだけ
      let exists = dots.some(d => d.row === r && d.col === c);

      if (!exists) {
        dots.push({ row: r, col: c });
      }

      render();
    }

    // =====================
    // 斜線をセルの上に乗せる
    // =====================
    function addSlash() {
      if (!selectedPos) return;

      let { r, c } = selectedPos;

      let exists = lines.some(l => l.row === r && l.col === c && l.type === "slash");

      if (!exists) {
        lines.push({ type: "slash", row: r, col: c });
      }

      render();
    }

    // =====================
    // 右上入力モード
    // =====================
    function smallMode() {
      inputMode = "small";
      render();
    }

    function mainMode() {
      inputMode = "main";
      render();
    }

    // =====================
    // 消去
    // =====================
    function erase() {
      if (!selectedTarget) return;

      // =====================
      // ヒントセル
      // =====================
      if (selectedTarget.type === "hint") {
        hintValue = "";
        renderHintCell();
        renderHint();
        return;
      }

      // =====================
      // メインボード
      // =====================
      if (selectedTarget.type === "main") {
        let { r, c } = selectedPos;

        cellsData[r][c] = {
          main: "",
          small: ""
        };

        lines = lines.filter(l => !(l.row === r && l.col === c));
        dots = dots.filter(d => !(d.row === r && d.col === c));

        render();
      }
    }

    // =====================
    // 行列追加
    // =====================
    function addColumn() {
      cols++;

      for (let r = 0; r < rows; r++) {
        cellsData[r].push({
          main: "",
          small: ""
        });
      }

      render();
    }

    function addLeft() {
      cols++;

      for (let r = 0; r < rows; r++) {
        cellsData[r].unshift({
          main: "",
          small: ""
        });
      }

      // 上線・斜線を右へ1つシフト
      lines.forEach(l => { l.col++; });

      // 「.」も右へ1つシフト
      dots.forEach(d => { d.col++; });

      if (selectedPos) {
        selectedPos.c++;
      }

      render();
    }

    function addRow() {
      rows++;

      let row = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          main: "",
          small: ""
        });
      }

      cellsData.push(row);
      render();
    }

    // =====================
    // ドローライン一括描画
    // 上線・斜線・「.」
    // =====================
    function drawLines() {
      let layer = document.getElementById("lineLayer");
      layer.innerHTML = "";

      // =====================
      // 上線・斜線
      // =====================
      lines.forEach(l => {
        let cell = document.querySelector(`.cell[data-row="${l.row}"][data-col="${l.col}"]`);
        if (!cell) return;

        let lineContainer = document.createElement("div");
        lineContainer.style.position = "absolute";
        lineContainer.style.left = cell.offsetLeft + "px";
        lineContainer.style.top = cell.offsetTop + "px";
        lineContainer.style.width = cell.offsetWidth + "px";
        lineContainer.style.height = cell.offsetHeight + "px";
        lineContainer.style.pointerEvents = "none";

        if (l.type === "topline") {
          // =====================
          // 上線
          // =====================
          lineContainer.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: black;"></div>
          `;
        } else if (l.type === "slash") {
          // =====================
          // 斜線
          // =====================
          lineContainer.innerHTML = `
            <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
              <line x1="65" y1="18" x2="28" y2="82" stroke="black" stroke-width="4.5" stroke-linecap="round" />
            </svg>
          `;
        }

        layer.appendChild(lineContainer);
      });

      // =====================
      // 「.」を描画
      // =====================
      dots.forEach(d => {
        let cell = document.querySelector(`.cell[data-row="${d.row}"][data-col="${d.col}"]`);
        if (!cell) return;

        let dot = document.createElement("div");
        dot.textContent = ".";
        dot.style.position = "absolute";

        /*
         * 通常の数字はセル中央。
         * そこからセル幅の50%右へ移動すると、
         * 選択セルの右端の罫線位置になる。
         */
        dot.style.left = (cell.offsetLeft + cell.offsetWidth) + "px";

        /*
         * 高さは通常の数字と同じくセル中央。
         */
        dot.style.top = (cell.offsetTop + cell.offsetHeight / 2) + "px";

        // ドット自身の中心を基準位置に合わせる
        dot.style.transform = "translate(-50%, -50%)";
        dot.style.fontSize = "var(--font-size)";
        dot.style.lineHeight = "1";
        dot.style.pointerEvents = "none";

        layer.appendChild(dot);
      });
    }

    // =====================
    // 追加キー展開
    // =====================
    function expandKeys() {
      let button = document.getElementById("expandButton");
      let old = document.getElementById("extraKeys");

      if (old) {
        old.remove();
        button.innerText = "▶";
        return;
      }

      let div = document.createElement("div");
      div.id = "extraKeys";

      div.innerHTML = `
        <div class="dragHandle">⠿⠿</div>

        <button onclick="input('𝑎')">𝑎</button>
        <button onclick="input('𝑏')">𝑏</button>
        <button onclick="input('𝑐')">𝑐</button>
        <button onclick="input('𝑑')">𝑑</button>

        <button onclick="input('𝐴')">𝐴</button>
        <button onclick="input('𝐵')">𝐵</button>
        <button onclick="input('𝐶')">𝐶</button>
        <button onclick="input('𝐷')">𝐷</button>

        <button onclick="input('')"></button>
        <button onclick="input('𝑥')">𝑥</button>
        <button onclick="input('𝑦')">𝑦</button>
        <button onclick="input('𝑧')">𝑧</button>

        <button onclick="input('')"></button>
        <button onclick="input('𝑋')">𝑋</button>
        <button onclick="input('𝑌')">𝑌</button>
        <button onclick="input('𝑍')">𝑍</button>

        <button onclick="input('√')">√</button>
        <button onclick="input('÷')">÷</button>
        <button onclick="input('±')">±</button>
        <button onclick="input('')"></button>

        <button onclick="input('𝑛')">𝑛</button>
        <button onclick="input('𝑚')">𝑚</button>
        <button onclick="input('𝑁')">𝑁</button>
        <button onclick="input('𝑀')">𝑀</button>

        <button onclick="input('(')">(</button>
        <button onclick="input(')')">)</button>
        <button onclick="input('=')">=</button>
        <button onclick="addDot()">.</button>
      `;

      document.getElementById("keyboard").appendChild(div);
      button.innerText = "◀";

      initDragHandles();
    }

    // =====================
    // 画像の保存＆コピー統合処理
    // =====================
    async function captureBoard() {
      const tempPos = selectedPos;
      selectedPos = null;
      render();

      const target = document.getElementById("board");

      const canvas = await html2canvas(target, {
        backgroundColor: "white",
        scale: 2
      });

      selectedPos = tempPos;
      render();

      return canvas;
    }

async function exportPNG() {
  try {
    const canvas = await captureBoard();

    // =====================
    // iPad以外 → ダウンロード
    // =====================
    if (!isIPad()) {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "hissan.png";
      a.click();
    }

    // =====================
    // 全端末 → クリップボードへコピー
    // =====================
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob
          })
        ]);
      } catch (err) {
        console.warn("クリップボード制限:", err);
      }
    }, "image/png");

  } catch (e) {
    console.error("画像生成エラー:", e);
  }
}
    // =====================
    // 全消去
    // =====================
    function clearGrid() {
      lines = [];
      dots = [];

      selectedPos = null;
      selectedTarget = null;

      // ヒントも全消去
      hintValue = "";

      init();

      renderHintCell();
      renderHint();
    }

    // =====================
    // キーボードドラッグ
    // =====================

    // 移動対象のキーボード要素
    let keyboard = document.getElementById("keyboard");

    // ドラッグ移動中フラグ
    let moving = false;

    // ドラッグ開始時の要素内クリックオフセット位置
    let offsetX = 0;
    let offsetY = 0;

    function initDragHandles() {
      document.querySelectorAll(".dragHandle").forEach(handle => {
        handle.onpointerdown = startDrag;
      });
    }

    function startDrag(e) {
      moving = true;

      let rect = keyboard.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      e.preventDefault();
    }

    document.addEventListener("pointermove", e => {
      if (!moving) return;
      e.preventDefault();

      keyboard.style.left = (e.clientX - offsetX) + "px";
      keyboard.style.top = (e.clientY - offsetY) + "px";
      keyboard.style.right = "auto";
      keyboard.style.bottom = "auto";
    });

    document.addEventListener("pointerup", () => {
      moving = false;
    });

    initDragHandles();

    // =====================
    // ヒントウィザード表示
    // =====================
    function hint() {
      const box = document.getElementById("hintBox");
      box.style.display = "flex";

      renderHintCell();
      renderHint();
    }

    // =====================
    // ヒントウィザードを閉じる
    // =====================
    function closeHint() {
      document.getElementById("hintBox").style.display = "none";
      // 値は消さない
      // 選択状態も無理に変更しない
    }

    // =====================
    // ヒントセル描画
    // =====================
    function renderHintCell() {
      const cell = document.getElementById("hintCell");
      const text = document.getElementById("hintCellText");

      text.textContent = hintValue;

      cell.classList.toggle(
        "selected",
        selectedTarget && selectedTarget.type === "hint"
      );
    }

    // =====================
    // ヒントセル選択
    // =====================
    function selectHintCell() {
      selectedTarget = {
        type: "hint"
      };

      // メインボード側の選択状態は解除しない
      // selectedPosはそのまま保持する

      renderHintCell();
    }

    // =====================
    // 九九描画
    // =====================
    function renderHint() {
      const dan = hintValue;

      document.getElementById("hintDan").textContent = dan;

      const list = document.getElementById("hintList");
      list.innerHTML = "";

      if (!dan) return;

      const number = Number(dan);

      // ×1 ～ ×9
      for (let i = 1; i <= 9; i++) {
        const row = document.createElement("div");
        row.className = "hintRow";
        row.textContent = `${dan} × ${i} = ${number * i}`;
        list.appendChild(row);

        // 区切り線
        if (i < 9) {
          const separator = document.createElement("div");
          separator.className = "hintSeparator";
          list.appendChild(separator);
        }
      }
    }

    // =====================
    // ヒントウィザード ドラッグ
    // =====================

    // ドラッグ移動中フラグ
    let hintMoving = false;

    // ドラッグ開始時の要素内クリックオフセット位置
    let hintOffsetX = 0;
    let hintOffsetY = 0;

    document.getElementById("hintHeader").addEventListener("pointerdown", startHintDrag);

    function startHintDrag(e) {
      hintMoving = true;

      const box = document.getElementById("hintBox").getBoundingClientRect();
      hintOffsetX = e.clientX - box.left;
      hintOffsetY = e.clientY - box.top;

      e.preventDefault();
    }

    document.addEventListener("pointermove", e => {
      if (!hintMoving) return;

      const box = document.getElementById("hintBox");
      box.style.left = (e.clientX - hintOffsetX) + "px";
      box.style.top = (e.clientY - hintOffsetY) + "px";
      box.style.transform = "none";

      e.preventDefault();
    });

    document.addEventListener("pointerup", () => {
      hintMoving = false;
    });

    // =========================
    // 使い方画像
    // =========================
    
    const howToImageData = [
      "./images/howto1.jpg",
      "./images/howto2.jpg"
    ];
    
    // 現在表示している画像番号
    let howToIndex = 0;

    // =========================
    // 使い方を開く
    // =========================
    function openHowTo() {
      const box = document.getElementById("howToBox");
      howToIndex = 0;
      box.style.display = "flex";
      renderHowTo();
    }

    // =========================
    // 使い方を閉じる
    // =========================
    function closeHowTo() {
      document.getElementById("howToBox").style.display = "none";
    }

    // =========================
    // 画像を表示
    // =========================
    function renderHowTo() {
      if (howToImageData.length === 0) {
        return;
      }

      const image = document.getElementById("howToImage");
      const currentPage = document.getElementById("howToCurrentPage");
      const totalPage = document.getElementById("howToTotalPage");

      currentPage.textContent = howToIndex + 1;
      totalPage.textContent = howToImageData.length;
      image.src = howToImageData[howToIndex];
    }

    // =========================
    // 次の画像
    // =========================
    function nextHowTo() {
      if (howToImageData.length === 0) {
        return;
      }

      howToIndex++;

      // 最後の次は最初へ
      if (howToIndex >= howToImageData.length) {
        howToIndex = 0;
      }

      renderHowTo();
    }

    // =========================
    // 前の画像
    // =========================
    function prevHowTo() {
      if (howToImageData.length === 0) {
        return;
      }

      howToIndex--;

      // 最初の前は最後へ
      if (howToIndex < 0) {
        howToIndex = howToImageData.length - 1;
      }

      renderHowTo();
    }

    // =========================
    // ページ読み込み時
    // =========================
    window.addEventListener("DOMContentLoaded", () => {
      init();
    });

    function isIPad() {
  return /iPad/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
