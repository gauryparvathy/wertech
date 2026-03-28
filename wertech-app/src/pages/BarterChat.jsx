import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, User, Shield, MoreVertical, Search, Paperclip, Smile, MessageSquare, Trash2, Check, X, Phone, Video, PhoneOff, ChevronLeft } from 'lucide-react';
import { subscribeUserEvents } from '../utils/liveEvents';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function formatMessageTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toColorClass(name) {
  const palette = [
    'bg-rose-500',
    'bg-orange-500',
    'bg-emerald-500',
    'bg-blue-500',
    'bg-violet-500',
    'bg-cyan-500'
  ];
  const sum = String(name || '')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
}

function createCallId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function NotificationBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function BarterChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem('username') || '';
  const targetUsername = location.state?.targetUsername || '';
  const complaintDraft = location.state?.complaintDraft || '';
  const incomingShareListing = location.state?.shareListing || null;
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageRequests, setMessageRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [sendInfo, setSendInfo] = useState('');
  const [pendingShareListing, setPendingShareListing] = useState(null);
  const [callState, setCallState] = useState({ status: 'idle', callId: '', type: 'audio', withUser: '', incomingFrom: '', offer: null });
  const [callError, setCallError] = useState('');
  const threadRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const filteredParticipants = useMemo(
    () => participants.filter((p) => p.username.toLowerCase().includes(searchTerm.toLowerCase())),
    [participants, searchTerm]
  );

  const loadParticipants = useCallback(async () => {
    if (!currentUsername) return;
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/chat/users/${encodeURIComponent(currentUsername)}`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) return;
      setParticipants(data);
      setSelectedUser((prev) => {
        if (targetUsername) {
          const target = data.find((u) => u.username === targetUsername);
          if (target) return target;
          if (!prev || prev.username !== targetUsername) {
            return { username: targetUsername, status: 'Verified' };
          }
        }
        if (prev?.username) {
          const matched = data.find((u) => u.username === prev.username);
          if (matched) {
            return { ...prev, ...matched };
          }
          // Keep users selected from search even when they are not yet in direct-chat participants.
          return prev;
        }
        return data[0] || null;
      });
    } catch (err) {
      // no-op fallback
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUsername, targetUsername]);

  const loadThread = useCallback(async (otherUsername) => {
    if (!currentUsername || !otherUsername) return;
    setLoadingMessages(true);
    try {
      const response = await fetch(
        `/api/messages/thread/${encodeURIComponent(currentUsername)}/${encodeURIComponent(otherUsername)}?page=1&limit=80`
      );
      const data = await response.json();
      if (!response.ok) return;
      const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setMessages(rows);
    } catch (err) {
      // no-op fallback
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUsername]);

  const loadMessageRequests = useCallback(async () => {
    if (!currentUsername) return;
    try {
      const response = await fetch(`/api/messages/requests/${encodeURIComponent(currentUsername)}`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) return;
      setMessageRequests(data);
    } catch (err) {
      // no-op
    }
  }, [currentUsername]);

  const markThreadAsRead = useCallback(async (otherUsername) => {
    if (!currentUsername || !otherUsername) return;
    try {
      const response = await fetch(
        `/api/messages/read-thread/${encodeURIComponent(currentUsername)}/${encodeURIComponent(otherUsername)}`,
        { method: 'PATCH' }
      );
      if (!response.ok) return;

      // Clear unread badge immediately for the open chat row.
      setParticipants((prev) =>
        prev.map((p) => (p.username === otherUsername ? { ...p, unread_count: 0 } : p))
      );
      // Keep currently visible incoming messages visually in read state.
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender_username === otherUsername && msg.receiver_username === currentUsername
            ? { ...msg, read_by_receiver: true }
            : msg
        )
      );
    } catch (err) {
      // no-op
    }
  }, [currentUsername]);

  const loadSearchResults = useCallback(async () => {
    const q = String(searchTerm || '').trim().toLowerCase();
    if (!currentUsername || !q) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) return;
      const rows = data
        .map((u) => ({ username: u.username, status: u.status || 'Verified' }))
        .filter((u) => u.username && u.username !== currentUsername && u.username.toLowerCase().includes(q))
        .slice(0, 8);
      setSearchResults(rows);
    } catch (err) {
      // no-op
    }
  }, [currentUsername, searchTerm]);

  useEffect(() => {
    loadParticipants();
    loadMessageRequests();
  }, [loadParticipants, loadMessageRequests]);

  useEffect(() => {
    loadSearchResults();
  }, [loadSearchResults]);

  useEffect(() => {
    if (!incomingShareListing?.listing_id) return;
    setPendingShareListing(incomingShareListing);
    setSendInfo('Listing selected. Choose a user and send.');
  }, [incomingShareListing, currentUsername]);

  useEffect(() => {
    if (!complaintDraft) return;
    setInput(complaintDraft);
    setSendInfo('Review your complaint and send it to verified Wertech support.');
  }, [complaintDraft]);

  useEffect(() => {
    if (!selectedUser?.username) {
      setMessages([]);
      return;
    }
    setParticipants((prev) =>
      prev.map((p) => (p.username === selectedUser.username ? { ...p, unread_count: 0 } : p))
    );
    const boot = async () => {
      await loadThread(selectedUser.username);
      await markThreadAsRead(selectedUser.username);
      await loadParticipants();
    };
    boot();
    return undefined;
  }, [selectedUser?.username, currentUsername, loadThread, markThreadAsRead, loadParticipants, loadMessageRequests]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, selectedUser?.username]);

  const cleanupCallMedia = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const sendCallSignal = useCallback(async (targetUsername, signalType, callId, callType, payload = {}) => {
    if (!currentUsername || !targetUsername || !callId) return;
    await fetch('/api/calls/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUsername,
        target_username: targetUsername,
        call_id: callId,
        signal_type: signalType,
        call_type: callType,
        payload
      })
    });
  }, [currentUsername]);

  const ensurePeerConnection = useCallback((targetUsername, callId, callType) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(targetUsername, 'ice', callId, callType, { candidate: event.candidate });
      }
    };
    peerConnectionRef.current = pc;
    return pc;
  }, [sendCallSignal]);

  const flushPendingIceCandidates = useCallback(async () => {
    if (!peerConnectionRef.current || !pendingIceCandidatesRef.current.length) return;
    const queued = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        // no-op
      }
    }
  }, []);

  const startCall = useCallback(async (callType) => {
    if (!selectedUser?.username || !navigator.mediaDevices?.getUserMedia) return;
    try {
      setCallError('');
      cleanupCallMedia();
      const callId = createCallId();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = ensurePeerConnection(selectedUser.username, callId, callType);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setCallState({ status: 'calling', callId, type: callType, withUser: selectedUser.username, incomingFrom: '', offer: null });
      await sendCallSignal(selectedUser.username, 'offer', callId, callType, { sdp: offer });
    } catch (error) {
      cleanupCallMedia();
      setCallError('Could not start the call. Check microphone/camera permissions.');
    }
  }, [cleanupCallMedia, ensurePeerConnection, selectedUser?.username, sendCallSignal]);

  const acceptIncomingCall = useCallback(async () => {
    if (callState.status !== 'incoming' || !callState.incomingFrom || !callState.callId || !callState.offer) return;
    try {
      setCallError('');
      cleanupCallMedia();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.type === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = ensurePeerConnection(callState.incomingFrom, callState.callId, callState.type);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));
      await flushPendingIceCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendCallSignal(callState.incomingFrom, 'answer', callState.callId, callState.type, { sdp: answer });
      setCallState((prev) => ({ ...prev, status: 'connected', withUser: prev.incomingFrom, offer: null }));
    } catch (error) {
      cleanupCallMedia();
      setCallError('Could not access microphone/camera for this call.');
    }
  }, [callState.callId, callState.incomingFrom, callState.offer, callState.status, callState.type, cleanupCallMedia, ensurePeerConnection, flushPendingIceCandidates, sendCallSignal]);

  const endCall = useCallback(async (signalType = 'hangup') => {
    const target = callState.withUser || callState.incomingFrom || selectedUser?.username || '';
    const callId = callState.callId;
    const callType = callState.type || 'audio';
    cleanupCallMedia();
    setCallState({ status: 'idle', callId: '', type: 'audio', withUser: '', incomingFrom: '', offer: null });
    if (target && callId) {
      try {
        await sendCallSignal(target, signalType, callId, callType, {});
      } catch (error) {
        // no-op
      }
    }
  }, [callState.callId, callState.incomingFrom, callState.type, callState.withUser, cleanupCallMedia, selectedUser?.username, sendCallSignal]);

  useEffect(() => () => cleanupCallMedia(), [cleanupCallMedia]);

  useEffect(() => {
    if (!currentUsername) return undefined;
    const unsubscribe = subscribeUserEvents(currentUsername, {
      onEvent: async (type, payload) => {
        if (type === 'call_signal') {
          const fromUsername = String(payload?.from_username || '');
          const signalType = String(payload?.signal_type || '');
          const callId = String(payload?.call_id || '');
          const callType = String(payload?.call_type || 'audio');
          if (!fromUsername || !callId) return;

          if (signalType === 'offer') {
            pendingIceCandidatesRef.current = [];
            setCallError('');
            setCallState({
              status: 'incoming',
              callId,
              type: callType,
              withUser: fromUsername,
              incomingFrom: fromUsername,
              offer: payload?.payload?.sdp || null
            });
            setSelectedUser((prev) => (prev?.username === fromUsername ? prev : { username: fromUsername, status: 'Verified' }));
            return;
          }

          if (signalType === 'reject' || signalType === 'hangup') {
            cleanupCallMedia();
            setCallState({ status: 'idle', callId: '', type: 'audio', withUser: '', incomingFrom: '', offer: null });
            return;
          }

          if (signalType === 'answer' && payload?.payload?.sdp) {
            try {
              const pc = peerConnectionRef.current;
              if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
                await flushPendingIceCandidates();
                setCallState((prev) => ({ ...prev, status: 'connected', offer: null }));
              }
            } catch (error) {
              setCallError('Could not complete the call handshake.');
            }
            return;
          }

          if (signalType === 'ice' && payload?.payload?.candidate) {
            try {
              if (peerConnectionRef.current?.remoteDescription) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
              } else {
                pendingIceCandidatesRef.current.push(payload.payload.candidate);
              }
            } catch (error) {
              // no-op
            }
            return;
          }
        }

        if (type !== 'message_update' && type !== 'notification_update') return;
        await loadParticipants();
        await loadMessageRequests();
        if (selectedUser?.username) {
          await loadThread(selectedUser.username);
          await markThreadAsRead(selectedUser.username);
        }
      }
    });
    return () => unsubscribe();
  }, [cleanupCallMedia, currentUsername, flushPendingIceCandidates, loadMessageRequests, loadParticipants, loadThread, markThreadAsRead, selectedUser?.username]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedUser?.username || !currentUsername) return;

    setInput('');
    try {
      const isWertechComplaint =
        selectedUser.username.toLowerCase() === 'wertech' &&
        text.includes('[Complaint For Verified Wertech Support]');
      const subjectMatch = text.match(/Subject:\s*(.+)/i);
      const detailsMatch = text.match(/Details:\s*([\s\S]+)/i);
      const response = await fetch(isWertechComplaint ? '/api/support/tickets' : '/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isWertechComplaint
            ? {
                username: currentUsername,
                subject: String(subjectMatch?.[1] || 'Support request').trim(),
                description: String(detailsMatch?.[1] || '').trim()
              }
            : {
                sender_username: currentUsername,
                receiver_username: selectedUser.username,
                text
              }
        )
      });

      const data = await response.json();
      if (!response.ok) {
        setSendInfo(data?.message || 'Could not send message.');
        return;
      }
      if (isWertechComplaint) {
        setSendInfo('Complaint sent to verified Wertech support.');
      } else if (data.request_status === 'pending') {
        setSendInfo('Message request sent. It will move to inbox after they accept.');
      } else {
        setSendInfo('');
      }
      await loadThread(selectedUser.username);
      await loadParticipants();
      await loadMessageRequests();
    } catch (err) {
      // no-op fallback
    }
  };

  const handleSendSharedListing = async () => {
    if (!pendingShareListing?.listing_id || !selectedUser?.username || !currentUsername) return;
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_username: currentUsername,
          receiver_username: selectedUser.username,
          message_type: 'listing_share',
          meta: { listing_id: pendingShareListing.listing_id }
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setSendInfo(data?.message || 'Could not share listing.');
        return;
      }
      if (data.request_status === 'pending') {
        setSendInfo('Listing share sent as request.');
      } else {
        setSendInfo('Listing shared.');
      }
      setPendingShareListing(null);
      await loadThread(selectedUser.username);
      await loadParticipants();
      await loadMessageRequests();
    } catch (err) {
      // no-op
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId || !currentUsername) return;
    const confirmed = window.confirm('Delete this message for everyone?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_username: currentUsername })
      });
      if (!response.ok) return;
      if (selectedUser?.username) {
        await loadThread(selectedUser.username);
        await loadParticipants();
        await loadMessageRequests();
      }
    } catch (err) {
      // no-op
    }
  };

  const handleReadSingleMessage = async (messageId) => {
    if (!messageId || !currentUsername) return;
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_username: currentUsername })
      });
      if (!response.ok) return;
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, read_by_receiver: true } : msg))
      );
      await loadParticipants();
      await loadMessageRequests();
    } catch (err) {
      // no-op
    }
  };

  const handleMessageRequestAction = async (senderUsername, action) => {
    if (!currentUsername || !senderUsername) return;
    try {
      const response = await fetch(
        `/api/messages/requests/${encodeURIComponent(currentUsername)}/${encodeURIComponent(senderUsername)}/${action}`,
        { method: 'PATCH' }
      );
      if (!response.ok) return;
      await loadMessageRequests();
      await loadParticipants();
      if (action === 'accept') {
        setSelectedUser({ username: senderUsername, status: 'Verified' });
        await loadThread(senderUsername);
      }
    } catch (err) {
      // no-op
    }
  };

  const activeName = selectedUser?.username || 'Select a user';
  const activeColor = toColorClass(activeName);
  const mobileInboxUsers = searchTerm.trim() ? searchResults : filteredParticipants;
  const showMobileInbox = !selectedUser?.username;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8.5rem)] lg:h-[85vh] bg-white dark:bg-slate-950 rounded-[28px] lg:rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 m-3 sm:m-4 lg:m-6">
      <div className="w-80 border-r dark:border-slate-800 hidden lg:flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-8">
          <h1 className="text-2xl font-black dark:text-white mb-6">Messages</h1>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 py-3 pl-12 pr-4 rounded-2xl text-sm outline-none border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-2 space-y-1">
              {searchResults.map((u) => (
                <button
                  key={`search-${u.username}`}
                  onClick={() => {
                    setSelectedUser(u);
                    setSearchTerm('');
                    setSearchResults([]);
                    setSendInfo('');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-bold dark:text-white"
                >
                  {u.username}
                </button>
              ))}
            </div>
          )}
        </div>

        {messageRequests.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">Message Requests</p>
            <div className="space-y-2">
              {messageRequests.map((req) => (
                <div key={`req-${req.sender_username}`} className="p-3 rounded-2xl bg-amber-50/80 border border-amber-100">
                  <p className="text-xs font-black text-slate-800">{req.sender_username}</p>
                  <p className="text-[11px] text-slate-500 truncate">{req.latest_text}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleMessageRequestAction(req.sender_username, 'accept')}
                      className="flex-1 py-1.5 rounded-lg bg-teal-600 text-white text-[10px] font-black uppercase inline-flex items-center justify-center gap-1"
                    >
                      <Check size={12} /> Accept
                    </button>
                    <button
                      onClick={() => handleMessageRequestAction(req.sender_username, 'reject')}
                      className="flex-1 py-1.5 rounded-lg bg-rose-100 text-rose-600 text-[10px] font-black uppercase inline-flex items-center justify-center gap-1"
                    >
                      <X size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {loadingUsers && <p className="text-center text-slate-400 text-xs mt-10 italic">Loading users...</p>}
          {!loadingUsers && filteredParticipants.length > 0 && filteredParticipants.map((user) => (
            <button
              key={user._id || user.username}
              onClick={() => {
                setSelectedUser(user);
                setParticipants((prev) =>
                  prev.map((p) => (p.username === user.username ? { ...p, unread_count: 0 } : p))
                );
              }}
              className={`w-full p-4 rounded-3xl flex items-center gap-4 transition-all ${
                selectedUser?.username === user.username
                  ? 'bg-white dark:bg-slate-800 shadow-md border border-teal-100 dark:border-teal-900'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.username}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className={`w-12 h-12 ${toColorClass(user.username)} rounded-2xl flex items-center justify-center text-white font-black shrink-0`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left overflow-hidden">
                <h4 className="font-bold text-sm dark:text-white truncate">{user.username}</h4>
                <p className="text-[10px] font-black uppercase text-teal-500">
                  {user.status || 'Verified'}
                </p>
              </div>
              {Number(user.unread_count || 0) > 0 && (
                <span className="ml-auto min-w-[22px] h-[22px] px-2 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center">
                  {user.unread_count > 99 ? '99+' : user.unread_count}
                </span>
              )}
            </button>
          ))}
          {!loadingUsers && filteredParticipants.length === 0 && (
            <p className="text-center text-slate-400 text-xs mt-10 italic">No direct chats. Search a user to start.</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 min-h-0">
        <div className={`lg:hidden px-4 pt-4 pb-3 border-b dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3 ${showMobileInbox ? 'block' : 'hidden'}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Messages</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Inbox</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 py-3 pl-12 pr-4 rounded-2xl text-sm outline-none border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
          {messageRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">Requests</p>
              {messageRequests.map((req) => (
                <div key={`mobile-req-${req.sender_username}`} className="p-4 rounded-[24px] bg-amber-50/90 border border-amber-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{req.sender_username}</p>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{req.latest_text || 'Sent you a message request.'}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white text-[10px] font-black uppercase tracking-wider text-amber-600">New</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleMessageRequestAction(req.sender_username, 'accept')}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleMessageRequestAction(req.sender_username, 'reject')}
                      className="flex-1 py-2.5 rounded-xl bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              {searchTerm.trim() ? 'Search Results' : 'Chats'}
            </p>
            {mobileInboxUsers.map((user) => (
              <button
                key={`mobile-user-${user._id || user.username}`}
                onClick={() => {
                  setSelectedUser(user);
                  setParticipants((prev) =>
                    prev.map((p) => (p.username === user.username ? { ...p, unread_count: 0 } : p))
                  );
                }}
                className="w-full p-4 rounded-[24px] text-left border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/70 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  {user.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt={user.username}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className={`w-12 h-12 ${toColorClass(user.username)} rounded-2xl flex items-center justify-center text-white font-black shrink-0`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-sm dark:text-white truncate">{user.username}</p>
                      <NotificationBadge count={Number(user.unread_count || 0)} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-teal-500">{user.status || 'Verified'}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300 truncate">
                      {user.latest_text || (searchTerm.trim() ? 'Tap to open chat' : 'Open conversation')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {!loadingUsers && mobileInboxUsers.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 px-4 py-8 text-center">
                <p className="text-sm font-black text-slate-500 dark:text-slate-300">
                  {searchTerm.trim() ? 'No users found for this search.' : 'No chats yet. Search a user to start a conversation.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={`p-4 sm:p-5 lg:p-6 border-b dark:border-slate-800 flex justify-between items-center gap-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md ${showMobileInbox ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="lg:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-200"
              title="Back to inbox"
            >
              <ChevronLeft size={18} />
            </button>
            <div className={`w-12 h-12 ${activeColor} rounded-2xl flex items-center justify-center text-white`}>
              <User size={24} />
            </div>
            <div>
              <h3 className="font-black dark:text-white flex items-center gap-2">
                {activeName} <Shield size={14} className="text-teal-500" />
              </h3>
              <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">
                {selectedUser ? (selectedUser.status || 'Verified') : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => startCall('audio')}
              disabled={!selectedUser || callState.status === 'calling' || callState.status === 'connected'}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 disabled:opacity-40"
              title="Start audio call"
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => startCall('video')}
              disabled={!selectedUser || callState.status === 'calling' || callState.status === 'connected'}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 disabled:opacity-40"
              title="Start video call"
            >
              <Video size={18} />
            </button>
            <button className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        <div ref={threadRef} className={`flex-1 overflow-y-auto p-4 sm:p-5 lg:p-8 space-y-4 lg:space-y-6 custom-scrollbar ${showMobileInbox ? 'hidden lg:block' : 'block'}`}>
          {!selectedUser && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-70">
              <MessageSquare size={48} className="mb-2" />
              <p className="font-bold">Select a user to start chatting</p>
            </div>
          )}

          {selectedUser && loadingMessages && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-70">
              <p className="font-bold">Loading messages...</p>
            </div>
          )}

          {selectedUser && !loadingMessages && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-70">
              <MessageSquare size={48} className="mb-2" />
              <p className="font-bold">No messages yet with {selectedUser.username}</p>
            </div>
          )}

          {selectedUser && messages.map((msg) => {
            const isMine = msg.sender_username === currentUsername;
            const isUnreadIncoming = !isMine && msg.read_by_receiver !== true;
            const mineStatus = msg.read_by_receiver === true ? 'Read' : 'Delivered';
            const isSharedListing = msg.message_type === 'listing_share' && msg.shared_listing?.listing_id;
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="group flex items-end gap-2 max-w-[88%] sm:max-w-[78%] lg:max-w-[70%]">
                  {isMine && (
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100"
                      title="Delete message"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (isUnreadIncoming) handleReadSingleMessage(msg._id);
                    }}
                    className={`${isMine ? 'bg-teal-500 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-tl-none'} ${
                      isUnreadIncoming ? 'ring-2 ring-rose-300/80 dark:ring-rose-700/70' : ''
                    } p-4 rounded-[22px] text-sm shadow-sm text-left`}
                    title={isUnreadIncoming ? 'Tap to mark as read' : undefined}
                  >
                    {isSharedListing ? (
                      <div className="space-y-2">
                        <p className="font-black text-xs uppercase tracking-widest opacity-80">Shared Listing</p>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/explore', { state: { openListingId: String(msg.shared_listing.listing_id) } });
                          }}
                          className={`rounded-2xl border ${isMine ? 'border-teal-200/50 bg-white/10' : 'border-slate-200 bg-white dark:bg-slate-900'} p-3`}
                        >
                          {msg.shared_listing.image ? (
                            <img src={msg.shared_listing.image} alt={msg.shared_listing.title} className="w-full h-32 object-cover rounded-xl mb-2" />
                          ) : null}
                          <p className={`font-black ${isMine ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{msg.shared_listing.title}</p>
                          <p className={`text-[10px] font-bold uppercase ${isMine ? 'text-white/80' : 'text-slate-500'}`}>
                            {msg.shared_listing.type === 'skill' ? 'Skill' : 'Product'} • {msg.shared_listing.wtk} WTK
                          </p>
                          <p className={`text-[10px] font-bold ${isMine ? 'text-white/80' : 'text-slate-500'}`}>
                            Owner: {msg.shared_listing.owner_username}
                          </p>
                        </div>
                        {msg.text ? <p>{msg.text}</p> : null}
                      </div>
                    ) : (
                      msg.text
                    )}
                    {isMine ? (
                      <p className="text-[9px] mt-1 opacity-70 font-bold text-right">
                        {formatMessageTime(msg.created_at)} • {mineStatus}
                      </p>
                    ) : (
                      <p className="text-[9px] mt-1 opacity-70 font-bold text-left">
                        {formatMessageTime(msg.created_at)}
                      </p>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-4 sm:p-5 lg:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t dark:border-slate-800 ${showMobileInbox ? 'hidden lg:block' : 'block'}`}>
          {sendInfo && (
            <p className="max-w-4xl mx-auto mb-3 text-[11px] font-bold text-amber-600">
              {sendInfo}
            </p>
          )}
          {pendingShareListing && (
            <div className="max-w-4xl mx-auto mb-3 p-3 rounded-2xl border border-teal-200 bg-teal-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">Ready to share</p>
                <p className="font-black text-slate-900 truncate">{pendingShareListing.title}</p>
                <p className="text-[10px] font-bold text-slate-500">
                  {pendingShareListing.type === 'skill' ? 'Skill' : 'Product'} • {pendingShareListing.wtk} WTK
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSendSharedListing}
                  disabled={!selectedUser}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 disabled:opacity-60"
                >
                  Share
                </button>
                <button
                  onClick={() => setPendingShareListing(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 sm:gap-4">
            <div className="flex-1 relative flex items-center">
              <Paperclip size={18} className="absolute left-6 text-slate-400" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedUser ? `Message ${selectedUser.username}...` : 'Select a user first'}
                disabled={!selectedUser}
                className="w-full bg-white dark:bg-slate-800 dark:text-white py-4 sm:py-5 pl-12 sm:pl-14 pr-12 sm:pr-14 rounded-[22px] sm:rounded-[24px] outline-none border dark:border-slate-700 font-bold shadow-sm focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-60"
              />
              <Smile size={18} className="absolute right-6 text-slate-400" />
            </div>
            <button
              type="submit"
              disabled={!selectedUser || !input.trim()}
              className="bg-teal-500 hover:bg-teal-600 text-white p-4 sm:p-5 rounded-[20px] sm:rounded-[22px] shadow-lg active:scale-95 transition-all disabled:opacity-60 shrink-0"
            >
              <Send size={24} />
            </button>
          </form>
        </div>
      </div>

      {(callState.status === 'incoming' || callState.status === 'calling' || callState.status === 'connected') && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-[28px] lg:rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">
                  {callState.type === 'video' ? 'Video Call' : 'Audio Call'}
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {callState.status === 'incoming'
                    ? `${callState.incomingFrom} is calling`
                    : `${callState.withUser || selectedUser?.username || 'Connecting'} call`}
                </h3>
                {callError && <p className="text-sm font-bold text-rose-600 mt-1">{callError}</p>}
              </div>
              <button onClick={() => endCall(callState.status === 'incoming' ? 'reject' : 'hangup')} className="p-3 rounded-2xl bg-rose-500 text-white">
                <PhoneOff size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[28px] bg-slate-950 overflow-hidden min-h-[220px] flex items-center justify-center">
                <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${callState.type === 'audio' ? 'hidden' : 'block'}`} />
                {callState.type === 'audio' && <p className="text-white font-black">Audio call in progress</p>}
              </div>
              <div className="rounded-[28px] bg-slate-100 dark:bg-slate-800 overflow-hidden min-h-[220px] flex items-center justify-center">
                <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${callState.type === 'audio' ? 'hidden' : 'block'}`} />
                {callState.type === 'audio' && <p className="text-slate-500 dark:text-slate-300 font-black">Your microphone is live</p>}
              </div>
            </div>
            {callState.status === 'incoming' && (
              <div className="mt-5 flex gap-3 justify-end">
                <button onClick={() => endCall('reject')} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black">Reject</button>
                <button onClick={acceptIncomingCall} className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black">Accept</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

