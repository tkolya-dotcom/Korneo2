import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ResizeMode, Video } from 'expo-av';

type LoadingVideoProps = {
  label?: string;
  style?: ViewStyle;
  size?: number;
};

export default function LoadingVideo({ label, style, size = 220 }: LoadingVideoProps) {
  return (
    <View style={[styles.container, style]}>
      <Video
        source={require('../../assets/loading.mp4')}
        shouldPlay
        isLooping
        isMuted
        resizeMode={ResizeMode.CONTAIN}
        style={{ width: size, height: size }}
      />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 12,
    color: '#00D9FF',
    fontSize: 14,
    fontWeight: '600',
  },
});

