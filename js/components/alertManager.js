/**
 * RailRadar Alert & Push Notification Manager
 * Orchestrates Web Notifications API, Web Audio acoustic chimes,
 * live threshold tracking for pinned trains, and alert history logging.
 */

import { soundEffects } from './soundEffects.js';
import { favourites } from './favouritesManager.js';
import { toast } from './toastManager.js';

export class AlertManager {
  constructor(onTrainSelect) {
    this.onTrainSelect = onTrainSelect;
    // Map: trainNumber -> { lastDelay: number, alerted: boolean }
    this.trainStates = new Map();
    this.init();
  }

  init() {
    // Sync soundEnabled with favourites setting
    soundEffects.setEnabled(favourites.favourites.soundEnabled !== false);
  }

  /**
   * Request browser permission for Desktop Notifications
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      toast.show('Browser does not support desktop notifications');
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      toast.show('Desktop push notifications already active');
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.show('Desktop push notifications enabled!');
        // Play gentle chime on successful permission
        soundEffects.playStationChime();
      } else {
        toast.show('Push notifications blocked or dismissed');
      }
      return permission;
    } catch (e) {
      console.warn('Failed to request notification permission', e);
      return 'denied';
    }
  }

  getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  /**
   * Send a browser desktop notification
   */
  sendDesktopNotification(title, options = {}, onClick = null) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (favourites.favourites.notificationsEnabled === false) return;

    try {
      const notification = new Notification(title, {
        icon: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=128&q=80',
        badge: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=96&q=80',
        tag: options.tag || 'railradar-alert',
        renotify: true,
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onClick) onClick();
      };
    } catch (e) {
      console.warn('Failed to dispatch desktop notification', e);
    }
  }

  /**
   * Check live trains feed against pinned favourites and delay threshold
   */
  checkTrains(trains) {
    if (!trains || !Array.isArray(trains)) return;

    const threshold = favourites.favourites.delayThreshold || 10;
    const isSoundActive = favourites.favourites.soundEnabled !== false;
    soundEffects.setEnabled(isSoundActive);

    trains.forEach(train => {
      // Only monitor user's pinned/starred trains
      const isPinned = favourites.isTrainSaved(train.trainNumber);
      if (!isPinned) return;

      const state = this.trainStates.get(train.trainNumber) || { lastDelay: 0, alerted: false };
      const currentDelay = train.delayMinutes || 0;

      // Condition 1: Train exceeds delay threshold and hasn't alerted, or delay jumped significantly (+5 min)
      if (currentDelay >= threshold) {
        const shouldAlert = !state.alerted || (currentDelay - state.lastDelay >= 5);

        if (shouldAlert) {
          state.alerted = true;
          state.lastDelay = currentDelay;
          this.trainStates.set(train.trainNumber, state);

          this.triggerDelayAlert(train, currentDelay, threshold);
        }
      }
      // Condition 2: Train recovered and is now back on time
      else if (state.alerted && train.status === 'ON_TIME') {
        state.alerted = false;
        state.lastDelay = 0;
        this.trainStates.set(train.trainNumber, state);

        this.triggerOnTimeRecovery(train);
      } else {
        state.lastDelay = currentDelay;
        this.trainStates.set(train.trainNumber, state);
      }
    });
  }

  /**
   * Trigger delay alert (sound + toast + desktop push notification + audit log)
   */
  triggerDelayAlert(train, currentDelay, threshold) {
    // 1. Play Warning Chime
    soundEffects.playDelayAlertChime();

    // 2. On-screen interactive toast
    const nextStopName = train.nextStop ? train.nextStop.name : train.destination.name;
    toast.show(
      `${train.trainName} (${train.trainNumber}) delayed by ${currentDelay}m (next: ${nextStopName})`,
      '',
      6000
    );

    // 3. Desktop Push Notification
    this.sendDesktopNotification(
      `RailRadar Delay Alert: ${train.trainNumber}`,
      {
        body: `${train.trainName} is delayed by ${currentDelay} mins (Threshold: ${threshold}m). Approaching ${nextStopName}.`,
        tag: `train-delay-${train.trainNumber}`,
        silent: true // We handle our own melodic chime
      },
      () => {
        if (this.onTrainSelect) {
          this.onTrainSelect(train.trainNumber);
        }
      }
    );

    // 4. Record to Audit Log in Favourites
    favourites.addAlertHistory({
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      delayMinutes: currentDelay,
      type: 'DELAY_WARNING',
      message: `Delayed by ${currentDelay} mins. Threshold ${threshold}m exceeded.`
    });
  }

  /**
   * Trigger recovery alert when train gets back on schedule
   */
  triggerOnTimeRecovery(train) {
    soundEffects.playOnTimeChime();

    toast.show(`${train.trainName} (${train.trainNumber}) is back ON TIME`, '', 5000);

    this.sendDesktopNotification(
      `RailRadar: Train Back on Schedule`,
      {
        body: `${train.trainName} (${train.trainNumber}) has recovered and is running on schedule.`,
        tag: `train-recovery-${train.trainNumber}`,
        silent: true
      },
      () => {
        if (this.onTrainSelect) {
          this.onTrainSelect(train.trainNumber);
        }
      }
    );

    favourites.addAlertHistory({
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      delayMinutes: 0,
      type: 'RECOVERED_ON_TIME',
      message: `Train recovered from previous delay and is now On-Time.`
    });
  }

  /**
   * Interactive self-test to verify audio chime and desktop notification
   */
  async testAlert() {
    // Play test announcement chime
    soundEffects.playStationChime();

    // Request permission if not already decided
    if (this.getPermissionStatus() === 'default') {
      await this.requestNotificationPermission();
    }

    toast.show('Running system self-test...', '', 4000);

    setTimeout(() => {
      soundEffects.playDelayAlertChime();

      this.sendDesktopNotification(
        'RailRadar: Alert System Test',
        {
          body: 'Audio chimes and push notification dispatch are active and functioning normally.',
          tag: 'railradar-test-alert',
          silent: true
        }
      );
    }, 700);
  }
}
