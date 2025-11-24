import React, { useState, useRef } from 'react';
import { EmailTemplate, Recipient, SendLog } from '../types';
import { simulateSendBatch } from '../services/mockBackend';
import { Send, Upload, CheckCircle, AlertTriangle, XCircle, FileText, Download, Users, AlertCircle as AlertIcon } from 'lucide-react';

interface Props {
  template: EmailTemplate;
  onClose: () => void;
}

const EmailSender: React.FC<Props> = ({ template, onClose }) => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sessionLogs, setSessionLogs] = useState<SendLog[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        
        if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validation: Ensure 'email' exists
        if (!headers.includes('email')) throw new Error("CSV header must include 'email' column.");

        const data = lines.slice(1).map(line => {
          // Handle quotes if needed, but simple split for now
          const values = line.split(',').map(v => v.trim());
          const vars: Record<string, string> = {};
          
          headers.forEach((h, i) => {
            if (h !== 'email') vars[h] = values[i] || '';
          });
          
          return { email: values[headers.indexOf('email')], vars } as Recipient;
        });

        const validRecipients = data.filter(r => r.email && r.email.includes('@'));
        setRecipients(validRecipients);
        setCsvError(null);
      } catch (err: any) {
        setCsvError(err.message || "Failed to parse CSV.");
        setRecipients([]);
      }
    };
    reader.readAsText(file);
  };

  const startSending = async () => {
    if (recipients.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setSessionLogs([]);

    await simulateSendBatch(template, recipients, (count, newLogs) => {
      setProgress(Math.round((count / recipients.length) * 100));
      setSessionLogs(prev => [...newLogs, ...prev]);
    });

    setIsProcessing(false);
  };

  const downloadSampleCsv = () => {
    const headers = ['email', ...template.variables];
    const content = `${headers.join(',')}\nuser@example.com,${template.variables.map(v => `ValueFor${v}`).join(',')}`;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${template.title.replace(/\s+/g, '_')}_sample.csv`;
    a.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[85vh] w-full max-w-6xl mx-auto animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Send className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Send Campaign</h2>
            <p className="text-sm text-gray-500">Targeting {recipients.length > 0 ? recipients.length : '0'} recipients with "{template.title}"</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
          <XCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Panel: Inputs */}
        <div className="w-full md:w-1/3 p-6 border-r border-gray-200 flex flex-col gap-6 bg-white overflow-y-auto">
          
          {/* Step 1: Recipients */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">1</span>
                Recipients
              </h3>
              <button onClick={downloadSampleCsv} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                <Download className="w-3 h-3" /> Sample CSV
              </button>
            </div>
            
            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                isProcessing ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'
              }`}
            >
              <Users className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-600">Upload CSV List</span>
              <span className="text-xs text-gray-400 mt-1">Columns: email, {template.variables.join(', ')}</span>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={isProcessing} />
            </div>

            {csvError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex gap-2 items-start">
                <AlertIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {csvError}
              </div>
            )}
            
            {recipients.length > 0 && !csvError && (
              <div className="mt-3 flex items-center justify-between text-sm bg-green-50 text-green-800 p-3 rounded-lg border border-green-100">
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  {recipients.length} recipients ready
                </span>
                <span className="text-xs bg-white px-2 py-1 rounded border border-green-200">
                  {Object.keys(recipients[0].vars).length} vars mapped
                </span>
              </div>
            )}
          </section>

          {/* Step 2: Variables Check */}
          <section className="flex-1">
             <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">2</span>
               Personalization
             </h3>
             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
               <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Required Variables</p>
               <div className="flex flex-wrap gap-2">
                 {template.variables.length > 0 ? (
                   template.variables.map(v => {
                      const isMapped = recipients.length > 0 && Object.keys(recipients[0].vars).includes(v);
                      return (
                        <span 
                          key={v} 
                          className={`px-2 py-1 text-xs rounded border font-mono ${
                            recipients.length === 0 ? 'bg-gray-200 text-gray-600 border-gray-300' : 
                            isMapped ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          {v} {recipients.length > 0 && !isMapped && '(missing)'}
                        </span>
                      );
                   })
                 ) : (
                   <span className="text-gray-400 italic text-sm">No variables in template</span>
                 )}
               </div>
             </div>
          </section>

          <button
            onClick={startSending}
            disabled={isProcessing || recipients.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all mt-auto"
          >
            {isProcessing ? 'Sending Campaign...' : 'Send Now'}
            {!isProcessing && <Send className="w-5 h-5" />}
          </button>
        </div>

        {/* Right Panel: Logs */}
        <div className="w-full md:w-2/3 flex flex-col bg-gray-50">
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Live Status</span>
              <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 ease-out rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {sessionLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                   <FileText className="w-8 h-8" />
                </div>
                <p className="font-medium text-gray-400">Waiting to start campaign...</p>
              </div>
            ) : (
              sessionLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${log.status === 'sent' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {log.status === 'sent' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{log.recipient}</p>
                      <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      log.status === 'sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                    {log.error && <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={log.error}>{log.error}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSender;
