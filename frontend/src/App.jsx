import React, { useState, useEffect } from 'react';
import './index.css';

// In production on Vercel, we use the Serverless Function at /api.
// In local development, we default to the local Express backend on port 5000.
const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000';


function App() {
    const [activeTab, setActiveTab] = useState('send');
    const [file, setFile] = useState(null);
    const [code, setCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [receiverCode, setReceiverCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        let timer;
        if (timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && code) {
            setCode('');
            setMessage({ text: 'Code expired!', type: 'error' });
        }
        return () => clearInterval(timer);
    }, [timeLeft, code]);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setMessage({ text: '', type: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setCode(data.code);
                setTimeLeft(data.expiryIn);
                setFile(null);
                setMessage({ text: 'File ready for transfer!', type: 'success' });
            } else {
                setMessage({ text: 'Upload failed.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Server offline or inaccessible.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!receiverCode) return;
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(`${API_URL}/download/${receiverCode}`);
            if (response.ok) {
                // If OK, trigger download
                const downloadUrl = import.meta.env.PROD ? `/api/download/${receiverCode}` : `${API_URL}/download/${receiverCode}`;
                window.open(downloadUrl, '_blank');
                setMessage({ text: 'Download started!', type: 'success' });
            } else {
                const errorText = await response.text();
                setMessage({ text: errorText || 'Invalid or expired code.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Server offline or inaccessible.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="header-section">
                <h1>Portal</h1>
                <p className="subtitle">
                    Secure, anonymous file sharing. Your files are encrypted and automatically deleted after 60 seconds of inactivity.
                </p>
            </div>

            <div className="main-content">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'send' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('send'); setMessage({ text: '', type: '' }); setCode(''); }}
                    >
                        Send File
                    </button>
                    <button
                        className={`tab ${activeTab === 'receive' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('receive'); setMessage({ text: '', type: '' }); setReceiverCode(''); }}
                    >
                        Receive File
                    </button>
                </div>

                {activeTab === 'send' ? (
                    <div className="send-section">
                        {!code ? (
                            <>
                                <label className="upload-zone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}>
                                    <span className="upload-icon">🚀</span>
                                    <p>{file ? file.name : "Drop file here or click to select"}</p>
                                    <input
                                        type="file"
                                        style={{ display: 'none' }}
                                        onChange={(e) => setFile(e.target.files[0])}
                                    />
                                </label>
                                <button
                                    className="btn"
                                    onClick={handleUpload}
                                    disabled={!file || loading}
                                >
                                    {loading ? 'Processing...' : 'Generate Secure Code'}
                                </button>
                            </>
                        ) : (
                            <div className="code-display">
                                <p style={{ color: 'var(--text-muted)' }}>Share code with recipient</p>
                                <div className="code-number">{code}</div>
                                <p className="timer">Available for {timeLeft}s</p>
                                <button className="btn" style={{ marginTop: '2rem' }} onClick={() => setCode('')}>Send Another</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="receive-section">
                        <input
                            type="text"
                            className="input-field"
                            placeholder="000000"
                            maxLength={6}
                            value={receiverCode}
                            onChange={(e) => setReceiverCode(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                            className="btn"
                            onClick={handleDownload}
                            disabled={!receiverCode || loading || receiverCode.length < 6}
                        >
                            {loading ? 'Verifying...' : 'Download Securely'}
                        </button>
                    </div>
                )}

                {message.text && (
                    <div className={`status-msg status-${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
