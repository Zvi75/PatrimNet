"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Quel est mon rendement net global ?",
  "Quels actifs ont un DSCR inférieur à 1.25 ?",
  "Résume les baux arrivant à échéance dans 90 jours",
  "Quelle est mon LTV et ma dette totale ?",
  "Quel actif génère le plus de revenus locatifs ?",
  "Compare la performance de mes actifs commerciaux vs résidentiels",
];

export function AIQueryInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: question.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.content,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
          setMessages((prev) => prev.slice(0, -1)); // remove placeholder
          return;
        }
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `Erreur : ${data.error ?? "Réponse inattendue"}` },
        ]);
        return;
      }

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: full }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Une erreur réseau est survenue." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  if (upgradeRequired) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-amber-400" />
        <p className="font-semibold text-amber-800">Fonctionnalité réservée au plan Pro</p>
        <p className="mt-1 text-sm text-amber-600">
          L'assistant IA est disponible à partir du plan Pro. Passez au plan supérieur pour poser
          des questions en langage naturel sur votre portefeuille.
        </p>
        <Button className="mt-4" onClick={() => (window.location.href = "/billing")}>
          Voir les plans →
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col rounded-xl border border-slate-200 bg-white">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Sparkles className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mb-1 font-semibold text-slate-700">Assistant patrimonial IA</p>
            <p className="mb-6 text-sm text-slate-400">
              Posez n'importe quelle question sur votre portefeuille
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs",
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-800",
                  )}
                >
                  {msg.content === "" && streaming && i === messages.length - 1 ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-slate-100 p-3">
        {messages.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={streaming}
                className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
            <button
              onClick={() => setMessages([])}
              disabled={streaming}
              className="ml-auto flex flex-shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" /> Réinitialiser
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question sur votre portefeuille… (Entrée pour envoyer)"
            rows={2}
            className="resize-none text-sm"
            disabled={streaming}
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0"
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-right text-[10px] text-slate-300">Propulsé par Claude Sonnet</p>
      </div>
    </div>
  );
}
