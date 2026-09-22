/**
 * Splitmee brand + hit paywall copy across all locales.
 * RevenueCat entitlement id stays "Nudgrr Unlimited" in native/code.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nPath = path.join(__dirname, "../lib/i18n.ts");

const packs = {
  en: {
    nudgrrUnlimited: "Splitmee Unlimited",
    unlockNudgrr: "Unlock Splitmee",
    unlockAllWaiting: "Unlock all with Splitmee Unlimited",
    getTheFullExperience: "Make getting paid feel inevitable.",
    paywallHeroBadge: "Drop the bill",
    paywallFeatureUnlimitedNudges: "Unlimited drops & nudges",
    paywallFeatureWaitingGame: "Full Waiting Game + escalation",
    paywallFeatureGroups: "Projects for trips & groups",
    paywallFeaturePowerTools: "Itemize & custom shares",
    paywallFeatureStoryDrops: "Story-ready drops friends actually open",
    paywallFeatureRemoveBranding: "Remove Splitmee branding from receipts",
    paywallFeatureNudgeWatermark: 'No "Sent via Splitmee" on text reminders',
    getUnlimited: "Get Unlimited",
  },
  da: {
    nudgrrUnlimited: "Splitmee Ubegrænset",
    unlockNudgrr: "Lås Splitmee op",
    unlockAllWaiting: "Lås alt op med Splitmee Ubegrænset",
    getTheFullExperience: "Gør det uundgåeligt at blive betalt.",
    paywallHeroBadge: "Drop regningen",
    paywallFeatureUnlimitedNudges: "Ubegrænsede drops & nudges",
    paywallFeatureWaitingGame: "Fuld Ventetid + eskalering",
    paywallFeatureGroups: "Projekter til ture & grupper",
    paywallFeaturePowerTools: "Ret-for-ret & egne andele",
    paywallFeatureStoryDrops: "Story-drops venner faktisk åbner",
    paywallFeatureRemoveBranding: "Fjern Splitmee-branding fra kvitteringer",
    paywallFeatureNudgeWatermark: 'Ingen "Sent via Splitmee" i tekstpåmindelser',
    getUnlimited: "Få ubegrænset",
  },
  de: {
    nudgrrUnlimited: "Splitmee Unbegrenzt",
    unlockNudgrr: "Splitmee freischalten",
    unlockAllWaiting: "Alles freischalten mit Splitmee Unbegrenzt",
    getTheFullExperience: "Mach bezahlt werden unvermeidlich.",
    paywallHeroBadge: "Drop the bill",
    paywallFeatureUnlimitedNudges: "Unbegrenzte Drops & Erinnerungen",
    paywallFeatureWaitingGame: "Volles Wartespiel + Eskalation",
    paywallFeatureGroups: "Projekte für Reisen & Gruppen",
    paywallFeaturePowerTools: "Positionen & eigene Anteile",
    paywallFeatureStoryDrops: "Story-Drops, die Freunde wirklich öffnen",
    paywallFeatureRemoveBranding: "Splitmee-Branding von Quittungen entfernen",
    paywallFeatureNudgeWatermark: 'Kein "Sent via Splitmee" in Text-Erinnerungen',
    getUnlimited: "Unbegrenzt holen",
  },
  fr: {
    nudgrrUnlimited: "Splitmee Illimité",
    unlockNudgrr: "Débloquer Splitmee",
    unlockAllWaiting: "Tout débloquer avec Splitmee Illimité",
    getTheFullExperience: "Rends le paiement inévitable.",
    paywallHeroBadge: "Drop the bill",
    paywallFeatureUnlimitedNudges: "Drops & rappels illimités",
    paywallFeatureWaitingGame: "Waiting Game complet + escalade",
    paywallFeatureGroups: "Projets pour voyages & groupes",
    paywallFeaturePowerTools: "Détail & parts custom",
    paywallFeatureStoryDrops: "Drops story que tes potes ouvrent vraiment",
    paywallFeatureRemoveBranding: "Retirer le branding Splitmee des reçus",
    paywallFeatureNudgeWatermark: 'Pas de "Sent via Splitmee" sur les rappels',
    getUnlimited: "Passer Illimité",
  },
  es: {
    nudgrrUnlimited: "Splitmee Ilimitado",
    unlockNudgrr: "Desbloquear Splitmee",
    unlockAllWaiting: "Desbloquea todo con Splitmee Ilimitado",
    getTheFullExperience: "Haz que te paguen se sienta inevitable.",
    paywallHeroBadge: "Drop the bill",
    paywallFeatureUnlimitedNudges: "Drops y nudges ilimitados",
    paywallFeatureWaitingGame: "Waiting Game completo + escalada",
    paywallFeatureGroups: "Proyectos para viajes y grupos",
    paywallFeaturePowerTools: "Ítems y partes custom",
    paywallFeatureStoryDrops: "Drops de story que sí abren",
    paywallFeatureRemoveBranding: "Quitar branding Splitmee de los recibos",
    paywallFeatureNudgeWatermark: 'Sin "Sent via Splitmee" en recordatorios',
    getUnlimited: "Obtener Ilimitado",
  },
  ja: {
    nudgrrUnlimited: "Splitmee Unlimited",
    unlockNudgrr: "Splitmeeを解除",
    unlockAllWaiting: "Splitmee Unlimitedですべて解除",
    getTheFullExperience: "支払われることを、避けられない空気に。",
    paywallHeroBadge: "Drop the bill",
    paywallFeatureUnlimitedNudges: "無制限のドロップ＆ナッジ",
    paywallFeatureWaitingGame: "フルWaiting Game＋エスカレーション",
    paywallFeatureGroups: "旅行・グループ用プロジェクト",
    paywallFeaturePowerTools: "明細とカスタム割",
    paywallFeatureStoryDrops: "友だちが実際に開くストーリー用ドロップ",
    paywallFeatureRemoveBranding: "レシートからSplitmeeブランディングを削除",
    paywallFeatureNudgeWatermark: "テキストに「Sent via Splitmee」なし",
    getUnlimited: "Unlimitedにする",
  },
  zh: {
    nudgrrUnlimited: "Splitmee 无限版",
    unlockNudgrr: "解锁 Splitmee",
    unlockAllWaiting: "用 Splitmee 无限版解锁全部",
    getTheFullExperience: "让被还款，变得理所当然。",
    paywallHeroBadge: "Drop the bill",
    paywallFeatureUnlimitedNudges: "无限 drops 与催款",
    paywallFeatureWaitingGame: "完整 Waiting Game + 升级提醒",
    paywallFeatureGroups: "旅行与群组的 Projects",
    paywallFeaturePowerTools: "分项与自定义份额",
    paywallFeatureStoryDrops: "朋友真的会点开的 Story drops",
    paywallFeatureRemoveBranding: "从收据移除 Splitmee 品牌",
    paywallFeatureNudgeWatermark: "文本提醒不带 Sent via Splitmee",
    getUnlimited: "开通无限版",
  },
  "zh-TW": {
    nudgrrUnlimited: "Splitmee 無限版",
    unlockNudgrr: "解鎖 Splitmee",
    unlockAllWaiting: "用 Splitmee 無限版解鎖全部",
    getTheFullExperience: "讓被還款，變得理所當然。",
    paywallHeroBadge: "Drop the bill",
    paywallFeatureUnlimitedNudges: "無限 drops 與催款",
    paywallFeatureWaitingGame: "完整 Waiting Game + 升級提醒",
    paywallFeatureGroups: "旅行與群組的 Projects",
    paywallFeaturePowerTools: "分項與自訂份額",
    paywallFeatureStoryDrops: "朋友真的會點開的 Story drops",
    paywallFeatureRemoveBranding: "從收據移除 Splitmee 品牌",
    paywallFeatureNudgeWatermark: "文字提醒不帶 Sent via Splitmee",
    getUnlimited: "開通無限版",
  },
};

let src = fs.readFileSync(i18nPath, "utf8");
const tStart = src.indexOf("export const translations");
if (tStart < 0) throw new Error("no translations");
const head = src.slice(0, tStart);
let body = src.slice(tStart);

const locales = Object.keys(packs);
const markers = locales.map((l) => (l === "zh-TW" ? '\n  "zh-TW": {' : `\n  ${l}: {`));
const starts = markers.map((m) => {
  const i = body.indexOf(m);
  if (i < 0) throw new Error("missing " + m);
  return i + m.length;
});
const ends = starts.map((_, i) =>
  i + 1 < starts.length ? starts[i + 1] - markers[i + 1].length : body.indexOf("\n};", starts[i])
);

function upsert(block, keys) {
  let b = block;
  for (const [k, v] of Object.entries(keys)) {
    const esc = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const simple = new RegExp(`(    ${k}: )"(?:\\\\.|[^"\\\\])*"`);
    if (simple.test(b)) {
      b = b.replace(simple, `$1"${esc}"`);
    } else if (k === "paywallFeaturePowerTools") {
      if (!/paywallFeaturePowerTools:/.test(b)) {
        b = b.replace(
          /(    paywallFeatureGroups: "(?:\\.|[^"\\])*",)/,
          `$1\n    paywallFeaturePowerTools: "${esc}",`
        );
      }
    } else {
      console.warn("miss", k);
    }
  }
  // Remaining user-facing Nudgrr → Splitmee inside string literals in this locale block
  b = b.replace(/"(?:\\.|[^"\\])*"/g, (m) =>
    m.includes("Nudgrr") ? m.replace(/Nudgrr/g, "Splitmee") : m
  );
  return b;
}

let out = body.slice(0, starts[0]);
for (let i = 0; i < locales.length; i++) {
  out += upsert(body.slice(starts[i], ends[i]), packs[locales[i]]);
  if (i + 1 < locales.length) out += markers[i + 1];
}
out += body.slice(ends[ends.length - 1]);

fs.writeFileSync(i18nPath, head + out);
console.log("ok", (head + out).match(/Splitmee Unlimited/g)?.length, "Splitmee Unlimited hits");
console.log("Nudgrr left in translations strings:", [...(head + out).matchAll(/"[^"]*Nudgrr[^"]*"/g)].length);
