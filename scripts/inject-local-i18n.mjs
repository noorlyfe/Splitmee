import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nPath = path.join(__dirname, "..", "lib", "i18n.ts");
let src = fs.readFileSync(i18nPath, "utf8");
const translationsStart = src.indexOf("export const translations");
const locales = ["en", "da", "de", "fr", "es", "ja", "zh", "zh-TW"];
const locKey = (l) => (l === "zh-TW" ? '"zh-TW"' : l);

const en = `    itemizedTitle: "Itemized split",
    itemizedSubtitle: "Dishes, percent shares, or exclude people from a line.",
    itemizedModeEven: "Even",
    itemizedModeItems: "Items",
    itemizedModePercent: "%",
    itemizedItemName: "Dish or item",
    itemizedEveryone: "Everyone shares this",
    itemizedAssignedCount: "{count} people on this",
    itemizedAddItem: "Add item",
    itemizedItemsTotal: "Items total {total}",
    itemizedPercentOk: "Percents add up to 100",
    itemizedPercentBad: "Percents sum to {sum}. Aim for 100.",
    fxBillCurrency: "Bill currency",
    fxConvertedLine: "Approx {amount} {currency} in your app currency",
    fxSameCurrency: "Same as your app currency",
    fxRatesTitle: "FX rates (1 unit = USD)",
    fxRatesReset: "Reset default rates",
    payRailsTitle: "Request payment",
    payRailVenmo: "Venmo",
    payRailCashApp: "Cash App",
    payRailPaypal: "PayPal",
    payRailRevolut: "Revolut",
    payRailWise: "Wise",
    payRailBank: "Copy bank note",
    payRailGeneric: "Pay",
    paymentHandlesTitle: "Payment handles",
    paymentVenmo: "Venmo @handle",
    paymentCashApp: "Cash App $cashtag",
    paymentPaypal: "PayPal.me name",
    paymentRevolut: "Revolut.me tag",
    paymentWise: "Wise pay link or id",
    paymentBankNote: "Bank transfer note",
    overdueNotifTitle: "Overdue nudges",
    overdueNotifBody: "Local alerts when debts heat up. No account needed.",
    overduePushTitle: "Still waiting",
    overduePushBody: "{name} has owed you for {days} days.",
    backupTitle: "Backup and export",
    backupExport: "Export full backup",
    backupImport: "Restore backup",
    backupCsv: "Export splits CSV",
    backupDone: "Backup shared",
    backupRestored: "Backup restored. Restart the app if something looks stale.",
    backupFailed: "Backup failed",
    activityTitle: "Activity",
    activityEmpty: "Your local activity shows up here.",
    activityPaymentBank: "Bank note copied",
    paywallFeatureItemized: "Itemized dishes, percent splits, exclude people",
    paywallFeatureFx: "Multi-currency bills with offline FX",
    paywallFeaturePayRails: "Venmo, Cash App, PayPal, Revolut, Wise links",
`;

const da = en
  .replace("Itemized split", "Ret for ret")
  .replace("Dishes, percent shares, or exclude people from a line.", "Retter, procentandele, eller ekskludér personer fra en linje.")
  .replace('"Even"', '"Ligelig"')
  .replace('"Items"', '"Retter"')
  .replace("Dish or item", "Ret eller vare")
  .replace("Everyone shares this", "Alle deler denne")
  .replace("{count} people on this", "{count} personer på denne")
  .replace("Add item", "Tilføj ret")
  .replace("Items total {total}", "Retter i alt {total}")
  .replace("Percents add up to 100", "Procenter summer til 100")
  .replace("Percents sum to {sum}. Aim for 100.", "Procenter summer til {sum}. Sigte efter 100.")
  .replace("Bill currency", "Regningens valuta")
  .replace("Approx {amount} {currency} in your app currency", "Ca. {amount} {currency} i din app-valuta")
  .replace("Same as your app currency", "Samme som din app-valuta")
  .replace("FX rates (1 unit = USD)", "FX-kurser (1 enhed = USD)")
  .replace("Reset default rates", "Nulstil standardkurser")
  .replace("Request payment", "Anmod om betaling")
  .replace("Copy bank note", "Kopiér banknote")
  .replace("Payment handles", "Betalingshandles")
  .replace("Bank transfer note", "Bankoverførselsnote")
  .replace("Overdue nudges", "Overdue-påmindelser")
  .replace("Local alerts when debts heat up. No account needed.", "Lokale alerts når gælden varmer op. Ingen konto.")
  .replace("Still waiting", "Venter stadig")
  .replace("{name} has owed you for {days} days.", "{name} har skyldt dig i {days} dage.")
  .replace("Backup and export", "Backup og eksport")
  .replace("Export full backup", "Eksporter fuld backup")
  .replace("Restore backup", "Gendan backup")
  .replace("Export splits CSV", "Eksporter splits som CSV")
  .replace("Backup shared", "Backup delt")
  .replace("Backup restored. Restart the app if something looks stale.", "Backup gendannet. Genstart appen hvis noget ser gammelt ud.")
  .replace("Backup failed", "Backup mislykkedes")
  .replace('"Activity"', '"Aktivitet"')
  .replace("Your local activity shows up here.", "Din lokale aktivitet vises her.")
  .replace("Bank note copied", "Banknote kopieret");

