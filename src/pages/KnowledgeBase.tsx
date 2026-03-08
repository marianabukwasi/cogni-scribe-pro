import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen, Upload, FileText, Plus, Tag, Brain, Pill, Building2,
  Trash2, X, Check, Search, HardDrive, File, Clock, Pencil, Download,
  Briefcase, Shield
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
type ProfKey = "medical" | "legal" | "ngo" | "therapy" | "generic";

interface KBItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  status: string;
  content?: string;
  file_url?: string;
  created_at: string;
  metadata?: any;
}

function getProfKey(profession?: string): ProfKey {
  if (!profession) return "medical";
  if (profession === "medical_doctor") return "medical";
  if (profession === "lawyer") return "legal";
  if (["ngo_caseworker", "refugee_support", "social_worker"].includes(profession)) return "ngo";
  if (profession === "therapist") return "therapy";
  return "generic";
}

// ─── Demo Items ─────────────────────────────────────────
function getDemoItems(pk: ProfKey): KBItem[] {
  const base: KBItem[] = [];
  if (pk === "medical") {
    base.push(
      { id: "1", title: "NICE Headache Guidelines 2024.pdf", category: "guidelines", tags: ["neurology", "headache", "migraine"], status: "ready", created_at: "2026-01-15T10:00:00Z", metadata: { pages: 42 } },
      { id: "2", title: "IIH Management Protocol - CHL.pdf", category: "guidelines", tags: ["neurology", "IIH", "first-line"], status: "ready", created_at: "2026-02-01T14:30:00Z", metadata: { pages: 18 } },
      { id: "3", title: "Luxembourg National Formulary 2026", category: "formulary", tags: ["luxembourg", "CNS"], status: "ready", created_at: "2026-01-01T00:00:00Z", metadata: { drugs: 3200 } },
      { id: "4", title: "Clinical Note Template - SOAP.docx", category: "templates", tags: ["SOAP", "clinical-note"], status: "ready", created_at: "2026-01-20T09:00:00Z", metadata: { styleLearnedFrom: 12 } },
      { id: "5", title: "My Standard Migraine Protocol", category: "protocols", tags: ["migraine", "first-line"], status: "ready", created_at: "2026-02-10T11:00:00Z", content: "First-line approach for migraine with aura:\n\n1. Confirm diagnosis — review ICHD-3 criteria\n2. Assess frequency — if ≥4/month consider prophylaxis\n3. Acute: Sumatriptan 50mg or Rizatriptan 10mg\n4. Prophylaxis: Propranolol 40mg BD or Topiramate 25mg titrated\n5. Lifestyle: sleep hygiene, trigger diary, hydration\n6. Red flags: thunderclap, new onset >50, neurological signs → urgent neuro referral\n\nNote: Always check for contraindications with triptans (cardiovascular risk, hemiplegic migraine)." },
    );
  } else if (pk === "legal") {
    base.push(
      { id: "1", title: "Luxembourg Civil Code - Contracts.pdf", category: "guidelines", tags: ["contract-law", "luxembourg"], status: "ready", created_at: "2026-01-10T10:00:00Z", metadata: { pages: 156 } },
      { id: "2", title: "Rome I Regulation Guide.pdf", category: "guidelines", tags: ["EU", "cross-border", "applicable-law"], status: "ready", created_at: "2026-01-15T10:00:00Z", metadata: { pages: 34 } },
      { id: "3", title: "File Note Template.docx", category: "templates", tags: ["file-note", "standard"], status: "ready", created_at: "2026-01-20T09:00:00Z", metadata: { styleLearnedFrom: 8 } },
      { id: "4", title: "Standard LBA Template", category: "case_templates", tags: ["LBA", "breach"], status: "ready", created_at: "2026-02-01T09:00:00Z", content: "Letter Before Action template for breach of contract claims." },
      { id: "5", title: "Our Firm's Case Management Protocol", category: "protocols", tags: ["intake", "case-management"], status: "ready", created_at: "2026-02-10T11:00:00Z", content: "Standard case management protocol:\n\n1. Initial client meeting — full fact-finding\n2. Conflict check within 24 hours\n3. Engagement letter within 48 hours\n4. File note within 24 hours of each interaction\n5. Monthly case review with supervising partner\n6. Client update every 2 weeks minimum" },
    );
  } else if (pk === "ngo") {
    base.push(
      { id: "1", title: "Luxembourg Asylum Procedures Guide.pdf", category: "guidelines", tags: ["asylum", "luxembourg", "procedure"], status: "ready", created_at: "2026-01-10T10:00:00Z", metadata: { pages: 86 } },
      { id: "2", title: "UNHCR Protection Guidelines.pdf", category: "guidelines", tags: ["UNHCR", "protection", "refugee"], status: "ready", created_at: "2026-01-15T10:00:00Z", metadata: { pages: 124 } },
      { id: "3", title: "Luxembourg Asylum Application Template", category: "case_templates", tags: ["asylum", "luxembourg", "application"], status: "ready", created_at: "2026-01-20T09:00:00Z", content: "Pre-built template for Luxembourg asylum applications." },
      { id: "4", title: "Emergency Needs Assessment Form", category: "case_templates", tags: ["needs", "emergency", "assessment"], status: "ready", created_at: "2026-02-01T09:00:00Z", content: "Standard emergency needs assessment form for new arrivals." },
      { id: "5", title: "Our Intake Interview Protocol", category: "protocols", tags: ["intake", "interview", "trauma-informed"], status: "ready", created_at: "2026-02-10T11:00:00Z", content: "Trauma-informed intake protocol:\n\n1. Establish safety — explain confidentiality and purpose\n2. Use open questions — avoid leading\n3. Allow pauses — do not rush accounts of trauma\n4. Note non-verbal cues for case file\n5. Prioritise immediate needs before detailed account\n6. Always close with next steps and timeline\n7. Interpreter must be independent — never family member" },
    );
  } else if (pk === "therapy") {
    base.push(
      { id: "1", title: "NICE Depression Guidelines CG90.pdf", category: "guidelines", tags: ["depression", "CBT", "NICE"], status: "ready", created_at: "2026-01-10T10:00:00Z", metadata: { pages: 64 } },
      { id: "2", title: "PHQ-9 & GAD-7 Scoring Guide.pdf", category: "guidelines", tags: ["assessment", "PHQ-9", "GAD-7"], status: "ready", created_at: "2026-01-15T10:00:00Z", metadata: { pages: 8 } },
      { id: "3", title: "Progress Note Template - BIRP.docx", category: "templates", tags: ["BIRP", "progress-note"], status: "ready", created_at: "2026-01-20T09:00:00Z", metadata: { styleLearnedFrom: 15 } },
      { id: "4", title: "My CBT Protocol for Depression", category: "protocols", tags: ["CBT", "depression", "behavioral-activation"], status: "ready", created_at: "2026-02-10T11:00:00Z", content: "Standard CBT protocol for moderate depression:\n\nWeeks 1-2: Assessment, psychoeducation, activity monitoring\nWeeks 3-4: Behavioral activation, graded task assignment\nWeeks 5-6: Cognitive restructuring introduction\nWeeks 7-10: Full cognitive restructuring + behavioral experiments\nWeeks 11-12: Relapse prevention and termination planning\n\nAlways: PHQ-9 at each session, safety plan if SI present, supervisor review if risk level changes." },
    );
  }
  return base;
}

