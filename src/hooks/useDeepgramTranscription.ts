import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptLine {
  speaker: string;
  lang: string;
  time: string;
  text: string;
  lowConfidence?: boolean;
  isInterim?: boolean;
}

const SPEAKER_LABELS: Record<number, string> = { 0: "Professional", 1: "Client" };
const LANG_DISPLAY: Record<string, string> = {
  en: "EN", fr: "FR", de: "DE", lb: "LU", hu: "HU", ar: "AR",
  ti: "TI", so: "SO", fa: "FA", ps: "PS", am: "AM", es: "ES",
  pt: "PT", it: "IT", nl: "NL", pl: "PL", ro: "RO", uk: "UK", ru: "RU",
};

const MAX_BUFFER_SECONDS = 300; // 5 minutes max buffer
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useDeepgramTranscription() {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [bufferedSeconds, setBufferedSeconds] = useState(0);
  const [bufferWarning, setBufferWarning] = useState<string | null>(null);
  const [isProcessingBuffer, setIsProcessingBuffer] = useState(false);
  const [audioClearedConfirm, setAudioClearedConfirm] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const shouldReconnectRef = useRef(false);

  // Offline audio buffer
  const audioBufferRef = useRef<Blob[]>([]);
  const bufferStartTimeRef = useRef<number | null>(null);
  const bufferTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inactivity timer
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionLangRef = useRef<string>("multi");

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Clear all audio buffers
  const clearAudioBuffers = useCallback(() => {
    audioBufferRef.current = [];
    setBufferedSeconds(0);
    setBufferWarning(null);
    bufferStartTimeRef.current = null;
    if (bufferTimerRef.current) {
      clearInterval(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    setAudioClearedConfirm(true);
    setTimeout(() => setAudioClearedConfirm(false), 3000);
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      clearAudioBuffers();
    }, INACTIVITY_TIMEOUT);
  }, [clearAudioBuffers]);

  // Tab close cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      audioBufferRef.current = [];
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const cleanup = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Process buffered audio when coming back online
  const processBuffer = useCallback(async () => {
    if (audioBufferRef.current.length === 0) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setIsProcessingBuffer(true);
    const chunks = [...audioBufferRef.current];
    audioBufferRef.current = [];
    setBufferedSeconds(0);
    bufferStartTimeRef.current = null;

    for (const chunk of chunks) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(chunk);
        await new Promise(r => setTimeout(r, 50)); // pace the sends
      }
    }

    setIsProcessingBuffer(false);
    setBufferWarning(null);
  }, []);

  // When coming back online and connected, process buffer
  useEffect(() => {
    if (isOnline && isConnected && audioBufferRef.current.length > 0) {
      processBuffer();
    }
  }, [isOnline, isConnected, processBuffer]);

  const connect = useCallback(async (sessionLang?: string) => {
    setIsConnecting(true);
    setError(null);
    sessionLangRef.current = sessionLang || "multi";

    // 1. Get mic permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");
    } catch {
      setMicPermission("denied");
      setError("Microphone permission denied");
      setIsConnecting(false);
      return false;
    }

    // 2. Get Deepgram token
    let apiKey: string;
    try {
      const { data, error: fnError } = await supabase.functions.invoke("deepgram-token");
      if (fnError || !data?.key) throw new Error(fnError?.message || "No key returned");
      apiKey = data.key;
    } catch (e: any) {
      setError("Could not get transcription token: " + (e.message || ""));
      setIsConnecting(false);
      stream.getTracks().forEach(t => t.stop());
      return false;
    }

    // 3. Open WebSocket to Deepgram
    const lang = sessionLang === "multi" || !sessionLang ? "multi" : sessionLang;
    const params = new URLSearchParams({
      model: "nova-2",
      language: lang,
      diarize: "true",
      smart_format: "true",
      punctuate: "true",
      interim_results: "true",
      encoding: "opus",
      sample_rate: "48000",
    });

    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", apiKey]);
    wsRef.current = ws;
    sessionStartRef.current = Date.now();
    shouldReconnectRef.current = true;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          resetInactivityTimer();

          if (ws.readyState === WebSocket.OPEN && navigator.onLine) {
            ws.send(e.data);
          } else {
            // Buffer audio while offline
            audioBufferRef.current.push(e.data);
            if (!bufferStartTimeRef.current) {
              bufferStartTimeRef.current = Date.now();
              // Start buffer time tracking
              bufferTimerRef.current = setInterval(() => {
                if (bufferStartTimeRef.current) {
                  const secs = Math.floor((Date.now() - bufferStartTimeRef.current) / 1000);
                  setBufferedSeconds(secs);

                  if (secs > MAX_BUFFER_SECONDS) {
                    // Discard oldest chunks (keep ~half)
                    const half = Math.floor(audioBufferRef.current.length / 2);
                    audioBufferRef.current = audioBufferRef.current.slice(half);
                    setBufferWarning("Some audio may have been lost due to extended offline period");
                  }
                }
              }, 1000);
            }
          }
        }
      };

      recorder.start(250);

      // Process any buffered audio from a previous disconnect
      if (audioBufferRef.current.length > 0) {
        processBuffer();
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.channel?.alternatives?.[0]) return;

        const alt = data.channel.alternatives[0];
        const transcript = alt.transcript;
        if (!transcript) return;

        const isFinal = data.is_final;
        const words = alt.words || [];
        const speakerNum = words[0]?.speaker ?? 0;
        const speakerLabel = SPEAKER_LABELS[speakerNum] || `Speaker ${speakerNum + 1}`;
        const detectedLang = data.channel?.detected_language || alt.languages?.[0] || "en";
        const langDisplay = LANG_DISPLAY[detectedLang] || detectedLang.toUpperCase().slice(0, 2);
        const avgConfidence = words.length > 0
          ? words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / words.length
          : 1;
        const elapsed = (Date.now() - sessionStartRef.current) / 1000;
        const timeStr = formatTimestamp(elapsed);

        const newLine: TranscriptLine = {
          speaker: speakerLabel,
          lang: langDisplay,
          time: timeStr,
          text: transcript,
          lowConfidence: avgConfidence < 0.7,
          isInterim: !isFinal,
        };

        setLines(prev => {
          if (!isFinal) {
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].isInterim) {
              const updated = [...prev];
              updated[lastIdx] = newLine;
              return updated;
            }
            return [...prev, newLine];
          } else {
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].isInterim) {
              const updated = [...prev];
              updated[lastIdx] = newLine;
              return updated;
            }
            return [...prev, newLine];
          }
        });
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setError("Transcription connection error");
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (shouldReconnectRef.current) {
        setError("Connection lost — reconnecting...");
        reconnectTimerRef.current = setTimeout(() => connect(sessionLang), 3000);
      }
    };

    resetInactivityTimer();
    return true;
  }, [resetInactivityTimer, processBuffer]);

  const disconnect = useCallback(() => {
    cleanup();
    clearAudioBuffers();
  }, [cleanup, clearAudioBuffers]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  return {
    lines,
    isConnected,
    isConnecting,
    error,
    micPermission,
    isOnline,
    bufferedSeconds,
    bufferWarning,
    isProcessingBuffer,
    audioClearedConfirm,
    connect,
    disconnect,
    pause,
    resume,
    setLines,
    clearAudioBuffers,
  };
}
