import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCheck, MessageSquareText, BellRing, UserPlus, UserCheck, X } from 'lucide-react';
import { subscribeUserEvents } from '../utils/liveEvents';
import { getApiMessage, toastError, toastSuccess } from '../utils/feedback';

function formatAgo(dateValue) {
  const date = new Date(dateValue);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Just now';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day > 1 ? 's' : ''} ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem('username') || '';
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [listingNotifications, setListingNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!currentUsername) return;
    setLoading(true);
    setError('');
    try {
      const [msgResponse, listingResponse] = await Promise.all([
        fetch(`/api/messages/unread/${encodeURIComponent(currentUsername)}?page=1&limit=50`),
        fetch(`/api/notifications/${encodeURIComponent(currentUsername)}?page=1&limit=50`)
      ]);

      const [msgData, listingData] = await Promise.all([msgResponse.json(), listingResponse.json()]);
      if (msgResponse.ok) {
        const rows = Array.isArray(msgData) ? msgData : Array.isArray(msgData?.items) ? msgData.items : [];
        setMessageNotifications(rows);
      }
      if (listingResponse.ok) {
        const rows = Array.isArray(listingData) ? listingData : Array.isArray(listingData?.items) ? listingData.items : [];
        setListingNotifications(rows);
      }
      if (!msgResponse.ok || !listingResponse.ok) {
        setError(getApiMessage(msgData, getApiMessage(listingData, 'Could not load notifications.')));
      }
    } catch (err) {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [currentUsername]);

  useEffect(() => {
    loadNotifications();
    const unsubscribe = subscribeUserEvents(currentUsername, {
      onEvent: (type) => {
        if (type === 'message_update' || type === 'notification_update') {
          loadNotifications();
        }
      }
    });
    return () => unsubscribe();
  }, [loadNotifications, currentUsername]);

  const groupedMessages = useMemo(() => {
    const map = new Map();
    for (const msg of messageNotifications) {
      const sender = msg.sender_username;
      if (!map.has(sender)) {
        map.set(sender, {
          kind: 'message',
          key: `msg-${sender}`,
          sender,
          latest: msg,
          count: 0,
          created_at: msg.created_at
        });
      }
      const item = map.get(sender);
      item.count += 1;
      if (new Date(msg.created_at).getTime() > new Date(item.latest.created_at).getTime()) {
        item.latest = msg;
        item.created_at = msg.created_at;
      }
    }
    return Array.from(map.values());
  }, [messageNotifications]);

  const listingItems = useMemo(
    () =>
      listingNotifications.map((item) => ({
        kind:
          item.type === 'friend_request'
            ? 'friend_request'
            : item.type === 'friend_accept'
              ? 'friend_accept'
              : item.type === 'message_request'
                ? 'message_request'
              : item.type === 'barter_request'
                ? 'barter_request'
                : item.type === 'barter_accept'
                  ? 'barter_accept'
              : 'listing',
        key: `listing-${item._id}`,
        id: item._id,
        title: item.title,
        message: item.message,
        actor: item.actor_username,
        created_at: item.created_at,
        meta: item.meta || {}
      })),
    [listingNotifications]
  );

  const mergedNotifications = useMemo(
    () =>
      [...groupedMessages, ...listingItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [groupedMessages, listingItems]
  );

  const openThreadFromNotification = async (senderUsername) => {
    if (!currentUsername || !senderUsername) return;
    navigate('/messages', { state: { targetUsername: senderUsername } });
  };

  const openListingNotification = async (notificationId, navigateToProfileUsername = '', meta = {}) => {
    if (!currentUsername || !notificationId) return;
    try {
      await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_username: currentUsername })
      });
      setListingNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (err) {
      // no-op
    }
    if (navigateToProfileUsername) {
      navigate(`/profile/${encodeURIComponent(navigateToProfileUsername)}`);
      return;
    }
    if (meta?.listing_id) {
      navigate('/explore', { state: { openListingId: String(meta.listing_id) } });
      return;
    }
    navigate('/explore');
  };

  const openBarterNotification = async (notificationId, meta = {}) => {
    if (!currentUsername || !notificationId) return;
    try {
      await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_username: currentUsername })
      });
      setListingNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (err) {
      // no-op
    }
    if (meta?.listing_id) {
      navigate('/explore', { state: { openListingId: String(meta.listing_id) } });
      return;
    }
    navigate('/barter-request');
  };

  const openMessageRequestNotification = async (notificationId, senderUsername) => {
    if (!currentUsername || !notificationId || !senderUsername) return;
    try {
      await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_username: currentUsername })
      });
      setListingNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (err) {
      // no-op
    }
    navigate('/messages', { state: { targetUsername: senderUsername } });
  };

  const acceptFriendRequestFromNotification = async (item) => {
    if (!currentUsername || !item?.actor || !item?.id) return;
    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_username: currentUsername,
          requester_username: item.actor
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not accept friend request.'));
        return;
      }

      await fetch(`/api/notifications/${encodeURIComponent(item.id)}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_username: currentUsername })
      });
      setListingNotifications((prev) => prev.filter((n) => n._id !== item.id));
      toastSuccess('Friend request accepted.');
      navigate(`/profile/${encodeURIComponent(item.actor)}`);
    } catch (err) {
      toastError('Could not accept friend request.');
    }
  };

  const rejectFriendRequestFromNotification = async (item) => {
    if (!currentUsername || !item?.actor || !item?.id) return;
    try {
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_username: currentUsername,
          requester_username: item.actor
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not reject friend request.'));
        return;
      }

      await fetch(`/api/notifications/${encodeURIComponent(item.id)}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_username: currentUsername })
      });
      setListingNotifications((prev) => prev.filter((n) => n._id !== item.id));
      toastSuccess('Friend request rejected.');
    } catch (err) {
      toastError('Could not reject friend request.');
    }
  };

  const markAllAsRead = async () => {
    if (!currentUsername) return;
    try {
      await Promise.all([
        fetch(`/api/messages/read-all/${encodeURIComponent(currentUsername)}`, {
          method: 'PATCH'
        }),
        fetch(`/api/notifications/read-all/${encodeURIComponent(currentUsername)}`, {
          method: 'PATCH'
        })
      ]);
      setMessageNotifications([]);
      setListingNotifications([]);
      toastSuccess('All notifications marked as read.');
    } catch (err) {
      toastError('Could not mark all notifications as read.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-6 px-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Notifications</h1>
          <p className="text-slate-500 font-medium">New listings, requests, and unread chats.</p>
        </div>
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-2 text-teal-600 font-bold text-sm hover:underline disabled:opacity-50"
          disabled={mergedNotifications.length === 0}
        >
          <CheckCheck size={18} /> Mark all as read
        </button>
      </div>

      <div className="space-y-4">
        {loading && <p className="text-slate-400 font-medium">Loading notifications...</p>}
        {!loading && error && (
          <div className="bg-rose-50 p-6 rounded-[28px] border border-rose-100 text-center space-y-3">
            <p className="text-rose-600 font-semibold">{error}</p>
            <button
              onClick={loadNotifications}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && mergedNotifications.length === 0 && (
          <div className="bg-white p-8 rounded-[28px] border border-slate-100 text-center text-slate-400 font-semibold">
            No unread notifications.
          </div>
        )}

        {!loading && !error && mergedNotifications.map((item) => {
          if (item.kind === 'message') {
            return (
              <motion.button
                key={item.key}
                onClick={() => openThreadFromNotification(item.sender)}
                whileHover={{ scale: 1.01 }}
                className="w-full text-left bg-white p-6 rounded-[28px] border border-slate-100 flex items-start gap-5 cursor-pointer hover:border-teal-200 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <MessageSquareText size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900">New message from {item.sender}</h4>
                  <p className="text-slate-500 text-sm mt-1 truncate">{item.latest.text}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    {formatAgo(item.latest.created_at)}
                  </div>
                  <div className="mt-2 inline-flex min-w-[22px] h-[22px] px-2 rounded-full bg-rose-500 text-white text-[11px] font-black items-center justify-center">
                    {item.count > 99 ? '99+' : item.count}
                  </div>
                </div>
              </motion.button>
            );
          }

          return (
            <motion.div
              key={item.key}
              onClick={() => {
                if (item.kind === 'message_request') {
                  openMessageRequestNotification(item.id, item.actor);
                  return;
                }
                if (item.kind === 'barter_request' || item.kind === 'barter_accept') {
                  openBarterNotification(item.id, item.meta || {});
                  return;
                }
                openListingNotification(
                  item.id,
                  item.kind === 'friend_accept' || item.kind === 'friend_request' ? item.actor : '',
                  item.meta || {}
                );
              }}
              whileHover={{ scale: 1.01 }}
              className="w-full text-left bg-white p-6 rounded-[28px] border border-slate-100 flex items-start gap-5 cursor-pointer hover:border-teal-200 hover:shadow-lg transition-all"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  item.kind === 'friend_request'
                    ? 'bg-indigo-50 text-indigo-500'
                    : item.kind === 'friend_accept'
                      ? 'bg-emerald-50 text-emerald-500'
                      : item.kind === 'message_request'
                        ? 'bg-cyan-50 text-cyan-600'
                      : item.kind === 'barter_request' || item.kind === 'barter_accept'
                        ? 'bg-sky-50 text-sky-500'
                      : 'bg-orange-50 text-orange-500'
                }`}
              >
                {item.kind === 'friend_request'
                  ? <UserPlus size={22} />
                  : item.kind === 'friend_accept'
                    ? <UserCheck size={22} />
                    : item.kind === 'message_request'
                      ? <MessageSquareText size={22} />
                      : <BellRing size={22} />}
              </div>
              <div className="flex-1">
                <h4 className="font-black text-slate-900">{item.title || 'New Listing Posted'}</h4>
                <p className="text-slate-500 text-sm mt-1 truncate">{item.message}</p>
                {item.kind === 'friend_request' && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptFriendRequestFromNotification(item);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 transition-all"
                    >
                      <UserCheck size={14} /> Accept
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectFriendRequestFromNotification(item);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black hover:bg-rose-100 transition-all border border-rose-200"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {formatAgo(item.created_at)}
                </div>
                <div className="mt-2 inline-flex min-w-[22px] h-[22px] px-2 rounded-full bg-rose-500 text-white text-[11px] font-black items-center justify-center">
                  1
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

