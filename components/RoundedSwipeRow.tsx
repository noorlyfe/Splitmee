import type { ReactNode, Ref } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Swipeable, type SwipeableProps } from "react-native-gesture-handler";

import { radii } from "../constants/theme";

type Props = Omit<SwipeableProps, "children"> & {
  children: ReactNode;
  /** Outer shell (shadow lives here so corners stay round). */
  style?: StyleProp<ViewStyle> | object;
  swipeableRef?: Ref<Swipeable>;
};

/**
 * Swipeable row clipped to xl radius so square container corners never poke
 * past the rounded card (Cast / Projects / Waiting).
 */
export function RoundedSwipeRow({
  children,
  style,
  swipeableRef,
  containerStyle,
  childrenContainerStyle,
  ...rest
}: Props) {
  return (
    <View style={[styles.shell, style]}>
      <Swipeable
        ref={swipeableRef}
        containerStyle={[styles.clip, containerStyle]}
        childrenContainerStyle={[styles.children, childrenContainerStyle]}
        {...rest}
      >
        {children}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.xl,
  },
  clip: {
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  children: {
    borderRadius: radii.xl,
  },
});
