import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Upload, FileText, Plus, Tag, Brain, Pill, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categories = [
  { key: "guidelines", label: "Guidelines", icon: BookOpen, desc: "Clinical or professional guidelines" },
  { key: "formulary", label: "Drug Formulary", icon: Pill, desc: "Drug references and formularies" },
  { key: "templates", label: "Templates & Style", icon: FileText, desc: "Report templates and writing style" },
  { key: "protocols", label: "Personal Protocols", icon: Brain, desc: "Your own clinical protocols" },
];

export default function KnowledgeBase() {
  const { profile } = useAuth();
  const [items] = useState<any[]>([]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">Your private knowledge base — the AI searches here first</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>
      </div>

      <Tabs defaultValue="guidelines">
        <TabsList className="bg-surface border border-border">
          {categories.map(c => (
            <TabsTrigger key={c.key} value={c.key} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2">
              <c.icon className="w-4 h-4" />{c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(c => (
          <TabsContent key={c.key} value={c.key} className="mt-4">
            <div className="glass-card p-8 text-center">
              <div className="border-2 border-dashed border-border rounded-lg p-12 hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">Upload {c.label}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
                <p className="text-xs text-muted-foreground mt-2">Drag and drop PDF files here</p>
              </div>
              {c.key === "protocols" && (
                <div className="mt-6">
                  <Button variant="outline" className="border-border text-foreground gap-2">
                    <Plus className="w-4 h-4" />Write New Protocol
                  </Button>
                </div>
              )}
              {c.key === "formulary" && (
                <div className="mt-6 flex gap-3 justify-center">
                  <Button variant="outline" size="sm" className="border-border text-foreground gap-2">
                    <Pill className="w-3 h-3" />Luxembourg Formulary
                  </Button>
                  <Button variant="outline" size="sm" className="border-border text-foreground gap-2">
                    <Pill className="w-3 h-3" />Hungary OGYÉI Formulary
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
