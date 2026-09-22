import * as ExpoHaptics from "expo-haptics";

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function getHapticsEnabled() {
  return hapticsEnabled;
}

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export async function impactAsync(style: ExpoHaptics.ImpactFeedbackStyle = ImpactFeedbackStyle.Light) {
  if (!hapticsEnabled) {
    return;
  }
  try {
    await ExpoHaptics.impactAsync(style);
  } catch {
    // ignore
  }
}

export async function notificationAsync(type: ExpoHaptics.NotificationFeedbackType) {
  if (!hapticsEnabled) {
    return;
  }
  try {
    await ExpoHaptics.notificationAsync(type);
  } catch {
    // ignore
  }
}

export async function selectionAsync() {
  if (!hapticsEnabled) {
    return;
  }
  try {
    await ExpoHaptics.selectionAsync();
  } catch {
    // ignore
  }
}

/** Drop-in namespace matching `import * as Haptics from "expo-haptics"`. */
const Haptics = {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
};

export default Haptics;
