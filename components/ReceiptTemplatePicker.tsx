import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "../lib/appHaptics";

import {
  RECEIPT_TEMPLATES,
  isFreeReceiptTemplate,
  type ReceiptTemplateId,
} from "../constants/receiptTemplates";
import { fonts, spacing, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { rtlRow } from "../lib/rtl";

type Props = {
  value: ReceiptTemplateId;
  onChange: (id: ReceiptTemplateId) => void;
  isPro: boolean;
  onRequirePro: () => void;
  /** When false, omit the section label (e.g. Settings already has a group title). */
  showLabel?: boolean;
};

/** Tiny structural silhouette: not a recolored chip. */
function TemplateThumb({ id, active }: { id: ReceiptTemplateId; active: boolean }) {
  switch (id) {
    case "drop":
      return (
        <View style={[thumb.frame, active && thumb.frameActive, { backgroundColor: "#FFF1E4" }]}>
          <View style={thumb.dropZigTop} />
          <View style={[thumb.dropStamp, { backgroundColor: "#FF4D1A" }]} />
          <View style={[thumb.dropHero, { backgroundColor: "#FF4D1A" }]} />
          <View style={[thumb.dropBlock, { backgroundColor: "#FFD9C2" }]} />
          <View style={[thumb.dropLine, { backgroundColor: "#1A0A04" }]} />
          <View style={[thumb.dropLine, { backgroundColor: "#1A0A04", width: "55%" }]} />
          <View style={thumb.dropZigBot} />
        </View>
      );
    case "soft":
      return (
        <View style={[thumb.frame, thumb.softRound, active && thumb.frameActive, { backgroundColor: "#F3F7F4" }]}>
          <View style={[thumb.softTitle, { backgroundColor: "#1E2E28" }]} />
          <View style={[thumb.softCircle, { borderColor: "#4F8A7A" }]}>
            <View style={[thumb.softDot, { backgroundColor: "#4F8A7A" }]} />
          </View>
          <View style={[thumb.softLine, { backgroundColor: "#7A9088" }]} />
          <View style={[thumb.softLine, { backgroundColor: "#7A9088", width: "70%" }]} />
        </View>
      );
    case "noted":
      return (
        <View style={[thumb.frame, active && thumb.frameActive, { backgroundColor: "transparent" }]}>
          <View style={thumb.notedTape} />
          <View style={[thumb.notedPad, { backgroundColor: "#FFE566", transform: [{ rotate: "2deg" }] }]}>
            <View style={[thumb.notedRule, { top: 22 }]} />
            <View style={[thumb.notedRule, { top: 34 }]} />
            <View style={[thumb.notedRule, { top: 46 }]} />
            <View style={[thumb.notedRule, { top: 58 }]} />
            <View style={[thumb.notedScrawl, { backgroundColor: "#2A2410" }]} />
            <View style={[thumb.notedArrow, { backgroundColor: "#2A2410" }]} />
          </View>
        </View>
      );
    case "ledger":
      return (
        <View style={[thumb.frame, active && thumb.frameActive, { backgroundColor: "#0B1F4A", padding: 3 }]}>
          <View style={[thumb.ledgerInner, { backgroundColor: "#F7F4EC", borderColor: "#0B1F4A" }]}>
            <View style={[thumb.ledgerInv, { backgroundColor: "#0B1F4A" }]} />
            <View style={[thumb.ledgerHair, { backgroundColor: "#0B1F4A" }]} />
            <View style={[thumb.ledgerDots, { backgroundColor: "#0B1F4A" }]} />
            <View style={[thumb.ledgerDots, { backgroundColor: "#0B1F4A", width: "80%" }]} />
            <View style={[thumb.ledgerBox, { borderColor: "#0B1F4A" }]} />
          </View>
        </View>
      );
    case "night":
      return (
        <View style={[thumb.frame, active && thumb.frameActive, { backgroundColor: "#07070E" }]}>
          <View style={[thumb.nightBar, { backgroundColor: "#39FF14" }]} />
          <View style={[thumb.nightBarHot, { backgroundColor: "#FF2BD6" }]} />
          <View style={[thumb.nightTitle, { backgroundColor: "#F5F5FF" }]} />
          <View style={[thumb.nightBox, { borderColor: "#39FF14" }]}>
            <View style={[thumb.nightAmount, { backgroundColor: "#39FF14" }]} />
          </View>
          <View style={[thumb.nightMsg, { borderLeftColor: "#FF2BD6" }]} />
        </View>
      );
    case "ticket":
      return (
        <View style={[thumb.frame, thumb.ticketRow, active && thumb.frameActive, { backgroundColor: "#F2E6D0", borderColor: "#1A1208", borderWidth: 1.5 }]}>
          <View style={thumb.ticketMain}>
            <View style={[thumb.ticketAdmit, { borderColor: "#C41E3A" }]} />
            <View style={[thumb.ticketTitle, { backgroundColor: "#1A1208" }]} />
            <View style={thumb.ticketBars}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View key={i} style={{ width: i % 3 === 0 ? 2 : 1, height: 10 + (i % 3) * 2, backgroundColor: "#1A1208" }} />
              ))}
            </View>
          </View>
          <View style={thumb.ticketPerf}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={thumb.ticketHole} />
            ))}
          </View>
          <View style={[thumb.ticketStub, { backgroundColor: "#E8D5B0" }]}>
            <View style={[thumb.ticketStubAmt, { backgroundColor: "#C41E3A" }]} />
          </View>
        </View>
      );
    default:
      return <View style={thumb.frame} />;
  }
}

