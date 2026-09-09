import React, { useState, useEffect, useContext } from 'react';
import api, { API_URL } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
    FileText, Download, Globe, User, RefreshCw, File, Shield,
    Search, Filter, CheckCircle2, Bookmark
} from 'lucide-react';

const DocumentsPage = () => {
    const { user } = useContext(AuthContext);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/documents');
            setDocuments(res.data || []);
        } catch (e) {
            console.error('Failed to fetch documents:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (doc) => {
        try {
            const token = localStorage.getItem('token');
            const downloadUrl = `${API_URL}/documents/download/${doc._id || doc.id}?token=${token || ''}`;
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', doc.attachment_name || `${doc.title}.txt`);
            link.setAttribute('target', '_blank');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert('Failed to download document');
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (doc.content || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', ...new Set(documents.map(d => d.category).filter(Boolean))];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span>Company Documents & Repository</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Access official company policies, appointment letters, operational circulars, and confidential notices.
                    </p>
                </div>
                <button
                    onClick={fetchDocuments}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-all"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh List</span>
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-2 flex-1 max-w-md bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search documents by title or keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-xs text-gray-800 outline-none w-full"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                                selectedCategory === cat
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
                <div className="py-16 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-200/80 text-center text-gray-400 space-y-2">
                    <File className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="text-base font-bold text-gray-700">No Documents Found</h3>
                    <p className="text-xs text-gray-400">No company documents match your current filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDocs.map(doc => (
                        <div key={doc._id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4 hover:border-indigo-200 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                            {doc.category || 'Policy'}
                                        </span>
                                        {doc.target_type === 'specific' ? (
                                            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                                                <User className="w-2.5 h-2.5" />
                                                <span>Personal / Confidential</span>
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                                <Globe className="w-2.5 h-2.5" />
                                                <span>Company-Wide</span>
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400 shrink-0">{doc.date || doc.updatedAt}</span>
                                </div>

                                <h3 className="text-base font-bold text-gray-900">{doc.title}</h3>

                                {doc.content && (
                                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                        {doc.content}
                                    </p>
                                )}

                                {/* Attachment Card */}
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                                            <File className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">
                                                {doc.attachment_name || `${doc.title}.txt`}
                                            </p>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                {doc.attachment_size || 'Attached File'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(doc)}
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download</span>
                                    </button>
                                </div>
                            </div>

                            {doc.created_by && (
                                <div className="text-[10px] text-gray-400 font-mono pt-2 border-t border-gray-100 flex items-center justify-between">
                                    <span>Issued By: <strong className="text-gray-700">{doc.created_by}</strong></span>
                                    <span className="text-indigo-600 font-semibold">Verified Circular</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
