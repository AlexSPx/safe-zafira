import React, { useEffect, useMemo, useState } from 'react';
import { SizableText, XStack, YStack, useTheme } from 'tamagui';
import {
  Camera,
  MapView,
  PointAnnotation,
} from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useVehicleStore } from '../../stores/vehicleStore';

const LIGHT_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const getBearing = (from: [number, number], to: [number, number]): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const toDeg = (value: number) => (value * 180) / Math.PI;

  const [fromLon, fromLat] = from;
  const [toLon, toLat] = to;

  const phi1 = toRad(fromLat);
  const phi2 = toRad(toLat);
  const lambda1 = toRad(fromLon);
  const lambda2 = toRad(toLon);

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export default function LocationScreen() {
  const theme = useTheme();
  const [isDarkMap, setIsDarkMap] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(13.5);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

  const mapStyle = useMemo(
    () => (isDarkMap ? DARK_STYLE_URL : LIGHT_STYLE_URL),
    [isDarkMap],
  );

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !isMounted) return;

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (isMounted) {
        setMyLocation([
          currentPosition.coords.longitude,
          currentPosition.coords.latitude,
        ]);
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (position) => {
          if (!isMounted) return;
          setMyLocation([position.coords.longitude, position.coords.latitude]);
        },
      );
    };

    void startLocationTracking();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, []);

  const { vehicleData } = useVehicleStore();
  const isOverSpeed =
    vehicleData &&
    vehicleData.speed &&
    vehicleData.speedLimit &&
    vehicleData.speed > vehicleData.speedLimit;

  const vehicleCoordinate = useMemo<[number, number] | null>(() => {
    if (vehicleData?.location) {
      return [vehicleData.location.x, vehicleData.location.y];
    }

    return null;
  }, [vehicleData?.location]);

  const vehicleBearing = useMemo(() => {
    if (!myLocation || !vehicleCoordinate) return 0;
    return getBearing(myLocation, vehicleCoordinate);
  }, [myLocation, vehicleCoordinate]);

  const cameraCenter = useMemo(() => {
    if (myLocation) {
      return myLocation;
    }

    if (vehicleData && vehicleData.location) {
      return [vehicleData.location.x, vehicleData.location.y];
    } else {
      // Default to Sofia coordinates if no location data is available
      return [23.3219, 42.6977];
    }
  }, [myLocation, vehicleData?.location]);

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
          {myLocation ? (
            <PointAnnotation id="my-location" coordinate={myLocation}>
              <View style={styles.userDotOuter}>
                <View style={styles.userDotInner} />
              </View>
            </PointAnnotation>
          ) : null}

          {vehicleCoordinate ? (
            <PointAnnotation
              id="vehicle-location"
              coordinate={vehicleCoordinate}
            >
              <View style={styles.vehicleDotOuter}>
                <View style={styles.vehicleDotInner} />
              </View>
            </PointAnnotation>
          ) : null}

          {myLocation && vehicleCoordinate ? (
            <PointAnnotation
              id="vehicle-direction-pointer"
              coordinate={myLocation}
            >
              <View
                style={[
                  styles.directionArrow,
                  { transform: [{ rotate: `${vehicleBearing}deg` }] },
                ]}
              />
            </PointAnnotation>
          ) : null}
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
            {myLocation
              ? 'Centered on your location'
              : 'Waiting for location permission'}
          </SizableText>
          <SizableText color="$textMuted" fontSize={13}>
            {myLocation ? 'Live location mode' : 'Location unavailable'}
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
                MAX{' '}
                {vehicleData?.speedLimit
                  ? `${vehicleData.speedLimit} km/h`
                  : 'N/A'}
              </SizableText>
            </View>

            <SizableText
              style={styles.speedValue}
              color={isOverSpeed ? '$red10' : '$textLight'}
              fontSize={34}
              fontWeight="900"
            >
              {vehicleData?.speed ? vehicleData.speed : 'N/A'}
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
  vehicleDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 115, 22, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.6)',
  },
  vehicleDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
  },
  directionArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F97316',
    marginBottom: 28,
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
