import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, GripVertical, Trash2, FileText, Eye } from "lucide-react";

const prebuiltTemplates = [
  { name: "Medical General", tag: "Medical", questions: 8 },
  { name: "Neurology Intake", tag: "Neurology", questions: 12 },
  { name: "Therapy Initial Assessment", tag: "Therapy", questions: 10 },
  { name: "Legal Consultation", tag: "Legal", questions: 7 },
  { name: "NGO Intake Interview", tag: "NGO", questions: 15 },
  { name: "Asylum Support", tag: "Asylum", questions: 18 },
];

const questionTypes = ["Short text", "Long text", "Multiple choice", "Yes/No", "Date", "Number", "File upload"];

export default function IntakeTemplates() {
  const [view, setView] = useState<"list" | "builder">("list");
  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<{ text: string; type: string; required: boolean; sensitive: boolean }[]>([]);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", type: "Short text", required: false, sensitive: false }]);
  };

  if (view === "builder") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-3xl text-foreground">Template Builder</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setView("list")} className="border-border text-foreground">Back</Button>
            <Button variant="outline" className="border-border text-foreground gap-2"><Eye className="w-4 h-4" />Preview</Button>
            <Button>Save Template</Button>
          </div>
        </div>

        <div className="glass-card p-6 mb-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Template Name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Neurology Initial Intake" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Use Case</Label>
              <Select>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {["Medical", "Therapy", "Legal", "NGO", "Asylum", "General"].map(u => <SelectItem key={u} value={u} className="text-foreground">{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Language</Label>
              <Select defaultValue="English">
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {["English", "French", "German", "Luxembourgish", "Hungarian"].map(l => <SelectItem key={l} value={l} className="text-foreground">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {questions.map((q, i) => (
            <div key={i} className="glass-card p-4 flex items-start gap-3">
              <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab shrink-0" />
              <div className="flex-1 space-y-3">
                <Input value={q.text} onChange={e => { const nq = [...questions]; nq[i].text = e.target.value; setQuestions(nq); }} placeholder="Question text" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                <div className="flex items-center gap-4">
                  <Select value={q.type} onValueChange={v => { const nq = [...questions]; nq[i].type = v; setQuestions(nq); }}>
                    <SelectTrigger className="w-40 bg-secondary border-border text-foreground text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-surface border-border">{questionTypes.map(t => <SelectItem key={t} value={t} className="text-foreground">{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch checked={q.required} onCheckedChange={v => { const nq = [...questions]; nq[i].required = v; setQuestions(nq); }} />
                    <span className="text-xs text-muted-foreground">Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={q.sensitive} onCheckedChange={v => { const nq = [...questions]; nq[i].sensitive = v; setQuestions(nq); }} />
                    <span className="text-xs text-muted-foreground">Sensitive</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="text-destructive shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addQuestion} className="border-border text-foreground gap-2 w-full">
          <Plus className="w-4 h-4" />Add Question
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl text-foreground">Intake Templates</h1>
        <Button onClick={() => setView("builder")} className="gap-2"><Plus className="w-4 h-4" />Create New Template</Button>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Pre-built Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prebuiltTemplates.map(t => (
            <div key={t.name} className="glass-card p-5 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => { setTemplateName(t.name); setView("builder"); }}>
              <div className="flex items-start justify-between">
                <FileText className="w-8 h-8 text-primary mb-3" />
                <span className="status-badge bg-primary/20 text-primary text-[10px]">{t.tag}</span>
              </div>
              <h3 className="text-foreground font-medium">{t.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t.questions} questions</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Templates</h2>
        <div className="glass-card p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No custom templates yet. Create one or start from a pre-built template.</p>
        </div>
      </div>
    </div>
  );
}
