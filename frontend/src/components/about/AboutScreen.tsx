"use client";

import { Mail, Globe } from "lucide-react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { Divider } from "@/components/ui/Divider";

interface AboutScreenProps {
  onBack: () => void;
  version: string;
  userName?: string;
}

export function AboutScreen({ onBack, version }: AboutScreenProps) {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <AppHeader title="Sobre" onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-16">
        {/* Hero institucional */}
        <div className="flex flex-col items-center py-4 gap-2 mb-4">
          <svg width="40" height="26" viewBox="0 0 40 26" aria-hidden>
            <circle cx="10" cy="13" r="10" fill="#FA6800" opacity="0.9" />
            <circle cx="28" cy="13" r="10" fill="#FA6800" opacity="0.5" />
          </svg>
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-extrabold text-laranja-360 leading-none">
              cimi
            </span>
            <span className="text-[17px] font-bold text-azul-noturno leading-none tracking-[1.2px]">
              LEADS
            </span>
          </div>
        </div>

        <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-laranja-360 mb-3">
          SOBRE O APP.
        </div>

        <p className="text-sm text-text-default leading-relaxed">
          O CIMI Leads é o aplicativo oficial de captura de contatos do
          ecossistema CIMI360. Desenvolvido para os eventos imobiliários do
          CIMI360, permite capturar, organizar e qualificar contatos em tempo
          real, sincronizando automaticamente com seu Google Contacts.
        </p>

        <div className="my-6"><Divider /></div>

        <Section title="Versão">
          <Card padding="md">
            <p className="text-sm text-text-default font-medium">v{version}</p>
          </Card>
        </Section>

        <div className="mt-6">
          <Section title="Suporte">
            {/* TODO: confirmar email de suporte definitivo com curadoria CIMI360 */}
            <div className="flex flex-col gap-3">
              <a
                href="mailto:suporte@cimi360.com.br"
                className="flex items-center gap-3 bg-white rounded-xl border border-border-default p-4"
              >
                <Mail size={16} strokeWidth={2} className="text-text-muted shrink-0" />
                <p className="text-sm text-text-default">suporte@cimi360.com.br</p>
              </a>
              <a
                href="https://cimi360.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-xl border border-border-default p-4"
              >
                <Globe size={16} strokeWidth={2} className="text-text-muted shrink-0" />
                <p className="text-sm text-text-default">cimi360.com.br</p>
              </a>
            </div>
          </Section>
        </div>

        <div className="mt-6">
          <Section title="Tecnologia">
            <Card padding="md" className="text-center">
              <span className="font-display text-2xl text-gyros-roxo">
                Gyros
              </span>
              <p className="text-sm text-text-default mt-1">
                Desenvolvido pela Gyros AI Solutions
              </p>
              <p className="text-xs italic text-text-muted mt-2">
                Tecnologia com alma
              </p>
              <a
                href="https://www.gyrosai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gyros-roxo underline mt-3 inline-block"
              >
                www.gyrosai.com
              </a>
            </Card>
          </Section>
        </div>
      </div>
    </div>
  );
}
