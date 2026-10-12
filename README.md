# Call Centre Staff Dashboard and Calling Demo

## Overview

A React front-end for a call centre operations dashboard with a browser-to-browser WebRTC calling demo and a browser voice-assistant demo.

## Dashboard features

- Summary metrics for team size, availability, calls handled, and average CSAT.
- Search staff by name, role, team, or extension; filter by availability; and sort by name or calls handled.
- Change staff availability from a staff card or profile.
- View staff team, extension, shift, call volume, and CSAT score.
- Responsive layout with 12 sample staff profiles. Dashboard data is in-memory mock data and resets on refresh.
- Human-to-human calling over WebRTC between two tabs in the same browser, using camera and microphone.
- Voice-assistant demo with browser speech output and scripted billing and support-hours responses.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser
- Camera and microphone permissions for the human calling demo

## Setup

1. Clone the repository and open its directory.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:

   ```sh
   npm start
   ```

4. Open `http://localhost:3000` in your browser.

To run the tests, use `npm test`. To create a production build, use `npm run build`.

## Tech stack

- React with Vite
- Browser WebRTC, BroadcastChannel, and Web Speech APIs
- CSS (no UI component library)

## Calling demo

### Human-to-human call

1. Run `npm start` and open the app in two tabs in the same browser.
2. Leave **Human call** selected and enter the same room name in both tabs.
3. Select **Join live call** in both tabs and allow camera and microphone access. Headphones are recommended.

The call uses real camera and microphone streams and peer-to-peer WebRTC. BroadcastChannel exchanges connection setup messages between tabs. This demo has no signaling server, TURN/STUN service, or external media server, so it does not connect separate devices or browsers. Browser permission prompts and secure-context requirements apply; use `localhost` or HTTPS. Some browsers or devices may not allow both tabs to access the camera at the same time.

### Voice-assistant demo

1. Select **AI voice call**, then select **Start AI call**.
2. Use **Speak** if browser speech recognition is available, or type a message and send it.

The assistant uses browser speech synthesis and fixed, local intent responses. It is not connected to an LLM or call-centre backend. Browser speech recognition may send audio to the browser vendor for transcription. The app does not implement recording or persistent transcript storage.

## Project notes

- The app uses sample data from `src/staffData.js`; no backend is connected.
- Main dashboard: `src/App.jsx`
- Staff list and cards: `src/components/StaffList.jsx` and `src/components/StaffCard.jsx`
- Calling demo: `src/components/CallPanel.jsx`
- AI tools used: Microsoft Copilot for step-by-step guidance and UI improvements.
