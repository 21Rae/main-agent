import React, { useState } from 'react';
import { generateEmailTemplate } from '../services/geminiService';
import { EmailTemplate } from '../types';
import { Loader2, Sparkles, AlertCircle, Wand2 } from 'lucide-react';

interface Props {
  onGenerated: (template: EmailTemplate) => void;
  onCancel: () => void;
}

const TemplateGenerator: React.FC<Props> = ({ onGenerated, onCancel }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateEmailTemplate(prompt);
      
      const newTemplate: EmailTemplate = {
        id: crypto.randomUUID(),
        title: result.title || 'Sirz Generated Template',
        subject: result.subject || 'Subject Line',
        preheader: result.preheader || '',
        mjml: result.mjml || '<mjml><mj-body></mj-body></mjml>',
        html: result.html || '<div>Empty Template</div>',
        variables: result.variables || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onGenerated(newTemplate);
    } catch (e: any) {
      setError(e.message || "Failed to generate template. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestions = [
    "Product launch email for a sleek smart watch. Tone: Futuristic. Dark Mode style. Variables: firstName, promoCode.",
    "Webinar invitation for 'Remote Work Trends'. Use a large hero image of an office. Variables: name, webinarDate.",
    "Customer feedback request with 3 colorful icons/steps. Tone: Friendly. Variables: customerName, orderId.",
    "Fashion brand summer sale newsletter. Bright, airy, and image-heavy. Variables: subscriberName."
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-xl border border-indigo-50 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Wand2 className="w-8 h-8 opacity-80" />
            <h2 className="text-3xl font-bold">Sirz AI Generator</h2>
          </div>
          <p className="text-indigo-100 opacity-90 max-w-xl">
            Describe your email campaign, audience, and goal. Sirz will design a responsive MJML template with beautiful imagery and personalization variables for you.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Your Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 resize-none transition-all text-gray-800 text-lg placeholder-gray-300"
              placeholder="E.g., Create a visually stunning newsletter for a travel agency. Use a large beach hero image. Blue and White theme. Variables: firstName, destination."
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Try these</span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(s)}
                  className="text-sm bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 px-4 py-2 rounded-full border border-gray-200 transition-all text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Sirz is Designing...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Generate Template
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-4 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
          Powered by Google Gemini 2.5 Flash • SirzMail Agent
        </div>
      </div>
    </div>
  );
};

export default TemplateGenerator;