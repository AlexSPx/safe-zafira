import React, { useMemo, useState } from 'react';
import { SizableText, XStack, YStack, useTheme } from 'tamagui';
import {
  Camera,
  MapView,
  PointAnnotation,
} from '@maplibre/maplibre-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LIGHT_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const SOFIA_CENTER: [number, number] = [23.3219, 42.6977];
const CURRENT_SPEED_KMH = 42;
const SPEED_LIMIT_KMH = 50;

export default function LocationScreen() {
  const theme = useTheme();
  const [isDarkMap, setIsDarkMap] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(13.5);
  const [cameraCenter, setCameraCenter] =
    useState<[number, number]>(SOFIA_CENTER);
  const isOverSpeed = CURRENT_SPEED_KMH > SPEED_LIMIT_KMH;

  const mapStyle = useMemo(
    () => (isDarkMap ? DARK_STYLE_URL : LIGHT_STYLE_URL),
    [isDarkMap],
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: theme.background?.val }}
    >
      <View style={styles.container}>
        <MapView
          style={styles.map}
          mapStyle={mapStyle}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Camera
            centerCoordinate={cameraCenter}
            zoomLevel={zoomLevel}
            pitch={0}
            heading={0}
            animationDuration={450}
          />
          <PointAnnotation id="sofia-location" coordinate={SOFIA_CENTER}>
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </PointAnnotation>
        </MapView>

        <YStack
          position="absolute"
          top="$4"
          left="$4"
          right="$4"
          pointerEvents="none"
          backgroundColor="$surface"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={18}
          p="$3"
          gap="$2"
          elevation={5}
        >
          <SizableText color="$textMuted" fontSize={12} fontWeight="600">
            MAP OVERVIEW
          </SizableText>
          <SizableText color="$textLight" fontSize={17} fontWeight="700">
            Vehicle last seen in Sofia
          </SizableText>
          <SizableText color="$textMuted" fontSize={13}>
            Static location mode
          </SizableText>
        </YStack>

        <XStack position="absolute" left="$4" bottom="$4">
          <View
            style={[
              styles.speedCircle,
              {
                borderColor: isOverSpeed ? '#DC2626' : theme.borderColor?.val,
                backgroundColor: isOverSpeed
                  ? 'rgba(220, 38, 38, 0.4)'
                  : 'rgba(18, 96, 255, 0.4)',
              },
            ]}
          >
            <View
              style={[
                styles.limitBadge,
                {
                  backgroundColor: isOverSpeed
                    ? '#B91C1C'
                    : (theme.primary?.val ?? '#1260FF'),
                },
              ]}
            >
              <SizableText color="$color1" fontSize={10} fontWeight="800">
                MAX {SPEED_LIMIT_KMH}
              </SizableText>
            </View>

            <SizableText
              style={styles.speedValue}
              color={isOverSpeed ? '$red10' : '$textLight'}
              fontSize={34}
              fontWeight="900"
            >
              {CURRENT_SPEED_KMH}
            </SizableText>
            <SizableText
              style={styles.speedUnit}
              color="$textMuted"
              fontSize={11}
              fontWeight="700"
            >
              km/h
            </SizableText>
          </View>
        </XStack>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChip: {
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
  },
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 96, 255, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 96, 255, 0.55)',
  },
  userDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1260FF',
  },
  speedCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  speedValue: {
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
  },
  speedUnit: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  limitBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
