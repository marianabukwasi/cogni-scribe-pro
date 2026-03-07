import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, Download, FileText, Printer, Edit, Clock } from "lucide-react";

const soapSections = {
  S: { title: "Subjective", content: "Patient presents with progressive headaches over 2 weeks, described as pressure-type, worse in the mornings. Reports visual disturbances including diplopia on lateral gaze. States 'It feels like my head is going to explode.' Recently started new supplements and reports increased work stress.", edited: false },
  O: { title: "Objective", content: "Alert and oriented. Cranial nerve examination pending fundoscopy. Visual acuity assessment recommended. BMI to be recorded. Vital signs within normal limits.", edited: false },
  A: { title: "Assessment", content: "1. Idiopathic Intracranial Hypertension (IIH) — suspected, high probability\n2. Migraine with aura — differential diagnosis\n\nRationale: Pressure-type headache with morning predominance, bilateral visual disturbances, and diplopia pattern consistent with raised intracranial pressure.", edited: false },
  P: { title: "Plan", content: "1. Urgent fundoscopy to assess for papilledema\n2. Initiate Acetazolamide (Diamox) 250mg BID if IIH confirmed\n3. Ophthalmology referral — visual field assessment and OCT\n4. Neurology referral if fundoscopy positive\n5. Verify supplement interactions before starting Acetazolamide\n6. Follow-up in 2 weeks\n7. Patient advised to seek emergency care if vision worsens acutely", edited: false },
};

const auditTrail = [
  { time: "14:02", action: "AI generated Subjective section" },
  { time: "14:02", action: "AI generated Objective section" },
  { time: "14:03", action: "AI generated Assessment section" },
  { time: "14:03", action: "AI generated Plan section" },
];

const prescriptionItems = [
  { name: "Acetazolamide (Diamox)", dosage: "250mg", form: "Tablet", frequency: "Twice daily", duration: "30 days", quantity: "60", instructions: "Take with food. Monitor for tingling in extremities." },
];

