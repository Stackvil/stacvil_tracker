import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, View, StatusBar, ActivityIndicator, Text,
    Platform, PermissionsAndroid, BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeFaceCapture from './NativeFaceCapture';

export default function App() {
    const webViewRef = useRef(null);
    const BASE_URL = 'https://track.stackvil.com';
    const [initialToken, setInitialToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initialUrl, setInitialUrl] = useState(`${BASE_URL}/`);
    const [canGoBack, setCanGoBack] = useState(false);
    const [faceCaptureVisible, setFaceCaptureVisible] = useState(false);
    const [faceCaptureMode, setFaceCaptureMode] = useState('enroll'); // 'enroll' | 'verify'

    // Initial Preparation: Permissions and persistence
    useEffect(() => {
        const prepare = async () => {
            try {
                // 1. Native Permissions (Non-blocking)
                if (Platform.OS === 'android') {
                    PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    ]).catch(e => console.warn('Permission request error:', e));
                }

                // 2. Auth Persistence Sync
                const token = await AsyncStorage.getItem('token');
                const user = await AsyncStorage.getItem('user');
                setInitialToken({ token, user });

                if (token && user) {
                    const parsedUser = JSON.parse(user);
                    if (parsedUser.role === 'admin') setInitialUrl(`${BASE_URL}/admin`);
                    else if (parsedUser.isRestricted) setInitialUrl(`${BASE_URL}/restricted-access`);
                    else setInitialUrl(`${BASE_URL}/dashboard`);
                }
            } catch (e) {
                console.error('Failed to prepare app', e);
            } finally {
                setIsLoading(false);
            }
        };
        prepare();
    }, []);

    // Handle Android Back Button
    useEffect(() => {
        const backAction = () => {
            if (faceCaptureVisible) {
                setFaceCaptureVisible(false);
                return true;
            }
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [canGoBack, faceCaptureVisible]);

    // Handle message from WebView web pages
    const handleMessage = async (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            // 1. Authentication Sync (Web -> Native)
            if (data.type === 'AUTH_SYNC') {
                if (data.token) {
                    await AsyncStorage.setItem('token', data.token);
                    await AsyncStorage.setItem('user', JSON.stringify(data.user));
                } else {
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('user');
                }
            }

            // 2. WiFi Detection (Web -> Native Request)
            if (data.type === 'GET_WIFI_SSID') {
                webViewRef.current?.postMessage(JSON.stringify({
                    type: 'WIFI_SSID',
                    ssid: 'NATIVE_BOUND', // Backend falls back to IP check for mobile
                    status: 'active'
                }));
            }

            // 3. Native Face Capture Request (Web -> Native)
            // The website sends this when user taps "Start Camera" on the face capture component
            if (data.type === 'OPEN_NATIVE_CAMERA') {
                setFaceCaptureMode(data.mode || 'enroll');
                setFaceCaptureVisible(true);
            }

        } catch (e) {
            console.error('WebView Bridge Error:', e);
        }
    };

    // Called when user captures a photo natively - sends base64 image to the website
    const handleNativeCapture = (base64Image) => {
        setFaceCaptureVisible(false);
        // Send the captured image back to the web page for face-api.js processing
        if (webViewRef.current) {
            const script = `
                (function() {
                    window.dispatchEvent(new CustomEvent('NATIVE_FACE_CAPTURED', {
                        detail: { image: '${base64Image}', mode: '${faceCaptureMode}' }
                    }));
                })();
                true;
            `;
            webViewRef.current.injectJavaScript(script);
        }
    };

    // Script to ensure the Web localStorage matches Native AsyncStorage on load
    const injectedJS = `
        (function() {
            try {
                const nativeToken = ${initialToken?.token ? `'${initialToken.token}'` : 'null'};
                const nativeUser = ${initialToken?.user ? `'${initialToken.user.replace(/'/g, "\\'")}'` : 'null'};
                const webToken = window.localStorage.getItem('token');
                if (nativeToken && nativeToken !== webToken) {
                    window.localStorage.setItem('token', nativeToken);
                    window.localStorage.setItem('user', nativeUser);
                    window.location.reload();
                }
            } catch (e) {
                console.error('Auth Injection Failed', e);
            }
        })();
        true;
    `;

    if (isLoading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.splashContainer}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.splashText}>Stackvil</Text>
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.webviewContainer}>
                    <WebView
                        ref={webViewRef}
                        source={{ uri: initialUrl }}
                        style={styles.webview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        scalesPageToFit={true}
                        onMessage={handleMessage}
                        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
                        injectedJavaScript={injectedJS}

                        // Media & Permissions
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        originWhitelist={['*']}
                        onPermissionRequest={(event) => {
                            // Grant all web-originated permission requests
                            event.grant(event.nativeEvent.resources);
                        }}

                        // Performance & Caching
                        cacheEnabled={true}
                        cacheMode="LOAD_DEFAULT"
                        sharedCookiesEnabled={true}
                        thirdPartyCookiesEnabled={true}
                    />
                </View>

                {/* Native Face Capture Modal - overlays when website requests camera */}
                <NativeFaceCapture
                    visible={faceCaptureVisible}
                    mode={faceCaptureMode}
                    onCapture={handleNativeCapture}
                    onCancel={() => setFaceCaptureVisible(false)}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    webviewContainer: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    splashContainer: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4f46e5',
        letterSpacing: 1
    },
});
