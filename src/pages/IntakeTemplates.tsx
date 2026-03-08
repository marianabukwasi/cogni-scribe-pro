import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, GripVertical, Trash2, FileText, Eye, ArrowLeft, BookOpen, Minus, Calendar } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

// ─── Types ──────────────────────────────────────────────
interface Question {
  id: string;
  text: string;
  helpText: string;
  type: string;
  required: boolean;
  sensitive: boolean;
  options?: string[];
  isSectionDivider?: boolean;
}

interface Template {
  id: string;
  name: string;
  use_case: string | null;
  language: string | null;
  questions: Question[];
  is_prebuilt: boolean | null;
  last_used_at: string | null;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────
const questionTypes = ["Short text", "Long text", "Multiple choice", "Yes/No", "Date", "Number", "File upload"];
const useCaseOptions = ["Medical", "Therapy", "Legal", "NGO", "Asylum", "General"];
const langOptions = ["English", "French", "German", "Luxembourgish", "Hungarian", "Spanish", "Dutch", "Italian", "Arabic"];

const newId = () => crypto.randomUUID();

// ─── Pre-built question library ─────────────────────────
const questionLibrary: Record<string, { text: string; type: string; helpText?: string }[]> = {
  Medical: [
    { text: "What is your chief complaint?", type: "Long text", helpText: "Describe the main reason for your visit" },
    { text: "How long have you had these symptoms?", type: "Short text" },
    { text: "What medications are you currently taking?", type: "Long text" },
    { text: "Do you have any known allergies?", type: "Long text" },
    { text: "Previous diagnoses or conditions?", type: "Long text" },
    { text: "Family medical history", type: "Long text", helpText: "Any significant conditions in your family" },
    { text: "Rate your pain level (1-10)", type: "Number", helpText: "1 = no pain, 10 = worst pain imaginable" },
  ],
  Therapy: [
    { text: "What is your reason for seeking therapy?", type: "Long text" },
    { text: "Have you had previous therapy experience?", type: "Yes/No" },
    { text: "Are you currently taking any medications?", type: "Long text" },
    { text: "How would you describe your sleep quality?", type: "Multiple choice" },
    { text: "How would you rate your current mood? (1-10)", type: "Number" },
    { text: "Do you have any safety concerns we should know about?", type: "Long text", helpText: "This is confidential" },
  ],
  Legal: [
    { text: "What is the nature of your legal issue?", type: "Long text" },
    { text: "What are the relevant dates?", type: "Long text" },
    { text: "Who are the parties involved?", type: "Long text" },
    { text: "Has any previous legal action been taken?", type: "Yes/No" },
    { text: "What documents do you have available?", type: "Long text" },
  ],
  "NGO": [
    { text: "What is your country of origin?", type: "Short text" },
    { text: "Please describe your journey", type: "Long text", helpText: "As much detail as you feel comfortable sharing" },
    { text: "What is your family situation?", type: "Long text" },
    { text: "Do you have any medical needs?", type: "Long text" },
    { text: "What is your current living situation?", type: "Long text" },
    { text: "What are your immediate needs?", type: "Long text" },
    { text: "What languages do you speak?", type: "Short text" },
  ],
};
// Alias
questionLibrary["Asylum"] = questionLibrary["NGO"];

// ─── Pre-built templates with actual questions ──────────
const prebuiltTemplateSeeds: { name: string; tag: string; questions: Question[] }[] = [
  {
    name: "Medical General", tag: "Medical",
    questions: questionLibrary.Medical.map(q => ({ id: newId(), text: q.text, helpText: q.helpText || "", type: q.type, required: false, sensitive: false })),
  },
  {
    name: "Neurology Intake", tag: "Medical",
    questions: [
      ...questionLibrary.Medical.slice(0, 3).map(q => ({ id: newId(), text: q.text, helpText: q.helpText || "", type: q.type, required: true, sensitive: false })),
      { id: newId(), text: "Have you experienced seizures, tremors, or loss of consciousness?", helpText: "", type: "Yes/No", required: true, sensitive: false },
      { id: newId(), text: "Do you have frequent headaches or migraines?", helpText: "", type: "Yes/No", required: false, sensitive: false },
      { id: newId(), text: "Any recent head injuries?", helpText: "", type: "Yes/No", required: true, sensitive: false },
    ],
  },
  {
    name: "Therapy Initial Assessment", tag: "Therapy",
    questions: questionLibrary.Therapy.map(q => ({ id: newId(), text: q.text, helpText: q.helpText || "", type: q.type, required: false, sensitive: q.text.includes("safety") })),
  },
  {
    name: "Legal Consultation", tag: "Legal",
    questions: questionLibrary.Legal.map(q => ({ id: newId(), text: q.text, helpText: q.helpText || "", type: q.type, required: false, sensitive: false })),
  },
  {
    name: "NGO Intake Interview", tag: "NGO",
    questions: questionLibrary.NGO.map(q => ({ id: newId(), text: q.text, helpText: q.helpText || "", type: q.type, required: false, sensitive: q.text.includes("journey") })),
  },
  {
    name: "Asylum Support", tag: "Asylum",
    questions: [
      ...questionLibrary.NGO.map(q => ({ id: newId(), text: q.text, helpText: q.helpText || "", type: q.type, required: false, sensitive: q.text.includes("journey") })),
      { id: newId(), text: "Have you applied for asylum before?", helpText: "", type: "Yes/No", required: true, sensitive: true },
      { id: newId(), text: "Do you have any identity documents?", helpText: "", type: "Yes/No", required: true, sensitive: false },
    ],
  },
  {
    name: "General Professional", tag: "General",
    questions: [
      { id: newId(), text: "Full name", helpText: "", type: "Short text", required: true, sensitive: false },
      { id: newId(), text: "Date of birth", helpText: "", type: "Date", required: true, sensitive: false },
      { id: newId(), text: "Reason for your appointment", helpText: "", type: "Long text", required: true, sensitive: false },
      { id: newId(), text: "Is there anything else we should know?", helpText: "", type: "Long text", required: false, sensitive: false },
    ],
  },
];

// ─── Component ──────────────────────────────────────────
export default function IntakeTemplates() {
  const { profile } = useAuth();
  const [view, setView] = useState<"list" | "builder" | "preview">("list");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // Builder state
  const [templateName, setTemplateName] = useState("");
  const [useCase, setUseCase] = useState("General");
  const [language, setLanguage] = useState("English");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("intake_templates")
      .select("*")
      .eq("professional_id", profile.user_id)
      .order("created_at", { ascending: false });
    setTemplates((data || []).map(t => ({ ...t, questions: (t.questions as any as Question[]) || [] })));
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const resetBuilder = () => {
    setTemplateName(""); setUseCase("General"); setLanguage("English"); setQuestions([]); setEditingId(null);
  };

  const openBuilder = (seed?: typeof prebuiltTemplateSeeds[0]) => {
    resetBuilder();
    if (seed) {
      setTemplateName(seed.name);
      setUseCase(seed.tag);
      setQuestions(seed.questions.map(q => ({ ...q, id: newId() })));
    }
    setView("builder");
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setTemplateName(t.name);
    setUseCase(t.use_case || "General");
    setLanguage(t.language || "English");
    setQuestions(t.questions);
    setView("builder");
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) { toast.error("Template name required"); return; }
    if (!profile) return;

    const payload = {
      name: templateName,
      use_case: useCase,
      language,
      questions: questions as unknown as Json,
      professional_id: profile.user_id,
    };

    if (editingId) {
      const { error } = await supabase.from("intake_templates").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Template updated");
    } else {
      const { error } = await supabase.from("intake_templates").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Template created");
    }
    load();
    setView("list");
    resetBuilder();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("intake_templates").delete().eq("id", id);
    toast.success("Template deleted");
    load();
  };

