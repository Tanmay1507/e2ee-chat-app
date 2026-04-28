'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, User, Shield, Trash2, UserPlus, Save, Edit2, ArrowLeft, Camera } from 'lucide-react';
import { Group } from '@/hooks/useChat';

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser: string;
  onUpdateGroup: (id: string, name: string, description: string) => Promise<boolean>;
  onRemoveMember: (groupId: string, username: string) => Promise<boolean>;
  onAddMember: (groupId: string, username: string) => Promise<boolean>;
  onUpdateMemberRole: (groupId: string, username: string, role: 'admin' | 'member') => Promise<boolean>;
  onDeleteGroup?: (groupId: string) => Promise<boolean>;
  allUsers: { username: string }[];
}

const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({ 
  isOpen, onClose, group, currentUser, onUpdateGroup, onRemoveMember, onAddMember, onUpdateMemberRole, onDeleteGroup, allUsers 
}) => {
  const [members, setMembers] = useState<{username: string, role: string}[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const [editedDesc, setEditedDesc] = useState(group.description || '');
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const isAdmin = group.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setEditedName(group.name);
      setEditedDesc(group.description || '');
    }
  }, [isOpen, group]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/members`);
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members');
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    const success = await onUpdateGroup(group.id, editedName, editedDesc);
    if (success) setIsEditing(false);
    setLoading(false);
  };

  const handleAddMember = async (username: string) => {
    setLoading(true);
    const success = await onAddMember(group.id, username);
    if (success) {
      fetchMembers();
      setIsAddingMember(false);
    } else {
      alert('Failed to add member.');
    }
    setLoading(false);
  };

  const handleRemoveMember = async (username: string) => {
    if (confirm(`Are you sure you want to remove ${username} from the group?`)) {
      setLoading(true);
      const success = await onRemoveMember(group.id, username);
      if (success) fetchMembers();
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (username: string) => {
    if (confirm(`Make ${username} a group admin?`)) {
      setLoading(true);
      const success = await onUpdateMemberRole(group.id, username, 'admin');
      if (success) fetchMembers();
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (confirm(`⚠️ CRITICAL: Are you sure you want to PERMANENTLY DELETE the group "${group.name}"? This action cannot be undone.`)) {
      setLoading(true);
      if (onDeleteGroup) {
        const success = await onDeleteGroup(group.id);
        if (success) onClose();
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4">
      <div className="bg-[#f0f2f5] w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="h-[60px] px-4 bg-wa-header flex items-center gap-4 shrink-0">
          <button onClick={onClose} className="text-slate-500 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-medium text-slate-900">Group info</h2>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {/* Hero Section */}
          <div className="bg-white p-6 flex flex-col items-center border-b border-slate-100 shadow-sm mb-2">
            <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center relative mb-4 group cursor-pointer">
              <Users className="w-16 h-16 text-slate-400" />
              {isAdmin && (
                <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            
            {isEditing ? (
              <div className="w-full space-y-4">
                <input 
                  value={editedName} 
                  onChange={e => setEditedName(e.target.value)}
                  className="w-full text-center p-2 border-b-2 border-wa-accent focus:outline-none bg-transparent font-medium text-lg"
                  placeholder="Group name"
                  autoFocus
                />
                <textarea 
                  value={editedDesc} 
                  onChange={e => setEditedDesc(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-wa-accent bg-slate-50"
                  placeholder="Add group description"
                />
                <div className="flex gap-2 justify-center">
                  <button 
                    disabled={loading}
                    onClick={handleUpdate}
                    className="bg-wa-accent text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    {loading ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2 text-slate-600 text-sm font-medium hover:bg-slate-50 rounded-full transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center w-full">
                <div className="flex items-center justify-center gap-2 group">
                  <h1 className="text-2xl font-normal text-slate-900">{group.name}</h1>
                  {isAdmin && (
                    <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-wa-accent sm:opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Group • {members.length} members
                </p>
              </div>
            )}
          </div>

          {/* Description Section */}
          {!isEditing && (
            <div className="bg-white p-6 border-b border-slate-100 mb-2">
              <p className="text-slate-600 text-sm leading-relaxed">
                {group.description || 'Add group description'}
              </p>
              <p className="text-[11px] text-slate-400 mt-4 uppercase tracking-wider font-medium">
                Created by {group.creatorUsername}
              </p>
            </div>
          )}

          {/* Members List Section */}
          <div className="bg-white pt-4 pb-6">
            <div className="px-6 py-2 flex items-center justify-between">
              <h3 className="text-wa-accent text-sm font-medium uppercase tracking-wide">
                {members.length} members
              </h3>
            </div>
             
             <div className="divide-y divide-slate-50">
                {isAdmin && (
                  <div 
                    className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors" 
                    onClick={() => setIsAddingMember(!isAddingMember)}
                  >
                    <div className="w-10 h-10 rounded-full bg-wa-accent flex items-center justify-center">
                      {isAddingMember ? <X className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{isAddingMember ? 'Close selection' : 'Add members'}</span>
                  </div>
                )}

                {isAddingMember && (
                  <div className="bg-slate-50 px-6 py-4 max-h-[300px] overflow-y-auto">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-3">Select personnel to add</p>
                    <div className="space-y-2">
                      {allUsers
                        .filter(u => !members.some(m => m.username.toLowerCase() === u.username.toLowerCase()))
                        .map(u => (
                          <button
                            key={u.username}
                            onClick={() => handleAddMember(u.username)}
                            disabled={loading}
                            className="w-full flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 hover:border-wa-accent transition-all group/btn"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-400" />
                              </div>
                              <span className="text-sm font-medium text-slate-700">{u.username}</span>
                            </div>
                            <UserPlus className="w-4 h-4 text-wa-accent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </button>
                        ))
                      }
                      {allUsers.filter(u => !members.some(m => m.username.toLowerCase() === u.username.toLowerCase())).length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-4">No more personnel to add.</p>
                      )}
                    </div>
                  </div>
                )}

                {members.map(m => (
                  <div key={m.username} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{m.username === currentUser ? 'You' : m.username}</span>
                        {m.username === group.creatorUsername && (
                           <span className="text-[10px] text-slate-400 italic">Group Creator</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {m.role === 'admin' && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 font-medium">
                          Admin
                        </span>
                      )}
                      {isAdmin && m.username.toLowerCase() !== currentUser.toLowerCase() && (
                        <div className="flex items-center gap-1">
                          {m.role !== 'admin' && (
                            <button 
                              onClick={() => handlePromoteToAdmin(m.username)}
                              className="p-1.5 text-wa-accent hover:bg-wa-accent/10 rounded-full transition-all"
                              title="Make Admin"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleRemoveMember(m.username)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-full transition-all"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {isAdmin && (
            <div className="bg-white border-t border-slate-100 p-2">
              <button 
                onClick={handleDeleteGroup}
                disabled={loading}
                className="w-full py-4 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 transition-colors font-medium text-sm"
              >
                <Trash2 className="w-5 h-5" />
                Delete Group
              </button>
            </div>
          )}

          {/* Encryption Footer */}
          <div className="bg-white p-6 flex items-start gap-4 text-slate-400">
             <Shield className="w-5 h-5 shrink-0 mt-0.5" />
             <p className="text-[12px] leading-snug">
               Messages and calls are end-to-end encrypted. No one outside of this chat, not even the server, can read or listen to them.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailsModal;
