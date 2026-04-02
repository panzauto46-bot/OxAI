import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Copy,
  FileText,
  Globe2,
  Lightbulb,
  Loader2,
  MessageSquareQuote,
  PencilLine,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useStore } from '../../store/useStore';
import { callOxloAPI } from '../../services/oxloApi';
import { useAvailableModels } from '../../hooks/useAvailableModels';

type GoalId = 'content' | 'reply' | 'idea' | 'summary' | 'translate';
type ToneValue = 'friendly' | 'professional' | 'persuasive' | 'casual';
type OutputLanguageValue = 'en' | 'id' | 'bilingual';
type LengthValue = 'short' | 'medium' | 'long';
type AppLanguage = 'en' | 'id';

interface GoalTemplate {
  id: GoalId;
  title: string;
  description: string;
  icon: typeof FileText;
  starter: string;
  outputFormat: string;
}

function getGoalTemplates(language: AppLanguage): GoalTemplate[] {
  if (language === 'id') {
    return [
      {
        id: 'content',
        title: 'Bikin Konten',
        description: 'Konten marketing, caption, script, atau artikel pendek.',
        icon: FileText,
        starter: 'Buat konten tentang',
        outputFormat: 'Teks siap pakai, rapi, dan mudah diposting.',
      },
      {
        id: 'reply',
        title: 'Balasan Chat',
        description: 'Balas chat customer, klien, atau DM secara profesional.',
        icon: MessageSquareQuote,
        starter: 'Buat balasan chat untuk',
        outputFormat: 'Balasan singkat, jelas, dan sopan.',
      },
      {
        id: 'idea',
        title: 'Cari Ide',
        description: 'Cari ide konten, campaign, produk, atau headline.',
        icon: Lightbulb,
        starter: 'Berikan ide untuk',
        outputFormat: 'Daftar ide yang bisa langsung dieksekusi.',
      },
      {
        id: 'summary',
        title: 'Ringkas Teks',
        description: 'Ringkas dokumen, notes, atau tulisan panjang.',
        icon: Bot,
        starter: 'Ringkas teks berikut tentang',
        outputFormat: 'Ringkasan poin inti yang cepat dipahami.',
      },
      {
        id: 'translate',
        title: 'Terjemahkan',
        description: 'Terjemahkan teks dengan tone dan konteks tetap terjaga.',
        icon: Globe2,
        starter: 'Terjemahkan konten tentang',
        outputFormat: 'Hasil terjemahan natural, bukan kaku.',
      },
    ];
  }

  return [
    {
      id: 'content',
      title: 'Create Content',
      description: 'Marketing copy, captions, scripts, or short articles.',
      icon: FileText,
      starter: 'Create content about',
      outputFormat: 'Ready-to-publish content with clear structure.',
    },
    {
      id: 'reply',
      title: 'Reply Message',
      description: 'Write customer, client, or DM replies professionally.',
      icon: MessageSquareQuote,
      starter: 'Write a reply for',
      outputFormat: 'Concise, clear, and polite response.',
    },
    {
      id: 'idea',
      title: 'Find Ideas',
      description: 'Generate ideas for content, campaign, product, or headline.',
      icon: Lightbulb,
      starter: 'Generate ideas for',
      outputFormat: 'Actionable idea list ready to execute.',
    },
    {
      id: 'summary',
      title: 'Summarize Text',
      description: 'Summarize docs, notes, or long writing quickly.',
      icon: Bot,
      starter: 'Summarize this text about',
      outputFormat: 'Key-point summary that is easy to understand.',
    },
    {
      id: 'translate',
      title: 'Translate',
      description: 'Translate while keeping tone and context accurate.',
      icon: Globe2,
      starter: 'Translate content about',
      outputFormat: 'Natural translation with context preserved.',
    },
  ];
}

