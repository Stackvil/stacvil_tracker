import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator,
    Platform, Alert
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

/**
 * NativeFaceCapture
 * A fully native camera modal that overlays on top of the WebView.
 * When a photo is taken, it returns a base64 image to the parent (App.js)
 * which then injects it into the WebView for face-api.js processing.
 */
const NativeFaceCapture = ({ visible, onCapture, onCancel, mode = 'enroll' }) => {
    const cameraRef = useRef(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [isCapturing, setIsCapturing] = useState(false);
    const [countdown, setCountdown] = useState(null);

    useEffect(() => {
        if (visible && permission && !permission.granted) {
            requestPermission();
        }
    }, [visible]);

    const startCountdown = () => {
        setCountdown(3);
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    takePicture();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const takePicture = async () => {
        if (!cameraRef.current || isCapturing) return;
        try {
            setIsCapturing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: true,
                skipProcessing: true
            });
            onCapture(`data:image/jpeg;base64,${photo.base64}`);
        } catch (err) {
            console.error('Camera capture error:', err);
            Alert.alert('Camera Error', 'Failed to capture photo. Please try again.');
        } finally {
            setIsCapturing(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {mode === 'verify' ? '🔐 Face Verification' : '📷 Face Enrollment'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {mode === 'verify'
                            ? 'Position your face in the frame to log in.'
                            : 'Position your face clearly, then tap Capture.'}
                    </Text>
                </View>

                {/* Camera View */}
                {permission?.granted ? (
                    <View style={styles.cameraContainer}>
                        <CameraView
                            ref={cameraRef}
                            style={styles.camera}
                            facing="front"
                        >
                            {/* Face Guide Overlay */}
                            <View style={styles.overlay}>
                                <View style={styles.faceGuide}>
                                    {countdown !== null && (
                                        <Text style={styles.countdown}>{countdown}</Text>
                                    )}
                                </View>
                            </View>
                        </CameraView>
                    </View>
                ) : (
                    <View style={styles.permissionBox}>
                        <Text style={styles.permissionText}>
                            📷 Camera permission is required.
                        </Text>
                        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                            <Text style={styles.permBtnText}>Grant Permission</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                        <Text style={styles.cancelBtnText}>✕ Cancel</Text>
                    </TouchableOpacity>

                    {permission?.granted && (
                        <TouchableOpacity
                            style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
                            onPress={startCountdown}
                            disabled={isCapturing || countdown !== null}
                        >
                            {isCapturing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.captureBtnText}>
                                    {countdown !== null ? `Taking in ${countdown}...` : '📸 Capture Face'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#1e293b',
    },
    title: {
        color: '#f1f5f9',
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 6,
    },
    cameraContainer: {
        flex: 1,
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#4f46e5',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceGuide: {
        width: 220,
        height: 280,
        borderRadius: 120,
        borderWidth: 3,
        borderColor: '#4f46e5',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    countdown: {
        color: '#4f46e5',
        fontSize: 64,
        fontWeight: '900',
    },
    permissionBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    permissionText: {
        color: '#f1f5f9',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    permBtn: {
        backgroundColor: '#4f46e5',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    controls: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#f1f5f9',
        fontWeight: '700',
        fontSize: 15,
    },
    captureBtn: {
        flex: 2,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#4f46e5',
        alignItems: 'center',
    },
    captureBtnDisabled: {
        backgroundColor: '#64748b',
    },
    captureBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});

export default NativeFaceCapture;
