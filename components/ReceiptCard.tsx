import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { getLocalizedReceiptTonePack } from "../constants/receiptTone";
import {
  DEFAULT_RECEIPT_TEMPLATE,
  type ReceiptTemplateId,
} from "../constants/receiptTemplates";
import type { NudgeTone } from "../constants/messages";
import { fonts, spacing } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type ReceiptShareBreakdown = {
  name: string;
  amount: number;
};

export type ReceiptCardProps = {
  width: number;
  restaurantLabel: string;
  dateLabel: string;
  billAmount: number;
  tipPercent: number;
  tipAmount: number;
  totalAmount: number;
  totalPerPerson: number;
  people: number;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter: string;
  tone: NudgeTone;
  /** Visual skin: independent of vibe tone. */
  templateId?: ReceiptTemplateId;
  currencyCode: string;
  previewText?: string;
  zigzagHorizontalOnly?: boolean;
  /** Unequal / assigned shares: itemized split on the receipt. */
  shareBreakdown?: ReceiptShareBreakdown[];
};

export function receiptShareHeight(width: number): number {
  return (width * 16) / 9;
}

export function receiptCaptureOuterWidth(width: number): number {
  return width;
}

type Pack = ReturnType<typeof getLocalizedReceiptTonePack>;

type LayoutProps = {
  width: number;
  title: string;
  dateLabel: string;
  billAmount: number;
  tipPctLabel: string;
  tipAmount: number;
  totalAmount: number;
  totalPerPerson: number;
  people: number;
  currencyCode: string;
  messageOnReceipt: string;
  pack: Pack;
  footerText: string;
  showBranding: boolean;
  shareBreakdown?: ReceiptShareBreakdown[];
  brandLabel: string;
  madeWith: string;
  sharesTitle: string;
  isRTL: boolean;
  isDark: boolean;
};

function money(n: number, code: string) {
  return formatCurrency(n, code);
}