// ─── Categories per profession ──────────────────────────
function getCategories(pk: ProfKey) {
  const cats = [
    { key: "guidelines", label: pk === "medical" ? "Clinical Guidelines" : pk === "legal" ? "Legal References" : pk === "ngo" ? "Policy & Guidance" : pk === "therapy" ? "Clinical Guidelines" : "Professional Guidelines", icon: BookOpen },
  ];
  if (pk === "medical") cats.push({ key: "formulary", label: "Drug Formulary", icon: Pill });
  cats.push({ key: "templates", label: "Templates & Style", icon: FileText });
  if (pk === "legal" || pk === "ngo") cats.push({ key: "case_templates", label: "Case Templates", icon: Briefcase });
  cats.push({ key: "protocols", label: "Personal Protocols", icon: Brain });
  return cats;
}

// ─── Pre-built templates ────────────────────────────────
function getPrebuiltTemplates(pk: ProfKey): { name: string; desc: string }[] {
  if (pk === "ngo") return [
    { name: "Luxembourg Asylum Application", desc: "Standard structure for Luxembourg protection requests" },
    { name: "Hungarian Asylum Application", desc: "Hungarian asylum procedure application template" },
    { name: "Social Housing Request", desc: "Template for emergency and permanent housing referrals" },
    { name: "Emergency Needs Assessment", desc: "Quick assessment form for new arrivals" },
  ];
  if (pk === "legal") return [
    { name: "Letter Before Action Template", desc: "Standard LBA for breach claims" },
    { name: "Client Engagement Letter", desc: "Standard engagement terms and fee agreement" },
  ];
  return [];
}