export default function DocumentReview() {
  const { id } = useParams();
  const [tab, setTab] = useState("clinical");
  const [approved, setApproved] = useState(false);
  const [rxApproved, setRxApproved] = useState(false);
  const [sections, setSections] = useState(soapSections);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-4 border-b border-border bg-surface">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="clinical" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2">
              <FileText className="w-4 h-4" />Clinical Note
            </TabsTrigger>
            <TabsTrigger value="prescription" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2">
              <FileText className="w-4 h-4" />Prescription
            </TabsTrigger>
            <TabsTrigger value="referral" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground gap-2">
              <FileText className="w-4 h-4" />Referral Letters
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "clinical" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Document */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto glass-card p-8">
              <div className="mb-6 pb-4 border-b border-border">
                <h2 className="font-heading text-2xl text-foreground">Clinical Note — SOAP Format</h2>
                <p className="text-xs text-muted-foreground mt-1">Session Date: {new Date().toLocaleDateString()}</p>
              </div>

              {Object.entries(sections).map(([key, section]) => (
                <div key={key} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-primary">{key} — {section.title}</h3>
                    <button onClick={() => setEditing(editing === key ? null : key)} className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className={`border-l-2 ${section.edited ? "border-l-accent" : "border-l-primary/30"} pl-4`}>
                    {editing === key ? (
                      <textarea
                        defaultValue={section.content}
                        onBlur={e => { setSections(s => ({ ...s, [key]: { ...s[key as keyof typeof s], content: e.target.value, edited: true } })); setEditing(null); }}
                        className="w-full bg-secondary border border-border rounded-md p-3 text-sm text-foreground resize-none min-h-[100px] focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {!approved ? (
                <Button onClick={() => { setApproved(true); toast.success("Document approved"); }} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Check className="w-4 h-4" />Verify and Approve
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Download className="w-4 h-4" />Download PDF</Button>
                  <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Download className="w-4 h-4" />Download DOCX</Button>
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="w-72 border-l border-border overflow-y-auto p-4 bg-surface">
            <h3 className="text-sm font-medium text-foreground mb-4">Audit Trail</h3>
            <div className="space-y-3">
              {auditTrail.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                    <p className="text-xs text-foreground">{a.action}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-6 border-border text-muted-foreground text-xs">Export Audit Trail</Button>
          </div>
        </div>
      )}

      {tab === "prescription" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto glass-card p-8">
            <div className="mb-6 pb-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl text-foreground">Prescription</h2>
                <p className="text-xs text-muted-foreground mt-1">Date: {new Date().toLocaleDateString()}</p>
              </div>
              <span className="status-badge bg-accent/20 text-accent">Luxembourg / eSanté</span>
            </div>

            {prescriptionItems.map((rx, i) => (
              <div key={i} className="glass-card p-5 mb-4">
                <h3 className="text-foreground font-medium">{rx.name}</h3>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Dosage</Label><Input defaultValue={rx.dosage} className="bg-secondary border-border text-foreground mt-1" /></div>
                  <div><Label className="text-xs text-muted-foreground">Form</Label><Input defaultValue={rx.form} className="bg-secondary border-border text-foreground mt-1" /></div>
                  <div><Label className="text-xs text-muted-foreground">Frequency</Label><Input defaultValue={rx.frequency} className="bg-secondary border-border text-foreground mt-1" /></div>
                  <div><Label className="text-xs text-muted-foreground">Duration</Label><Input defaultValue={rx.duration} className="bg-secondary border-border text-foreground mt-1" /></div>
                  <div><Label className="text-xs text-muted-foreground">Quantity</Label><Input defaultValue={rx.quantity} className="bg-secondary border-border text-foreground mt-1" /></div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Special Instructions</Label>
                  <Input defaultValue={rx.instructions} className="bg-secondary border-border text-foreground mt-1" />
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full mb-4 border-border text-foreground gap-2"><Plus className="w-4 h-4" />Add Medication</Button>

            {!rxApproved ? (
              <Button onClick={() => { setRxApproved(true); toast.success("Prescription signed"); }} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Check className="w-4 h-4" />Verify and Sign Prescription
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Download className="w-4 h-4" />PDF</Button>
                <Button variant="outline" className="flex-1 gap-2 border-border text-foreground"><Printer className="w-4 h-4" />Print</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "referral" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Tabs defaultValue="ophthalmology">
              <TabsList className="bg-surface border border-border mb-4">
                <TabsTrigger value="ophthalmology" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Ophthalmology</TabsTrigger>
                <TabsTrigger value="neurology" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-muted-foreground">Neurology</TabsTrigger>
              </TabsList>
              {["ophthalmology", "neurology"].map(spec => (
                <TabsContent key={spec} value={spec}>
                  <div className="glass-card p-8">
                    <div className="space-y-4 text-sm text-foreground">
                      <p className="text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input defaultValue={`${spec.charAt(0).toUpperCase() + spec.slice(1)} Department`} className="bg-secondary border-border text-foreground" />
                      </div>
                      <div className="border-l-2 border-l-primary/30 pl-4 space-y-3 py-2">
                        <p>Dear Colleague,</p>
                        <p>I am writing to refer the above patient for urgent {spec} assessment. The patient presents with a 2-week history of progressive headaches and visual disturbances including diplopia on lateral gaze, raising concern for idiopathic intracranial hypertension.</p>
                        <p>I would be grateful for {spec === "ophthalmology" ? "visual field assessment and OCT to document any optic disc swelling" : "neurological assessment and consideration of lumbar puncture with opening pressure measurement"}.</p>
                        <p>Current medications pending confirmation of supplement details.</p>
                        <p>Thank you for your time.</p>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"><Check className="w-4 h-4" />Approve</Button>
                        <Button variant="outline" className="gap-2 border-border text-foreground"><Download className="w-4 h-4" />PDF</Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>
  );
}