function ZigzagStrip({ color, pointing }: { color: string; pointing: "up" | "down" }) {
  const teeth = 18;
  return (
    <View style={[zigzag.row, pointing === "up" && zigzag.flip]}>
      {Array.from({ length: teeth }).map((_, i) => (
        <View
          key={i}
          style={[
            zigzag.tooth,
            {
              borderBottomColor: pointing === "down" ? color : "transparent",
              borderTopColor: pointing === "up" ? color : "transparent",
              borderBottomWidth: pointing === "down" ? 9 : 0,
              borderTopWidth: pointing === "up" ? 9 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

const zigzag = StyleSheet.create({
  row: {
    flexDirection: "row",
    width: "100%",
    height: 9,
    overflow: "hidden",
  },
  flip: {
    transform: [{ rotate: "180deg" }],
  },
  tooth: {
    flex: 1,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});

function DotLeaders() {
  return (
    <Text style={ledgerStyles.dots} numberOfLines={1}>
      {".".repeat(48)}
    </Text>
  );
}

function ShareBlock({
  props,
  amountColor,
  labelColor,
  metaColor,
  align = "center",
  amountSize = 36,
  mono = false,
}: {
  props: LayoutProps;
  amountColor: string;
  labelColor: string;
  metaColor: string;
  align?: "center" | "left" | "right";
  amountSize?: number;
  mono?: boolean;
}) {
  const textAlign = align;
  const { shareBreakdown, pack, people, currencyCode, totalPerPerson, sharesTitle, isRTL } = props;
  if (shareBreakdown && shareBreakdown.length > 0) {
    return (
      <View style={{ gap: 6, alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: labelColor, letterSpacing: 1.4, textTransform: "uppercase", textAlign }}>
          {sharesTitle}
        </Text>
        {shareBreakdown.map((line, idx) => (
          <View key={`${line.name}-${idx}`} style={[common.row, rtlRow(isRTL), { width: "100%" }]}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: amountColor, flex: 1 }} numberOfLines={1}>
              {line.name}
            </Text>
            <Text style={{ fontFamily: mono ? fonts.mono : fonts.bodyBold, fontSize: 14, color: amountColor }}>
              {money(line.amount, currencyCode)}
            </Text>
          </View>
        ))}
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: metaColor, textAlign }}>{pack.splitCaption(shareBreakdown.length)}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 4, alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: labelColor, letterSpacing: 1.6, textTransform: "uppercase", textAlign }}>
        {pack.eachTitle}
      </Text>
      <Text
        style={{
          fontFamily: mono ? fonts.mono : fonts.bodyBold,
          fontSize: amountSize,
          color: amountColor,
          letterSpacing: mono ? 0 : -1.6,
          textAlign,
        }}
      >
        {money(totalPerPerson, currencyCode)}
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: metaColor, textAlign }}>{pack.splitCaption(people)}</Text>
    </View>
  );
}

/** DROP: torn thermal story drop: amount first, jagged edges, loud stamp. */
function DropLayout(p: LayoutProps) {
  const paper = p.isDark ? "#1C120E" : "#FFF1E4";
  const pad = p.isDark ? "#0E0A08" : "#E8D5C4";
  const ink = p.isDark ? "#FFE8D6" : "#1A0A04";
  const hot = "#FF4D1A";
  const mute = p.isDark ? "#C4A090" : "#8B5E4A";
  return (
    <View style={{ width: p.width, backgroundColor: pad }}>
      <ZigzagStrip color={paper} pointing="down" />
      <View style={[drop.root, { width: p.width, backgroundColor: paper }]}>
        <View style={[drop.stamp, { backgroundColor: hot, transform: [{ rotate: "-8deg" }] }]}>
          <Text style={drop.stampText}>{p.pack.badge}</Text>
        </View>
        {p.showBranding ? (
          <Text style={[drop.brand, { color: hot }]}>{p.brandLabel}</Text>
        ) : null}
        <Text style={[drop.heroAmount, { color: hot }]}>{money(p.totalPerPerson, p.currencyCode)}</Text>
        <Text style={[drop.eachHint, { color: mute }]}>{p.pack.eachTitle.toLowerCase()}</Text>
        <Text style={[drop.title, { color: ink }]} numberOfLines={2}>
          {p.title}
        </Text>
        <Text style={[drop.tag, { color: mute }]}>{p.pack.tagline}</Text>
        <View style={[drop.msg, { backgroundColor: p.isDark ? "#2A1810" : "#FFD9C2" }]}>
          <Text style={[drop.msgText, { color: ink }]} numberOfLines={6}>
            {p.messageOnReceipt}
          </Text>
        </View>
        <View style={drop.lines}>
          <View style={[common.row, rtlRow(p.isRTL)]}>
            <Text style={[drop.lineL, { color: mute }]}>{p.pack.billLabel}</Text>
            <Text style={[drop.lineV, { color: ink }]}>{money(p.billAmount, p.currencyCode)}</Text>
          </View>
          <View style={[common.row, rtlRow(p.isRTL)]}>
            <Text style={[drop.lineL, { color: mute }]}>{p.pack.tipLabel(p.tipPctLabel)}</Text>
            <Text style={[drop.lineV, { color: ink }]}>{money(p.tipAmount, p.currencyCode)}</Text>
          </View>
          <View style={[common.row, rtlRow(p.isRTL)]}>
            <Text style={[drop.lineLBold, { color: ink }]}>{p.pack.totalLabel}</Text>
            <Text style={[drop.lineVBold, { color: ink }]}>{money(p.totalAmount, p.currencyCode)}</Text>
          </View>
        </View>
        {p.shareBreakdown && p.shareBreakdown.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <ShareBlock props={p} amountColor={ink} labelColor={hot} metaColor={mute} amountSize={28} />
          </View>
        ) : null}
        <ReceiptCustomFooter text={p.footerText} color={mute} />
        {p.showBranding ? <Text style={[drop.made, { color: mute }]}>{p.madeWith}</Text> : null}
        <Text style={[drop.meta, { color: mute }]}>
          {p.dateLabel}, {p.pack.dateFlavor}
        </Text>
      </View>
      <ZigzagStrip color={paper} pointing="up" />
    </View>
  );
}

/** SOFT: airy spa sheet: circle amount, whisper typography, no chrome. */
function SoftLayout(p: LayoutProps) {
  const bg = p.isDark ? "#121816" : "#F3F7F4";
  const ink = p.isDark ? "#E4EEE9" : "#1E2E28";
  const sage = "#4F8A7A";
  const mute = p.isDark ? "#8AA099" : "#7A9088";
  return (
    <View style={[soft.root, { width: p.width, backgroundColor: bg }]}>
      {p.showBranding ? <Text style={[soft.brand, { color: sage }]}>{p.brandLabel}</Text> : null}
      <Text style={[soft.title, { color: ink }]} numberOfLines={2}>
        {p.title}
      </Text>
      <Text style={[soft.tag, { color: mute }]}>{p.pack.tagline}</Text>
      <View style={[soft.circle, { borderColor: sage }]}>
        <Text style={[soft.circleLabel, { color: sage }]}>{p.pack.eachTitle}</Text>
        <Text style={[soft.circleAmount, { color: sage }]}>{money(p.totalPerPerson, p.currencyCode)}</Text>
        <Text style={[soft.circleMeta, { color: mute }]}>{p.pack.splitCaption(p.people)}</Text>
      </View>
      <Text style={[soft.msg, { color: ink }]} numberOfLines={5}>
        {p.messageOnReceipt}
      </Text>
      <View style={soft.quietLines}>
        {(
          [
            [p.pack.billLabel, money(p.billAmount, p.currencyCode)],
            [p.pack.tipLabel(p.tipPctLabel), money(p.tipAmount, p.currencyCode)],
            [p.pack.totalLabel, money(p.totalAmount, p.currencyCode)],
          ] as const
        ).map(([label, val]) => (
          <View key={label} style={[soft.quietRow, rtlRow(p.isRTL)]}>
            <Text style={[soft.quietL, { color: mute }]}>{label}</Text>
            <Text style={[soft.quietV, { color: ink }]}>{val}</Text>
          </View>
        ))}
      </View>
      {p.shareBreakdown && p.shareBreakdown.length > 0 ? (
        <ShareBlock props={p} amountColor={ink} labelColor={sage} metaColor={mute} amountSize={26} />
      ) : null}
      <ReceiptCustomFooter text={p.footerText} color={mute} />
      <Text style={[soft.date, { color: mute }]}>{p.dateLabel}</Text>
      {p.showBranding ? <Text style={[soft.made, { color: mute }]}>{p.madeWith}</Text> : null}
    </View>
  );
}

/** NOTED: sticky note / memo pad: ruled paper, tape, scrawl. */
function NotedLayout(p: LayoutProps) {
  const paper = p.isDark ? "#3A3418" : "#FFE566";
  const ink = p.isDark ? "#FFF6C8" : "#2A2410";
  const rule = p.isDark ? "rgba(255,246,200,0.12)" : "rgba(42,36,16,0.12)";
  const tape = p.isDark ? "rgba(200,180,100,0.55)" : "rgba(255,255,255,0.55)";
  return (
    <View style={[noted.wrap, { width: p.width }]}>
      <View style={[noted.tape, { backgroundColor: tape }]} />
      <View style={[noted.pad, { backgroundColor: paper, transform: [{ rotate: "1.2deg" }] }]}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[noted.rule, { top: 56 + i * 28, backgroundColor: rule }]} />
        ))}
        <Text style={[noted.memo, { color: ink }]}>{p.pack.badge}</Text>
        <Text style={[noted.title, { color: ink }]} numberOfLines={2}>
          {p.title}
        </Text>
        <Text style={[noted.scrawl, { color: ink }]} numberOfLines={5}>
          {p.messageOnReceipt}
        </Text>
        <Text style={[noted.owed, { color: ink }]}>
          → {money(p.totalPerPerson, p.currencyCode)}
        </Text>
        <Text style={[noted.meta, { color: ink }]}>
          {p.pack.tipLabel(p.tipPctLabel)}, {money(p.totalAmount, p.currencyCode)}, {p.pack.splitCaption(p.people)}
        </Text>
        <Text style={[noted.date, { color: ink }]}>
          {p.dateLabel}, {p.pack.dateFlavor}
        </Text>
        {p.shareBreakdown && p.shareBreakdown.length > 0 ? (
          <View style={{ marginTop: 12, zIndex: 2 }}>
            <ShareBlock props={p} amountColor={ink} labelColor={ink} metaColor={ink} align="left" amountSize={24} />
          </View>
        ) : null}
        <ReceiptCustomFooter text={p.footerText} color={ink} />
        {p.showBranding ? (
          <Text style={[noted.brand, { color: ink }]}>
            {p.brandLabel}, {p.madeWith}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** LEDGER: formal invoice: double frame, dotted leaders, mono figures. */
function LedgerLayout(p: LayoutProps) {
  const paper = p.isDark ? "#141510" : "#F7F4EC";
  const ink = p.isDark ? "#F2EFE6" : "#0B1F4A";
  const rule = p.isDark ? "rgba(242,239,230,0.25)" : "rgba(11,31,74,0.35)";
  return (
    <View style={[ledgerStyles.outer, { width: p.width, borderColor: ink }]}>
      <View style={[ledgerStyles.inner, { backgroundColor: paper, borderColor: ink }]}>
        <View style={[ledgerStyles.head, rtlRow(p.isRTL)]}>
          <View>
            <Text style={[ledgerStyles.inv, { color: ink }]}>INVOICE</Text>
            {p.showBranding ? <Text style={[ledgerStyles.brand, { color: ink }]}>{p.brandLabel}</Text> : null}
          </View>
          <View style={{ alignItems: p.isRTL ? "flex-start" : "flex-end" }}>
            <Text style={[ledgerStyles.date, { color: ink }]}>{p.dateLabel}</Text>
            <Text style={[ledgerStyles.flavor, { color: ink }]}>{p.pack.dateFlavor}</Text>
          </View>
        </View>
        <View style={[ledgerStyles.hair, { backgroundColor: rule }]} />
        <Text style={[ledgerStyles.title, { color: ink }]} numberOfLines={2}>
          {p.title}
        </Text>
        <Text style={[ledgerStyles.tag, { color: ink }]}>{p.pack.tagline}</Text>
        <Text style={[ledgerStyles.msg, { color: ink }]} numberOfLines={4}>
          {p.messageOnReceipt}
        </Text>
        {(
          [
            [p.pack.billLabel, money(p.billAmount, p.currencyCode)],
            [p.pack.tipLabel(p.tipPctLabel), money(p.tipAmount, p.currencyCode)],
            [p.pack.totalLabel, money(p.totalAmount, p.currencyCode)],
          ] as const
        ).map(([label, val]) => (
          <View key={label} style={[ledgerStyles.line, rtlRow(p.isRTL)]}>
            <Text style={[ledgerStyles.lineL, { color: ink }]}>{label}</Text>
            <DotLeaders />
            <Text style={[ledgerStyles.lineV, { color: ink }]}>{val}</Text>
          </View>
        ))}
        <View style={[ledgerStyles.dueBox, { borderColor: ink }]}>
          <Text style={[ledgerStyles.dueLabel, { color: ink }]}>{p.pack.eachTitle}</Text>
          <Text style={[ledgerStyles.dueAmount, { color: ink }]}>{money(p.totalPerPerson, p.currencyCode)}</Text>
          <Text style={[ledgerStyles.dueMeta, { color: ink }]}>{p.pack.splitCaption(p.people)}</Text>
        </View>
        {p.shareBreakdown && p.shareBreakdown.length > 0 ? (
          <ShareBlock props={p} amountColor={ink} labelColor={ink} metaColor={ink} align="left" amountSize={22} mono />
        ) : null}
        <View style={[ledgerStyles.stamp, { borderColor: ink }]}>
          <Text style={[ledgerStyles.stampText, { color: ink }]}>{p.pack.badge}</Text>
        </View>
        <ReceiptCustomFooter text={p.footerText} color={ink} />
        {p.showBranding ? <Text style={[ledgerStyles.made, { color: ink }]}>{p.madeWith}</Text> : null}
      </View>
    </View>
  );
}

/** NIGHT: club flyer / neon board: black field, acid green, poster stack. */
function NightLayout(p: LayoutProps) {
  const bg = "#07070E";
  const neon = "#39FF14";
  const hot = "#FF2BD6";
  const mute = "#8B90A8";
  const paper = "#0E1018";
  return (
    <View style={[night.root, { width: p.width, backgroundColor: bg }]}>
      <View style={[night.neonBar, { backgroundColor: neon }]} />
      <View style={[night.neonBarThin, { backgroundColor: hot }]} />
      {p.showBranding ? <Text style={[night.brand, { color: neon }]}>{p.brandLabel}</Text> : null}
      <Text style={[night.kicker, { color: hot }]}>{p.pack.badge}</Text>
      <Text style={[night.title, { color: "#F5F5FF" }]} numberOfLines={2}>
        {p.title.toUpperCase()}
      </Text>
      <Text style={[night.tag, { color: mute }]}>{p.pack.tagline}</Text>
      <View style={[night.amountBlock, { borderColor: neon, backgroundColor: paper }]}>
        <Text style={[night.amountLabel, { color: neon }]}>{p.pack.eachTitle}</Text>
        <Text style={[night.amount, { color: neon }]}>{money(p.totalPerPerson, p.currencyCode)}</Text>
      </View>
      <View style={[night.msg, { borderLeftColor: hot }]}>
        <Text style={[night.msgText, { color: "#E8E8F8" }]} numberOfLines={5}>
          {p.messageOnReceipt}
        </Text>
      </View>
      <View style={night.grid}>
        {(
          [
            [p.pack.billLabel, money(p.billAmount, p.currencyCode)],
            [p.pack.tipLabel(p.tipPctLabel), money(p.tipAmount, p.currencyCode)],
            [p.pack.totalLabel, money(p.totalAmount, p.currencyCode)],
          ] as const
        ).map(([label, val]) => (
          <View key={label} style={[common.row, rtlRow(p.isRTL), night.gridRow]}>
            <Text style={[night.gridL, { color: mute }]}>{label}</Text>
            <Text style={[night.gridV, { color: "#F5F5FF" }]}>{val}</Text>
          </View>
        ))}
      </View>
      <Text style={[night.meta, { color: mute }]}>
        {p.dateLabel}, {p.pack.splitCaption(p.people)}
      </Text>
      {p.shareBreakdown && p.shareBreakdown.length > 0 ? (
        <ShareBlock props={p} amountColor={neon} labelColor={hot} metaColor={mute} amountSize={28} mono />
      ) : null}
      <ReceiptCustomFooter text={p.footerText} color={mute} />
      {p.showBranding ? <Text style={[night.made, { color: mute }]}>{p.madeWith}</Text> : null}
    </View>
  );
}

/** TICKET: concert stub: perforated tear + barcode + ADMIT. */
function TicketLayout(p: LayoutProps) {
  const paper = p.isDark ? "#1A1610" : "#F2E6D0";
  const ink = p.isDark ? "#F6EBD8" : "#1A1208";
  const red = "#C41E3A";
  const mute = p.isDark ? "#B5A48E" : "#7A6A52";
  return (
    <View style={[ticket.shell, { width: p.width, backgroundColor: paper, borderColor: ink }]}>
      <View style={ticket.main}>
        <View style={[ticket.topRow, rtlRow(p.isRTL)]}>
          {p.showBranding ? <Text style={[ticket.brand, { color: red }]}>{p.brandLabel}</Text> : <View />}
          <View style={[ticket.admit, { borderColor: red }]}>
            <Text style={[ticket.admitText, { color: red }]}>ADMIT</Text>
          </View>
        </View>
        <Text style={[ticket.event, { color: ink }]} numberOfLines={2}>
          {p.title.toUpperCase()}
        </Text>
        <Text style={[ticket.venue, { color: mute }]}>{p.pack.tagline}</Text>
        <View style={[ticket.stats, rtlRow(p.isRTL)]}>
          <View>
            <Text style={[ticket.statL, { color: mute }]}>DATE</Text>
            <Text style={[ticket.statV, { color: ink }]}>{p.dateLabel}</Text>
          </View>
          <View>
            <Text style={[ticket.statL, { color: mute }]}>PARTY</Text>
            <Text style={[ticket.statV, { color: ink }]}>{p.people}</Text>
          </View>
          <View>
            <Text style={[ticket.statL, { color: mute }]}>TIP</Text>
            <Text style={[ticket.statV, { color: ink }]}>{p.tipPctLabel}%</Text>
          </View>
        </View>
        <Text style={[ticket.msg, { color: ink }]} numberOfLines={4}>
          {p.messageOnReceipt}
        </Text>
        <View style={ticket.barcode}>
          {Array.from({ length: 28 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
                height: 28 + (i % 4) * 3,
                backgroundColor: ink,
                opacity: 0.85,
              }}
            />
          ))}
        </View>
        <ReceiptCustomFooter text={p.footerText} color={mute} />
        {p.showBranding ? <Text style={[ticket.made, { color: mute }]}>{p.madeWith}</Text> : null}
      </View>
      <View style={ticket.perfCol}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={i} style={[ticket.perfHole, { backgroundColor: p.isDark ? "#0C0A08" : "#E8E0D0" }]} />
        ))}
      </View>
      <View style={[ticket.stub, { backgroundColor: p.isDark ? "#241C12" : "#E8D5B0" }]}>
        <Text style={[ticket.stubLabel, { color: red }]}>{p.pack.eachTitle}</Text>
        <Text style={[ticket.stubAmount, { color: ink }]}>{money(p.totalPerPerson, p.currencyCode)}</Text>
        <Text style={[ticket.stubMeta, { color: mute }]}>{money(p.totalAmount, p.currencyCode)}</Text>
        <Text style={[ticket.stubBadge, { color: red }]}>{p.pack.badge}</Text>
        {p.shareBreakdown && p.shareBreakdown.length > 0 ? (
          <View style={{ marginTop: 8, width: "100%" }}>
            <ShareBlock props={p} amountColor={ink} labelColor={red} metaColor={mute} amountSize={16} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const ReceiptCard = memo(function ReceiptCard({
  width,
  restaurantLabel,
  dateLabel,
  billAmount,
  tipPercent,
  tipAmount,
  totalAmount,
  totalPerPerson,
  people,
  isPro,
  hideReceiptBranding = false,
  customFooter,
  tone,
  templateId = DEFAULT_RECEIPT_TEMPLATE,
  currencyCode,
  previewText,
  shareBreakdown,
}: ReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const pack = useMemo(() => getLocalizedReceiptTonePack(tone, t), [tone, t]);

  const title = restaurantLabel.trim() || t("dinner");
  const tipPctLabel =
    Math.abs(tipPercent - Math.round(tipPercent)) < 0.001
      ? `${Math.round(tipPercent)}`
      : `${tipPercent}`;

  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );

  const showBranding = !(isPro && hideReceiptBranding);

  const socialDrop = useMemo(() => {
    const amountLabel = formatCurrency(totalPerPerson, currencyCode);
    return pack.dropLine(amountLabel);
  }, [currencyCode, pack, totalPerPerson]);

  const messageOnReceipt = previewText?.trim() ? previewText.trim() : socialDrop;

  const layoutProps: LayoutProps = {
    width,
    title,
    dateLabel,
    billAmount,
    tipPctLabel,
    tipAmount,
    totalAmount,
    totalPerPerson,
    people,
    currencyCode,
    messageOnReceipt,
    pack,
    footerText,
    showBranding,
    shareBreakdown,
    brandLabel: t("receiptBrandLabel"),
    madeWith: t("madeWithNudgrr"),
    sharesTitle: t("customSharesReceiptTitle"),
    isRTL,
    isDark,
  };

  switch (templateId) {
    case "soft":
      return <SoftLayout {...layoutProps} />;
    case "noted":
      return <NotedLayout {...layoutProps} />;
    case "ledger":
      return <LedgerLayout {...layoutProps} />;
    case "night":
      return <NightLayout {...layoutProps} />;
    case "ticket":
      return <TicketLayout {...layoutProps} />;
    case "drop":
    default:
      return <DropLayout {...layoutProps} />;
  }
});

const common = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
});

