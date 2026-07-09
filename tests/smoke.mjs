import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const game = await readFile(new URL("../game.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");

new vm.Script(game, { filename: "game.js" });

const htmlIds = new Set(
  [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
);
const referencedIds = new Set(
  [...game.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1])
);

const missingIds = [...referencedIds].filter((id) => !htmlIds.has(id));
if (missingIds.length > 0) {
  throw new Error(`HTMLに存在しない要素ID: ${missingIds.join(", ")}`);
}

const duplicateIds = [...htmlIds].filter(
  (id) => [...html.matchAll(new RegExp(`\\bid="${id}"`, "g"))].length > 1
);
if (duplicateIds.length > 0) {
  throw new Error(`重複している要素ID: ${duplicateIds.join(", ")}`);
}

const requiredDesignRules = [
  ["売買の刻消費", "state.actions -= 1;\n    render();"],
  ["相対日表示", "relativeDayLabel(intel.targetDay)"],
  ["噂の対象表示", "${intel.subject}見通し"],
  ["売買不能条件", "state.actions <= 0"],
  ["噂の最新3件表示", "state.gatheredIntel.slice(0, 3)"],
  ["日誌の最新4件表示", "state.journal.slice(0, 4)"],
  ["帳合米の建玉", "function openPaperPosition(side)"],
  ["帳合米の差金清算", "function settlePaperPosition()"],
  ["帳合米の三日満期", "state.day + 3"],
  ["総資産の常設表示", 'totalAssets: $("total-assets")'],
  ["帳合米の評価損益表示", 'paperValue: $("paper-value")'],
  ["帳合米の導線文", 'guidanceLine: $("guidance-line")'],
  ["火縄大引", "function startClosing()"],
  ["立用の判定", "round.oneSided && !round.countered"],
  ["反対注文の刻消費", "function counterClosingOrder()"],
  ["火縄の制限時間", "window.setTimeout(resolveClosingRound, 8000)"],
  ["一日の振り返り", "function createDaySummary"],
  ["噂の的中確認", "intel.direction === expectedDirection"]
];

for (const [name, source] of requiredDesignRules) {
  if (!game.includes(source)) {
    throw new Error(`面白さレビューで追加した仕様が見つかりません: ${name}`);
  }
}

if (!styles.includes("@media (min-width: 981px)") || !styles.includes("overflow: hidden;")) {
  throw new Error("デスクトップ一画面レイアウトの規則が見つかりません");
}

if (!styles.includes("@media (min-width: 981px) and (max-height: 760px)")) {
  throw new Error("Chromeの低い表示領域向け一画面レイアウトの規則が見つかりません");
}

if (!styles.includes("@media (min-width: 981px) and (max-height: 620px)")) {
  throw new Error("Chromeの超低い表示領域向け一画面レイアウトの規則が見つかりません");
}

if (!html.includes('id="day-summary"')) {
  throw new Error("一日の振り返り表示が見つかりません");
}

if (!styles.includes("@keyframes fuse-burn") || !html.includes('id="closing-dialog"')) {
  throw new Error("火縄大引の演出が見つかりません");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculatePaperSettlement(side, entryPrice, exitPrice, units = 10) {
  const margin = Math.ceil(entryPrice * units * 0.25);
  const direction = side === "buy" ? 1 : -1;
  const profit = (exitPrice - entryPrice) * units * direction;
  return { margin, profit, payout: margin + profit };
}

const unchangedBuy = calculatePaperSettlement("buy", 100, 100);
const risingBuy = calculatePaperSettlement("buy", 100, 110);
const risingSell = calculatePaperSettlement("sell", 100, 110);
const fallingSell = calculatePaperSettlement("sell", 100, 90);

if (unchangedBuy.payout !== unchangedBuy.margin || unchangedBuy.profit !== 0) {
  throw new Error("値動きなしの帳合米で証拠金が正しく返却されません");
}
if (risingBuy.profit !== 100 || risingSell.profit !== -100 || fallingSell.profit !== 100) {
  throw new Error("帳合米の買建て・売建て損益が正しく鏡像になっていません");
}

for (let run = 0; run < 10000; run += 1) {
  let price = 100;
  for (let day = 2; day <= 30; day += 1) {
    const eventDelta = [-14, -7, 7, 14][Math.floor(Math.random() * 4)];
    const feedback = price > 125 ? -4 : price < 78 ? 4 : 0;
    const noise = Math.round((Math.random() - 0.5) * 6);
    price = clamp(price + eventDelta + feedback + noise, 45, 190);
    if (!Number.isFinite(price) || price < 45 || price > 190) {
      throw new Error(`価格モデルが範囲外です: ${price}`);
    }
  }
}

console.log(
  `smoke: OK (${htmlIds.size} IDs, ${referencedIds.size} references, ${requiredDesignRules.length} design rules, 10,000 market runs)`
);
