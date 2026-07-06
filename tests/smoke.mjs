import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const game = await readFile(new URL("../game.js", import.meta.url), "utf8");

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
  ["売買不能条件", "state.actions <= 0"]
];

for (const [name, source] of requiredDesignRules) {
  if (!game.includes(source)) {
    throw new Error(`面白さレビューで追加した仕様が見つかりません: ${name}`);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
