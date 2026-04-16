
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { ref, onValue, push, set, serverTimestamp, off } from "firebase/database";
import { User, ChatGroup, ChatMessage } from '../types';
import { Send, Users, Plus, MessageSquare, X, Search, UserPlus, Loader2 } from 'lucide-react';

interface ChatRoomProps {
  currentUser: User;
  allUsers: User[];
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, allUsers }) => {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch groups where user is a member
  useEffect(() => {
    const groupsRef = ref(db, 'chats/groups');
    const unsub = onValue(groupsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const groupList = Object.keys(data)
          .map(key => ({ ...data[key], id: key }))
          .filter(g => g.members && g.members.includes(currentUser.id));
        setGroups(groupList.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)));
      } else {
        setGroups([]);
      }
    });
    return () => off(groupsRef, 'value', unsub);
  }, [currentUser.id]);

  // Fetch messages for active group
  useEffect(() => {
    if (!activeGroupId) {
      setMessages([]);
      return;
    }
    const messagesRef = ref(db, `chats/messages/${activeGroupId}`);
    const unsub = onValue(messagesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const msgList = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setMessages(msgList.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });
    return () => off(messagesRef, 'value', unsub);
  }, [activeGroupId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroupId) return;

    const msgRef = ref(db, `chats/messages/${activeGroupId}`);
    const newMsgRef = push(msgRef);
    const msgData: ChatMessage = {
      id: newMsgRef.key as string,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text: newMessage.trim(),
      timestamp: Date.now()
    };

    try {
      await set(newMsgRef, msgData);
      // Update group last message
      await set(ref(db, `chats/groups/${activeGroupId}/lastMessage`), newMessage.trim());
      await set(ref(db, `chats/groups/${activeGroupId}/lastMessageTime`), Date.now());
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length < 2) return;
    setIsCreating(true);

    const groupsRef = ref(db, 'chats/groups');
    const newGroupRef = push(groupsRef);
    const groupData: ChatGroup = {
      id: newGroupRef.key as string,
      name: newGroupName.trim(),
      createdBy: currentUser.id,
      createdAt: Date.now(),
      members: selectedMembers,
      lastMessage: 'Group created',
      lastMessageTime: Date.now()
    };

    try {
      await set(newGroupRef, groupData);
      setShowCreateModal(false);
      setNewGroupName('');
      setSelectedMembers([currentUser.id]);
      setActiveGroupId(groupData.id);
    } catch (err) {
      console.error("Error creating group", err);
    } finally {
      setIsCreating(false);
    }
  };

  const availableUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (u.id === currentUser.id) return false;
      
      // Palika user (HEALTH_SECTION) can add their subordinate admins
      if (currentUser.role === 'HEALTH_SECTION') {
        return u.parentId === currentUser.id && u.role === 'ADMIN';
      }
      
      // Admin user can add their staff
      if (currentUser.role === 'ADMIN') {
        return u.organizationName === currentUser.organizationName && u.id !== currentUser.id;
      }

      // Super admin can add anyone
      if (currentUser.role === 'SUPER_ADMIN') return true;

      // Staff can only be added to groups (they don't create groups by default in this spec, 
      // but let's allow them to see people in their org if they were to create one)
      return u.organizationName === currentUser.organizationName;
    });
  }, [allUsers, currentUser]);

  const filteredUsers = availableUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/30">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary-600" />
              समूह च्याट (Group Chat)
            </h3>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
              title="New Group"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="खोज्नुहोस्..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users size={24} />
              </div>
              <p className="text-sm text-slate-500">कुनै समूह छैन। नयाँ समूह बनाउनुहोस्।</p>
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`w-full p-4 text-left border-b border-slate-100 transition-all hover:bg-white flex items-start gap-3 ${activeGroupId === group.id ? 'bg-white border-l-4 border-l-primary-600 shadow-sm' : ''}`}
              >
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                  <Users size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800 truncate text-sm">{group.name}</h4>
                    {group.lastMessageTime && (
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(group.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{group.lastMessage || 'No messages yet'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeGroupId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{groups.find(g => g.id === activeGroupId)?.name}</h3>
                  <p className="text-xs text-slate-500">{groups.find(g => g.id === activeGroupId)?.members.length} सदस्यहरू</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser.id;
                const showSender = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && showSender && (
                      <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{msg.senderName}</span>
                    )}
                    <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-primary-100' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="सन्देश लेख्नुहोस्..."
                  className="flex-1 px-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-600">च्याट सुरु गर्नुहोस्</h3>
            <p className="text-sm">बायाँ तर्फबाट समूह छान्नुहोस् वा नयाँ समूह बनाउनुहोस्।</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-primary-600" />
                नयाँ समूह बनाउनुहोस्
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">समूहको नाम</label>
                <input 
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="उदा: स्वास्थ्य शाखा टोली"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">सदस्यहरू छान्नुहोस्</label>
                  <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    {selectedMembers.length - 1} Selected
                  </span>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="नाम वा युजरनेम खोज्नुहोस्..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                  {filteredUsers.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400 italic">कुनै प्रयोगकर्ता भेटिएन।</p>
                  ) : (
                    filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={`w-full p-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors ${selectedMembers.includes(user.id) ? 'bg-primary-50/50' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedMembers.includes(user.id) ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {user.fullName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{user.fullName}</p>
                          <p className="text-[10px] text-slate-500">@{user.username} • {user.role}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedMembers.includes(user.id) ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-300'}`}>
                          {selectedMembers.includes(user.id) && <Plus size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
              >
                रद्द
              </button>
              <button 
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMembers.length < 2 || isCreating}
                className="flex-[2] py-3 text-sm font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                समूह बनाउनुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
