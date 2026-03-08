import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface Question {
  id: string;
  text: string;
  helpText: string;
  type: string;
  required: boolean;
  sensitive: boolean;
  isSectionDivider?: boolean;
}

export default function IntakeForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [professionalName, setProfessionalName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [responseId, setResponseId] = useState("");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const load = async () => {
      // Fetch intake response by access token (public access)
      const { data: response } = await supabase
        .from("intake_responses")
        .select("*, intake_templates(*)")
        .eq("access_token", token)
        .single();

      if (!response) { setLoading(false); return; }
      if (response.completed) { setSubmitted(true); setLoading(false); return; }

      setResponseId(response.id);
      const template = response.intake_templates as any;
      if (template) {
        setQuestions((template.questions as Question[]) || []);
      }

      // Get professional info via secure function
      const { data: prof } = await supabase.rpc("get_professional_info", { p_user_id: response.professional_id });

      if (prof && prof.length > 0) {
        setProfessionalName(prof[0].full_name);
        setOrganisation(prof[0].organisation || "");
      }

      setLoading(false);
    };
    load();
  }, [token]);

  const activeQuestions = questions.filter(q => !q.isSectionDivider);
  const answeredCount = activeQuestions.filter(q => answers[q.id]?.trim()).length;
  const progress = activeQuestions.length > 0 ? (answeredCount / activeQuestions.length) * 100 : 0;

  const handleSubmit = async () => {
    const missing = activeQuestions.filter(q => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      toast.error(`Please answer all required questions (${missing.length} remaining)`);
      return;
    }

    const { error } = await supabase
      .from("intake_responses")
      .update({ responses: answers as any, completed: true })
      .eq("id", responseId);

    if (error) { toast.error("Failed to submit. Please try again."); return; }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading form...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Invalid or missing form link.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-600">Your responses have been submitted securely. Your professional will review them before your appointment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{professionalName}</h1>
          {organisation && <p className="text-gray-500 mt-1">{organisation}</p>}
        </div>

        {/* Consent */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          Your responses will be shared securely with <strong>{professionalName}</strong> to prepare for your appointment.
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{answeredCount} of {activeQuestions.length} answered</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-2 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q) => {
            if (q.isSectionDivider) {
              return <div key={q.id} className="border-t border-gray-200 my-8" />;
            }
            return (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {q.text}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {q.helpText && <p className="text-xs text-gray-500">{q.helpText}</p>}

                {q.type === "Long text" ? (
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={3}
                  />
                ) : q.type === "Yes/No" ? (
                  <div className="flex gap-3">
                    {["Yes", "No"].map(opt => (
                      <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                        className={`px-6 py-2 border rounded-lg text-sm transition-colors ${answers[q.id] === opt ? "bg-blue-500 text-white border-blue-500" : "border-gray-300 text-gray-700 hover:border-blue-300"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.type === "Date" ? (
                  <input type="date" value={answers[q.id] || ""}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                ) : q.type === "Number" ? (
                  <input type="number" value={answers[q.id] || ""}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    className="border border-gray-300 rounded-lg p-2 text-sm w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                ) : (
                  <input type="text" value={answers[q.id] || ""}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                )}
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="mt-10 pb-8">
          <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base">
            Submit Responses
          </Button>
        </div>
      </div>
    </div>
  );
}
