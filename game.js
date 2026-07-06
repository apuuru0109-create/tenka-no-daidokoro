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
    paperStatus: $("paper-status"),
    paperBuy: $("paper-buy"),
    paperSell: $("paper-sell"),
    gather: $("gather"),
    intelList: $("intel-list"),
    daySummary: $("day-summary"),
    journal: $("journal"),
    nextDay: $("next-day"),
    closing: $("closing-dialog"),
    closingSignal: $("closing-signal"),
    closingCopy: $("closing-copy"),
    fuseBurn: $("fuse-burn"),
    closingCounter: $("closing-counter"),
    closingPass: $("closing-pass"),
    closingNote: $("closing-note"),
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
      paperPosition: null,
      closingRound: null,
      dayStart: null,
      lastSummary: null,
      endingShown: false
    });
    state.dayStart = createDaySnapshot();
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

  function formatDelta(value, unit = "") {
    const rounded = Math.round(value * 10) / 10;
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded.toLocaleString("ja-JP")}${unit}`;
  }

  function clonePaperPosition(position) {
    return position ? { ...position } : null;
  }

  function createDaySnapshot() {
    return {
      day: state.day,
      cash: state.cash,
      inventory: state.inventory,
      reputation: state.reputation,
      welfare: state.welfare,
      price: state.price,
      paperPosition: clonePaperPosition(state.paperPosition)
    };
  }

  function paperValue(position, price) {
    if (!position) return 0;
    const direction = position.side === "buy" ? 1 : -1;
    return position.margin + (price - position.entryPrice) * position.units * direction;
  }

  function calculateAssets(snapshot) {
    return snapshot.cash + snapshot.inventory * snapshot.price + paperValue(snapshot.paperPosition, snapshot.price);
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
      direction: displayedDirection,
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

  function openPaperPosition(side) {
    if (state.actions <= 0) {
      notify("今日はもう商いに使える刻が残っていません。");
      return;
    }
    if (state.day >= MAX_DAYS) {
      notify("大決算の日に、新しい帳合米は建てられません。");
      return;
    }
    if (state.paperPosition) {
      notify("清算前の帳合米があります。まず満期を待ちましょう。");
      return;
    }

    const units = 10;
    const margin = Math.ceil(state.price * units * 0.25);
    if (state.cash < margin) {
      notify(`証拠金${formatNumber(margin)}文が足りません。`);
      return;
    }

    state.cash -= margin;
    state.actions -= 1;
    state.paperPosition = {
      side,
      units,
      margin,
      entryPrice: state.price,
      settleDay: Math.min(MAX_DAYS, state.day + 3)
    };

    const direction = side === "buy" ? "買建て" : "売建て";
    state.journal.unshift({
      day: state.day,
      text: `帳合米を${direction}。${state.paperPosition.settleDay}日目の相場で差金清算する。`
    });
    notify(`帳合米を${direction}ました。証拠金${formatNumber(margin)}文を預けます。`);
    render();
  }

  function settlePaperPosition() {
    const position = state.paperPosition;
    if (!position || state.day < position.settleDay) return null;

    const priceDifference = state.price - position.entryPrice;
    const direction = position.side === "buy" ? 1 : -1;
    const profit = priceDifference * position.units * direction;
    const payout = position.margin + profit;
    state.cash += payout;
    state.paperPosition = null;

    const result = profit >= 0
      ? `${formatNumber(profit)}文の益`
      : `${formatNumber(Math.abs(profit))}文の損`;
    state.journal.unshift({
      day: state.day,
      text: `帳合米が満期を迎え、${result}。証拠金と差金を清算した。`
    });
    return {
      notice: `帳合米を清算し、${result}になりました。`,
      profit
    };
  }

  let closingTimer;

  function calculateClosingRound() {
    const nextDay = state.day + 1;
    const event = state.scheduledEvents[nextDay];
    const eventImpact = event.type === "supply"
      ? event.delta * -7
      : event.delta * 7;
    const scarcityFeedback = state.price > 125 ? -4 : state.price < 78 ? 4 : 0;
    const noise = Math.round((Math.random() - 0.5) * 6);
    const projectedChange = Math.round(
      eventImpact + state.tradePressure + scarcityFeedback + noise
    );

    return {
      nextDay,
      event,
      projectedChange,
      oneSided: Math.abs(projectedChange) >= 15,
      orderSide: projectedChange > 0 ? "buy" : "sell",
      countered: false
    };
  }

  function startClosing() {
    if (state.day >= MAX_DAYS) {
      showEnding();
      return;
    }

    if (state.closingRound) return;
    state.closingRound = calculateClosingRound();
    const round = state.closingRound;

    if (round.oneSided) {
      const buying = round.orderSide === "buy";
      elements.closingSignal.textContent = buying ? "買い一色" : "売り一色";
      elements.closingSignal.className = `closing-signal ${buying ? "buying" : "selling"}`;
      elements.closingCopy.textContent = buying
        ? "買いの声ばかりが響き、売り手がいません。このまま火縄が消えれば立用です。"
        : "売りの声ばかりが響き、買い手がいません。このまま火縄が消えれば立用です。";
      elements.closingCounter.textContent = buying
        ? "売り向かう（一刻）"
        : "買い向かう（一刻）";
      elements.closingCounter.disabled = state.actions <= 0;
      elements.closingNote.textContent = state.actions > 0
        ? "反対注文が一件成立すれば終値が生まれ、店の信用も上がります。"
        : "残り刻がないため、反対注文は出せません。";
    } else {
      elements.closingSignal.textContent = "売買拮抗";
      elements.closingSignal.className = "closing-signal balanced";
      elements.closingCopy.textContent =
        "売り手と買い手の声が交わっています。火縄が消えた瞬間の値が本日の終値です。";
      elements.closingCounter.textContent = "反対注文は不要";
      elements.closingCounter.disabled = true;
      elements.closingNote.textContent = "拍子木が鳴るまで、大引の値を見届けましょう。";
    }

    elements.closing.showModal();
    elements.fuseBurn.classList.remove("burning");
    void elements.fuseBurn.offsetWidth;
    elements.fuseBurn.classList.add("burning");
    window.clearTimeout(closingTimer);
    closingTimer = window.setTimeout(resolveClosingRound, 8000);
  }

  function counterClosingOrder() {
    const round = state.closingRound;
    if (!round || !round.oneSided || round.countered || state.actions <= 0) return;

    state.actions -= 1;
    state.reputation = clamp(state.reputation + 2, 0, 100);
    round.countered = true;
    elements.closingCounter.disabled = true;
    elements.closingCounter.textContent = round.orderSide === "buy"
      ? "売り注文、成立"
      : "買い注文、成立";
    elements.closingSignal.textContent = "値が立った";
    elements.closingSignal.className = "closing-signal matched";
    elements.closingCopy.textContent =
      "あなたの反対注文に拍子木が鳴りました。火縄が消えれば、この値が終値になります。";
    elements.closingNote.textContent = "市場をつないだ働きが会所で評判になりました。信用 +2";
    render();
  }

  function createDaySummary({ resolvedDay, event, change, stood, startSnapshot, intelForEvent, settlement }) {
    const endSnapshot = createDaySnapshot();
    const assetsDelta = calculateAssets(endSnapshot) - calculateAssets(startSnapshot);
    const cashDelta = endSnapshot.cash - startSnapshot.cash;
    const inventoryDelta = endSnapshot.inventory - startSnapshot.inventory;
    const reputationDelta = endSnapshot.reputation - startSnapshot.reputation;
    const welfareDelta = endSnapshot.welfare - startSnapshot.welfare;
    const expectedDirection = eventDirection(event);
    const accurateIntel = intelForEvent.filter((intel) => intel.direction === expectedDirection);
    const missedIntel = intelForEvent.length - accurateIntel.length;
    const rumorLine = intelForEvent.length === 0
      ? "この日の材料を示す噂は拾えていませんでした。"
      : `噂は${accurateIntel.length}/${intelForEvent.length}件的中。${accurateIntel.length > 0
        ? accurateIntel.map((intel) => intel.character.name.replace(/^[^ ]+ /, "")).join("・")
        : "的中者なし"}${missedIntel > 0 ? `、逆目${missedIntel}件` : ""}。`;
    const marketLine = stood
      ? `${event.reason}。注文が片側に偏り、立用で終値は${state.price}文のまま。`
      : `${event.reason}。火縄大引は${formatDelta(change, "文")}、終値${state.price}文。`;
    const settlementLine = settlement
      ? settlement.notice
      : "帳合米の満期清算はありません。";

    return {
      day: resolvedDay,
      title: `${resolvedDay}日目の商い`,
      lines: [
        marketLine,
        rumorLine,
        `総資産 ${formatDelta(assetsDelta, "文")} / 手元金 ${formatDelta(cashDelta, "文")} / 蔵 ${formatDelta(inventoryDelta, "俵")}`,
        `信用 ${formatDelta(reputationDelta)} / 町の暮らし ${formatDelta(welfareDelta)}`,
        settlementLine
      ]
    };
  }

  function resolveClosingRound() {
    const round = state.closingRound;
    if (!round) return;

    window.clearTimeout(closingTimer);
    if (elements.closing.open) elements.closing.close();

    const resolvedDay = state.day;
    const startSnapshot = state.dayStart || createDaySnapshot();
    const { nextDay, event } = round;
    const intelForEvent = state.gatheredIntel.filter((intel) => intel.targetDay === nextDay);
    state.previousPrice = state.price;

    if (event.type === "supply") {
      state.todayEvent = { weather: event.weather, supply: event.delta, demand: 0 };
    } else {
      state.todayEvent = { weather: event.weather, supply: 0, demand: event.delta };
    }

    const stood = round.oneSided && !round.countered;
    const change = stood ? 0 : round.projectedChange;
    state.price = clamp(state.price + change, 45, 190);
    state.priceHistory.push(state.price);
    state.tradePressure *= 0.25;
    state.day = nextDay;
    state.actions = STARTING_ACTIONS;
    state.closingRound = null;

    updateTownWelfare();
    const signed = change > 0 ? `+${change}` : `${change}`;
    state.journal.unshift({
      day: nextDay,
      text: stood
        ? `${event.reason}。注文が片側に偏ったまま火縄が消え、立用。終値は${state.price}文に据え置かれた。`
        : `${event.reason}。火縄大引は${signed}文、終値${state.price}文で成立した。`
    });
    const settlement = settlePaperPosition();
    state.lastSummary = createDaySummary({
      resolvedDay,
      event,
      change,
      stood,
      startSnapshot,
      intelForEvent,
      settlement
    });
    state.dayStart = createDaySnapshot();

    state.gatheredIntel = state.gatheredIntel.filter((intel) => intel.targetDay >= state.day);
    render();

    if (state.day === MAX_DAYS) {
      elements.nextDay.querySelector("span").textContent = "大決算を迎える";
      elements.nextDay.querySelector("small").textContent = "三十日の商いを締める";
      notify("大決算の日を迎えました。最後の取引ができます。");
    } else {
      notify(
        settlement?.notice ||
        (stood
          ? `${state.day}日目の朝。昨夜は立用となり、相場は据え置きです。`
          : `${state.day}日目の朝。${event.label}で相場が動きました。`)
      );
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
    renderPaperPosition();
    renderDaySummary();
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

  function renderPaperPosition() {
    const position = state.paperPosition;
    const units = 10;
    const requiredMargin = Math.ceil(state.price * units * 0.25);

    if (position) {
      const side = position.side === "buy" ? "買" : "売";
      elements.paperStatus.textContent =
        `${side}建 ${position.entryPrice}文 → ${position.settleDay}日目清算`;
    } else {
      elements.paperStatus.textContent = `建玉なし・証拠金 ${formatNumber(requiredMargin)}文`;
    }

    const cannotOpen =
      Boolean(position) ||
      state.actions <= 0 ||
      state.day >= MAX_DAYS ||
      state.cash < requiredMargin;
    elements.paperBuy.disabled = cannotOpen;
    elements.paperSell.disabled = cannotOpen;
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

    elements.intelList.innerHTML = state.gatheredIntel.slice(0, 3).map((intel) => `
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

  function renderDaySummary() {
    const summary = state.lastSummary;
    if (!summary) {
      elements.daySummary.innerHTML = `
        <strong>本日の商い</strong>
        <span>火縄大引のあと、噂と損益を振り返ります。</span>
      `;
      return;
    }

    elements.daySummary.innerHTML = `
      <strong>${summary.title}</strong>
      <ul>
        ${summary.lines.map((line) => `<li>${line}</li>`).join("")}
      </ul>
    `;
  }

  function renderJournal() {
    elements.journal.innerHTML = state.journal.slice(0, 4).map((entry) => `
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
  elements.paperBuy.addEventListener("click", () => openPaperPosition("buy"));
  elements.paperSell.addEventListener("click", () => openPaperPosition("sell"));
  elements.gather.addEventListener("click", gatherIntel);
  elements.nextDay.addEventListener("click", startClosing);
  elements.closingCounter.addEventListener("click", counterClosingOrder);
  elements.closingPass.addEventListener("click", resolveClosingRound);
  elements.closing.addEventListener("cancel", (event) => event.preventDefault());
  $("help-button").addEventListener("click", () => elements.help.showModal());
  document.querySelector(".dialog-close").addEventListener("click", () => elements.help.close());
  $("restart").addEventListener("click", resetGame);
  window.addEventListener("resize", drawChart);

  resetGame();
})();
