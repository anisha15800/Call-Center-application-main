import React, { useEffect, useRef, useState } from "react";

const assistantReply = (message) => {
  const text = message.toLowerCase();
  if (text.includes("bill") || text.includes("payment") || text.includes("refund")) {
    return "I can help with billing. Please have your account number ready, and I can connect you with our billing team if you need account-specific help.";
  }
  if (text.includes("hour") || text.includes("open") || text.includes("time")) {
    return "Our support team is available Monday through Friday, from 9 AM to 5 PM. Would you like help with anything else?";
  }
  if (text.includes("human") || text.includes("agent") || text.includes("person")) {
    return "I can arrange a handoff to a human agent. In this demo, please call the team using the Human call tab.";
  }
  return "Thanks for getting in touch. I can help with billing or support hours, or you can ask to speak to a human agent.";
};

function CallPanel() {
  const [mode, setMode] = useState("human");
  const [room, setRoom] = useState("demo-room");
  const [callStatus, setCallStatus] = useState("Not connected");
  const [callError, setCallError] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [voiceInputError, setVoiceInputError] = useState("");
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const peerIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => () => {
    const channel = channelRef.current;
    if (channel && peerIdRef.current) {
      channel.postMessage({ type: "leave", from: peerIdRef.current });
      channel.close();
    }
    peersRef.current.forEach(({ connection }) => connection.close());
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop());
    if (recognitionRef.current) recognitionRef.current.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const sendSignal = (type, to, payload = {}) => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type,
        from: peerIdRef.current,
        to,
        ...payload,
      });
    }
  };

  const closePeer = (peerId) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.onicecandidate = null;
      peer.connection.ontrack = null;
      peer.connection.onconnectionstatechange = null;
      peer.connection.close();
    }
    peersRef.current.delete(peerId);
    setRemoteStream(null);
    setCallStatus("Waiting for another person");
  };

  const createPeer = (remoteId) => {
    const connection = new RTCPeerConnection({ iceServers: [] });
    const peer = { connection, pendingCandidates: [] };
    peersRef.current.set(remoteId, peer);

    localStreamRef.current.getTracks().forEach((track) => connection.addTrack(track, localStreamRef.current));
    connection.onicecandidate = (event) => {
      if (event.candidate) sendSignal("candidate", remoteId, { candidate: event.candidate.toJSON() });
    };
    connection.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setCallStatus("Connected");
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "connected") setCallStatus("Connected");
      if (connection.connectionState === "failed") {
        setCallError("The browser could not establish a peer connection. Try rejoining the room.");
        closePeer(remoteId);
      }
      if (connection.connectionState === "disconnected") setCallStatus("Reconnecting…");
    };
    return peer;
  };

  const addPendingCandidates = async (peer) => {
    const candidates = peer.pendingCandidates.splice(0);
    for (const candidate of candidates) await peer.connection.addIceCandidate(candidate);
  };

  const joinHumanCall = async (event) => {
    event.preventDefault();
    setCallError("");
    const roomName = room.trim();
    if (!roomName) {
      setCallError("Enter a room name before joining.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof BroadcastChannel === "undefined") {
      setCallError("This browser does not support camera/microphone capture or same-browser room signaling. Use a current browser on localhost or HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const peerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const channel = new BroadcastChannel(`call-centre-room:${roomName}`);
      localStreamRef.current = stream;
      peerIdRef.current = peerId;
      channelRef.current = channel;
      setLocalStream(stream);
      setCallStatus("Waiting for another person");

      channel.onmessage = async ({ data }) => {
        if (!data || data.from === peerIdRef.current || (data.to && data.to !== peerIdRef.current)) return;
        try {
          if (data.type === "join" && peerIdRef.current < data.from && !peersRef.current.has(data.from)) {
            const peer = createPeer(data.from);
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            sendSignal("offer", data.from, { description: peer.connection.localDescription });
          } else if (data.type === "offer" && !peersRef.current.has(data.from)) {
            const peer = createPeer(data.from);
            await peer.connection.setRemoteDescription(data.description);
            await addPendingCandidates(peer);
            const answer = await peer.connection.createAnswer();
            await peer.connection.setLocalDescription(answer);
            sendSignal("answer", data.from, { description: peer.connection.localDescription });
          } else if (data.type === "answer") {
            const peer = peersRef.current.get(data.from);
            if (peer) {
              await peer.connection.setRemoteDescription(data.description);
              await addPendingCandidates(peer);
            }
          } else if (data.type === "candidate") {
            const peer = peersRef.current.get(data.from);
            if (peer) {
              if (peer.connection.remoteDescription) await peer.connection.addIceCandidate(data.candidate);
              else peer.pendingCandidates.push(data.candidate);
            }
          } else if (data.type === "leave") {
            closePeer(data.from);
          }
        } catch (error) {
          setCallError(`Call setup failed: ${error.message}`);
        }
      };
      channel.postMessage({ type: "join", from: peerId });
    } catch (error) {
      setCallError(`Could not start the call: ${error.message}. Allow camera and microphone access, then try again.`);
    }
  };

  const leaveHumanCall = () => {
    const channel = channelRef.current;
    const peerId = peerIdRef.current;
    channelRef.current = null;
    peerIdRef.current = null;
    channel?.postMessage({ type: "leave", from: peerId });
    channel?.close();

    peersRef.current.forEach(({ connection }) => {
      connection.onicecandidate = null;
      connection.ontrack = null;
      connection.onconnectionstatechange = null;
      connection.close();
    });
    peersRef.current.clear();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("Not connected");
    setMuted(false);
    setCameraOff(false);
    setCallError("");
  };

  const toggleMuted = () => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMuted(nextMuted);
  };

  const toggleCamera = () => {
    const nextCameraOff = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !nextCameraOff; });
    setCameraOff(nextCameraOff);
  };

  const startAiCall = () => {
    setAiActive(true);
    setVoiceInputError("");
    const greeting = "Hello, I'm the Call for Care voice assistant. I can help with billing or support hours. How can I help you today?";
    setMessages([{ speaker: "Assistant", text: greeting }]);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(greeting));
    } else {
      setVoiceInputError("Speech output is unavailable in this browser. You can still chat by text.");
    }
  };

  const handleAiMessage = (text) => {
    const message = text.trim();
    if (!message) return;
    const reply = assistantReply(message);
    setMessages((current) => [...current, { speaker: "You", text: message }, { speaker: "Assistant", text: reply }]);
    setDraft("");
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceInputError("Voice input is not supported in this browser. Use the text box instead.");
      return;
    }
    setVoiceInputError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => handleAiMessage(event.results[0][0].transcript);
    recognition.onerror = (event) => setVoiceInputError(`Voice input error: ${event.error}. You can use the text box instead.`);
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <section className="calling-panel" aria-labelledby="calling-heading">
      <div className="calling-panel-heading">
        <div>
          <p className="eyebrow">LIVE CALLING DEMO</p>
          <h2 id="calling-heading">Try a call</h2>
          <p className="calling-intro">Real browser media for peer calls, plus a spoken voice assistant.</p>
        </div>
        <div className="call-mode-tabs" role="tablist" aria-label="Call type">
          <button type="button" role="tab" aria-selected={mode === "human"} className={mode === "human" ? "call-mode-active" : ""} onClick={() => setMode("human")}>Human call</button>
          <button type="button" role="tab" aria-selected={mode === "ai"} className={mode === "ai" ? "call-mode-active" : ""} onClick={() => setMode("ai")}>AI voice call</button>
        </div>
      </div>

      {mode === "human" ? (
        <div className="human-call">
          <form className="call-join-form" onSubmit={joinHumanCall}>
            <label>
              Room name
              <input value={room} onChange={(event) => setRoom(event.target.value)} disabled={Boolean(localStream)} />
            </label>
            <span className={`call-status ${callStatus === "Connected" ? "call-status-live" : ""}`}><span className="mini-dot" />{callStatus}</span>
            {!localStream
              ? <button className="call-primary-button" type="submit">Join live call</button>
              : <button className="call-end-button" type="button" onClick={leaveHumanCall}>Leave call</button>}
          </form>
          {callError && <p className="call-error" role="alert">{callError}</p>}
          {localStream && (
            <>
              <p className="call-hint">Open this app in a second tab in the same browser, enter <strong>{room.trim()}</strong>, and join. Use headphones to avoid audio feedback.</p>
              <div className="call-video-grid">
                <div className="call-video-tile">
                  <video ref={localVideoRef} autoPlay muted playsInline />
                  <span>You</span>
                </div>
                <div className="call-video-tile">
                  <video ref={remoteVideoRef} autoPlay playsInline />
                  {!remoteStream && <div className="video-placeholder">Waiting for the other person to join…</div>}
                  <span>Other participant</span>
                </div>
              </div>
              <div className="call-controls">
                <button type="button" onClick={toggleMuted}>{muted ? "Unmute microphone" : "Mute microphone"}</button>
                <button type="button" onClick={toggleCamera}>{cameraOff ? "Turn camera on" : "Turn camera off"}</button>
              </div>
            </>
          )}
          <p className="call-footnote">Peer-to-peer WebRTC · room signaling stays in this browser · no external media server</p>
        </div>
      ) : (
        <div className="ai-call">
          <div className="ai-call-summary">
            <span className={`ai-avatar ${aiActive ? "ai-avatar-active" : ""}`} aria-hidden="true">AI</span>
            <div><strong>Call for Care voice assistant</strong><p>Spoken replies with billing and support-hours help.</p></div>
            {!aiActive && <button className="call-primary-button" type="button" onClick={startAiCall}>Start AI call</button>}
          </div>
          {aiActive && (
            <>
              <div className="ai-transcript" aria-live="polite">
                {messages.map((message, index) => (
                  <p key={`${message.speaker}-${index}`} className={`transcript-${message.speaker.toLowerCase()}`}><strong>{message.speaker}:</strong> {message.text}</p>
                ))}
              </div>
              <form className="ai-response-form" onSubmit={(event) => { event.preventDefault(); handleAiMessage(draft); }}>
                <input aria-label="Say something to the assistant" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type what you would say…" />
                <button type="submit" disabled={!draft.trim()}>Send</button>
                <button type="button" onClick={startVoiceInput}>Speak</button>
              </form>
              {voiceInputError && <p className="call-error" role="status">{voiceInputError}</p>}
              <p className="call-hint">The assistant is a local scripted demo, not a connected AI service. Browser voice recognition may be processed by your browser provider.</p>
            </>
          )}
          <p className="call-footnote">Speech output is generated by your browser · no call recording or transcript storage</p>
        </div>
      )}
    </section>
  );
}

export default CallPanel;
