import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";
import CallPanel from "./components/CallPanel";

test("renders the dashboard and live calling options", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /call centre staff dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Human call" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "AI voice call" })).toBeInTheDocument();
});

test("starts the local voice assistant and accepts a message", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "AI voice call" }));
  fireEvent.click(screen.getByRole("button", { name: "Start AI call" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Say something to the assistant" }), {
    target: { value: "What are your support hours?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(screen.getByText(/Monday through Friday, from 9 AM to 5 PM/i)).toBeInTheDocument();
});

test("leaves a human call, stops local media, and closes room signaling", async () => {
  const mediaTrack = { stop: vi.fn(), enabled: true };
  const stream = {
    getTracks: () => [mediaTrack],
    getAudioTracks: () => [mediaTrack],
    getVideoTracks: () => [mediaTrack],
  };
  let channel;
  class TestBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.postMessage = vi.fn();
      this.close = vi.fn();
      channel = this;
    }
  }
  const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  const broadcastChannelDescriptor = Object.getOwnPropertyDescriptor(window, "BroadcastChannel");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  Object.defineProperty(window, "BroadcastChannel", {
    configurable: true,
    writable: true,
    value: TestBroadcastChannel,
  });

  try {
    render(<CallPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Join live call" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Leave call" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Leave call" }));

    expect(mediaTrack.stop).toHaveBeenCalled();
    expect(channel.close).toHaveBeenCalled();
    expect(channel.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "leave" }));
    expect(screen.getByRole("button", { name: "Join live call" })).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  } finally {
    if (mediaDevicesDescriptor) Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
    else delete navigator.mediaDevices;
    if (broadcastChannelDescriptor) Object.defineProperty(window, "BroadcastChannel", broadcastChannelDescriptor);
    else delete window.BroadcastChannel;
  }
});