  // Question helpers
  const addQuestion = () => setQuestions(q => [...q, { id: newId(), text: "", helpText: "", type: "Short text", required: false, sensitive: false }]);
  const addDivider = () => setQuestions(q => [...q, { id: newId(), text: "", helpText: "", type: "Short text", required: false, sensitive: false, isSectionDivider: true }]);
  const updateQ = (idx: number, patch: Partial<Question>) => setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, ...patch } : q));
  const removeQ = (idx: number) => setQuestions(qs => qs.filter((_, i) => i !== idx));

  const addFromLibrary = (lq: { text: string; type: string; helpText?: string }) => {
    setQuestions(q => [...q, { id: newId(), text: lq.text, helpText: lq.helpText || "", type: lq.type, required: false, sensitive: false }]);
    toast.success("Question added");
  };

  // Drag reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setQuestions(reordered);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // ─── Preview ────────────────
  if (view === "preview") {
    return (
      <div className="min-h-screen bg-white text-gray-900 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h1>
            {profile?.organisation && <p className="text-gray-500">{profile.organisation}</p>}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-sm text-blue-800">
            Your responses will be shared securely with {profile?.full_name} to prepare for your appointment.
          </div>
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-blue-500 rounded-full w-0" /></div>
          </div>
          <div className="space-y-6">
            {questions.filter(q => !q.isSectionDivider).map((q, i) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {q.text || `Question ${i + 1}`}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {q.helpText && <p className="text-xs text-gray-500">{q.helpText}</p>}
                {q.type === "Long text" ? (
                  <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm" rows={3} disabled />
                ) : q.type === "Yes/No" ? (
                  <div className="flex gap-3">
                    <button className="px-6 py-2 border border-gray-300 rounded-lg text-sm" disabled>Yes</button>
                    <button className="px-6 py-2 border border-gray-300 rounded-lg text-sm" disabled>No</button>
                  </div>
                ) : q.type === "Date" ? (
                  <input type="date" className="border border-gray-300 rounded-lg p-2 text-sm" disabled />
                ) : q.type === "Number" ? (
                  <input type="number" className="border border-gray-300 rounded-lg p-2 text-sm w-32" disabled />
                ) : (
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" disabled />
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setView("builder")} className="border-gray-300 text-gray-700">Back to Editor</Button>
            <Button disabled className="bg-blue-600 text-white">Submit</Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Builder ────────────────
  if (view === "builder") {
    const libraryCategory = ["Medical", "Therapy", "Legal", "NGO", "Asylum"].includes(useCase) ? useCase : null;

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-3xl text-foreground">Template Builder</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setView("list"); resetBuilder(); }} className="border-border text-foreground gap-2">
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            <Button variant="outline" onClick={() => setView("preview")} className="border-border text-foreground gap-2">
              <Eye className="w-4 h-4" />Preview
            </Button>
            <Button variant="outline" onClick={() => setShowLibrary(!showLibrary)} className="border-border text-foreground gap-2">
              <BookOpen className="w-4 h-4" />{showLibrary ? "Hide" : "Show"} Library
            </Button>
            <Button onClick={saveTemplate}>Save Template</Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main builder */}
          <div className="flex-1">
            <div className="glass-card p-6 mb-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Template Name</Label>
                <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Neurology Initial Intake" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Use Case</Label>
                  <Select value={useCase} onValueChange={setUseCase}>
                    <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      {useCaseOptions.map(u => <SelectItem key={u} value={u} className="text-foreground">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      {langOptions.map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {questions.map((q, i) => (
                q.isSectionDivider ? (
                  <div key={q.id} className="flex items-center gap-3 py-2"
                    draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDragEnd={handleDragEnd}>
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab shrink-0" />
                    <div className="flex-1 border-t border-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Section Divider</span>
                    <div className="flex-1 border-t border-border" />
                    <Button variant="ghost" size="sm" onClick={() => removeQ(i)} className="text-destructive shrink-0"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div key={q.id} className={`glass-card p-4 flex items-start gap-3 ${dragIdx === i ? "ring-2 ring-primary/50" : ""}`}
                    draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDragEnd={handleDragEnd}>
                    <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab shrink-0" />
                    <div className="flex-1 space-y-3">
                      <Input value={q.text} onChange={e => updateQ(i, { text: e.target.value })} placeholder="Question text" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                      <Input value={q.helpText} onChange={e => updateQ(i, { helpText: e.target.value })} placeholder="Help text (optional)" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-xs" />
                      <div className="flex flex-wrap items-center gap-4">
                        <Select value={q.type} onValueChange={v => updateQ(i, { type: v })}>
                          <SelectTrigger className="w-40 bg-secondary border-border text-foreground text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-surface border-border">{questionTypes.map(t => <SelectItem key={t} value={t} className="text-foreground">{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch checked={q.required} onCheckedChange={v => updateQ(i, { required: v })} />
                          <span className="text-xs text-muted-foreground">Required</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={q.sensitive} onCheckedChange={v => updateQ(i, { sensitive: v })} />
                          <span className="text-xs text-muted-foreground">Sensitive</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeQ(i)} className="text-destructive shrink-0"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                )
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={addQuestion} className="border-border text-foreground gap-2 flex-1">
                <Plus className="w-4 h-4" />Add Question
              </Button>
              <Button variant="outline" onClick={addDivider} className="border-border text-foreground gap-2">
                <Minus className="w-4 h-4" />Section Divider
              </Button>
            </div>
          </div>

          {/* Question Library Sidebar */}
          {showLibrary && (
            <div className="w-72 shrink-0">
              <div className="glass-card p-4 sticky top-6">
                <h3 className="font-heading text-lg text-foreground mb-3">Question Library</h3>
                <ScrollArea className="h-[60vh]">
                  {Object.entries(questionLibrary).filter(([k]) => k !== "Asylum" || useCase === "Asylum").map(([cat, qs]) => (
                    <div key={cat} className="mb-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{cat}</p>
                      <div className="space-y-1.5">
                        {qs.map((q, qi) => (
                          <button key={qi} onClick={() => addFromLibrary(q)}
                            className="w-full text-left p-2.5 rounded-md bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/30 transition-colors text-xs text-foreground">
                            <span className="line-clamp-2">{q.text}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 block">{q.type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── List View ────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl text-foreground">Intake Templates</h1>
        <Button onClick={() => openBuilder()} className="gap-2"><Plus className="w-4 h-4" />Create New Template</Button>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Pre-built Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prebuiltTemplateSeeds.map(t => (
            <div key={t.name} className="glass-card p-5 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => openBuilder(t)}>
              <div className="flex items-start justify-between">
                <FileText className="w-8 h-8 text-primary mb-3" />
                <span className="status-badge bg-primary/20 text-primary text-[10px]">{t.tag}</span>
              </div>
              <h3 className="text-foreground font-medium">{t.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t.questions.length} questions</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Templates</h2>
        {templates.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No custom templates yet. Create one or start from a pre-built template.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className="glass-card p-5 flex items-center justify-between hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => openEdit(t)}>
                  <FileText className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <p className="text-foreground font-medium">{t.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {t.use_case && <span className="status-badge bg-primary/20 text-primary text-[10px]">{t.use_case}</span>}
                      <span className="text-xs text-muted-foreground">{t.questions.length} questions</span>
                      {t.last_used_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />Last used {new Date(t.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} className="text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
