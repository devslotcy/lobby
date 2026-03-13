# Notification Sound Files

This directory contains custom notification sounds for the dating app.

## Required Sound Files

1. **notification.mp3** - Soft, gentle notification sound for messages
   - Duration: 1-2 seconds
   - Style: Soft, pleasant, not intrusive
   - Use case: New message notifications

2. **match.mp3** - Exciting, celebratory match sound
   - Duration: 2-3 seconds
   - Style: Exciting, celebratory, memorable
   - Use case: New match notifications

## How to Add Sound Files

1. Add your .mp3 files to this directory:
   - `assets/sounds/notification.mp3`
   - `assets/sounds/match.mp3`

2. The files will automatically be used by the NotificationService

## Sound Requirements

- Format: MP3
- Bitrate: 128-192 kbps recommended
- Keep file size small (< 100KB each)
- Test on both iOS and Android devices

## Where to Find Sounds

You can:
- Create custom sounds using audio editing software
- Purchase royalty-free sounds from sites like AudioJungle
- Use free sound libraries (ensure proper licensing)
- Record custom sounds for your brand

## Alternative: Use System Sounds (Temporary)

If you want to test without custom sounds, you can modify the NotificationService to use system default sounds by removing the `sound` property from notification configurations.
