import React, { useState, useEffect, useRef } from 'react';
import { User, ConferenceGroup, ConferenceMessage } from '../types';
import { db, storage } from '../firebase';
import { ref, onValue, push, set, remove, update, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Users, MessageSquare, Plus, X, Send, Search, UserPlus, Paperclip, File, Download, Trash2, Loader2, Edit2, MoreVertical, ChevronLeft } from 'lucide-react';
import imageCompression from 'browser-image-compression';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ConferenceProps {
  currentUser: User;
  allUsers: User[];
}

export const Conference: React.FC<ConferenceProps> = ({ currentUser, allUsers }) => {
  const [groups, setGroups] = useState<ConferenceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConferenceMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [membersToAdd, setMembersToAdd] = useState<string[]>([]);
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine eligible members based on role
  const eligibleMembers = React.useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') {
      return allUsers.filter(u => u.id !== currentUser.id);
    } else if (currentUser.role === 'HEALTH_SECTION') {
      // Palika user sees all ADMINs under them
      return allUsers.filter(u => u.role === 'ADMIN' && u.parentId === currentUser.id);
    } else if (currentUser.role === 'ADMIN') {
      // Admin sees all users in their organization
      return allUsers.filter(u => u.organizationName === currentUser.organizationName && u.id !== currentUser.id);
    }
    return [];
  }, [allUsers, currentUser]);

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return eligibleMembers;
    const lowerQuery = searchQuery.toLowerCase();
    return eligibleMembers.filter(m => 
      m.fullName.toLowerCase().includes(lowerQuery) || 
      m.organizationName.toLowerCase().includes(lowerQuery) ||
      m.designation.toLowerCase().includes(lowerQuery)
    );
  }, [eligibleMembers, searchQuery]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const eligibleToAdd = React.useMemo(() => {
    if (!selectedGroup) return [];
    return eligibleMembers.filter(m => !selectedGroup.members.includes(m.id));
  }, [eligibleMembers, selectedGroup]);

  const filteredEligibleToAdd = React.useMemo(() => {
    if (!addMemberSearchQuery.trim()) return eligibleToAdd;
    const lowerQuery = addMemberSearchQuery.toLowerCase();
    return eligibleToAdd.filter(m => 
      m.fullName.toLowerCase().includes(lowerQuery) || 
      m.organizationName.toLowerCase().includes(lowerQuery) ||
      m.designation.toLowerCase().includes(lowerQuery)
    );
  }, [eligibleToAdd, addMemberSearchQuery]);

  const canCreateGroup = currentUser.role === 'HEALTH_SECTION' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  useEffect(() => {
    const groupsRef = ref(db, 'conferenceGroups');
    const unsub = onValue(groupsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const groupList = Object.keys(data).map(key => ({ ...data[key], id: key })) as ConferenceGroup[];
        // Filter groups where current user is a member
        const myGroups = groupList.filter(g => g.members?.includes(currentUser.id));
        setGroups(myGroups);
      } else {
        setGroups([]);
      }
    });
    return () => unsub();
  }, [currentUser.id]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }
    setShowGroupMembers(false);
    
    // Clear unread status
    remove(ref(db, `conferenceUnread/${currentUser.id}/${selectedGroupId}`));

    const messagesRef = ref(db, `conferenceMessages/${selectedGroupId}`);
    const unsub = onValue(messagesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const msgList = Object.keys(data).map(key => ({ ...data[key], id: key })) as ConferenceMessage[];
        msgList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(msgList);
        // Clear unread status when new messages arrive while viewing the group
        remove(ref(db, `conferenceUnread/${currentUser.id}/${selectedGroupId}`));
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [selectedGroupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembers.length === 0) {
      alert('कृपया समूहको नाम र कम्तिमा एक सदस्य चयन गर्नुहोस्।');
      return;
    }

    const groupRef = push(ref(db, 'conferenceGroups'));
    const newGroup: Omit<ConferenceGroup, 'id'> = {
      name: newGroupName.trim(),
      createdBy: currentUser.id,
      members: [currentUser.id, ...selectedMembers],
      createdAt: new Date().toISOString()
    };

    await set(groupRef, newGroup);
    setShowCreateGroup(false);
    setNewGroupName('');
    setSelectedMembers([]);
    setSelectedGroupId(groupRef.key);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedGroupId || isUploading) return;

    if (editingMessageId) {
      // Handle Edit
      const msgRef = ref(db, `conferenceMessages/${selectedGroupId}/${editingMessageId}`);
      await update(msgRef, {
        text: newMessage.trim(),
        isEdited: true
      });
      setNewMessage('');
      setEditingMessageId(null);
      return;
    }

    let fileUrl = '';
    let fileName = '';
    let fileType = '';

    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        let fileToUpload = selectedFile;
        
        // Compress image if it's an image
        if (selectedFile.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          fileToUpload = await imageCompression(selectedFile, options);
        }

        const fileRef = storageRef(storage, `conferenceFiles/${selectedGroupId}/${Date.now()}_${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(fileRef, fileToUpload);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(Math.round(progress));
            }, 
            (error) => reject(error), 
            () => resolve()
          );
        });

        fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
        fileName = fileToUpload.name;
        fileType = fileToUpload.type;
      } catch (error) {
        console.error("Error uploading file:", error);
        alert("फाइल अपलोड गर्न समस्या भयो।");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
    }

    const msgRef = push(ref(db, `conferenceMessages/${selectedGroupId}`));
    const msg: Omit<ConferenceMessage, 'id'> = {
      groupId: selectedGroupId,
      senderId: currentUser.id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      ...(fileUrl && { fileUrl, fileName, fileType })
    };

    await set(msgRef, msg);
    
    // Update unread counts for all other members
    if (selectedGroup && selectedGroup.members) {
      const updates: any = {};
      selectedGroup.members.forEach(memberId => {
        if (memberId !== currentUser.id) {
          // We'll just increment a counter or set a flag.
          // Since we can't easily increment without a transaction, we can just set it to true or a timestamp.
          // Let's store the timestamp of the last unread message.
          updates[`conferenceUnread/${memberId}/${selectedGroupId}`] = serverTimestamp();
        }
      });
      await update(ref(db), updates);
    }

    setNewMessage('');
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleEditMessage = (msg: ConferenceMessage) => {
    setEditingMessageId(msg.id);
    setNewMessage(msg.text);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedFile(null);
  };

  const handleDeleteMessage = async (msg: ConferenceMessage) => {
    if (!window.confirm('के तपाईं पक्का यो सन्देश मेटाउन चाहनुहुन्छ?')) return;
    
    try {
      if (msg.fileUrl) {
        // Try to delete file from storage if possible
        try {
          const fileRef = storageRef(storage, msg.fileUrl);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.error("Could not delete file from storage:", storageErr);
        }
      }
      await remove(ref(db, `conferenceMessages/${msg.groupId}/${msg.id}`));
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("सन्देश मेटाउन समस्या भयो।");
    }
  };

  const handleDownload = async (url: string, filename: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed, opening in new tab", error);
      window.open(url, '_blank');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;
    if (window.confirm('के तपाईं पक्का यो सदस्यलाई समूहबाट हटाउन चाहनुहुन्छ?')) {
      const updatedMembers = selectedGroup.members.filter(id => id !== memberId);
      await set(ref(db, `conferenceGroups/${selectedGroup.id}/members`), updatedMembers);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('फाइल ५MB भन्दा सानो हुनुपर्छ।');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleAddMembersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || membersToAdd.length === 0) return;
    
    const updatedMembers = [...selectedGroup.members, ...membersToAdd];
    await set(ref(db, `conferenceGroups/${selectedGroup.id}/members`), updatedMembers);
    
    setShowAddMember(false);
    setMembersToAdd([]);
    setAddMemberSearchQuery('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className={`border-r border-slate-200 flex flex-col bg-slate-50 ${selectedGroupId ? 'hidden md:flex md:w-1/3' : 'w-full md:w-1/3'}`}>
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-indigo-600" />
            कन्फरेन्स समूहहरू
          </h2>
          {canCreateGroup && (
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
              title="नयाँ समूह बनाउनुहोस्"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {groups.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              कुनै समूह छैन।
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${selectedGroupId === group.id ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${selectedGroupId === group.id ? 'bg-indigo-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold truncate">{group.name}</div>
                  <div className="text-xs opacity-70 truncate">{group.members.length} सदस्यहरू</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedGroupId ? 'hidden md:flex' : 'flex'}`}>
        {selectedGroup ? (
          <>
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-1 sm:gap-3">
                <button 
                  onClick={() => setSelectedGroupId(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronLeft size={24} />
                </button>
                <div 
                  className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-slate-50 p-1 sm:p-2 rounded-lg transition-colors"
                  onClick={() => setShowGroupMembers(!showGroupMembers)}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                    {selectedGroup.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">{selectedGroup.name}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                      {`${selectedGroup.members.length} सदस्यहरू (हेर्न क्लिक गर्नुहोस्)`}
                    </p>
                  </div>
                </div>
              </div>
              {canCreateGroup && (
                <button 
                  onClick={() => setShowAddMember(true)}
                  className="p-1.5 sm:p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold shrink-0"
                >
                  <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">सदस्य थप्नुहोस्</span>
                </button>
              )}
            </div>

            {showGroupMembers && (
              <div className="bg-white border-b border-slate-200 p-4 max-h-48 overflow-y-auto shadow-inner">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">समूहका सदस्यहरू</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedGroup.members.map(mId => {
                    const member = allUsers.find(u => u.id === mId);
                    if (!member) return null;
                    const isCreator = selectedGroup.createdBy === currentUser.id;
                    const canRemove = canCreateGroup && (isCreator || currentUser.role === 'SUPER_ADMIN') && member.id !== currentUser.id;
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-sm font-medium text-slate-800 truncate">{member.fullName}</div>
                            <div className="text-[10px] text-slate-500 truncate">{member.designation}</div>
                          </div>
                        </div>
                        {canRemove && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMember(member.id);
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                            title="हटाउनुहोस्"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                const sender = allUsers.find(u => u.id === msg.senderId);
                const isImage = msg.fileType?.startsWith('image/');
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                      {!isMe && <div className="text-[10px] font-bold text-indigo-600 mb-1">{sender?.fullName || 'Unknown'}</div>}
                      
                      {msg.fileUrl && (
                        <div className="mb-2 mt-1">
                          {isImage ? (
                            <div className="relative group/image inline-block">
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={msg.fileUrl} alt="attachment" className="max-w-full h-auto rounded-lg border border-white/20 max-h-48 object-contain bg-black/5" />
                              </a>
                              <button
                                onClick={(e) => handleDownload(msg.fileUrl!, msg.fileName || 'image', e)}
                                className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"
                                title="डाउनलोड गर्नुहोस्"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => handleDownload(msg.fileUrl!, msg.fileName || 'document', e)}
                              className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-indigo-700 hover:bg-indigo-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'} transition-colors text-sm w-full text-left`}
                            >
                              <File size={16} className="shrink-0" />
                              <span className="truncate max-w-[200px]">{msg.fileName || 'Document'}</span>
                              <Download size={14} className="shrink-0 ml-1" />
                            </button>
                          )}
                        </div>
                      )}
                      
                      {msg.text && <div className="text-sm whitespace-pre-wrap">{msg.text}</div>}
                      
                      <div className={`text-[10px] mt-1 flex items-center justify-between gap-3 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                        <div className="flex items-center gap-2">
                          {isMe && (
                            <>
                              <button 
                                onClick={() => handleEditMessage(msg)}
                                className="hover:text-white transition-colors"
                                title="सम्पादन गर्नुहोस्"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => handleDeleteMessage(msg)}
                                className="hover:text-red-300 transition-colors"
                                title="मेटाउनुहोस्"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {msg.isEdited && <span>(सम्पादन गरिएको)</span>}
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 sm:p-4 bg-white border-t border-slate-200">
              {editingMessageId && (
                <div className="mb-2 sm:mb-3 flex items-center justify-between bg-amber-50 text-amber-800 p-2 rounded-lg text-xs sm:text-sm border border-amber-200">
                  <div className="flex items-center gap-2">
                    <Edit2 size={14} className="sm:w-4 sm:h-4" />
                    <span>सन्देश सम्पादन गर्दै...</span>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingMessageId(null);
                      setNewMessage('');
                    }}
                    className="p-1 hover:bg-amber-200 rounded-md transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {selectedFile && !editingMessageId && (
                <div className="mb-2 sm:mb-3 flex flex-col gap-2 bg-indigo-50 text-indigo-800 p-2 rounded-lg text-xs sm:text-sm border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <File size={14} className="sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate flex-1">{selectedFile.name}</span>
                    {!isUploading && (
                      <button 
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 hover:bg-indigo-200 rounded-md transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {isUploading && (
                    <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-1">
                      <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-1 sm:gap-2 items-center">
                {!editingMessageId && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 sm:p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                    title="फाइल पठाउनुहोस्"
                  >
                    <Paperclip size={18} className="sm:w-5 sm:h-5" />
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="सन्देश लेख्नुहोस्..."
                  className="flex-1 min-w-0 border border-slate-300 rounded-xl px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  className="bg-indigo-600 text-white p-2 sm:p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin sm:w-5 sm:h-5" /> : <Send size={18} className="sm:w-5 sm:h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={64} className="mb-4 opacity-20" />
            <p>च्याट सुरु गर्न समूह चयन गर्नुहोस्</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateGroup(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
            <div className="p-6 border-b bg-indigo-50 text-indigo-800 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Users size={20} /> नयाँ समूह बनाउनुहोस्</h3>
              <button onClick={() => setShowCreateGroup(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">समूहको नाम</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="जस्तै: स्वास्थ्य शाखा टिम"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">सदस्यहरू चयन गर्नुहोस्</label>
                
                <div className="mb-3 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="नाम, संस्था वा पदबाट खोज्नुहोस्..."
                    className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">कुनै सदस्य फेला परेन।</div>
                  ) : (
                    filteredMembers.map(member => (
                      <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, member.id]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-800">{member.fullName}</div>
                          <div className="text-xs text-slate-500">{member.organizationName} - {member.designation}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateGroup(false)} className="px-6 py-2 text-slate-500 font-bold">रद्द</button>
                <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg">बनाउनुहोस्</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAddMember(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
            <div className="p-6 border-b bg-indigo-50 text-indigo-800 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><UserPlus size={20} /> सदस्य थप्नुहोस्</h3>
              <button onClick={() => setShowAddMember(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddMembersSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">नयाँ सदस्यहरू चयन गर्नुहोस्</label>
                
                <div className="mb-3 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={addMemberSearchQuery}
                    onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                    placeholder="नाम, संस्था वा पदबाट खोज्नुहोस्..."
                    className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y">
                  {filteredEligibleToAdd.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">थप्नको लागि कुनै नयाँ सदस्य फेला परेन।</div>
                  ) : (
                    filteredEligibleToAdd.map(member => (
                      <label key={member.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={membersToAdd.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMembersToAdd([...membersToAdd, member.id]);
                            } else {
                              setMembersToAdd(membersToAdd.filter(id => id !== member.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-800">{member.fullName}</div>
                          <div className="text-xs text-slate-500">{member.organizationName} - {member.designation}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddMember(false)} className="px-6 py-2 text-slate-500 font-bold">रद्द</button>
                <button type="submit" disabled={membersToAdd.length === 0} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg disabled:opacity-50">थप्नुहोस्</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