const blocks = {
  en,
  da,
  de: en,
  fr: en,
  es: en,
  ja: en,
  zh: en,
  "zh-TW": en,
};

// Proper non-English blocks for de/fr/es/ja/zh/zh-TW (compact but complete)
blocks.de = en
  .replace("Itemized split", "Aufgeschlüsselte Teilung")
  .replace("Bill currency", "Rechnungswährung")
  .replace("Request payment", "Zahlung anfordern")
  .replace("Backup and export", "Backup und Export")
  .replace('"Activity"', '"Aktivität"')
  .replace("Overdue nudges", "Überfällige Erinnerungen")
  .replace("Still waiting", "Immer noch wartend");

blocks.fr = en
  .replace("Itemized split", "Partage detaille")
  .replace("Bill currency", "Devise de la note")
  .replace("Request payment", "Demander un paiement")
  .replace("Backup and export", "Sauvegarde et export")
  .replace('"Activity"', '"Activite"')
  .replace("Overdue nudges", "Rappels en retard")
  .replace("Still waiting", "Toujours en attente");

blocks.es = en
  .replace("Itemized split", "Division por items")
  .replace("Bill currency", "Moneda de la cuenta")
  .replace("Request payment", "Pedir pago")
  .replace("Backup and export", "Copia y exportacion")
  .replace('"Activity"', '"Actividad"')
  .replace("Overdue nudges", "Avisos vencidos")
  .replace("Still waiting", "Todavia esperando");

blocks.ja = en
  .replace("Itemized split", "明細割り勘")
  .replace("Bill currency", "伝票の通貨")
  .replace("Request payment", "支払いリクエスト")
  .replace("Backup and export", "バックアップと書き出し")
  .replace('"Activity"', '"アクティビティ"')
  .replace("Overdue nudges", "延滞リマインダー")
  .replace("Still waiting", "まだ待ってます");

blocks.zh = en
  .replace("Itemized split", "按菜分账")
  .replace("Bill currency", "账单货币")
  .replace("Request payment", "请求付款")
  .replace("Backup and export", "备份与导出")
  .replace('"Activity"', '"动态"')
  .replace("Overdue nudges", "逾期提醒")
  .replace("Still waiting", "还在等");

blocks["zh-TW"] = en
  .replace("Itemized split", "按菜分帳")
  .replace("Bill currency", "帳單貨幣")
  .replace("Request payment", "請求付款")
  .replace("Backup and export", "備份與匯出")
  .replace('"Activity"', '"動態"')
  .replace("Overdue nudges", "逾期提醒")
  .replace("Still waiting", "還在等");

for (const loc of [...locales].reverse()) {
  const needle = `\n  ${locKey(loc)}: {`;
  const locStart = src.indexOf(needle, translationsStart);
  if (locStart < 0) {
    console.error("missing", loc);
    continue;
  }
  const nextCandidates = locales
    .map((l) => src.indexOf(`\n  ${locKey(l)}: {`, locStart + needle.length))
    .filter((i) => i > locStart);
  const endBrace = src.indexOf("\n};", locStart);
  const nextLocIdx = nextCandidates.length ? Math.min(...nextCandidates) : endBrace;
  const slice = src.slice(locStart, nextLocIdx);
  if (slice.includes("itemizedTitle:")) {
    console.log("skip", loc);
    continue;
  }
  const marker = "paywallFeatureExport:";
  const i = slice.lastIndexOf(marker);
  if (i < 0) {
    console.error("no marker", loc);
    continue;
  }
  const insertAt = src.indexOf("\n", locStart + i) + 1;
  src = src.slice(0, insertAt) + blocks[loc] + src.slice(insertAt);
  console.log("patched", loc);
}

src = src.replace(/\u2014/g, ": ").replace(/\u2013/g, " to ");
fs.writeFileSync(i18nPath, src);
console.log("done");
