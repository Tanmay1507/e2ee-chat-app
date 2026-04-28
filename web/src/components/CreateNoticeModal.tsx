'use client';

import { useState, useRef } from 'react';
import { X, Bell, FileText, Upload } from 'lucide-react';

interface CreateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (heading: string, description: string, attachment?: { name: string, data: string }) => void;
}

export default function CreateNoticeModal({ isOpen, onClose, onCreate }: CreateNoticeModalProps) {
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<{ name: string, data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFile({
          name: selectedFile.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heading.trim() && description.trim()) {
      onCreate(heading.trim(), description.trim(), file || undefined);
      setHeading('');
      setDescription('');
      setFile(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-wa-header px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2 text-wa-accent">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Create Group Notice</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:bg-slate-200 p-1 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">
                Heading
              </label>
              <span className={`text-[10px] ${heading.length > 140 ? 'text-red-500' : 'text-slate-400'}`}>
                {heading.length}/150
              </span>
            </div>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value.slice(0, 150))}
              placeholder="e.g. Important Announcement"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-wa-accent focus:border-transparent outline-none transition-all"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details here..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-wa-accent focus:border-transparent outline-none transition-all resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attachment (Optional PDF)
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:border-wa-accent transition-colors"
            >
              <div className="space-y-1 text-center">
                {file ? (
                  <div className="flex flex-col items-center">
                    <FileText className="mx-auto h-10 w-10 text-wa-accent" />
                    <span className="text-sm text-slate-600 mt-2">{file.name}</span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-red-500 mt-1 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="flex text-sm text-slate-600">
                      <span className="relative cursor-pointer font-medium text-wa-accent hover:text-[#008f6f]">
                        Upload a file
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      PDF up to 2MB
                    </p>
                  </>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!heading.trim() || !description.trim()}
              className="px-6 py-2 bg-wa-accent text-white font-medium rounded-lg hover:bg-[#008f6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Post Notice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