const drop = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 8,
    overflow: "hidden",
  },
  stamp: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
    marginBottom: 4,
  },
  stampText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#FFF8F2",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  brand: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  heroAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 52,
    letterSpacing: -2.4,
    lineHeight: 56,
    marginTop: 4,
  },
  eachHint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: -4,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    letterSpacing: -0.6,
    marginTop: 8,
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  msg: {
    padding: spacing.md,
    borderRadius: 4,
    marginTop: 4,
  },
  msgText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
  lines: {
    gap: 8,
    marginTop: 4,
  },
  lineL: { fontFamily: fonts.body, fontSize: 13, flex: 1 },
  lineV: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  lineLBold: { fontFamily: fonts.bodyBold, fontSize: 14, flex: 1 },
  lineVBold: { fontFamily: fonts.bodyBold, fontSize: 14 },
  made: { fontFamily: fonts.body, fontSize: 10, marginTop: 4 },
  meta: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
});

const soft = StyleSheet.create({
  root: {
    borderRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#4F8A7A",
        shadowOpacity: 0.12,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  brand: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.body,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "center",
    marginTop: -6,
  },
  circle: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginVertical: spacing.sm,
  },
  circleLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  circleAmount: {
    fontFamily: fonts.body,
    fontSize: 28,
    letterSpacing: -0.8,
  },
  circleMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  msg: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  quietLines: {
    width: "100%",
    gap: 14,
    marginTop: spacing.sm,
  },
  quietRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quietL: { fontFamily: fonts.body, fontSize: 12 },
  quietV: { fontFamily: fonts.body, fontSize: 12 },
  date: { fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  made: { fontFamily: fonts.body, fontSize: 10 },
});

