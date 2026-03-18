import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator, Text, Platform, PermissionsAndroid, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
    const webViewRef = useRef(null);
    const [initialToken, setInitialToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initialUrl, setInitialUrl] = useState('https://track.stackvil.com/');
    const [canGoBack, setCanGoBack] = useState(false);

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
                    if (parsedUser.role === 'admin') setInitialUrl('https://track.stackvil.com/admin');
                    else if (parsedUser.isRestricted) setInitialUrl('https://track.stackvil.com/restricted-access');
                    else setInitialUrl('https://track.stackvil.com/dashboard');
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
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [canGoBack]);

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
                // In a pure Expo/RN project without native WiFi libraries, 
                // we return a signal that native detection is active (allows backend to fallback to IP)
                webViewRef.current.postMessage(JSON.stringify({ 
                    type: 'WIFI_SSID', 
                    ssid: 'NATIVE_BOUND', // Marker for backend to know it's the mobile app
                    status: 'active'
                }));
            }
        } catch (e) {
            console.error('WebView Bridge Error:', e);
        }
    };

    // Script to ensure the Web localstorage matches Native AsyncStorage on load
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
                    <Text style={styles.splashText}>Stackvil Tracker Loading...</Text>
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
                            const { resources } = event.nativeEvent;
                            if (resources.includes('VIDEO_CAPTURE') || resources.includes('AUDIO_CAPTURE')) {
                                event.grant(resources);
                            }
                        }}
                        
                        // Performance & Caching
                        cacheEnabled={true}
                        cacheMode="LOAD_DEFAULT"
                        sharedCookiesEnabled={true}
                        thirdPartyCookiesEnabled={true}
                    />
                </View>
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
