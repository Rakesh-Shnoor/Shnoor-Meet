import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoGrid from '../components/VideoGrid';
import MeetingControls from '../components/MeetingControls';
import { Send, Users, Info, Video, MessageSquare, Search, Brain, CheckSquare, Download, Clock, Paperclip, FileText } from 'lucide-react';
import { askGemini } from '../services/geminiService';
import { transcribeAudioChunk } from '../services/groqService';

export default function MeetingRoom() {
  const { id: roomId } = useParams();
  const {
    localStream,
    remoteStreams,
    messages,
    participantsMetadata,
    isSharingScreen,
    isHandRaised,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleRaiseHand,
    sendChatMessage,
    sendCaptionMessage,
    isHost,
    mediaError
  } = useWebRTC(roomId);

  const [activeTab, setActiveTab] = useState(null);
  
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('auto');
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(true);
  const [activeCaptions, setActiveCaptions] = useState({}); // Keyed by sender ID/Name
  const [captionHistory, setCaptionHistory] = useState([]);
  
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [memories, setMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const sessionTimers = useRef({});
  const [, forceRender] = useState(0);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const transcriptionIntervalRef = useRef(null);
  const langRef = useRef(transcriptionLanguage);
  const transRef = useRef(isTranslationEnabled);

  useEffect(() => {
    langRef.current = transcriptionLanguage;
    transRef.current = isTranslationEnabled;
  }, [transcriptionLanguage, isTranslationEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, messages, activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(remoteStreams).forEach(peerId => {
        if (!sessionTimers.current[peerId]) {
          sessionTimers.current[peerId] = { timeIn: 0, timeOut: 0 };
        }
        sessionTimers.current[peerId].timeIn += 1;
        const meta = participantsMetadata[peerId] || {};
        if (meta.status === 'away') {
          sessionTimers.current[peerId].timeOut += 1;
        }
      });
        if (activeTab === 'admin') forceRender(r => r + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isHost, remoteStreams, participantsMetadata, activeTab]);

  const handleGlobalChatSubmit = (e) => {
    e.preventDefault();
    if (!globalChatInput.trim()) return;
    sendChatMessage(globalChatInput.trim());
    setGlobalChatInput('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const mockFileUrl = URL.createObjectURL(file); 
    const message = `[FILE: ${file.name}](${mockFileUrl})`;
    sendChatMessage(message);
  };

  useEffect(() => {
    const handleNewCaption = (e) => {
      const { text, sender, senderName } = e.detail;
      if (!text) return;

      const speakerName = senderName || participantsMetadata[sender]?.displayName || 'Participant';
      
      setActiveCaptions(prev => ({
        ...prev,
        [sender]: { name: speakerName, text, expiresAt: Date.now() + 6000 }
      }));

      setCaptionHistory(prev => {
        const last = prev[prev.length - 1];
        if (last?.speaker === speakerName && last?.text === text) return prev;
        return [...prev, { speaker: speakerName, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
      });
    };
    window.addEventListener('new-caption', handleNewCaption);
    return () => window.removeEventListener('new-caption', handleNewCaption);
  }, [participantsMetadata]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveCaptions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (next[id].expiresAt < now) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isCaptionsOn && localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (!audioTrack) {
        console.error('No audio track available for transcription.');
        return;
      }

      const audioStream = new MediaStream([audioTrack]);
      
      const startRecordingChunk = () => {
        let options = { mimeType: 'audio/webm' };
        if (!window.MediaRecorder.isTypeSupported('audio/webm')) {
           options = {};
        }
        
        const recorder = new MediaRecorder(audioStream, options);
        mediaRecorderRef.current = recorder;
        
        recorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0 && isCaptionsOn) {
            console.log(`[Captions] Captured audio chunk: ${Math.round(e.data.size / 1024)}KB`);
            try {
              const transcript = await transcribeAudioChunk(e.data, langRef.current, transRef.current);
              if (transcript && transcript.trim() !== '') {
                console.log(`[Captions] Local transcript received: "${transcript.substring(0, 30)}..."`);
                setActiveCaptions(prev => ({
                  ...prev,
                  'me': { name: 'You', text: transcript, expiresAt: Date.now() + 6000 }
                }));
                sendCaptionMessage(transcript);
                
                setCaptionHistory(prev => [...prev, { 
                  speaker: 'You', 
                  text: transcript, 
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                }]);
              } else {
                console.log('[Captions] No speech detected in this chunk.');
              }
            } catch (err) {
              console.error('[Captions] Transcription loop error:', err);
            }
          }
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 8000);
      };

      startRecordingChunk();
      transcriptionIntervalRef.current = setInterval(startRecordingChunk, 8050);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
      }
    };
  }, [isCaptionsOn, localStream]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    alert('Meeting code copied to clipboard!');
  };

  const captureSnapshot = async () => {
    if (!localStream) return null;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    video.srcObject = localStream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        video.pause();
        video.srcObject = null;
        resolve(dataUrl);
      };
    });
  };

  const handleTakeSnapshot = async () => {
    const dataUrl = await captureSnapshot();
    if (dataUrl) {
      setMemories(prev => [...prev, {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'snapshot',
        image: dataUrl,
        text: 'Manual Snapshot'
      }]);
      setActiveTab('memory');
    }
  };

  const addMemory = (text, type = 'note', imageBase64 = null) => {
    setMemories(prev => [...prev, {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      text,
      image: imageBase64
    }]);
  };

  const handleDownloadRecap = async () => {
    setIsGeneratingRecap(true);
    let fullTranscript = captionHistory.map(c => `[${c.time}] ${c.speaker}: ${c.text}`).join('\n');
    if (!fullTranscript) fullTranscript = "No transcripts recorded.";
    
    const prompt = `You are an executive assistant generating a formal Meeting Recap.
    
    TRANSCRIPT:
    ${fullTranscript}

    Please output a strictly structured HTML report using ONLY these sections EXACTLY (Do not use Markdown wrappers like \`\`\`html, output raw HTML tags only for the content):
    <h2>Executive Summary</h2>
    <p>...Brief paragraph summarizing the entire context in a highly structured way...</p>

    <h2>Key Main Points</h2>
    <ul><li>...Bullet points of main topics discussed...</li></ul>

    <h2>Action Items & Tasks</h2>
    <ul><li>...Bullet points of what tasks were given to WHICH specific person...</li></ul>
    `;

    try {
      setAssistantMessages(prev => [...prev, { sender: 'System', text: 'Generating comprehensive meeting recap... Please wait.' }]);
      const summaryHTML = await askGemini(prompt, "", []);
      
      const images = memories.filter(m => m.image);
      let galleryHTML = "";
      if (images.length > 0) {
        galleryHTML = `<h2>Visual Context Captured</h2><div class="gallery">` + 
                      images.map(img => `<img src="${img.image}" alt="Meeting Screenshot"/>`).join('') + 
                      `</div>`;
      }

      const rawHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Meeting Recap - Auto Generated</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1f2937; line-height: 1.6; background: #fff;}
    .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #111827; }
    h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .ai-summary { background: #f9fafb; padding: 20px; border-radius: 8px; font-size: 15px; border-left: 4px solid #4f46e5; }
    .gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
    .gallery img { width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;}
    .transcript { margin-top: 40px; font-family: ui-monospace, monospace; background: #111827; color: #d1d5db; padding: 20px; border-radius: 8px; font-size: 13px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Meeting Recap Dashboard</h1>
    <p style="color: #6b7280;">Auto-Generated on ${new Date().toLocaleString()}</p>
  </div>

  <div class="ai-summary">
    ${summaryHTML.replace(/```html/g, '').replace(/```/g, '')}
  </div>

  ${galleryHTML}

  <h2>Raw Spoken Transcript</h2>
  <div class="transcript">${fullTranscript}</div>
</body>
</html>`;

      const blob = new Blob([rawHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Meeting_Recap_${roomId}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setAssistantMessages(prev => [...prev, { sender: 'System', text: 'Recap generated and downloaded successfully!' }]);
    } catch(e) {
      console.error('Failed to generate recap', e);
      setAssistantMessages(prev => [...prev, { sender: 'System', text: 'Failed to generate recap due to API overload.' }]);
    }
    setIsGeneratingRecap(false);
  };

  const handleAssistantSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    let currentInput = aiInput.trim();
    setAiInput('');
    setAssistantMessages(prev => [...prev, { sender: 'Me', text: currentInput }]);
    setAiIsTyping(true);

    const isTakeNote = currentInput.toLowerCase().includes('take a note');
    const isExtractTask = currentInput.toLowerCase().includes('task');
    let snapshotBase64 = null;
    
    if (isTakeNote || currentInput.toLowerCase().includes('screenshot') || currentInput.toLowerCase().includes('see this')) {
      snapshotBase64 = await captureSnapshot();
    }

    const historicalImages = memories
      .filter(m => m.image)
      .map(m => m.image);
    
    const allImagesToAnalyze = [...historicalImages];
    if (snapshotBase64) {
      allImagesToAnalyze.push(snapshotBase64);
    }

    try {
      let injectedOCR = "";
      const lowerInput = currentInput.toLowerCase();
      const wantsScreen = lowerInput.includes('screen') || lowerInput.includes('code') || lowerInput.includes('read') || lowerInput.includes('look') || lowerInput.includes('what');
      
      if (wantsScreen) {
        setAssistantMessages(prev => [...prev, { sender: 'System', text: 'Scanning stream with OCR... Please wait a few seconds.' }]);
        const videoEls = document.querySelectorAll('video');
        let targetVideo = Array.from(videoEls).sort((a,b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight))[0];
        
        if (targetVideo) {
          const canvas = document.createElement('canvas');
          canvas.width = targetVideo.videoWidth;
          canvas.height = targetVideo.videoHeight;
          canvas.getContext('2d').drawImage(targetVideo, 0, 0);
          const Tesseract = (await import('tesseract.js')).default;
          const { data: { text: ocrText } } = await Tesseract.recognize(canvas, 'eng');
          injectedOCR = `\n\n=== LIVE SCREEN OCR EXTRACT ===\n${ocrText || "No text detected on screen."}\n`;
        }
      }

      const spokenTranscript = captionHistory.length > 0
        ? captionHistory.map(c => `[${c.time}] ${c.speaker}: ${c.text}`).join('\n')
        : 'No spoken transcript yet — captions may not be enabled.';

      const chatTranscript = messages.length > 0
        ? messages.map(m => `[Chat] ${m.sender === 'Me' ? 'You' : m.sender}: ${m.text}`).join('\n')
        : 'No group chat messages yet.';

      const memoryLog = memories.length > 0
        ? memories.map(m => `[${m.time}][${m.type.toUpperCase()}] ${m.text}`).join('\n')
        : 'No memory notes saved yet.';

      const context = `You are an intelligent AI meeting assistant with access to the full context of this live video call.

=== SPOKEN TRANSCRIPT (Live Captions) ===
${spokenTranscript}

=== GROUP CHAT MESSAGES ===
${chatTranscript}

=== MEMORY LOG (Saved Notes & Tasks) ===
${memoryLog}

=== VISUAL CONTEXT ===
You have access to ${allImagesToAnalyze.length} screenshot(s) taken during this meeting. Analyse them carefully if the user asks visual questions.
${injectedOCR}

Use ALL of the above context to give the most accurate, helpful, and context-aware response possible. If the user is asking about something that was said, look in the Spoken Transcript first.`;
      
      const answer = await askGemini(currentInput, context, allImagesToAnalyze);
      
      setAssistantMessages(prev => [...prev, { sender: 'AI', text: answer, image: snapshotBase64 }]);
      
      if (isTakeNote || isExtractTask) {
        addMemory(answer, isExtractTask ? 'task' : 'note', snapshotBase64);
      }

    } catch (e) {
      const isQuota = e.message === 'API_QUOTA_EXCEEDED';
      setAssistantMessages(prev => [...prev, { 
        sender: 'AI', 
        text: isQuota 
          ? '⚠️ API quota exceeded for today. The free-tier API key has hit its daily limit. Please try again tomorrow, or replace the API key in geminiService.js with a new one from https://aistudio.google.com/apikey'
          : `Sorry, I had trouble responding: ${e.message}`
      }]);
    } finally {
      setAiIsTyping(false);
    }
  };

  const filteredMemories = memories.filter(m => 
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.time.includes(searchQuery)
  );

  return (
    <div className="h-screen w-full bg-[#131417] flex flex-col overflow-hidden text-[#e2e3e8] font-sans">
      <header className="w-full p-6 flex items-center justify-between z-10 bg-[#131417]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-xl tracking-wide hidden sm:block">Shnoor Meetings</span>
          <span className="text-gray-400 text-sm bg-[#1e2025] px-4 py-2 rounded-lg border border-gray-800 ml-4 hidden md:inline-flex items-center cursor-pointer hover:bg-gray-800 transition">
            Code: {roomId} <Info size={14} className="ml-2" />
          </span>
        </div>
        <div className="flex items-center text-gray-400 bg-[#1e2025] px-4 py-2 rounded-lg border border-gray-800">
          <Users size={16} className="mr-2" /> 
          <span className="font-medium text-sm">{1 + Object.keys(remoteStreams).length}</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden px-6 pb-2 relative w-full h-full gap-4">
        
        <div className="flex-1 flex flex-col transition-all duration-300 w-full min-w-0">
          <div className="flex-1 rounded-2xl overflow-hidden relative flex items-center justify-center p-2 bg-black shadow-2xl border border-gray-900">
            {!localStream ? (
              <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-700">
                <div className={`p-8 rounded-full bg-gray-800 ${!mediaError ? 'animate-pulse' : ''} border border-gray-700 transition-all`}>
                  <Video size={48} className={mediaError ? 'text-red-500' : 'text-blue-500'} />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2 text-white">
                    {mediaError ? 'Camera/Mic Access Failed' : 'Ready to join?'}
                  </h3>
                  <p className="text-gray-400 max-w-sm">
                    {mediaError 
                      ? `We couldn't access your hardware: ${mediaError}. Please check your browser permissions.`
                      : 'We are requesting access to your camera and microphone. Please click "Allow" in the browser prompt.'}
                  </p>
                  {mediaError && (
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg transition-all transform active:scale-95"
                    >
                      Retry Access
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <VideoGrid 
                localStream={localStream} 
                remoteStreams={remoteStreams} 
                participantsMetadata={participantsMetadata}
                localHandRaised={isHandRaised}
                isSharingScreen={isSharingScreen}
              />
            )}
            
            {isCaptionsOn && Object.keys(activeCaptions).length > 0 && (
              <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-3 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                {Object.entries(activeCaptions).map(([id, caption]) => (
                  <div key={id} className="bg-[#212328]/95 backdrop-blur-md px-5 py-3 rounded-2xl text-left shadow-2xl flex items-start gap-4 border border-gray-800 animate-in fade-in slide-in-from-left-2 transition-all">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${id === 'me' ? 'from-blue-500 to-indigo-500' : 'from-emerald-500 to-teal-500'} shrink-0 shadow-lg border border-gray-600 flex items-center justify-center text-[10px] font-bold text-white uppercase`}>
                      {caption.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-gray-500 tracking-widest mb-0.5">{caption.name}</div>
                      <p className="text-[#e2e3e8] text-[15px] font-medium tracking-wide leading-relaxed">
                        {caption.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <MeetingControls 
            roomId={roomId}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onToggleScreenShare={toggleScreenShare}
            onToggleRaiseHand={toggleRaiseHand}
            onToggleCaptions={() => setIsCaptionsOn(!isCaptionsOn)}
            onTakeSnapshot={handleTakeSnapshot}
            isSharingScreen={isSharingScreen}
            isHandRaised={isHandRaised}
            isCaptionsOn={isCaptionsOn}
            isTranslationEnabled={isTranslationEnabled}
            setIsTranslationEnabled={setIsTranslationEnabled}
            transcriptionLanguage={transcriptionLanguage}
            setTranscriptionLanguage={setTranscriptionLanguage}
            toggleRightPanel={(tab) => {
               setActiveTab(activeTab === tab ? null : tab);
            }}
            onExportRecap={handleDownloadRecap}
            isGeneratingRecap={isGeneratingRecap}
          />
        </div>

        {activeTab && (
          <aside className="w-[400px] flex flex-col bg-[#1e2025] rounded-2xl shadow-xl overflow-hidden border border-gray-800 shrink-0 h-[calc(100vh-200px)]">
            <div className="flex bg-[#2a2d33] text-sm font-semibold py-1.5 px-1.5 rounded-xl mx-4 mt-4 gap-1 z-10">
               <button 
                 onClick={() => setActiveTab('people')}
                 className={`flex-1 py-1.5 rounded-lg capitalize transition-colors ${activeTab === 'people' ? 'bg-[#3b3d44] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 People
               </button>
               <button 
                 onClick={() => setActiveTab('chat')}
                 className={`flex-1 py-1.5 rounded-lg capitalize transition-colors ${activeTab === 'chat' ? 'bg-[#3b3d44] text-white shadow-sm font-bold border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
               >
                 Chat
               </button>
               <button 
                 onClick={() => setActiveTab('ai')}
                 className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-[#3b3d44] text-white shadow-sm font-bold border-b-2 border-blue-500' : 'text-gray-400 border-b-2 border-transparent hover:text-white'}`}
               >
                 AI Assistant
               </button>
               <button 
                 onClick={() => setActiveTab('memory')}
                 className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'memory' ? 'bg-[#3b3d44] text-white shadow-sm font-bold border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
               >
                 Memory
               </button>
               <button 
                 onClick={() => setActiveTab('admin')}
                 className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-[#3b3d44] text-white shadow-sm font-bold border-b-2 border-red-500' : 'text-gray-400 hover:text-white'}`}
               >
                 Admin
               </button>
            </div>
            
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 pb-0 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center px-4 space-y-4">
                      <div className="p-4 bg-gray-800 rounded-full mb-2 opacity-50 shadow-md">
                        <MessageSquare className="text-gray-400" size={32} />
                      </div>
                      <p>Welcome to the group chat. Say hi or share files with the room!</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isFile = m.text.startsWith('[FILE:');
                      const fileName = isFile ? m.text.substring(m.text.indexOf(' ')+1, m.text.indexOf(']')) : null;
                      const fileUrl = isFile ? m.text.substring(m.text.indexOf('(')+1, m.text.indexOf(')')) : null;

                      return (
                        <div key={idx} className={`flex flex-col gap-1 ${m.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-medium text-gray-500">{m.sender === 'Me' ? 'You' : m.sender}</span>
                          </div>
                          
                          {isFile ? (
                             <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`px-4 py-3 rounded-2xl text-[14px] max-w-[85%] leading-relaxed shadow-sm flex items-center gap-2 cursor-pointer ${m.sender === 'Me' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#2a2d33] text-indigo-100 rounded-tl-none border border-gray-700 hover:bg-gray-700'}`}>
                               <FileText size={18} />
                               <span className="truncate">{fileName}</span>
                             </a>
                          ) : (
                             <div className={`px-4 py-3 rounded-2xl text-[14px] max-w-[85%] leading-relaxed shadow-sm ${m.sender === 'Me' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#2a2d33] text-indigo-100 rounded-tl-none border border-gray-700'}`}>
                               {m.text}
                             </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4">
                  <form onSubmit={handleGlobalChatSubmit} className="bg-[#2a2d33] rounded-2xl flex items-center shadow-inner border border-gray-700 focus-within:border-indigo-500 transition-colors px-2">
                    <button type="button" onClick={() => document.getElementById('file-upload').click()} className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-gray-700">
                      <Paperclip size={18} />
                    </button>
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                    
                    <input
                      type="text"
                      value={globalChatInput}
                      onChange={(e) => setGlobalChatInput(e.target.value)}
                      placeholder="Message everyone..."
                      className="flex-1 bg-transparent border-none outline-none text-[#e2e3e8] py-3 px-2 placeholder-gray-500 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!globalChatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl disabled:opacity-30 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>
            )}
            
            {activeTab === 'ai' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 pb-0 space-y-6">
                  {assistantMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center px-4 space-y-4">
                      <div className="p-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full mb-2 opacity-50 shadow-lg shadow-blue-900/50">
                        <Brain className="text-white" size={32} />
                      </div>
                      <p>Ask a question about the meeting, or type "Take a note" to save something to Memory.</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        <button onClick={() => setAiInput('Summarize the meeting')} className="bg-[#2a2d33] border border-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-[#3b3d44] transition">Summarize</button>
                        <button onClick={() => setAiInput('What are my tasks?')} className="bg-[#2a2d33] border border-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-[#3b3d44] transition">List Tasks</button>
                        <button onClick={() => setAiInput('Read screen and explain code')} className="bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 px-3 py-1.5 rounded-full text-xs hover:bg-indigo-600/40 transition">Scan Screen</button>
                      </div>
                    </div>
                  ) : (
                    assistantMessages.map((m, idx) => (
                      <div key={idx} className={`flex flex-col gap-1 ${m.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {m.sender !== 'Me' && <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold shadow-md shadow-blue-500/20">AI</div>}
                          <span className="text-[11px] text-gray-500">{m.sender === 'Me' ? 'You' : m.sender}</span>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-[14px] max-w-[85%] leading-relaxed shadow-sm ${m.sender === 'Me' ? 'bg-[#3b3d44] text-white rounded-tr-none' : 'bg-[#2a2d33] text-blue-100 rounded-tl-none border border-gray-700'}`}>
                          {m.text}
                          {m.image && <img src={m.image} alt="snapshot" className="mt-2 rounded-lg border border-gray-600 w-full object-cover" />}
                        </div>
                      </div>
                    ))
                  )}
                  {aiIsTyping && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs italic">
                      <div className="w-6 h-6 rounded-full bg-blue-600/50 animate-pulse flex items-center justify-center text-[10px] font-bold text-white">AI</div>
                      Thinking...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4">
                  <form onSubmit={handleAssistantSubmit} className="bg-[#2a2d33] rounded-2xl flex items-center shadow-inner border border-gray-700 focus-within:border-blue-500 transition-colors">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask the AI Assistant..."
                      className="flex-1 bg-transparent border-none outline-none text-[#e2e3e8] py-4 px-5 placeholder-gray-500 text-sm"
                      disabled={aiIsTyping}
                    />
                    <button
                      type="submit"
                      disabled={!aiInput.trim() || aiIsTyping}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl disabled:opacity-30 transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {(activeTab === 'memory') && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-[#2a2d33]">
                  <div className="flex items-center gap-3 bg-[#2a2d33] py-2 px-4 rounded-lg focus-within:ring-1 focus-within:ring-emerald-500">
                    <Search size={16} className="text-gray-400" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search past memories..."
                      className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {filteredMemories.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center">
                      <div className="p-4 bg-[#2a2d33] rounded-full mb-3 opacity-50">
                        <CheckSquare className="text-gray-400" size={24} />
                      </div>
                      <p>{searchQuery ? "No memories match your search." : "No memories yet. Ask the AI to take a note!"}</p>
                    </div>
                  ) : (
                    filteredMemories.map((mem) => (
                      <div key={mem.id} className="bg-[#2a2d33] border border-gray-700 p-4 rounded-xl shadow-sm hover:border-gray-500 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                            mem.type === 'snapshot' ? 'bg-indigo-500/20 text-indigo-400' :
                            mem.type === 'task' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {mem.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12}/> {mem.time}</span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed mb-2">{mem.text}</p>
                        {mem.image && (
                           <div className="mt-3 rounded-lg overflow-hidden border border-gray-700 relative">
                             <img src={mem.image} alt="Memory Snapshot" className="w-full object-cover" />
                           </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-[#2a2d33] flex justify-center">
                   <button className="text-gray-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors">
                     <Download size={14}/> Export Memory Log
                   </button>
                </div>
              </div>
            )}

            {activeTab === 'people' && (
              <div className="flex-1 overflow-y-auto p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">In Call</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-[#2a2d33] rounded-xl cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        You
                      </div>
                      <span className="text-[15px] font-medium text-gray-200">You {isHost ? '(Host)' : ''}</span>
                    </div>
                  </div>
                  {Object.keys(remoteStreams).map(peerId => (
                    <div key={peerId} className="flex items-center justify-between py-2 px-3 hover:bg-[#2a2d33] rounded-xl cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#3b3d44] border border-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold shadow-sm">
                          U
                        </div>
                        <span className="text-[15px] font-medium text-gray-200">Participant</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'admin') && (
              <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"/> Dashboard
                </h3>
                <div className="bg-[#2a2d33] border border-gray-700 rounded-xl overflow-hidden shadow-lg">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-800/80 border-b border-gray-700">
                        <th className="p-4 font-semibold text-gray-300">User</th>
                        <th className="p-4 font-semibold text-gray-300">Status</th>
                        <th className="p-4 font-semibold text-gray-300">Current Activity</th>
                        <th className="p-4 font-semibold text-gray-300">Time In</th>
                        <th className="p-4 font-semibold text-gray-300">Time AFK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {Object.keys(remoteStreams).length === 0 && (
                        <tr><td colSpan="4" className="p-6 text-center text-gray-500">No participants yet.</td></tr>
                      )}
                      {Object.keys(remoteStreams).map((peerId) => {
                        const meta = participantsMetadata[peerId] || {};
                        const timers = sessionTimers.current[peerId] || { timeIn: 0, timeOut: 0 };
                        const isAway = meta.status === 'away';
                        return (
                          <tr key={peerId} className="hover:bg-gray-700/30 transition-colors">
                            <td className="p-4 text-gray-200 font-medium">#{peerId.slice(0, 4)}</td>
                            <td className="p-4">
                              {isAway ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Away
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Active
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-gray-300 font-medium text-xs">
                              {isAway ? (
                                <span className="text-gray-500 italic">Not focused on meeting</span>
                              ) : meta.isSpeaking ? (
                                <span className="text-blue-400 italic">Speaking / Explaining</span>
                              ) : meta.isHandRaised ? (
                                <span className="text-yellow-400 italic">Hand Raised (Has a question)</span>
                              ) : (
                                <span className="text-gray-400 italic">Listening</span>
                              )}
                            </td>
                            <td className="p-4 text-emerald-300 font-mono text-xs">{timers.timeIn}s</td>
                            <td className="p-4 text-red-300 font-mono text-xs">{timers.timeOut}s</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                   <h4 className="text-indigo-300 font-bold text-sm mb-2">Automated AI Insights</h4>
                   <p className="text-gray-400 text-xs leading-relaxed">
                     When participants ask questions, DeepSeek automatically processes their transcript metrics. If someone tabs out (AFK), the status changes live. Try it by asking a participant to switch browser tabs!
                   </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
