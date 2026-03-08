import { FileText, Sparkles, StickyNote, MessageSquare } from "lucide-react";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { key: "transcript", label: "Transcript", icon: FileText },
  { key: "suggestions", label: "Suggestions", icon: Sparkles },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "chat", label: "Chat", icon: MessageSquare },
];

export default function MobileSessionTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex md:hidden">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
            activeTab === key ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Icon className="w-5 h-5" />
          {label}
        </button>
      ))}
    </div>
  );
}
