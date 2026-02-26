import React from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.webviewContainer}>
                    <WebView
                        source={{ uri: 'https://track.stackvil.com/' }}
                        style={styles.webview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        scalesPageToFit={true}
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
});
