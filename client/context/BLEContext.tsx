import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
import { useAuthStore } from '../stores/authStore';

const SERVICE_UUID = "00001523-1212-efde-1523-785feabcd123";
const CHAR_READ_UUID = "00001524-1212-efde-1523-785feabcd123";
const CHAR_WRITE_UUID = "00001525-1212-efde-1523-785feabcd123";

const bleManager = new BleManager();

interface BLEContextType {
    scanForDevices: () => void;
    requestPermissions: () => Promise<boolean>;
    connectToDevice: (device: Device) => Promise<void>;
    disconnectFromDevice: () => void;
    allDevices: Device[];
    connectedDevice: Device | null;
    hardwareId: string | null;
    isScanning: boolean;
    isConnecting: boolean;
}

const BLEContext = createContext<BLEContextType | null>(null);

export const useBLEContext = () => {
    const context = useContext(BLEContext);
    if (!context) {
        throw new Error('useBLEContext must be used within a BLEProvider');
    }
    return context;
};

export const BLEProvider = ({ children }: { children: ReactNode }) => {
    const [allDevices, setAllDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [hardwareId, setHardwareId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const { jwt } = useAuthStore();

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const apiLevel = parseInt(Platform.Version.toString(), 10);

            if (apiLevel < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'Bluetooth Low Energy requires Location',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const result = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return (
                    result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
                    result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                    result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
                );
            }
        }
        return true;
    };

    const isDuplicateDevice = (devices: Device[], nextDevice: Device) => {
        return devices.findIndex((device) => nextDevice.id === device.id) > -1;
    };

    const scanForDevices = () => {
        setAllDevices([]);
        setIsScanning(true);
        bleManager.startDeviceScan(
            [SERVICE_UUID],
            null,
            (error, device) => {
                if (error) {
                    console.warn('Scan Error:', error);
                    setIsScanning(false);
                    return;
                }
                if (device && (device.name || device.localName)) {
                    setAllDevices((prevState) => {
                        if (!isDuplicateDevice(prevState, device)) {
                            return [...prevState, device];
                        }
                        return prevState;
                    });
                }
            }
        );

        setTimeout(() => {
            bleManager.stopDeviceScan();
            setIsScanning(false);
        }, 10000);
    };

    const connectToDevice = async (device: Device) => {
        try {
            setIsConnecting(true);
            const deviceConnection = await bleManager.connectToDevice(device.id);
            setConnectedDevice(deviceConnection);
            await deviceConnection.discoverAllServicesAndCharacteristics();
            bleManager.stopDeviceScan();
            setIsScanning(false);

            console.log('Connected. Starting Handshake...');

            const readCharacteristic = await deviceConnection.readCharacteristicForService(
                SERVICE_UUID,
                CHAR_READ_UUID
            );
            if (readCharacteristic.value) {
                const hwId = base64.decode(readCharacteristic.value);
                setHardwareId(hwId);
                console.log(`[Handshake] Successfully Read Hardware ID: ${hwId}`);
            }

            const encodedOK = base64.encode(jwt!);
            await deviceConnection.writeCharacteristicWithResponseForService(
                SERVICE_UUID,
                CHAR_WRITE_UUID,
                encodedOK
            );

            console.log('[Handshake] Sent JWT Confirmation to Device.');

        } catch (e) {
            console.warn('Error connecting or handshaking:', e);
            setConnectedDevice(null);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectFromDevice = () => {
        if (connectedDevice) {
            bleManager.cancelDeviceConnection(connectedDevice.id);
            setConnectedDevice(null);
            setHardwareId(null);
            setIsConnecting(false);
        }
    };

    return (
        <BLEContext.Provider value={{
            scanForDevices,
            requestPermissions,
            connectToDevice,
            disconnectFromDevice,
            allDevices,
            connectedDevice,
            hardwareId,
            isScanning,
            isConnecting
        }}>
            {children}
        </BLEContext.Provider>
    );
};
