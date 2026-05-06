import { notificationApi } from './api';

const VAPID_PUBLIC_KEY = 'BEEzPFGdQAkhUj_QmAsasmU9lPJtChxOhHP6z4gjBXe_MLPG0f3G6lqhDcSifsrswXTbbER_s8xRs6ofbQwDUpo';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
    }

    // Don't prompt if already denied
    if (Notification.permission === 'denied') {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Wait for SW to be ready
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

        await notificationApi.subscribe(subscription, deviceType);
    } catch (error) {
        console.error('Push subscription failed:', error);
    }
}
