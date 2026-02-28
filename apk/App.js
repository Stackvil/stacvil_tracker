import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
    const webViewRef = useRef(null);
    const [initialToken, setInitialToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initialUrl, setInitialUrl] = useState('https://track.stackvil.com/');

    useEffect(() => {
        const loadToken = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const user = await AsyncStorage.getItem('user');
                setInitialToken({ token, user });

                if (token && user) {
                    const parsedUser = JSON.parse(user);
                    if (parsedUser.role === 'admin') {
                        setInitialUrl('https://track.stackvil.com/admin');
                    } else if (parsedUser.isRestricted) {
                        setInitialUrl('https://track.stackvil.com/restricted-access');
                    } else {
                        setInitialUrl('https://track.stackvil.com/dashboard');
                    }
                }
            } catch (e) {
                console.error('Failed to load token', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadToken();
    }, []);

    const handleMessage = async (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'AUTH_SYNC') {
                if (data.token) {
                    await AsyncStorage.setItem('token', data.token);
                    await AsyncStorage.setItem('user', JSON.stringify(data.user));
                } else {
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('user');
                }
            }
        } catch (e) {
            console.error('Error handling message from WebView', e);
        }
    };

    const injectedJS = `
        (function() {
            try {
                const nativeToken = ${initialToken?.token ? \`'\${initialToken.token}'\` : 'null'};
                const nativeUser = ${initialToken?.user ? \`'\${initialToken.user.replace(/'/g, "\\\\'")}'\` : 'null'};
                
                const webToken = window.localStorage.getItem('token');
                
                if (nativeToken && nativeToken !== webToken) {
                    window.localStorage.setItem('token', nativeToken);
                    window.localStorage.setItem('user', nativeUser);
                    // Force the webview to reload itself so the production React app seamlessly 
                    // sees the token when it mounts, completely bypassing initialization bugs.
                    window.location.reload();
                }
            } catch (e) {
                console.error('Injection failed', e);
            }
        })();
        true;
    `;

    if (isLoading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.splashContainer}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.splashText}>Checking session...</Text>
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
                        injectedJavaScript={injectedJS}
                        // Persistence Enhancements
                        cacheEnabled={true}
                        cacheMode="LOAD_DEFAULT"
                        sharedCookiesEnabled={true}
                        thirdPartyCookiesEnabled={true}
                        incognito={false}
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
        fontSize: 16,
        color: '#6b7280',
    },
});