function buildRequestPrompt({
  appLanguage,
  goal,
  request,
  audience,
  context,
  tone,
  outputLanguageLabel,
  outputLengthLabel,
}: {
  appLanguage: AppLanguage;
  goal: GoalTemplate;
  request: string;
  audience: string;
  context: string;
  tone: string;
  outputLanguageLabel: string;
  outputLengthLabel: string;
}): string {
  if (appLanguage === 'id') {
    return [
      `Tujuan user: ${goal.title}`,
      `Permintaan utama: ${request || `${goal.starter} ...`}`,
      `Target audiens: ${audience || 'Umum'}`,
      `Konteks tambahan: ${context || 'Tidak ada konteks tambahan.'}`,
      `Tone: ${tone}`,
      `Bahasa output: ${outputLanguageLabel}`,
      `Panjang output: ${outputLengthLabel}`,
      `Format hasil yang diminta: ${goal.outputFormat}`,
      '',
      'Tolong hasilkan jawaban siap pakai. Jangan jelaskan proses internal. Langsung output final.',
    ].join('\n');
  }

  return [
    `User goal: ${goal.title}`,
    `Main request: ${request || `${goal.starter} ...`}`,
    `Target audience: ${audience || 'General audience'}`,
    `Additional context: ${context || 'No extra context provided.'}`,
    `Tone: ${tone}`,
    `Output language: ${outputLanguageLabel}`,
    `Output length: ${outputLengthLabel}`,
    `Requested output format: ${goal.outputFormat}`,
    '',
    'Provide final, ready-to-use output. Do not explain internal reasoning.',
  ].join('\n');
}