const noted = StyleSheet.create({
  wrap: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  tape: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 72,
    height: 22,
    borderRadius: 2,
    zIndex: 3,
    transform: [{ rotate: "-4deg" }],
  },
  pad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    minHeight: 340,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#2A2410",
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: { width: 4, height: 10 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  rule: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    height: StyleSheet.hairlineWidth,
    zIndex: 0,
  },
  memo: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    zIndex: 2,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    marginTop: 10,
    zIndex: 2,
  },
  scrawl: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 28,
    marginTop: 18,
    zIndex: 2,
  },
  owed: {
    fontFamily: fonts.bodyBold,
    fontSize: 32,
    marginTop: 20,
    letterSpacing: -1,
    zIndex: 2,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 8,
    zIndex: 2,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 10,
    zIndex: 2,
  },
  brand: {
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 12,
    zIndex: 2,
  },
});

const ledgerStyles = StyleSheet.create({
  outer: {
    borderWidth: 3,
    padding: 4,
  },
  inner: {
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 10,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  inv: {
    fontFamily: fonts.mono,
    fontSize: 18,
    letterSpacing: 3,
  },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
    textTransform: "uppercase",
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  flavor: {
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 2,
    opacity: 0.7,
  },
  hair: {
    height: 1,
    width: "100%",
    marginVertical: 4,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  tag: {
    fontFamily: fonts.mono,
    fontSize: 11,
    opacity: 0.75,
  },
  msg: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginVertical: 4,
  },
  line: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  lineL: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  dots: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 10,
    opacity: 0.35,
    overflow: "hidden",
  },
  lineV: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  dueBox: {
    borderWidth: 2,
    padding: spacing.md,
    marginTop: 8,
    alignItems: "flex-end",
    gap: 2,
  },
  dueLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  dueAmount: {
    fontFamily: fonts.mono,
    fontSize: 28,
  },
  dueMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    opacity: 0.7,
  },
  stamp: {
    alignSelf: "flex-start",
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: "-6deg" }],
    marginTop: 4,
  },
  stampText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  made: {
    fontFamily: fonts.mono,
    fontSize: 9,
    opacity: 0.55,
    marginTop: 4,
  },
});