export function ReceiptTemplatePicker({
  value,
  onChange,
  isPro,
  onRequirePro,
  showLabel = true,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, isRTL } = useLocale();

  return (
    <View style={styles.wrap}>
      {showLabel ? <Text style={styles.label}>{t("templateLabel")}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, rtlRow(isRTL)]}
        keyboardShouldPersistTaps="handled"
        decelerationRate="fast"
        snapToInterval={100}
      >
        {RECEIPT_TEMPLATES.map((tpl) => {
          const active = value === tpl.id;
          const locked = !isPro && !isFreeReceiptTemplate(tpl.id);
          return (
            <Pressable
              key={tpl.id}
              onPress={() => {
                if (locked) {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  onRequirePro();
                  return;
                }
                void Haptics.selectionAsync();
                onChange(tpl.id);
              }}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: locked }}
              accessibilityLabel={t(tpl.nameKey)}
            >
              <View style={styles.thumbWrap}>
                <TemplateThumb id={tpl.id} active={active} />
                {locked ? (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
                {t(tpl.nameKey)}
              </Text>
              {active ? <View style={[styles.dot, { backgroundColor: tpl.swatchAccent }]} /> : <View style={styles.dotSpacer} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const thumb = StyleSheet.create({
  frame: {
    width: 84,
    height: 108,
    overflow: "hidden",
    padding: 8,
    gap: 5,
  },
  frameActive: {
    transform: [{ scale: 1.02 }],
  },
  dropZigTop: {
    height: 6,
    marginHorizontal: -8,
    marginTop: -8,
    backgroundColor: "#FFF1E4",
    borderBottomWidth: 6,
    borderBottomColor: "#E8D5C4",
  },
  dropStamp: {
    alignSelf: "flex-end",
    width: 28,
    height: 10,
    borderRadius: 2,
    transform: [{ rotate: "-8deg" }],
  },
  dropHero: {
    width: "72%",
    height: 14,
    borderRadius: 2,
    marginTop: 2,
  },
  dropBlock: {
    height: 22,
    borderRadius: 2,
    marginTop: 2,
  },
  dropLine: {
    height: 3,
    width: "100%",
    opacity: 0.35,
    borderRadius: 1,
  },
  dropZigBot: {
    marginTop: "auto",
    marginHorizontal: -8,
    marginBottom: -8,
    height: 6,
    backgroundColor: "#E8D5C4",
  },
  softRound: {
    borderRadius: 22,
    alignItems: "center",
  },
  softTitle: {
    width: "50%",
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
    marginTop: 6,
  },
  softCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  softDot: {
    width: 18,
    height: 6,
    borderRadius: 3,
  },
  softLine: {
    height: 3,
    width: "85%",
    borderRadius: 2,
    opacity: 0.35,
  },
  notedTape: {
    position: "absolute",
    top: 2,
    alignSelf: "center",
    width: 28,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    zIndex: 2,
    borderRadius: 1,
  },
  notedPad: {
    flex: 1,
    marginTop: 6,
    padding: 8,
  },
  notedRule: {
    position: "absolute",
    left: 8,
    right: 8,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(42,36,16,0.2)",
  },
  notedScrawl: {
    marginTop: 28,
    height: 4,
    width: "80%",
    borderRadius: 1,
    opacity: 0.5,
  },
  notedArrow: {
    marginTop: 16,
    height: 8,
    width: "55%",
    borderRadius: 1,
  },
  ledgerInner: {
    flex: 1,
    borderWidth: 1,
    padding: 6,
    gap: 5,
  },
  ledgerInv: {
    width: "40%",
    height: 6,
  },
  ledgerHair: {
    height: 1,
    width: "100%",
    opacity: 0.4,
  },
  ledgerDots: {
    height: 3,
    width: "100%",
    opacity: 0.25,
  },
  ledgerBox: {
    marginTop: "auto",
    height: 22,
    borderWidth: 1.5,
    alignSelf: "stretch",
  },
  nightBar: {
    height: 3,
    width: "100%",
    marginTop: -2,
  },
  nightBarHot: {
    height: 2,
    width: "40%",
  },
  nightTitle: {
    height: 8,
    width: "75%",
    marginTop: 6,
    opacity: 0.9,
  },
  nightBox: {
    marginTop: 8,
    borderWidth: 1.5,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  nightAmount: {
    width: "50%",
    height: 8,
  },
  nightMsg: {
    marginTop: 8,
    borderLeftWidth: 2,
    height: 16,
    width: "90%",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ticketRow: {
    flexDirection: "row",
    padding: 0,
    gap: 0,
  },
  ticketMain: {
    flex: 1,
    padding: 6,
    gap: 5,
  },
  ticketAdmit: {
    alignSelf: "flex-end",
    width: 22,
    height: 10,
    borderWidth: 1.5,
  },
  ticketTitle: {
    height: 6,
    width: "80%",
    opacity: 0.8,
  },
  ticketBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1.5,
    marginTop: "auto",
    height: 16,
  },
  ticketPerf: {
    width: 8,
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  ticketHole: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E8E0D0",
  },
  ticketStub: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketStubAmt: {
    width: 10,
    height: 28,
    borderRadius: 1,
  },
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.textSecondary,
      paddingHorizontal: 2,
    },
    row: {
      flexDirection: "row",
      gap: 12,
      paddingVertical: 4,
      paddingRight: 8,
    },
    item: {
      width: 84,
      alignItems: "center",
      gap: 8,
    },
    thumbWrap: {
      width: 84,
      height: 108,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: colors.surface,
      ...{
        shadowColor: colors.shadow,
        shadowOpacity: 0.14,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      },
    },
    lockOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    name: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    nameActive: {
      color: colors.textPrimary,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    dotSpacer: {
      width: 5,
      height: 5,
    },
  });
}