// ─── Component ──────────────────────────────────────────
export default function KnowledgeBase() {
  const { profile } = useAuth();
  const { isDemo } = useDemo();
  const pk = getProfKey(profile?.profession);
  const categories = getCategories(pk);
  const isWhiteLabel = profile?.account_tier === "white_label" || profile?.account_tier === "enterprise";

  const [items, setItems] = useState<KBItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewProtocol, setShowNewProtocol] = useState(false);
  const [newProtocolTitle, setNewProtocolTitle] = useState("");
  const [newProtocolContent, setNewProtocolContent] = useState("");
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [drugForm, setDrugForm] = useState({ name: "", indications: "", dosages: "", contraindications: "", interactions: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState("guidelines");

  useEffect(() => {
    if (isDemo) {
      setItems(getDemoItems(pk));
      return;
    }
    if (!profile) return;
    supabase.from("knowledge_base_items").select("*").eq("professional_id", profile.user_id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data.map(d => ({ ...d, tags: d.tags || [], status: d.status || "ready" })));
      });
  }, [profile, isDemo, pk]);

  const categoryItems = (cat: string) => items.filter(i => i.category === cat && (searchQuery ? i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) : true));

  const handleUploadClick = (cat: string) => {
    setUploadCategory(cat);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const newItem: KBItem = {
        id: `temp-${Date.now()}-${Math.random()}`,
        title: file.name,
        category: uploadCategory,
        tags: [],
        status: "processing",
        created_at: new Date().toISOString(),
        metadata: { size: file.size },
      };
      setItems(prev => [newItem, ...prev]);
      // Simulate processing
      setTimeout(() => {
        setItems(prev => prev.map(i => i.id === newItem.id ? { ...i, status: "ready", metadata: { ...i.metadata, pages: Math.floor(Math.random() * 50) + 5 } } : i));
        toast.success(`${file.name} processed and ready`);
      }, 3000);
    });
    e.target.value = "";
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (!isDemo) supabase.from("knowledge_base_items").delete().eq("id", id);
    toast.success("Item removed");
  };

  const addTag = (id: string, tag: string) => {
    if (!tag.trim()) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, tags: [...new Set([...i.tags, tag.trim().toLowerCase()])] } : i));
    setNewTag("");
  };

  const removeTag = (id: string, tag: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, tags: i.tags.filter(t => t !== tag) } : i));
  };

  const saveProtocol = () => {
    if (!newProtocolTitle.trim()) return;
    const newItem: KBItem = {
      id: `protocol-${Date.now()}`,
      title: newProtocolTitle,
      category: "protocols",
      tags: [],
      status: "ready",
      content: newProtocolContent,
      created_at: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setShowNewProtocol(false);
    setNewProtocolTitle("");
    setNewProtocolContent("");
    toast.success("Protocol saved");
  };

  const saveDrug = () => {
    if (!drugForm.name.trim()) return;
    const newItem: KBItem = {
      id: `drug-${Date.now()}`,
      title: drugForm.name,
      category: "formulary",
      tags: ["manual-entry"],
      status: "ready",
      content: `Indications: ${drugForm.indications}\nDosages: ${drugForm.dosages}\nContraindications: ${drugForm.contraindications}\nInteractions: ${drugForm.interactions}`,
      created_at: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setShowAddDrug(false);
    setDrugForm({ name: "", indications: "", dosages: "", contraindications: "", interactions: "" });
    toast.success("Drug reference added");
  };

  const saveEdit = () => {
    if (!editingItem) return;
    setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, content: editContent } : i));
    setEditingItem(null);
    toast.success("Saved");
  };

  const totalItems = items.length;
  const readyItems = items.filter(i => i.status === "ready").length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.txt,image/*" capture="environment" multiple onChange={handleFileSelect} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl md:text-3xl text-foreground">Knowledge Base</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Your private knowledge base. The AI searches here first before using general knowledge. The more you add, the more it reflects how you practice.
        </p>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <File className="w-3.5 h-3.5" />
            <span>{totalItems} items ({readyItems} ready)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HardDrive className="w-3.5 h-3.5" />
            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(totalItems * 5, 80)}%` }} />
            </div>
            <span>{Math.min(totalItems * 5, 80)}% used</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base..."
          className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* White Label Shared Base */}
      {isWhiteLabel && (
        <div className="glass-card p-4 mb-4 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Shared Organisation Base</span>
            <Badge variant="secondary" className="text-[10px]">Organisation</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Items shared across your organisation appear here. Your personal items override shared items if there is a conflict.</p>
          <div className="mt-3 text-xs text-muted-foreground italic">No shared items yet — configure in Settings → White Label</div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={categories[0].key}>
        <TabsList className="bg-surface border border-border flex-wrap h-auto gap-1 p-1 overflow-x-auto">
          {categories.map(c => (
            <TabsTrigger key={c.key} value={c.key} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2 text-xs">
              <c.icon className="w-3.5 h-3.5" />{c.label}
              {categoryItems(c.key).length > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-secondary text-[10px] inline-flex items-center justify-center">{categoryItems(c.key).length}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.key} value={cat.key} className="mt-4 space-y-4">
            {/* Upload Area */}
            <div
              onClick={() => handleUploadClick(cat.key)}
              className="glass-card p-6 text-center cursor-pointer hover:border-primary/50 transition-colors group"
            >
              <div className="border-2 border-dashed border-border rounded-lg p-8 group-hover:border-primary/30 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                <p className="text-sm text-foreground font-medium">Upload to {cat.label}</p>
                <p className="text-xs text-muted-foreground mt-1">Tap to browse files or take a photo</p>
              </div>
            </div>

            {/* Category-specific actions */}
            {cat.key === "formulary" && pk === "medical" && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="border-border text-foreground gap-2 text-xs" onClick={() => toast.info("Luxembourg National Formulary added to queue")}>
                  <Pill className="w-3 h-3" />Add Luxembourg Formulary
                </Button>
                <Button variant="outline" size="sm" className="border-border text-foreground gap-2 text-xs" onClick={() => toast.info("OGYÉI Formulary added to queue")}>
                  <Pill className="w-3 h-3" />Add Hungary OGYÉI Formulary
                </Button>
                <Button variant="outline" size="sm" className="border-primary/30 text-primary gap-2 text-xs" onClick={() => setShowAddDrug(true)}>
                  <Plus className="w-3 h-3" />Add Drug Manually
                </Button>
              </div>
            )}

            {cat.key === "protocols" && (
              <Button variant="outline" onClick={() => setShowNewProtocol(true)} className="border-primary/30 text-primary gap-2">
                <Pencil className="w-4 h-4" />Write New Protocol
              </Button>
            )}

            {cat.key === "case_templates" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Pre-built templates available:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getPrebuiltTemplates(pk).map(t => (
                    <div key={t.name} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground font-medium">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-primary text-xs" onClick={() => {
                        setItems(prev => [{ id: `prebuilt-${Date.now()}`, title: t.name, category: "case_templates", tags: ["pre-built"], status: "ready", created_at: new Date().toISOString(), content: t.desc }, ...prev]);
                        toast.success(`${t.name} added`);
                      }}>
                        <Plus className="w-3 h-3 mr-1" />Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cat.key === "templates" && (
              <div className="glass-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Pencil className="w-3 h-3" />
                  <span>Style learned from <strong className="text-foreground">{categoryItems("templates").filter(i => i.metadata?.styleLearnedFrom).reduce((sum, i) => sum + (i.metadata?.styleLearnedFrom || 0), 0)}</strong> documents</span>
                </div>
              </div>
            )}

            {/* Items List */}
            {categoryItems(cat.key).length > 0 ? (
              <div className="space-y-2">
                {categoryItems(cat.key).map(item => (
                  <div key={item.id} className="glass-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                          <span className={`status-badge text-[10px] ${item.status === "ready" ? "bg-accent/20 text-accent" : "bg-warning/20 text-warning"}`}>
                            {item.status === "ready" ? "Ready" : "Processing..."}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground ml-6">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.created_at).toLocaleDateString()}</span>
                          {item.metadata?.pages && <span>{item.metadata.pages} pages</span>}
                          {item.metadata?.drugs && <span>{item.metadata.drugs} drugs</span>}
                          {item.metadata?.styleLearnedFrom && <span>Style from {item.metadata.styleLearnedFrom} docs</span>}
                        </div>
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
                          {item.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">
                              <Tag className="w-2.5 h-2.5" />{tag}
                              <button onClick={() => removeTag(item.id, tag)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                            </span>
                          ))}
                          <div className="inline-flex items-center">
                            <Input
                              value={newTag}
                              onChange={e => setNewTag(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") { addTag(item.id, newTag); } }}
                              placeholder="+ tag"
                              className="h-5 w-16 text-[10px] bg-transparent border-none px-1 text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0"
                            />
                          </div>
                        </div>
                        {/* Content preview for protocols */}
                        {item.content && cat.key === "protocols" && (
                          <div className="mt-2 ml-6">
                            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{item.content}</p>
                            <Button variant="ghost" size="sm" className="text-primary text-[10px] h-6 px-1 mt-1" onClick={() => { setEditingItem(item); setEditContent(item.content || ""); }}>
                              <Pencil className="w-3 h-3 mr-1" />Edit
                            </Button>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8 p-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !["formulary", "case_templates", "templates"].includes(cat.key) && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No items in {cat.label} yet. Upload documents or create entries above.
                </div>
              )
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* New Protocol Dialog */}
      <Dialog open={showNewProtocol} onOpenChange={setShowNewProtocol}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Write New Protocol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground text-sm">Title</Label>
              <Input value={newProtocolTitle} onChange={e => setNewProtocolTitle(e.target.value)} placeholder="e.g. My standard approach for migraine with aura" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground mt-1" />
            </div>
            <div>
              <Label className="text-foreground text-sm">Protocol Content</Label>
              <Textarea value={newProtocolContent} onChange={e => setNewProtocolContent(e.target.value)} placeholder="Write your protocol here. This is high-priority context for AI suggestions..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground mt-1 min-h-[200px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProtocol(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={saveProtocol} disabled={!newProtocolTitle.trim()}>Save Protocol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Protocol Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">{editingItem?.title}</DialogTitle>
          </DialogHeader>
          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="bg-secondary border-border text-foreground min-h-[250px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Drug Dialog */}
      <Dialog open={showAddDrug} onOpenChange={setShowAddDrug}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading">Add Drug Reference</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-foreground text-xs">Drug Name (INN)</Label><Input value={drugForm.name} onChange={e => setDrugForm(p => ({ ...p, name: e.target.value }))} className="bg-secondary border-border text-foreground mt-1" /></div>
            <div><Label className="text-foreground text-xs">Indications</Label><Input value={drugForm.indications} onChange={e => setDrugForm(p => ({ ...p, indications: e.target.value }))} className="bg-secondary border-border text-foreground mt-1" /></div>
            <div><Label className="text-foreground text-xs">Standard Dosages</Label><Input value={drugForm.dosages} onChange={e => setDrugForm(p => ({ ...p, dosages: e.target.value }))} className="bg-secondary border-border text-foreground mt-1" /></div>
            <div><Label className="text-foreground text-xs">Contraindications</Label><Input value={drugForm.contraindications} onChange={e => setDrugForm(p => ({ ...p, contraindications: e.target.value }))} className="bg-secondary border-border text-foreground mt-1" /></div>
            <div><Label className="text-foreground text-xs">Interactions</Label><Input value={drugForm.interactions} onChange={e => setDrugForm(p => ({ ...p, interactions: e.target.value }))} className="bg-secondary border-border text-foreground mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDrug(false)} className="border-border text-foreground">Cancel</Button>
            <Button onClick={saveDrug} disabled={!drugForm.name.trim()}>Add Drug</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