export function QuickBuilder() {
  const { apiKey, addToast, language } = useStore();
  const { models: availableModels, modelOptions, defaultModelId } = useAvailableModels(apiKey);

  const appLanguage: AppLanguage = language === 'id' ? 'id' : 'en';
  const goalTemplates = useMemo(() => getGoalTemplates(appLanguage), [appLanguage]);

  const text = appLanguage === 'id'
    ? {
        title: 'Quick Builder',
        subtitle: 'Mode simple untuk user nol AI: isi kebutuhan, lihat preview, langsung pakai.',
        step1Title: '1. Pilih yang mau kamu kerjakan',
        step1Desc: 'Pilih tujuan, nanti prompt disusun otomatis.',
        step2Title: '2. Isi kebutuhan kamu (bahasa biasa)',
        requestLabel: 'Kamu mau hasil seperti apa?',
        audienceLabel: 'Target audiens (opsional)',
        audiencePlaceholder: 'Contoh: owner UMKM, mahasiswa, customer baru',
        contextLabel: 'Konteks tambahan (opsional)',
        contextPlaceholder: 'Masukkan detail tambahan biar hasil lebih tepat.',
        toneLabel: 'Tone jawaban',
        outputLanguageLabel: 'Bahasa output',
        lengthLabel: 'Panjang jawaban',
        modelLabel: 'Model AI',
        generate: 'Generate Preview',
        shorter: 'Lebih Singkat',
        formal: 'Lebih Formal',
        casual: 'Lebih Santai',
        liveBriefTitle: 'Live Brief Preview',
        liveBriefDesc: 'Ringkasan input kamu sebelum generate.',
        step3Title: '3. Preview Hasil',
        step3Desc: 'Hasil AI muncul di sini dan bisa langsung dipakai.',
        copy: 'Copy',
        copied: 'Copied',
        emptyPreviewPrefix: 'Klik',
        emptyPreviewAction: 'Generate Preview',
        emptyPreviewSuffix: 'untuk melihat hasil di sini.',
        debugPrompt: 'Lihat prompt otomatis (debug)',
        tipsTitle: 'Tips Cepat',
        tipsBody: 'Kalau hasil belum pas, klik tombol refine cepat: Lebih Singkat, Lebih Formal, atau Lebih Santai.',
        detailTitle: 'Butuh fitur lebih detail?',
        detailBody: 'Menu lengkap tetap tersedia di sidebar: Workflow, Prompt, Agent, dan Content Pipeline.',
        toastApiRequiredTitle: 'API key diperlukan',
        toastApiRequiredMsg: 'Klik API Key Set dulu, lalu simpan API key provider kamu.',
        toastRequestTitle: 'Isi kebutuhan dulu',
        toastRequestMsg: 'Tulis minimal satu kalimat tentang hasil yang kamu mau.',
        toastNoPreviewTitle: 'Belum ada preview',
        toastNoPreviewMsg: 'Klik Generate Preview dulu sebelum pakai tombol perbaiki cepat.',
        toastGenerateFailTitle: 'Preview gagal dibuat',
        toastGenerateDoneTitle: 'Preview siap',
        toastGenerateDoneMsg: 'Hasil sudah muncul, kamu bisa refine dengan satu klik.',
        toastCopiedTitle: 'Hasil disalin',
        toastCopiedMsg: 'Preview berhasil disalin ke clipboard.',
      }
    : {
        title: 'Quick Builder',
        subtitle: 'Simple mode for non-technical users: describe your need, preview result, then use it.',
        step1Title: '1. Pick what you want to do',
        step1Desc: 'Choose a goal and the system builds the prompt for you.',
        step2Title: '2. Describe your need in plain language',
        requestLabel: 'What output do you want?',
        audienceLabel: 'Target audience (optional)',
        audiencePlaceholder: 'Example: small business owners, students, new customers',
        contextLabel: 'Extra context (optional)',
        contextPlaceholder: 'Add details to make the result more accurate.',
        toneLabel: 'Response tone',
        outputLanguageLabel: 'Output language',
        lengthLabel: 'Output length',
        modelLabel: 'AI Model',
        generate: 'Generate Preview',
        shorter: 'Make Shorter',
        formal: 'Make Formal',
        casual: 'Make Casual',
        liveBriefTitle: 'Live Brief Preview',
        liveBriefDesc: 'Quick summary of your input before generation.',
        step3Title: '3. Result Preview',
        step3Desc: 'AI output appears here and is ready to use.',
        copy: 'Copy',
        copied: 'Copied',
        emptyPreviewPrefix: 'Click',
        emptyPreviewAction: 'Generate Preview',
        emptyPreviewSuffix: 'to see your result here.',
        debugPrompt: 'Show auto prompt (debug)',
        tipsTitle: 'Quick Tip',
        tipsBody: 'If the result is not perfect yet, use quick refine buttons: Make Shorter, Make Formal, or Make Casual.',
        detailTitle: 'Need advanced features?',
        detailBody: 'Full menus are available in the sidebar: Workflow, Prompt, Agent, and Content Pipeline.',
        toastApiRequiredTitle: 'API key required',
        toastApiRequiredMsg: 'Click API Key Set first, then save your provider API key.',
        toastRequestTitle: 'Describe your need first',
        toastRequestMsg: 'Write at least one sentence about the output you want.',
        toastNoPreviewTitle: 'No preview yet',
        toastNoPreviewMsg: 'Click Generate Preview first before using quick refine buttons.',
        toastGenerateFailTitle: 'Failed to generate preview',
        toastGenerateDoneTitle: 'Preview ready',
        toastGenerateDoneMsg: 'Result is ready. You can refine it with one click.',
        toastCopiedTitle: 'Result copied',
        toastCopiedMsg: 'Preview copied to clipboard.',
      };

  const toneOptions = useMemo(
    () =>
      appLanguage === 'id'
        ? [
            { value: 'friendly', label: 'Ramah' },
            { value: 'professional', label: 'Profesional' },
            { value: 'persuasive', label: 'Meyakinkan' },
            { value: 'casual', label: 'Santai' },
          ]
        : [
            { value: 'friendly', label: 'Friendly' },
            { value: 'professional', label: 'Professional' },
            { value: 'persuasive', label: 'Persuasive' },
            { value: 'casual', label: 'Casual' },
          ],
    [appLanguage]
  );

  const outputLanguageOptions = useMemo(
    () =>
      appLanguage === 'id'
        ? [
            { value: 'id', label: 'Bahasa Indonesia' },
            { value: 'en', label: 'English' },
            { value: 'bilingual', label: 'Bilingual (ID + EN)' },
          ]
        : [
            { value: 'en', label: 'English' },
            { value: 'id', label: 'Bahasa Indonesia' },
            { value: 'bilingual', label: 'Bilingual (EN + ID)' },
          ],
    [appLanguage]
  );

  const lengthOptions = useMemo(
    () =>
      appLanguage === 'id'
        ? [
            { value: 'short', label: 'Pendek (3-5 kalimat)' },
            { value: 'medium', label: 'Sedang (1-3 paragraf)' },
            { value: 'long', label: 'Panjang (detail)' },
          ]
        : [
            { value: 'short', label: 'Short (3-5 sentences)' },
            { value: 'medium', label: 'Medium (1-3 paragraphs)' },
            { value: 'long', label: 'Long (detailed)' },
          ],
    [appLanguage]
  );

  const [selectedGoalId, setSelectedGoalId] = useState<GoalId>('content');
  const [request, setRequest] = useState('');
  const [audience, setAudience] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState<ToneValue>('friendly');
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguageValue>('en');
  const [outputLength, setOutputLength] = useState<LengthValue>('medium');
  const [selectedModel, setSelectedModel] = useState(defaultModelId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOutput, setPreviewOutput] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const validIds = new Set(availableModels.map((model) => model.id));
    if (availableModels.length === 0) return;
    setSelectedModel((previous) => (validIds.has(previous) ? previous : availableModels[0].id));
  }, [availableModels]);

  const selectedGoal = useMemo(
    () => goalTemplates.find((goal) => goal.id === selectedGoalId) || goalTemplates[0],
    [goalTemplates, selectedGoalId]
  );

  const toneLabel = useMemo(
    () => toneOptions.find((option) => option.value === tone)?.label || tone,
    [tone, toneOptions]
  );
  const outputLanguageLabel = useMemo(
    () => outputLanguageOptions.find((option) => option.value === outputLanguage)?.label || outputLanguage,
    [outputLanguage, outputLanguageOptions]
  );
  const outputLengthLabel = useMemo(
    () => lengthOptions.find((option) => option.value === outputLength)?.label || outputLength,
    [outputLength, lengthOptions]
  );

  const briefPreview = useMemo(() => {
    if (appLanguage === 'id') {
      return [
        `Tujuan: ${selectedGoal.title}`,
        `Request: ${request || `${selectedGoal.starter} ...`}`,
        `Audiens: ${audience || 'Umum'}`,
        `Tone: ${toneLabel}`,
        `Bahasa: ${outputLanguageLabel}`,
        `Panjang: ${outputLengthLabel}`,
      ].join('\n');
    }

    return [
      `Goal: ${selectedGoal.title}`,
      `Request: ${request || `${selectedGoal.starter} ...`}`,
      `Audience: ${audience || 'General audience'}`,
      `Tone: ${toneLabel}`,
      `Language: ${outputLanguageLabel}`,
      `Length: ${outputLengthLabel}`,
    ].join('\n');
  }, [
    appLanguage,
    audience,
    outputLanguageLabel,
    outputLengthLabel,
    request,
    selectedGoal,
    toneLabel,
  ]);

  const runGenerate = async (action: 'new' | 'shorter' | 'formal' | 'casual') => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: text.toastApiRequiredTitle,
        message: text.toastApiRequiredMsg,
      });
      return;
    }

    if (action === 'new' && !request.trim()) {
      addToast({
        type: 'info',
        title: text.toastRequestTitle,
        message: text.toastRequestMsg,
      });
      return;
    }

    if (action !== 'new' && !previewOutput.trim()) {
      addToast({
        type: 'info',
        title: text.toastNoPreviewTitle,
        message: text.toastNoPreviewMsg,
      });
      return;
    }

    setIsGenerating(true);
    const prompt =
      action === 'new'
        ? buildRequestPrompt({
            appLanguage,
            goal: selectedGoal,
            request: request.trim(),
            audience: audience.trim(),
            context: context.trim(),
            tone: toneLabel,
            outputLanguageLabel,
            outputLengthLabel,
          })
        : [
            appLanguage === 'id'
              ? 'Perbaiki draft berikut tanpa mengubah makna utama.'
              : 'Improve the following draft without changing the main meaning.',
            action === 'shorter'
              ? appLanguage === 'id'
                ? 'Arah perbaikan: buat lebih singkat dan to the point.'
                : 'Direction: make it shorter and more direct.'
              : '',
            action === 'formal'
              ? appLanguage === 'id'
                ? 'Arah perbaikan: buat lebih formal dan profesional.'
                : 'Direction: make it more formal and professional.'
              : '',
            action === 'casual'
              ? appLanguage === 'id'
                ? 'Arah perbaikan: buat lebih santai dan natural.'
                : 'Direction: make it more casual and natural.'
              : '',
            '',
            appLanguage === 'id' ? 'Draft saat ini:' : 'Current draft:',
            previewOutput,
          ]
            .filter(Boolean)
            .join('\n');

    const response = await callOxloAPI(
      apiKey,
      selectedModel,
      [
        {
          role: 'system',
          content:
            appLanguage === 'id'
              ? 'Kamu adalah AI assistant untuk user pemula. Berikan output final yang bisa langsung dipakai user tanpa penjelasan teknis.'
              : 'You are an AI assistant for beginners. Return final, ready-to-use output without technical explanations.',
        },
        { role: 'user', content: prompt },
      ],
      0.7
    );

    setIsGenerating(false);

    if (response.error) {
      addToast({
        type: 'error',
        title: text.toastGenerateFailTitle,
        message: response.error,
      });
      return;
    }

    setLastPrompt(prompt);
    setPreviewOutput(response.content.trim());
    addToast({
      type: 'success',
      title: text.toastGenerateDoneTitle,
      message: text.toastGenerateDoneMsg,
    });
  };

  const handleCopyOutput = async () => {
    if (!previewOutput.trim()) return;
    await navigator.clipboard.writeText(previewOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast({
      type: 'success',
      title: text.toastCopiedTitle,
      message: text.toastCopiedMsg,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{text.title}</h2>
            <p className="text-slate-400">{text.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">{text.step1Title}</h3>
                <p className="text-sm text-slate-400">{text.step1Desc}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {goalTemplates.map((goal) => {
                    const Icon = goal.icon;
                    const isActive = goal.id === selectedGoalId;
                    return (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedGoalId(goal.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          isActive
                            ? 'border-emerald-500/60 bg-emerald-900/30'
                            : 'border-slate-700 bg-slate-900/40 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/25 text-emerald-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="font-medium text-white">{goal.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{goal.description}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">{text.step2Title}</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  label={text.requestLabel}
                  placeholder={`${selectedGoal.starter} ...`}
                  rows={4}
                  value={request}
                  onChange={(event) => setRequest(event.target.value)}
                />

                <Input
                  label={text.audienceLabel}
                  placeholder={text.audiencePlaceholder}
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                />

                <Textarea
                  label={text.contextLabel}
                  placeholder={text.contextPlaceholder}
                  rows={3}
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Select
                    label={text.toneLabel}
                    options={toneOptions}
                    value={tone}
                    onChange={(event) => setTone(event.target.value as ToneValue)}
                  />
                  <Select
                    label={text.outputLanguageLabel}
                    options={outputLanguageOptions}
                    value={outputLanguage}
                    onChange={(event) => setOutputLanguage(event.target.value as OutputLanguageValue)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Select
                    label={text.lengthLabel}
                    options={lengthOptions}
                    value={outputLength}
                    onChange={(event) => setOutputLength(event.target.value as LengthValue)}
                  />
                  <Select
                    label={text.modelLabel}
                    options={modelOptions}
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => void runGenerate('new')} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                    {text.generate}
                  </Button>
                  <Button variant="secondary" onClick={() => void runGenerate('shorter')} disabled={isGenerating}>
                    {text.shorter}
                  </Button>
                  <Button variant="secondary" onClick={() => void runGenerate('formal')} disabled={isGenerating}>
                    {text.formal}
                  </Button>
                  <Button variant="secondary" onClick={() => void runGenerate('casual')} disabled={isGenerating}>
                    {text.casual}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">{text.liveBriefTitle}</h3>
                <p className="text-sm text-slate-400">{text.liveBriefDesc}</p>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
                  {briefPreview}
                </pre>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{text.step3Title}</h3>
                  <p className="text-sm text-slate-400">{text.step3Desc}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleCopyOutput} disabled={!previewOutput.trim()}>
                  <Copy className="w-4 h-4" />
                  {copied ? text.copied : text.copy}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {!previewOutput ? (
                  <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
                    {text.emptyPreviewPrefix}{' '}
                    <span className="font-medium text-emerald-300">{text.emptyPreviewAction}</span>{' '}
                    {text.emptyPreviewSuffix}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-4">
                    <p className="whitespace-pre-wrap text-sm text-slate-100">{previewOutput}</p>
                  </div>
                )}

                {lastPrompt && (
                  <details className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-300">
                      {text.debugPrompt}
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{lastPrompt}</pre>
                  </details>
                )}

                <div className="rounded-lg border border-teal-700/40 bg-teal-900/20 p-3 text-xs text-teal-100">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <PencilLine className="h-3.5 w-3.5" />
                    {text.tipsTitle}
                  </div>
                  <p>{text.tipsBody}</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="flex items-start gap-3 py-4">
                <Sparkles className="h-5 w-5 text-emerald-300 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">{text.detailTitle}</p>
                  <p className="text-xs text-slate-400">{text.detailBody}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
