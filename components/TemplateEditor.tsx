import React, { useState, useEffect, useRef } from 'react';
import { EmailTemplate } from '../types';
import { Code, Eye, Save, ArrowLeft, RefreshCw, Smartphone, Monitor, Plus, X, Upload, Image as ImageIcon, PlayCircle, CheckCircle2, Link as LinkIcon, Copy, Share2, Sparkles, Wand2 } from 'lucide-react';
import { saveTemplate, processEmailContent } from '../services/mockBackend';
import { editEmailTemplate } from '../services/geminiService';

interface Props {
  template: EmailTemplate;
  onBack: () => void;
  onSave: (updated: EmailTemplate) => void;
}

interface DetectedLink {
  index: number;
  type: 'button' | 'link';
  text: string;
  url: string;
  originalMatch: string;
}

interface DetectedSocialLink {
  index: number;
  network: string;
  url: string;
}

const TemplateEditor: React.FC<Props> = ({ template, onBack, onSave }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate>(template);
  const [isSaving, setIsSaving] = useState(false);
  const [newVar, setNewVar] = useState('');
  
  // AI Editing State
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiBar, setShowAiBar] = useState(false);
  
  // State for Logo URL
  const [logoUrl, setLogoUrl] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // State for Live Preview Data
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [showPreviewData, setShowPreviewData] = useState(false);
  
  // State for Links
  const [detectedLinks, setDetectedLinks] = useState<DetectedLink[]>([]);
  const [detectedSocialLinks, setDetectedSocialLinks] = useState<DetectedSocialLink[]>([]);

  useEffect(() => {
    setEditedTemplate(template);
    // Initialize preview values: remove brackets if present just in case
    const initialValues: Record<string, string> = {};
    template.variables.forEach(v => {
      initialValues[v] = v; 
    });
    setPreviewValues(initialValues);
  }, [template]);

  // Extract links whenever mjml changes
  useEffect(() => {
    extractLinks(editedTemplate.mjml);
    extractSocialLinks(editedTemplate.mjml);
  }, [editedTemplate.mjml]);

  const extractLinks = (mjml: string) => {
    const links: DetectedLink[] = [];
    
    // Regex for mj-button
    // Finds <mj-button ... > Text </mj-button>
    // Captures: 1: attributes, 2: content
    const buttonRegex = /<mj-button([\s\S]*?)>([\s\S]*?)<\/mj-button>/g;
    let match;
    let idx = 0;

    while ((match = buttonRegex.exec(mjml)) !== null) {
      const attributes = match[1];
      const content = match[2];
      
      // Extract href from attributes
      const hrefMatch = /href="([^"]*)"/.exec(attributes);
      const url = hrefMatch ? hrefMatch[1] : '';

      links.push({
        index: idx++,
        type: 'button',
        text: content.trim(),
        url: url,
        originalMatch: match[0]
      });
    }

    setDetectedLinks(links);
  };

  const extractSocialLinks = (mjml: string) => {
    const sLinks: DetectedSocialLink[] = [];
    // Regex for mj-social-element
    // Finds <mj-social-element ... > Text </mj-social-element> or self closing
    const socialRegex = /<mj-social-element([\s\S]*?)>([\s\S]*?)<\/mj-social-element>/g;
    let match;
    let idx = 0;

    while ((match = socialRegex.exec(mjml)) !== null) {
      const attributes = match[1];
      
      const hrefMatch = /href="([^"]*)"/.exec(attributes);
      const nameMatch = /name="([^"]*)"/.exec(attributes);
      
      // Try to determine network name
      let network = 'Social';
      if (nameMatch) {
        network = nameMatch[1];
      } else if (match[2].trim()) {
        network = match[2].trim();
      }

      // capitalize
      network = network.charAt(0).toUpperCase() + network.slice(1);

      sLinks.push({
        index: idx++,
        network: network,
        url: hrefMatch ? hrefMatch[1] : ''
      });
    }

    setDetectedSocialLinks(sLinks);
  };

  const updateLink = (linkIndex: number, newUrl: string) => {
    let currentIdx = 0;
    const buttonRegex = /<mj-button([\s\S]*?)>([\s\S]*?)<\/mj-button>/g;
    
    const newMjml = editedTemplate.mjml.replace(buttonRegex, (fullMatch, attributes, content) => {
      if (currentIdx === linkIndex) {
        if (/href="[^"]*"/.test(attributes)) {
          return `<mj-button${attributes.replace(/href="[^"]*"/, `href="${newUrl}"`)}>${content}</mj-button>`;
        } else {
          return `<mj-button href="${newUrl}"${attributes}>${content}</mj-button>`;
        }
      }
      currentIdx++;
      return fullMatch;
    });
    
    updateField('mjml', newMjml);
  };

  const updateSocialLink = (linkIndex: number, newUrl: string) => {
    let currentIdx = 0;
    const socialRegex = /<mj-social-element([\s\S]*?)>([\s\S]*?)<\/mj-social-element>/g;
    
    const newMjml = editedTemplate.mjml.replace(socialRegex, (fullMatch, attributes, content) => {
      if (currentIdx === linkIndex) {
        if (/href="[^"]*"/.test(attributes)) {
          return `<mj-social-element${attributes.replace(/href="[^"]*"/, `href="${newUrl}"`)}>${content}</mj-social-element>`;
        } else {
          return `<mj-social-element href="${newUrl}"${attributes}>${content}</mj-social-element>`;
        }
      }
      currentIdx++;
      return fullMatch;
    });

    updateField('mjml', newMjml);
  };

  const getPreviewHtml = () => {
    // Process content with current variables AND remove brackets from values if they were accidentally added
    const cleanValues: Record<string, string> = {};
    Object.keys(previewValues).forEach(k => {
      cleanValues[k] = previewValues[k].replace(/[\[\]]/g, '');
    });
    return processEmailContent(editedTemplate.html, cleanValues);
  };

  const handleSave = () => {
    setIsSaving(true);
    saveTemplate(editedTemplate);
    setTimeout(() => {
      setIsSaving(false);
      onSave(editedTemplate);
    }, 600);
  };

  const handleSaveAndExit = () => {
    saveTemplate(editedTemplate);
    onSave(editedTemplate);
    onBack();
  };

  const updateField = (field: keyof EmailTemplate, value: any) => {
    setEditedTemplate(prev => ({ ...prev, [field]: value }));
  };

  const addVariable = () => {
    const trimmed = newVar.trim().replace(/[\[\]]/g, ''); 
    if (trimmed && !editedTemplate.variables.includes(trimmed)) {
      updateField('variables', [...editedTemplate.variables, trimmed]);
      setNewVar('');
      setPreviewValues(prev => ({...prev, [trimmed]: trimmed}));
    }
  };

  const copyVariableToClipboard = (v: string) => {
    navigator.clipboard.writeText(`[${v}]`);
  };

  const removeVariable = (v: string) => {
    updateField('variables', editedTemplate.variables.filter(item => item !== v));
  };

  const handleRenameVariable = (oldName: string, newName: string) => {
    const cleanNewName = newName.replace(/[\[\]]/g, '');
    if (!cleanNewName || cleanNewName === oldName) return;

    const newVariables = editedTemplate.variables.map(v => v === oldName ? cleanNewName : v);
    
    const oldTag = `[${oldName}]`;
    const newTag = `[${cleanNewName}]`;
    const regex = new RegExp(oldTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    
    const newMjml = editedTemplate.mjml.replace(regex, newTag);
    const newHtml = editedTemplate.html.replace(regex, newTag);

    setEditedTemplate(prev => ({
      ...prev,
      variables: newVariables,
      mjml: newMjml,
      html: newHtml
    }));

    const newPreviewValues = { ...previewValues };
    newPreviewValues[cleanNewName] = (newPreviewValues[oldName] === oldName) ? cleanNewName : (newPreviewValues[oldName] || cleanNewName);
    delete newPreviewValues[oldName];
    setPreviewValues(newPreviewValues);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
        replaceLogoInTemplate(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const replaceLogoInTemplate = (url: string) => {
    let newMjml = editedTemplate.mjml;
    const logoRegex = /(<mj-image[^>]*alt="Logo"[^>]*src=")([^"]*)(")/i;
    if (logoRegex.test(newMjml)) {
      newMjml = newMjml.replace(logoRegex, `$1${url}$3`);
    } else {
      const firstImageRegex = /(<mj-image[^>]*src=")([^"]*)(")/i;
      if (firstImageRegex.test(newMjml)) {
        newMjml = newMjml.replace(firstImageRegex, `$1${url}$3`);
      }
    }
    
    let newHtml = editedTemplate.html;
    const htmlLogoRegex = /(<img[^>]*alt="Logo"[^>]*src=")([^"]*)(")/i;
    if (htmlLogoRegex.test(newHtml)) {
       newHtml = newHtml.replace(htmlLogoRegex, `$1${url}$3`);
    } else {
       const firstImgRegex = /(<img[^>]*src=")([^"]*)(")/i;
       if (firstImgRegex.test(newHtml)) {
         newHtml = newHtml.replace(firstImgRegex, `$1${url}$3`);
       }
    }

    setEditedTemplate(prev => ({
      ...prev,
      mjml: newMjml,
      html: newHtml
    }));
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiEditing(true);
    
    try {
      const result = await editEmailTemplate(editedTemplate.mjml, aiPrompt);
      
      setEditedTemplate(prev => ({
        ...prev,
        ...result,
        updatedAt: new Date().toISOString()
      }));
      setAiPrompt('');
      setShowAiBar(false);
      
      // Update variables if changed
      if (result.variables) {
        // Sync preview values for new vars
        const newPreviewVals = {...previewValues};
        result.variables.forEach(v => {
          if (!newPreviewVals[v]) newPreviewVals[v] = v;
        });
        setPreviewValues(newPreviewVals);
      }

    } catch (error) {
      console.error("AI Edit failed", error);
      alert("Failed to edit template with AI. Please try again.");
    } finally {
      setIsAiEditing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <input
              type="text"
              value={editedTemplate.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="text-lg font-bold text-gray-900 border-none focus:ring-0 p-0 hover:bg-gray-50 bg-transparent placeholder-gray-400"
              placeholder="Template Title"
            />
            <span className="text-xs text-gray-500">Last saved: {new Date(editedTemplate.updatedAt).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Toggle */}
          <button
            onClick={() => setShowAiBar(!showAiBar)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showAiBar ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Edit with Sirz
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'preview' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'code' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code className="w-4 h-4" /> Code
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-70"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>

          <button
            onClick={handleSaveAndExit}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save & Exit
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          {activeTab === 'preview' ? (
            <div className="flex-1 bg-gray-200/50 flex flex-col items-center justify-center p-8 overflow-hidden relative">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white p-1.5 rounded-full shadow-sm border border-gray-200 z-10">
                 <button 
                  onClick={() => setDeviceMode('desktop')}
                  className={`p-2 rounded-full transition-colors ${deviceMode === 'desktop' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Desktop View"
                 >
                   <Monitor className="w-5 h-5" />
                 </button>
                 <button 
                  onClick={() => setDeviceMode('mobile')}
                  className={`p-2 rounded-full transition-colors ${deviceMode === 'mobile' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Mobile View"
                 >
                   <Smartphone className="w-5 h-5" />
                 </button>
              </div>
              
              <div className={`bg-white shadow-2xl transition-all duration-500 ease-in-out overflow-hidden ${
                deviceMode === 'mobile' 
                  ? 'w-[375px] h-[667px] rounded-3xl border-[10px] border-gray-800' 
                  : 'w-full max-w-5xl h-full rounded-xl border border-gray-200'
              }`}>
                <iframe 
                  srcDoc={getPreviewHtml()}
                  title="Email Preview"
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-same-origin"
                />
              </div>

              {showPreviewData && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-20">
                  <PlayCircle className="w-4 h-4 text-green-400" />
                  Showing live data preview
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-gray-900 flex flex-col">
              <div className="bg-gray-800 text-gray-400 px-4 py-2 text-xs uppercase font-semibold tracking-wider flex justify-between items-center border-b border-gray-700">
                <span>MJML Source Editor</span>
                <span className="text-gray-500">Editable</span>
              </div>
              <textarea
                value={editedTemplate.mjml}
                onChange={(e) => updateField('mjml', e.target.value)}
                className="flex-1 w-full p-6 bg-gray-900 text-blue-100 font-mono text-sm focus:outline-none resize-none code-scroll leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* AI Magic Edit Bar */}
          {showAiBar && (
            <div className="absolute bottom-6 left-6 right-6 z-30 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white rounded-xl shadow-2xl border border-indigo-100 p-4 max-w-3xl mx-auto flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Edit with Sirz</span>
                  </div>
                  <button onClick={() => setShowAiBar(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                    placeholder="E.g., Change the button color to orange, Make the tone more professional..."
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    disabled={isAiEditing}
                    autoFocus
                  />
                  <button 
                    onClick={handleAiEdit}
                    disabled={isAiEditing || !aiPrompt.trim()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    {isAiEditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {isAiEditing ? 'Editing...' : 'Apply Edit'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Configuration */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shadow-xl z-10">
          
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              Logo & Branding
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Logo URL..."
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    if (e.target.value) replaceLogoInTemplate(e.target.value);
                  }}
                  className="flex-1 p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={() => logoInputRef.current?.click()}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
                  title="Upload Image"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                />
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="p-6 border-b border-gray-100">
             <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
               <LinkIcon className="w-4 h-4 text-indigo-600" />
               Links & Actions
             </h3>
             <div className="space-y-5">
                {/* Buttons */}
                <div>
                   <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Buttons</h4>
                   {detectedLinks.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No buttons detected</p>
                   ) : (
                    detectedLinks.map((link, i) => (
                      <div key={i} className="mb-3 last:mb-0">
                        <label className="text-xs font-medium text-gray-700 truncate block mb-1" title={link.text}>
                          {link.text || "Untitled Button"}
                        </label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateLink(link.index, e.target.value)}
                          placeholder="https://..."
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ))
                   )}
                </div>

                {/* Social Media */}
                <div>
                   <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                     <Share2 className="w-3 h-3" /> Social Media
                   </h4>
                   {detectedSocialLinks.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No social links detected</p>
                   ) : (
                    detectedSocialLinks.map((link, i) => (
                      <div key={i} className="mb-3 last:mb-0">
                        <label className="text-xs font-medium text-gray-700 truncate block mb-1">
                          {link.network}
                        </label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateSocialLink(link.index, e.target.value)}
                          placeholder="https://..."
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ))
                   )}
                </div>
             </div>
          </div>

          {/* Settings */}
          <div className="p-6 border-b border-gray-100">
             <h3 className="font-bold text-gray-900 mb-4">Email Settings</h3>
             <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={editedTemplate.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Preheader Text</label>
                  <input
                    type="text"
                    value={editedTemplate.preheader}
                    onChange={(e) => updateField('preheader', e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
             </div>
          </div>

          {/* Variables */}
          <div className="p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Personalization</h3>
              <button 
                onClick={() => setShowPreviewData(!showPreviewData)}
                className={`text-xs font-medium px-2 py-1 rounded transition-colors ${showPreviewData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
              >
                {showPreviewData ? 'Preview Mode: ON' : 'Preview Mode: OFF'}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mb-4">
              Click a variable to copy the tag (e.g. [name]), then paste it into your template content.
            </p>
            
            {/* Add New Variable */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newVar}
                onChange={(e) => setNewVar(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addVariable()}
                placeholder="Add variable..."
                className="flex-1 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={addVariable}
                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                title="Add Variable"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {editedTemplate.variables.map(v => (
                <div key={v} className="bg-gray-50 border border-gray-200 rounded-lg p-3 group hover:border-indigo-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-mono text-indigo-600 font-bold">
                       <button 
                         onClick={() => copyVariableToClipboard(v)}
                         className="p-1 hover:bg-indigo-50 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                         title="Copy [variable] to clipboard"
                       >
                         <Copy className="w-3 h-3" />
                       </button>
                       <div className="flex items-center">
                          [<input 
                            type="text" 
                            defaultValue={v}
                            onBlur={(e) => handleRenameVariable(v, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameVariable(v, e.currentTarget.value);
                                e.currentTarget.blur();
                              }
                            }}
                            className="bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none w-auto min-w-[20px] max-w-[100px]"
                          />]
                       </div>
                    </div>
                    <button 
                      onClick={() => removeVariable(v)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove variable"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Preview Value Input */}
                  {showPreviewData && (
                    <div className="animate-in slide-in-from-top-1 duration-200">
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Preview Value</label>
                      <input 
                        type="text" 
                        value={previewValues[v] === v ? '' : previewValues[v]}
                        onChange={(e) => setPreviewValues({...previewValues, [v]: e.target.value})}
                        placeholder={`Value for ${v}`}
                        className="w-full text-xs p-2 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {editedTemplate.variables.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  No variables defined
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;