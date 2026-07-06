(() => {
  "use strict";

  const MAX_DAYS = 30;
  const STARTING_ACTIONS = 3;

  const characters = [
    {
      name: "船頭 源次",
      mark: "源",
      specialty: "川と入荷に詳しい",
      accuracy: 0.9,
      lines: {
        supplyUp: "上方からの船が、明日はいつもの倍ほど着きそうだ。",
        supplyDown: "川筋がどうにも怪しい。明日の荷は細るかもしれねえ。",
        demandUp: "祭り支度で、町の料理屋が米を探し回っていたぜ。",
        demandDown: "大店が買い付けを見送ったらしい。荷が余るかもな。"
      }
    },
    {
      name: "瓦版屋 弥吉",
      mark: "瓦",
      specialty: "話は速いが、ときどき盛る",
      accuracy: 0.66,
      lines: {
        supplyUp: "号外だ！ 諸国から米船が押し寄せ、川が埋まるって話だ！",
        supplyDown: "遠国でひどい嵐だそうだ。米船は一艘も来ないかもしれねえ！",
        demandUp: "町じゅうが宴になるぞ。米屋は大忙しだってよ！",
        demandDown: "倹約令が出る、なんて噂を聞いたぜ。皆、財布の紐を締めるさ。"
      }
    },
    {
      name: "薬種商 菊乃",
      mark: "菊",
      specialty: "遠国の兆しを早く掴む",
      accuracy: 0.82,
      lines: {
        supplyUp: "西国の作柄は良好とのこと。数日中には荷が増えるでしょう。",
        supplyDown: "山陽では長雨が続いています。先々の入荷が気がかりですね。",
        demandUp: "宿場で人の往来が増えています。食米の引き合いも強くなるでしょう。",
        demandDown: "各藩の蔵屋敷が、買い急がぬよう申し合わせたようです。"
      }
    },
    {
      name: "飯屋 千代",
      mark: "千",
      specialty: "町の台所事情に詳しい",
      accuracy: 0.78,
      lines: {
        supplyUp: "今日は安く仕入れられたよ。問屋には米がたくさんあるみたい。",
        supplyDown: "米屋を三軒回ったけど、どこも在庫が少ないって。",
        demandUp: "奉公人さんたちの祝い事が重なって、注文がどっと増えたの。",
        demandDown: "この値段じゃ、みんな麦を混ぜるしかないね。米の注文も減ってるよ。"
      }
    }
  ];

  const eventCatalog = [
    { type: "supply", delta: 2, label: "豊かな入荷", reason: "入荷が予想を上回った", weather: "晴れ" },
    { type: "supply", delta: 1, label: "やや多い入荷", reason: "米船の到着が増えた", weather: "薄曇り" },
    { type: "supply", delta: -1, label: "入荷の遅れ", reason: "川船の到着が遅れた", weather: "雨" },
    { type: "supply", delta: -2, label: "川止め", reason: "荒天で米船が止まった", weather: "大雨" },
    { type: "demand", delta: 2, label: "祭礼の支度", reason: "祭礼を前に買い付けが集中した", weather: "晴れ" },
    { type: "demand", delta: 1, label: "宿場の賑わい", reason: "旅人が増え食米需要が強まった", weather: "晴れ" },
    { type: "demand", delta: -1, label: "買い控え", reason: "高値を嫌って町衆が買い控えた", weather: "曇り" },
    { type: "demand", delta: -2, label: "倹約のお触れ", reason: "倹約令で大口需要が落ち込んだ", weather: "曇り" }
  ];

  const state = {};
  const $ = (id) => document.getElementById(id);

  const elements = {
    day: $("day"),
    daysLeft: $("days-left"),
    cash: $("cash"),
    inventory: $("inventory"),
    reputation: $("reputation"),
    welfare: $("welfare"),
    actions: $("actions"),
    price: $("price"),
    weather: $("weather"),
    supply: $("supply"),
    demand: $("demand"),
    trend: $("trend-badge"),
    chart: $("price-chart"),
    quantity: $("quantity"),
    buyTotal: $("buy-total"),
    sellTotal: $("sell-total"),
    buy: $("buy"),
    sell: $("sell"),
    gather: $("gather"),
    intelList: $("intel-list"),
    journal: $("journal"),
    nextDay: $("next-day"),
    toast: $("toast"),
    help: $("help-dialog"),
    ending: $("ending-dialog")
  };

  function resetGame() {
    Object.assign(state, {
      day: 1,
      cash: 1200,
      inventory: 8,
      reputation: 50,
      welfare: 70,
      actions: STARTING_ACTIONS,
      price: 100,
      previousPrice: 100,
      priceHistory: [100],
      gatheredIntel: [],
      knownIntelIds: new Set(),
      journal: [
        { day: 1, text: "親方の店を継いだ。三十日後の決算までに、暖簾を守らなくては。" }
      ],
      scheduledEvents: createInitialSchedule(),
      todayEvent: { weather: "晴れ", supply: 0, demand: 0 },
      tradePressure: 0,
      totalBought: 0,
      totalSold: 0,
      endingShown: false
    });
    elements.ending.close();
    render();
  }

  function createInitialSchedule() {
    const schedule = {};
    for (let day = 2; day <= MAX_DAYS; day += 1) {
      const event = { ...randomItem(eventCatalog), id: `${day}-${Math.random()}` };
      schedule[day] = event;
    }
    return schedule;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatNumber(value) {
    return Math.round(value).toLocaleString("ja-JP");
  }

  function eventDirection(event) {
    if (event.type === "supply") {
      return event.delta > 0 ? "supplyUp" : "supplyDown";
    }
    return event.delta > 0 ? "demandUp" : "demandDown";
  }

  function gatherIntel() {
    if (state.actions <= 0) {
      notify("今日はもう歩き回る刻が残っていません。");
      return;
    }

    const possibleDays = [state.day + 1, state.day + 2, state.day + 3]
      .filter((day) => day <= MAX_DAYS);
    if (possibleDays.length === 0) {
      notify("決算は明日。新しい噂を追う暇はなさそうです。");
      return;
    }

    let targetDay = randomItem(possibleDays);
    let event = state.scheduledEvents[targetDay];
    let character = randomItem(characters);
    let tries = 0;

    while (state.knownIntelIds.has(`${event.id}-${character.name}`) && tries < 10) {
      targetDay = randomItem(possibleDays);
      event = state.scheduledEvents[targetDay];
      character = randomItem(characters);
      tries += 1;
    }

    const truthful = Math.random() < character.accuracy;
    const direction = eventDirection(event);
    const displayedDirection = truthful ? direction : oppositeDirection(direction);
    const intel = {
      id: `${event.id}-${character.name}`,
      character,
      targetDay,
      subject: event.type === "supply" ? "入荷" : "需要",
      message: character.lines[displayedDirection],
      reliability: character.accuracy >= 0.85 ? "確かな筋" : character.accuracy >= 0.75 ? "見込みあり" : "眉唾もの"
    };

    state.actions -= 1;
    state.knownIntelIds.add(intel.id);
    state.gatheredIntel.unshift(intel);
    notify(`${character.name}から話を聞きました。`);
    render();
  }

  function oppositeDirection(direction) {
    const opposites = {
      supplyUp: "supplyDown",
      supplyDown: "supplyUp",
      demandUp: "demandDown",
      demandDown: "demandUp"
    };
    return opposites[direction];
  }

  function trade(side) {
    if (state.actions <= 0) {
      notify("今日はもう商いに使える刻が残っていません。");
      return;
    }

    const quantity = clamp(Number.parseInt(elements.quantity.value, 10) || 1, 1, 20);
    const total = quantity * state.price;

    if (side === "buy") {
      if (state.cash < total) {
        notify("手元金が足りません。");
        return;
      }
      state.cash -= total;
      state.inventory += quantity;
      state.totalBought += quantity;
      state.tradePressure += quantity * 0.16;
      if (quantity >= 8) {
        state.welfare = clamp(state.welfare - 2, 0, 100);
        state.reputation = clamp(state.reputation - 1, 0, 100);
        notify("大口の買い付けで、町の米が少し品薄になりました。");
      } else {
        notify(`${quantity}俵を${formatNumber(total)}文で仕入れました。`);
      }
    } else {
      if (state.inventory < quantity) {
        notify("蔵の米が足りません。");
        return;
      }
      state.cash += total;
      state.inventory -= quantity;
      state.totalSold += quantity;
      state.tradePressure -= quantity * 0.14;
      if (quantity >= 8 && state.price >= 115) {
        state.welfare = clamp(state.welfare + 4, 0, 100);
        state.reputation = clamp(state.reputation + 2, 0, 100);
        notify("高値のさなかに米を放出し、町衆から感謝されました。");
      } else {
        notify(`${quantity}俵を${formatNumber(total)}文で売り渡しました。`);
      }
    }

    state.actions -= 1;
    render();
  }

  function advanceDay() {
    if (state.day >= MAX_DAYS) {
      showEnding();
      return;
    }

    const nextDay = state.day + 1;
    const event = state.scheduledEvents[nextDay];
    state.previousPrice = state.price;

    let eventImpact = 0;
    if (event.type === "supply") {
      eventImpact = event.delta * -7;
      state.todayEvent = { weather: event.weather, supply: event.delta, demand: 0 };
    } else {
      eventImpact = event.delta * 7;
      state.todayEvent = { weather: event.weather, supply: 0, demand: event.delta };
    }

    const scarcityFeedback = state.price > 125 ? -4 : state.price < 78 ? 4 : 0;
    const noise = Math.round((Math.random() - 0.5) * 6);
    const change = Math.round(eventImpact + state.tradePressure + scarcityFeedback + noise);
    state.price = clamp(state.price + change, 45, 190);
    state.priceHistory.push(state.price);
    state.tradePressure *= 0.25;
    state.day = nextDay;
    state.actions = STARTING_ACTIONS;

    updateTownWelfare();
    const signed = change > 0 ? `+${change}` : `${change}`;
    state.journal.unshift({
      day: nextDay,
      text: `${event.reason}。米価は${signed}文、${state.price}文になった。`
    });

    state.gatheredIntel = state.gatheredIntel.filter((intel) => intel.targetDay >= state.day);
    render();

    if (state.day === MAX_DAYS) {
      elements.nextDay.querySelector("span").textContent = "大決算を迎える";
      elements.nextDay.querySelector("small").textContent = "三十日の商いを締める";
      notify("大決算の日を迎えました。最後の取引ができます。");
    } else {
      notify(`${state.day}日目の朝。${event.label}で相場が動きました。`);
    }
  }

  function updateTownWelfare() {
    if (state.price >= 140) {
      state.welfare -= 7;
    } else if (state.price >= 120) {
      state.welfare -= 3;
    } else if (state.price <= 70) {
      state.welfare += 4;
    } else if (state.price <= 88) {
      state.welfare += 2;
    } else {
      state.welfare += 0.5;
    }
    state.welfare = clamp(state.welfare, 0, 100);
  }

  function showEnding() {
    if (state.endingShown) return;
    state.endingShown = true;

    const assets = state.cash + state.inventory * state.price;
    let title;
    let copy;

    if (assets >= 2500 && state.welfare >= 65 && state.reputation >= 55) {
      title = "町と栄える暖簾";
      copy = "相場を読み切りながら、町の食卓も見捨てなかった。あなたの店には、金だけでは買えない信用が残った。";
    } else if (assets >= 3000 && state.welfare < 45) {
      title = "冷たい天下人";
      copy = "蔵は米と銀で満ちた。しかし、軒先であなたの名を呼ぶ声に、親しみはもう残っていない。";
    } else if (assets >= 2000) {
      title = "堂島の若き相場師";
      copy = "暖簾を守り、次の商いへ進むだけの力を得た。まだ道半ばだが、会所はあなたの名を覚えた。";
    } else if (assets >= 1200 || state.reputation >= 65) {
      title = "細く、長く";
      copy = "大儲けとはいかなかった。それでも人との縁が店を支え、もう一度暖簾を上げる朝が来る。";
    } else {
      title = "暖簾を畳む夜";
      copy = "決算には届かなかった。だが、相場の傷は知恵になる。この失敗を携え、別の商いからやり直せる。";
    }

    $("ending-title").textContent = title;
    $("ending-copy").textContent = copy;
    $("ending-stats").innerHTML = `
      <div><span>総資産</span><b>${formatNumber(assets)}文</b></div>
      <div><span>店の信用</span><b>${Math.round(state.reputation)}</b></div>
      <div><span>町の暮らし</span><b>${welfareLabel()}</b></div>
    `;
    elements.ending.showModal();
  }

  function welfareLabel() {
    if (state.welfare >= 80) return "賑わう";
    if (state.welfare >= 60) return "安らか";
    if (state.welfare >= 40) return "苦しい";
    if (state.welfare >= 20) return "困窮";
    return "飢え";
  }

  function relativeLabel(value, positive, negative) {
    if (value >= 2) return `非常に${positive}`;
    if (value === 1) return `やや${positive}`;
    if (value === -1) return `やや${negative}`;
    if (value <= -2) return `非常に${negative}`;
    return "平常";
  }

  function render() {
    elements.day.textContent = state.day;
    elements.daysLeft.textContent = Math.max(0, MAX_DAYS - state.day);
    elements.cash.textContent = `${formatNumber(state.cash)}文`;
    elements.inventory.textContent = `${state.inventory}俵`;
    elements.reputation.textContent = Math.round(state.reputation);
    elements.welfare.textContent = welfareLabel();
    elements.actions.textContent = [
      ...Array(state.actions).fill("●"),
      ...Array(STARTING_ACTIONS - state.actions).fill("○")
    ].join(" ");
    elements.price.textContent = state.price;
    elements.weather.textContent = state.todayEvent.weather;
    elements.supply.textContent = relativeLabel(state.todayEvent.supply, "多い", "少ない");
    elements.demand.textContent = relativeLabel(state.todayEvent.demand, "強い", "弱い");

    const change = state.price - state.previousPrice;
    elements.trend.textContent = `${change > 0 ? "▲" : change < 0 ? "▼" : "—"} ${Math.abs(change)}文`;
    elements.trend.className = `trend ${change > 0 ? "up" : change < 0 ? "down" : "neutral"}`;
    elements.gather.disabled = state.actions <= 0;

    updateTradeTotals();
    renderIntel();
    renderJournal();
    drawChart();
  }

  function updateTradeTotals() {
    const quantity = clamp(Number.parseInt(elements.quantity.value, 10) || 1, 1, 20);
    elements.quantity.value = quantity;
    const total = quantity * state.price;
    elements.buyTotal.textContent = `${formatNumber(total)}文`;
    elements.sellTotal.textContent = `${formatNumber(total)}文`;
    elements.buy.disabled = total > state.cash || state.actions <= 0;
    elements.sell.disabled = quantity > state.inventory || state.actions <= 0;
  }

  function relativeDayLabel(targetDay) {
    const difference = targetDay - state.day;
    if (difference <= 0) return "今日";
    if (difference === 1) return "明日";
    if (difference === 2) return "明後日";
    return `${difference}日後`;
  }

  function renderIntel() {
    if (state.gatheredIntel.length === 0) {
      elements.intelList.innerHTML = `
        <div class="empty-state">
          <span>?</span>
          <p>町へ出て、相場の手がかりを集めましょう。</p>
        </div>`;
      return;
    }

    elements.intelList.innerHTML = state.gatheredIntel.map((intel) => `
      <article class="intel-card">
        <div class="portrait">${intel.character.mark}</div>
        <div>
          <header>
            <h3>${intel.character.name}</h3>
            <small>${relativeDayLabel(intel.targetDay)}の${intel.subject}見通し・${intel.reliability}</small>
          </header>
          <p>「${intel.message}」</p>
        </div>
      </article>
    `).join("");
  }

  function renderJournal() {
    elements.journal.innerHTML = state.journal.map((entry) => `
      <li><b>${entry.day}日</b><span>${entry.text}</span></li>
    `).join("");
  }

  function drawChart() {
    const canvas = elements.chart;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, rect.width * ratio);
    canvas.height = Math.max(180, rect.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 14, bottom: 27, left: 42 };
    const values = state.priceHistory;
    const min = Math.max(35, Math.min(...values) - 15);
    const max = Math.min(200, Math.max(...values) + 15);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(65, 47, 28, 0.14)";
    ctx.fillStyle = "#766954";
    ctx.font = "10px Yu Gothic";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4;
      const value = Math.round(max - ((max - min) * i) / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${value}`, 7, y + 3);
    }

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const step = values.length === 1 ? 0 : plotWidth / Math.max(MAX_DAYS - 1, values.length - 1);
    const points = values.map((value, index) => ({
      x: padding.left + index * step,
      y: padding.top + ((max - value) / (max - min)) * plotHeight
    }));

    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, "rgba(159, 53, 39, 0.24)");
      gradient.addColorStop(1, "rgba(159, 53, 39, 0)");
      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = "#9f3527";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#9f3527";
    ctx.fill();

    ctx.fillStyle = "#766954";
    ctx.fillText("1日", padding.left, height - 7);
    ctx.textAlign = "right";
    ctx.fillText(`${state.day}日`, Math.min(last.x + 12, width - padding.right), height - 7);
    ctx.textAlign = "left";
  }

  let toastTimer;
  function notify(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
  }

  elements.quantity.addEventListener("input", updateTradeTotals);
  $("minus").addEventListener("click", () => {
    elements.quantity.value = Math.max(1, Number(elements.quantity.value) - 1);
    updateTradeTotals();
  });
  $("plus").addEventListener("click", () => {
    elements.quantity.value = Math.min(20, Number(elements.quantity.value) + 1);
    updateTradeTotals();
  });
  elements.buy.addEventListener("click", () => trade("buy"));
  elements.sell.addEventListener("click", () => trade("sell"));
  elements.gather.addEventListener("click", gatherIntel);
  elements.nextDay.addEventListener("click", advanceDay);
  $("help-button").addEventListener("click", () => elements.help.showModal());
  document.querySelector(".dialog-close").addEventListener("click", () => elements.help.close());
  $("restart").addEventListener("click", resetGame);
  window.addEventListener("resize", drawChart);

  resetGame();
})();
