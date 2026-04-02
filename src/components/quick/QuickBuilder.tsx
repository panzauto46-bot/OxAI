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
  ArrowRight,
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

interface GoalTemplate {
  id: GoalId;
  title: string;
  description: string;
  icon: typeof FileText;
  starter: string;
  outputFormat: string;
}

const goalTemplates: GoalTemplate[] = [
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

const toneOptions = [
  { value: 'friendly', label: 'Ramah' },
  { value: 'professional', label: 'Profesional' },
  { value: 'persuasive', label: 'Meyakinkan' },
  { value: 'casual', label: 'Santai' },
];

const languageOptions = [
  { value: 'Bahasa Indonesia', label: 'Bahasa Indonesia' },
  { value: 'English', label: 'English' },
  { value: 'Bahasa Indonesia + English', label: 'Bilingual (ID + EN)' },
];

const lengthOptions = [
  { value: 'Pendek (3-5 kalimat)', label: 'Pendek' },
  { value: 'Sedang (1-3 paragraf)', label: 'Sedang' },
  { value: 'Panjang (detail)', label: 'Panjang' },
];

function buildRequestPrompt({
  goal,
  request,
  audience,
  context,
  tone,
  language,
  length,
}: {
  goal: GoalTemplate;
  request: string;
  audience: string;
  context: string;
  tone: string;
  language: string;
  length: string;
}): string {
  return [
    `Tujuan user: ${goal.title}`,
    `Permintaan utama: ${request || `${goal.starter} ...`}`,
    `Target audiens: ${audience || 'Umum'}`,
    `Konteks tambahan: ${context || 'Tidak ada konteks tambahan.'}`,
    `Tone: ${tone}`,
    `Bahasa output: ${language}`,
    `Panjang output: ${length}`,
    `Format hasil yang diminta: ${goal.outputFormat}`,
    '',
    'Tolong hasilkan jawaban siap pakai. Jangan jelaskan proses internal. Langsung output final.',
  ].join('\n');
}

export function QuickBuilder() {
  const { apiKey, addToast, setActiveMode, setExperienceMode } = useStore();
  const { models: availableModels, modelOptions, defaultModelId } = useAvailableModels(apiKey);

  const [selectedGoalId, setSelectedGoalId] = useState<GoalId>('content');
  const [request, setRequest] = useState('');
  const [audience, setAudience] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState(toneOptions[0].value);
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [length, setLength] = useState(lengthOptions[1].value);
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
    [selectedGoalId]
  );

  const briefPreview = useMemo(() => {
    return [
      `Tujuan: ${selectedGoal.title}`,
      `Request: ${request || `${selectedGoal.starter} ...`}`,
      `Audiens: ${audience || 'Umum'}`,
      `Tone: ${tone}`,
      `Bahasa: ${language}`,
      `Panjang: ${length}`,
    ].join('\n');
  }, [audience, language, length, request, selectedGoal, tone]);

  const runGenerate = async (action: 'new' | 'shorter' | 'formal' | 'casual') => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Klik API Key Set dulu, lalu simpan API key provider kamu.',
      });
      return;
    }

    if (action === 'new' && !request.trim()) {
      addToast({
        type: 'info',
        title: 'Isi kebutuhan dulu',
        message: 'Tulis minimal satu kalimat tentang hasil yang kamu mau.',
      });
      return;
    }

    if (action !== 'new' && !previewOutput.trim()) {
      addToast({
        type: 'info',
        title: 'Belum ada preview',
        message: 'Klik Generate Preview dulu sebelum pakai tombol perbaiki cepat.',
      });
      return;
    }

    setIsGenerating(true);
    const prompt =
      action === 'new'
        ? buildRequestPrompt({
            goal: selectedGoal,
            request: request.trim(),
            audience: audience.trim(),
            context: context.trim(),
            tone,
            language,
            length,
          })
        : [
            'Perbaiki draft berikut tanpa mengubah makna utama.',
            action === 'shorter' ? 'Arah perbaikan: buat lebih singkat dan to the point.' : '',
            action === 'formal' ? 'Arah perbaikan: buat lebih formal dan profesional.' : '',
            action === 'casual' ? 'Arah perbaikan: buat lebih santai dan natural.' : '',
            '',
            'Draft saat ini:',
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
            'Kamu adalah AI assistant untuk user pemula. Berikan output final yang bisa langsung dipakai user tanpa penjelasan teknis.',
        },
        { role: 'user', content: prompt },
      ],
      0.7
    );

    setIsGenerating(false);

    if (response.error) {
      addToast({
        type: 'error',
        title: 'Preview gagal dibuat',
        message: response.error,
      });
      return;
    }

    setLastPrompt(prompt);
    setPreviewOutput(response.content.trim());
    addToast({
      type: 'success',
      title: 'Preview siap',
      message: 'Hasil sudah muncul, kamu bisa refine dengan satu klik.',
    });
  };

  const handleCopyOutput = async () => {
    if (!previewOutput.trim()) return;
    await navigator.clipboard.writeText(previewOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast({
      type: 'success',
      title: 'Hasil disalin',
      message: 'Preview berhasil disalin ke clipboard.',
    });
  };

  const handleOpenAdvanced = () => {
    setExperienceMode('advanced');
    setActiveMode('workflow');
    window.location.hash = '#workflow';
    addToast({
      type: 'info',
      title: 'Mode lanjutan aktif',
      message: 'Semua fitur teknis sekarang ditampilkan.',
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Quick Builder</h2>
            <p className="text-slate-400">Mode simple untuk user nol AI: isi kebutuhan, lihat preview, langsung pakai.</p>
          </div>
          <Button variant="secondary" onClick={handleOpenAdvanced}>
            Buka Mode Lanjutan
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">1. Pilih yang mau kamu kerjakan</h3>
                <p className="text-sm text-slate-400">Pilih tujuan, nanti prompt disusun otomatis.</p>
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
                <h3 className="text-lg font-semibold text-white">2. Isi kebutuhan kamu (bahasa biasa)</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  label="Kamu mau hasil seperti apa?"
                  placeholder={`${selectedGoal.starter} ...`}
                  rows={4}
                  value={request}
                  onChange={(event) => setRequest(event.target.value)}
                />

                <Input
                  label="Target audiens (opsional)"
                  placeholder="Contoh: owner UMKM, mahasiswa, customer baru"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                />

                <Textarea
                  label="Konteks tambahan (opsional)"
                  placeholder="Masukkan detail tambahan biar hasil lebih tepat."
                  rows={3}
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Select
                    label="Tone jawaban"
                    options={toneOptions}
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                  />
                  <Select
                    label="Bahasa output"
                    options={languageOptions}
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Select
                    label="Panjang jawaban"
                    options={lengthOptions}
                    value={length}
                    onChange={(event) => setLength(event.target.value)}
                  />
                  <Select
                    label="Model AI"
                    options={modelOptions}
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => void runGenerate('new')} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                    Generate Preview
                  </Button>
                  <Button variant="secondary" onClick={() => void runGenerate('shorter')} disabled={isGenerating}>
                    Lebih Singkat
                  </Button>
                  <Button variant="secondary" onClick={() => void runGenerate('formal')} disabled={isGenerating}>
                    Lebih Formal
                  </Button>
                  <Button variant="secondary" onClick={() => void runGenerate('casual')} disabled={isGenerating}>
                    Lebih Santai
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Live Brief Preview</h3>
                <p className="text-sm text-slate-400">Ringkasan input kamu sebelum generate.</p>
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
                  <h3 className="text-lg font-semibold text-white">3. Preview Hasil</h3>
                  <p className="text-sm text-slate-400">Hasil AI muncul di sini dan bisa langsung dipakai.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleCopyOutput} disabled={!previewOutput.trim()}>
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {!previewOutput ? (
                  <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
                    Klik <span className="font-medium text-emerald-300">Generate Preview</span> untuk melihat hasil di sini.
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-4">
                    <p className="whitespace-pre-wrap text-sm text-slate-100">{previewOutput}</p>
                  </div>
                )}

                {lastPrompt && (
                  <details className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-300">
                      Lihat prompt otomatis (debug)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{lastPrompt}</pre>
                  </details>
                )}

                <div className="rounded-lg border border-teal-700/40 bg-teal-900/20 p-3 text-xs text-teal-100">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <PencilLine className="h-3.5 w-3.5" />
                    Tips Cepat
                  </div>
                  <p>Kalau hasil belum pas, klik tombol refine cepat: Lebih Singkat, Lebih Formal, atau Lebih Santai.</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="flex items-start gap-3 py-4">
                <Sparkles className="h-5 w-5 text-emerald-300 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Mau bikin alur lebih kompleks?</p>
                  <p className="text-xs text-slate-400">Pindah ke mode lanjutan untuk Workflow Builder, Prompt Studio, Agent Builder, dan Content Pipeline.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