const night = StyleSheet.create({
  root: {
    borderRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 10,
    overflow: "hidden",
  },
  neonBar: {
    height: 4,
    width: "100%",
    marginBottom: 2,
  },
  neonBarThin: {
    height: 2,
    width: "42%",
    marginBottom: 8,
  },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    letterSpacing: 1.2,
    lineHeight: 32,
  },
  tag: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  amountBlock: {
    borderWidth: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  amountLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  amount: {
    fontFamily: fonts.mono,
    fontSize: 36,
  },
  msg: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    paddingVertical: 4,
  },
  msgText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  grid: {
    gap: 8,
    marginTop: 4,
  },
  gridRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingBottom: 6,
  },
  gridL: { fontFamily: fonts.mono, fontSize: 11, flex: 1 },
  gridV: { fontFamily: fonts.mono, fontSize: 12 },
  meta: { fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
  made: { fontFamily: fonts.mono, fontSize: 9, opacity: 0.5 },
});

const ticket = StyleSheet.create({
  shell: {
    flexDirection: "row",
    borderWidth: 2,
    borderRadius: 6,
    overflow: "hidden",
    minHeight: 360,
  },
  main: {
    flex: 1,
    padding: spacing.md,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  admit: {
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  admitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
  },
  event: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  venue: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
  },
  statL: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  statV: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    marginTop: 2,
  },
  msg: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  barcode: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 40,
    marginTop: 8,
  },
  made: {
    fontFamily: fonts.body,
    fontSize: 9,
    marginTop: 4,
  },
  perfCol: {
    width: 12,
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 8,
  },
  perfHole: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stub: {
    width: 96,
    paddingVertical: spacing.md,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stubLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  stubAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  stubMeta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textAlign: "center",
  },
  stubBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 8,
    textAlign: "center",
  },
});
