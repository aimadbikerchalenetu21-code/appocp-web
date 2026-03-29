import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markNotificationRead } from '../services/firestoreService';
import { Bell, CheckCircle, AlertTriangle, Play, ClipboardList } from 'lucide-react';

const ICON_MAP = {
  'check-circle':    { Icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50' },
  'alert-triangle':  { Icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50' },
  'play-circle':     { Icon: Play,          color: 'text-blue-600',   bg: 'bg-blue-50' },
  'clipboard-list':  { Icon: ClipboardList, color: 'text-blue-600',   bg: 'bg-blue-50' },
};

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.uid, setNotifications);
  }, [user]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleRead = async (n) => {
    if (!n.read) await markNotificationRead(n.id);
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter((n) => !n.read).map((n) => markNotificationRead(n.id)));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="rounded-2xl p-5 mb-6 shadow-md flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 60%, #16a34a 100%)' }}>
        <div>
          <h1 className="text-xl font-extrabold text-white">Notifications</h1>
          {unread > 0
            ? <p className="text-green-200 text-sm mt-0.5">{unread} non lue{unread > 1 ? 's' : ''}</p>
            : <p className="text-green-200 text-sm mt-0.5">Toutes lues</p>
          }
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="text-xs font-semibold bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors">
            Tout lire
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <Bell size={44} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const ic = ICON_MAP[n.icon] || { Icon: Bell, color: 'text-gray-400', bg: 'bg-gray-50' };
            return (
              <div key={n.id}
                onClick={() => handleRead(n)}
                className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${
                  n.read ? 'border-gray-100 opacity-70' : 'border-green-200 shadow-md'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ic.bg}`}>
                    <ic.Icon size={18} className={ic.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold truncate ${n.read ? 'text-gray-600' : 'text-gray-800'}`}>{n.title}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0 mt-1" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
