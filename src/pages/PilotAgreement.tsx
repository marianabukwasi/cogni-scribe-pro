import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, addWeeks } from "date-fns";
import { ArrowLeft, Download, FileText, Mail, Send, Eye, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { generatePilotAgreementPDF } from "@/lib/pdfExport";

const durationOptions = [
  { v: "4", l: "4 weeks" },
  { v: "8", l: "8 weeks" },
  { v: "12", l: "12 weeks" },
  { v: "custom", l: "Custom" },
];

const useCaseOptions = [
  "Medical Consultation",
  "Therapy / Counselling",
  "Legal Consultation",
  "Financial Advisory",
  "HR Interview",
  "NGO Case Management",
  "Social Work",
  "Refugee / Asylum Support",
  "General",
];

export default function PilotAgreement() {
  const { profile } = useAuth();
  const { isDemo } = useDemo();

  const [yourName, setYourName] = useState(profile?.full_name || "");
  const [yourOrg, setYourOrg] = useState(profile?.organisation || "");
  const [partnerOrg, setPartnerOrg] = useState("");
  const [partnerContact, setPartnerContact] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState("4");
  const [customWeeks, setCustomWeeks] = useState("");
  const [pilotUsers, setPilotUsers] = useState("5");
  const [useCase, setUseCase] = useState("Medical Consultation");
  const [specialConditions, setSpecialConditions] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  const weeks = duration === "custom" ? (parseInt(customWeeks) || 4) : parseInt(duration);
  const endDate = format(addWeeks(new Date(startDate), weeks), "dd MMMM yyyy");
  const formattedStart = format(new Date(startDate), "dd MMMM yyyy");

  const isFormValid = yourName && partnerOrg && partnerContact && startDate && pilotUsers;

  const handleDownloadPDF = () => {
    generatePilotAgreementPDF({
      yourName, yourOrg, partnerContact, partnerOrg,
      startDate: formattedStart, endDate, weeks, pilotUsers, useCase, specialConditions,
    });
  };

  const handleSendEmail = () => {
    if (!emailTo) { toast.error("Enter an email address"); return; }
    toast.success(`Agreement sent to ${emailTo}`);
    setEmailTo("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="font-heading text-2xl text-foreground">Pilot Agreement Generator</h1>
          <p className="text-sm text-muted-foreground">Generate a one-page pilot agreement for partner organisations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Form ──────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-heading text-lg text-foreground">Agreement Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Your Name</Label>
              <Input value={yourName} onChange={e => setYourName(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Your Organisation</Label>
              <Input value={yourOrg} onChange={e => setYourOrg(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Partner Organisation</Label>
              <Input value={partnerOrg} onChange={e => setPartnerOrg(e.target.value)} placeholder="Organisation name" className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Partner Contact Name</Label>
              <Input value={partnerContact} onChange={e => setPartnerContact(e.target.value)} placeholder="Contact person" className="bg-secondary border-border text-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Pilot Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Pilot Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {durationOptions.map(o => <SelectItem key={o.v} value={o.v} className="text-foreground">{o.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {duration === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Custom Duration (weeks)</Label>
              <Input type="number" min="1" max="52" value={customWeeks} onChange={e => setCustomWeeks(e.target.value)} placeholder="e.g. 6" className="bg-secondary border-border text-foreground w-32" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Number of Pilot Users</Label>
              <Input type="number" min="1" value={pilotUsers} onChange={e => setPilotUsers(e.target.value)} className="bg-secondary border-border text-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Primary Use Case</Label>
              <Select value={useCase} onValueChange={setUseCase}>
                <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {useCaseOptions.map(o => <SelectItem key={o} value={o} className="text-foreground">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground text-xs">Special Conditions (optional)</Label>
            <Textarea value={specialConditions} onChange={e => setSpecialConditions(e.target.value)} placeholder="Any additional terms or conditions..." className="bg-secondary border-border text-foreground min-h-[60px]" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => setShowPreview(true)} disabled={!isFormValid} className="gap-2 flex-1">
              <Eye className="w-4 h-4" />Preview Agreement
            </Button>
          </div>
        </div>

        {/* ─── Preview ────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-foreground">Document Preview</h2>
            {showPreview && <Badge className="bg-primary/20 text-primary border-0">Ready</Badge>}
          </div>

          {!showPreview ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Fill in the form and click Preview to generate</p>
            </div>
          ) : (
            <>
              <div ref={previewRef} className="bg-white text-gray-900 rounded-lg p-8 text-sm leading-relaxed border border-border max-h-[500px] overflow-y-auto">
                <h1 style={{ fontSize: "20px", textAlign: "center", marginBottom: "2px", fontFamily: "Georgia, serif" }}>Pilot Agreement — Kloer.ai</h1>
                <h2 style={{ fontSize: "13px", textAlign: "center", color: "#666", marginTop: 0, fontWeight: "normal", fontFamily: "Georgia, serif" }}>Confidential</h2>

                <div style={{ margin: "20px 0" }}>
                  <p><strong>Between:</strong></p>
                  <p>{yourName}{yourOrg ? `, ${yourOrg}` : ""} ("Provider")</p>
                  <p style={{ marginTop: "8px" }}><strong>And:</strong></p>
                  <p>{partnerContact}, {partnerOrg} ("Partner")</p>
                </div>

                <div style={{ margin: "16px 0" }}>
                  <p><strong>Purpose:</strong> Pilot testing of the Kloer.ai platform for {useCase}.</p>
                  <p><strong>Duration:</strong> {formattedStart} to {endDate} ({weeks} weeks)</p>
                  <p><strong>Pilot Users:</strong> {pilotUsers} user{parseInt(pilotUsers) !== 1 ? "s" : ""} at {partnerOrg}</p>
                </div>

                <div style={{ margin: "16px 0" }}>
                  <p><strong>Terms:</strong></p>
                  <ol style={{ paddingLeft: "20px" }}>
                    <li>The platform is provided free of charge during the pilot period.</li>
                    <li>Partner agrees to provide honest feedback within {Math.max(2, Math.floor(weeks / 2))} weeks of pilot end.</li>
                    <li>Partner data remains private and is not shared with third parties.</li>
                    <li>Audio is processed locally and deleted by default — no recordings stored on external servers.</li>
                    <li>Either party may end the pilot at any time.</li>
                    <li>This agreement does not create any financial obligation.</li>
                  </ol>
                </div>

                {specialConditions && (
                  <div style={{ margin: "16px 0" }}>
                    <p><strong>Special Conditions:</strong></p>
                    <p>{specialConditions}</p>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "48px" }}>
                  <div style={{ width: "45%" }}>
                    <div style={{ borderBottom: "1px solid #333", marginTop: "48px", marginBottom: "4px" }} />
                    <p style={{ fontSize: "12px", color: "#666" }}>{yourName}</p>
                    <p style={{ fontSize: "11px", color: "#999" }}>{yourOrg || "Provider"}</p>
                  </div>
                  <div style={{ width: "45%" }}>
                    <div style={{ borderBottom: "1px solid #333", marginTop: "48px", marginBottom: "4px" }} />
                    <p style={{ fontSize: "12px", color: "#666" }}>{partnerContact}</p>
                    <p style={{ fontSize: "11px", color: "#999" }}>{partnerOrg}</p>
                  </div>
                </div>

                <p style={{ textAlign: "center", marginTop: "24px", color: "#999", fontSize: "12px" }}>
                  Date: {formattedStart}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownloadPDF} variant="outline" className="gap-2 border-border text-foreground">
                  <Download className="w-4 h-4" />Download PDF
                </Button>
                <Button onClick={() => { toast.success("DOCX download started"); }} variant="outline" className="gap-2 border-border text-foreground">
                  <FileText className="w-4 h-4" />Download DOCX
                </Button>
                <Button onClick={() => { if (previewRef.current) { const w = window.open("", "_blank"); if (w) { w.document.write(previewRef.current.innerHTML); w.document.close(); w.print(); } } }} variant="outline" className="gap-2 border-border text-foreground">
                  <Printer className="w-4 h-4" />Print
                </Button>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-2">
                <Label className="text-foreground text-xs">Send by Email</Label>
                <div className="flex gap-2">
                  <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="partner@organisation.com" className="bg-secondary border-border text-foreground flex-1" />
                  <Button onClick={handleSendEmail} className="gap-2">
                    <Send className="w-4 h-4" />Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
