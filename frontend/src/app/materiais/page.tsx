"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Calendar, MapPin } from "lucide-react";
import {
  countActiveItems,
  getMaterialsCached,
  type MaterialItem,
  type MaterialProduct,
} from "@/lib/materials";
import { checkGoogleStatus, connectGoogle } from "@/lib/api";
import { LoginScreen } from "@/components/auth/LoginScreen";

const LANGUAGE_LABELS: Record<string, string> = {
  PT: "PT",
  ENG: "ENG",
  ESP: "ESP",
};

function LanguageBadge({ language }: { language: string | null }) {
  if (!language) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-app-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
      {LANGUAGE_LABELS[language] ?? language}
    </span>
  );
}

function ItemRow({ item }: { item: MaterialItem }) {
  const isEvent = item.kind === "evento";
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center">
          <p className="truncate text-sm font-medium text-text-default">
            {item.label}
          </p>
          <LanguageBadge language={item.language} />
        </div>
        {isEvent && (item.meta?.date || item.meta?.location) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
            {item.meta?.date && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={11} strokeWidth={2} />
                {item.meta.date}
              </span>
            )}
            {item.meta?.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} strokeWidth={2} />
                {item.meta.location}
              </span>
            )}
          </div>
        )}
      </div>
      {item.url && (
        <ExternalLink
          size={15}
          strokeWidth={2}
          className="ml-3 shrink-0 text-text-muted"
        />
      )}
    </>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center border-b border-border-default px-4 py-3 last:border-b-0 hover:bg-app-bg"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center border-b border-border-default px-4 py-3 last:border-b-0">
      {content}
    </div>
  );
}

function ProductBlock({ product }: { product: MaterialProduct }) {
  const activeCount = countActiveItems(product);
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[1.4px] text-laranja-360">
          {product.label}
        </h2>
        <span className="text-[11px] font-semibold text-text-muted">
          {activeCount} {activeCount === 1 ? "ativo" : "ativos"}
        </span>
      </div>
      {product.groups.map((group) => (
        <div key={group.name} className="mb-3">
          <p className="mb-1 px-1 text-[11px] font-semibold text-text-muted">
            {group.name}
          </p>
          <div className="overflow-hidden rounded-xl border border-border-default bg-white">
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MateriaisPage() {
  const [products, setProducts] = useState<MaterialProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  // Gate de login: mesmo gate das demais telas. null = ainda verificando.
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkGoogleStatus()
      .then((status) => {
        if (mounted) setAuthed(status.authenticated);
      })
      .catch(() => {
        if (mounted) setAuthed(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (authed !== true) return;
    let mounted = true;
    getMaterialsCached()
      .then((res) => {
        if (!mounted) return;
        setProducts(res.materials.products);
        setFromCache(res.offline);
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setFromCache(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [authed]);

  // Enquanto verifica a sessão, evita piscar conteúdo/login.
  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-laranja-360 border-t-transparent" />
      </div>
    );
  }

  if (!authed) {
    return (
      <LoginScreen
        onLogin={() => {
          setAuthLoading(true);
          connectGoogle(); // redireciona a página; authLoading fica no spinner do botão
        }}
        loading={authLoading}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-app-bg">
      <header className="sticky top-0 z-10 flex h-[54px] items-center border-b border-border-default bg-white px-1">
        <div className="flex w-11 shrink-0 items-center justify-start">
          <Link
            href="/"
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full"
          >
            <ChevronLeft size={22} strokeWidth={2.2} className="text-azul-noturno" />
          </Link>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <p className="truncate text-base font-bold tracking-tight text-azul-noturno">
            Materiais
          </p>
        </div>
        <div className="w-11 shrink-0" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-16">
        {fromCache && !loading && (
          <div className="mb-4 rounded-xl border border-warning-border bg-warning-bg px-3 py-2">
            <p className="text-[11px] text-warning-fg">
              Sem conexão — exibindo a última lista salva no aparelho.
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border-default bg-white p-6 text-center text-sm text-text-subtle">
            Carregando...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-border-default bg-white p-6 text-center text-sm text-text-muted">
            Nenhum material disponível no momento.
          </div>
        ) : (
          products.map((product) => (
            <ProductBlock key={product.key} product={product} />
          ))
        )}
      </div>
    </div>
  );
}
