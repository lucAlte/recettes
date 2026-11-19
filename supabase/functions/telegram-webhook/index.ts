// =====================================================================
//  Edge Function Supabase : webhook du bot Telegram
//  Rôle : recevoir les liens Instagram partagés et les mettre en file d'attente.
//  Toujours en ligne (même PC éteint). n8n vide la file quand le PC s'allume.
//
//  Secrets requis (Edge Functions > Secrets) :
//    TELEGRAM_BOT_TOKEN       token donné par @BotFather
//    TELEGRAM_WEBHOOK_SECRET  chaîne aléatoire, identique à celle du setWebhook
//  (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement)
//
//  ⚠️ Désactiver "Verify JWT" sur cette fonction (Telegram n'envoie pas de JWT).
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

// Reels, posts et TV Instagram, avec ou sans nom de compte dans l'URL
const IG_RE =
  /https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]{5,})/i;

// URL normalisée = uniquement des caractères sûrs (aucune injection possible côté n8n)
function normalizeInstagramUrl(text: string): string | null {
  const m = text.match(IG_RE);
  if (!m) return null;
  const kind = m[1].toLowerCase().startsWith("reel") ? "reel" : m[1].toLowerCase();
  return `https://www.instagram.com/${kind}/${m[2]}/`;
}

async function reply(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

const HELP =
  "👋 <b>Bot Recettes</b>\n\n" +
  "1. Dans l'app : <i>Réglages → Bot Telegram</i>, appuie sur « Lier Telegram » (ou envoie <code>/lier CODE</code>).\n" +
  "2. Sur Instagram : <i>Partager → Telegram →</i> ce bot.\n" +
  "3. La recette arrive dans l'app au prochain démarrage de ton PC.\n\n" +
  "Commandes : /statut (file d'attente), /aide";

async function linkChat(chatId: number, code: string, username?: string) {
  const { data: hh } = await supabase
    .from("households")
    .select("id, name")
    .eq("telegram_link_code", code.trim().toUpperCase())
    .maybeSingle();
  if (!hh) {
    await reply(chatId, "❌ Code inconnu. Vérifie-le dans l'app (Réglages → Bot Telegram).");
    return;
  }
  const { error } = await supabase.from("telegram_links").upsert({
    chat_id: chatId,
    household_id: hh.id,
    telegram_username: username ?? null,
    linked_at: new Date().toISOString(),
  });
  if (error) throw error;
  await reply(chatId, `✅ Chat lié à l'espace <b>${escapeHtml(hh.name)}</b>.\nPartage-moi des Reels de recettes !`);
}

async function getHousehold(chatId: number): Promise<string | null> {
  const { data } = await supabase
    .from("telegram_links")
    .select("household_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data?.household_id ?? null;
}

async function status(chatId: number) {
  const hid = await getHousehold(chatId);
  if (!hid) return reply(chatId, "Ce chat n'est lié à aucun espace. " + HELP);
  const { data } = await supabase
    .from("import_queue")
    .select("status")
    .eq("household_id", hid)
    .in("status", ["pending", "processing", "error"]);
  const c = { pending: 0, processing: 0, error: 0 } as Record<string, number>;
  (data ?? []).forEach((r) => c[r.status]++);
  await reply(
    chatId,
    `📊 File d'attente\n⏳ En attente : ${c.pending}\n⚙️ En cours : ${c.processing}\n⚠️ En erreur : ${c.error}`,
  );
}

async function enqueue(chatId: number, url: string) {
  const hid = await getHousehold(chatId);
  if (!hid) {
    await reply(chatId, "🔗 Ce chat n'est pas encore lié à ton espace.\n\n" + HELP);
    return;
  }

  const { data: existing } = await supabase
    .from("import_queue")
    .select("id, status, recipe_id")
    .eq("household_id", hid)
    .eq("url", url)
    .maybeSingle();

  if (existing) {
    if (existing.status === "error" || (existing.status === "done" && !existing.recipe_id)) {
      await supabase
        .from("import_queue")
        .update({ status: "pending", attempts: 0, error: null, chat_id: chatId })
        .eq("id", existing.id);
      await reply(chatId, "🔁 Cette vidéo est remise dans la file d'attente.");
    } else if (existing.status === "done") {
      await reply(chatId, "📗 Cette recette est déjà dans ton carnet.");
    } else {
      await reply(chatId, "⏳ Cette vidéo est déjà dans la file d'attente.");
    }
    return;
  }

  const { error } = await supabase
    .from("import_queue")
    .insert({ household_id: hid, chat_id: chatId, url });
  if (error) throw error;

  const { count } = await supabase
    .from("import_queue")
    .select("id", { count: "exact", head: true })
    .eq("household_id", hid)
    .eq("status", "pending");

  await reply(
    chatId,
    `📥 Reçu ! ${count ?? 1} vidéo(s) en attente.\nElle sera importée dès que ton PC sera allumé.`,
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (!WEBHOOK_SECRET || req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("ok");
  }

  const msg = update.message ?? update.edited_message;
  if (!msg?.chat?.id) return new Response("ok");
  const chatId: number = msg.chat.id;
  const text: string = (msg.text ?? msg.caption ?? "").trim();

  try {
    const [cmd, arg] = text.split(/\s+/, 2);
    const command = cmd?.toLowerCase().replace(/@.*$/, "");

    if (command === "/start" && arg) await linkChat(chatId, arg, msg.from?.username);
    else if (command === "/lier" || command === "/link") {
      if (arg) await linkChat(chatId, arg, msg.from?.username);
      else await reply(chatId, "Utilisation : <code>/lier CODE</code>");
    } else if (command === "/statut") await status(chatId);
    else if (command === "/start" || command === "/aide" || command === "/help") await reply(chatId, HELP);
    else {
      const url = normalizeInstagramUrl(text);
      if (url) await enqueue(chatId, url);
      else await reply(chatId, "🤔 Je n'ai pas trouvé de lien Instagram (Reel ou post) dans ce message.");
    }
  } catch (e) {
    console.error(e);
    await reply(chatId, "⚠️ Erreur interne, réessaie dans un instant.").catch(() => {});
  }

  // Toujours 200, sinon Telegram renvoie le message en boucle
  return new Response("ok");
});
