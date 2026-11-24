import { sb, check } from '../supa.js';
import { state, loadHouseholds, switchHousehold } from '../state.js';
import { TELEGRAM_BOT_USERNAME } from '../config.js';
import { h, toast, errorToast, modal, timeAgo } from '../ui.js';
import { householdForms } from './auth.js';

const STATUS = {
  pending: ['⏳', 'En attente'],
  processing: ['⚙️', 'En cours'],
  done: ['✅', 'Importée'],
  error: ['⚠️', 'Erreur'],
};

export async function settingsView(root, _params, rerender) {
  const hh = state.household;

  // --- Espace ---
  const hhName = h('input', { value: hh.name, maxlength: 60 });
  const myName = h('input', { value: state.me.display_name, maxlength: 40 });
  const members = h('ul', { class: 'simple-list' });
  const links = h('ul', { class: 'simple-list' });
  const imports = h('ul', { class: 'simple-list imports' });
  const planBox = h('div', { class: 'plan-status' });

  const copy = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg, 'success');
    } catch {
      prompt('Copie ce texte :', text);
    }
  };

  const inviteText = `Rejoins mon espace recettes 🍳\n1. Ouvre ${location.origin + location.pathname}\n2. Crée un compte\n3. « Rejoindre un espace » avec le code : ${hh.invite_code}`;
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Mes Recettes', text: inviteText }); } catch { /* annulé */ }
    } else copy(inviteText, 'Invitation copiée');
  };

  const deepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${hh.telegram_link_code}`;

  root.replaceChildren(
    h('h1', {}, 'Réglages'),

    h(
      'section',
      { class: 'card-box stack' },
      h('h2', {}, '🏠 Mon espace'),
      planBox,
      h(
        'div',
        { class: 'row gap wrap' },
        h('label', { class: 'field grow' }, "Nom de l'espace", hhName),
        h('button', {
          class: 'btn align-end',
          onClick: async () => {
            try {
              check(await sb.from('households').update({ name: hhName.value.trim() }).eq('id', hh.id));
              await loadHouseholds();
              toast('Nom mis à jour', 'success');
              rerender();
            } catch (e) { errorToast(e); }
          },
        }, 'Renommer'),
      ),
      h(
        'div',
        { class: 'invite' },
        h('div', {}, h('span', { class: 'muted small' }, "Code d'invitation"), h('div', { class: 'code' }, hh.invite_code)),
        h('div', { class: 'row gap' }, h('button', { class: 'btn small', onClick: () => copy(hh.invite_code, 'Code copié') }, 'Copier'), h('button', { class: 'btn small primary', onClick: share }, 'Inviter')),
      ),
      h('h3', {}, 'Membres'),
      members,
    ),

    h(
      'section',
      { class: 'card-box stack' },
      h('h2', {}, '🤖 Bot Telegram'),
      h('p', { class: 'muted small' }, 'Lie ton Telegram à cet espace, puis partage des Reels Instagram au bot : ils arrivent ici automatiquement.'),
      h('a', { class: 'btn primary', href: deepLink, target: '_blank', rel: 'noopener' }, '🔗 Lier Telegram (1 clic)'),
      h('p', { class: 'small' }, 'Ou envoie au bot : ', h('code', { class: 'code-inline', onClick: () => copy(`/lier ${hh.telegram_link_code}`, 'Commande copiée') }, `/lier ${hh.telegram_link_code}`)),
      h('h3', {}, 'Comptes Telegram liés'),
      links,
      h('button', {
        class: 'link small',
        onClick: async () => {
          if (!confirm("Régénérer les codes ? L'ancien code d'invitation et l'ancien code Telegram ne fonctionneront plus.")) return;
          try {
            check(await sb.rpc('regenerate_codes', { p_household: hh.id }));
            await loadHouseholds();
            rerender();
          } catch (e) { errorToast(e); }
        },
      }, '🔄 Régénérer les codes'),
    ),

    h(
      'section',
      { class: 'card-box stack' },
      h('div', { class: 'section-head' }, h('h2', {}, '📥 Imports Instagram'), h('button', { class: 'btn small ghost', onClick: loadImports }, 'Actualiser')),
      h('p', { class: 'muted small' }, 'Les vidéos sont traitées par n8n quand ton PC est allumé (toutes les 5 min).'),
      imports,
    ),

    h(
      'section',
      { class: 'card-box stack' },
      h('h2', {}, '👤 Mon profil'),
      h('p', { class: 'muted small' }, state.user.email),
      h(
        'div',
        { class: 'row gap wrap' },
        h('label', { class: 'field grow' }, 'Mon prénom dans cet espace', myName),
        h('button', {
          class: 'btn align-end',
          onClick: async () => {
            try {
              check(await sb.from('household_members').update({ display_name: myName.value.trim() || 'Moi' }).eq('household_id', hh.id).eq('user_id', state.user.id));
              await loadHouseholds();
              toast('Prénom mis à jour', 'success');
              loadMembers();
            } catch (e) { errorToast(e); }
          },
        }, 'Enregistrer'),
      ),
      h('button', { class: 'btn ghost', onClick: () => sb.auth.signOut() }, 'Se déconnecter'),
    ),

    h(
      'section',
      { class: 'card-box stack' },
      h('h2', {}, '🔀 Mes espaces'),
      state.memberships.length > 1
        ? h(
            'label',
            { class: 'field' },
            'Espace actif',
            h(
              'select',
              { value: hh.id, onChange: (e) => { switchHousehold(e.target.value); rerender(); location.hash = '#/recettes'; } },
              state.memberships.map((m) => h('option', { value: m.household_id }, m.households.name)),
            ),
          )
        : null,
      h(
        'div',
        { class: 'row gap wrap' },
        h('button', {
          class: 'btn',
          onClick: () => {
            const m = modal('Créer ou rejoindre un espace', householdForms(() => { m.close(); rerender(); location.hash = '#/recettes'; }), { wide: true });
          },
        }, '+ Créer / rejoindre un espace'),
        h('button', {
          class: 'btn ghost danger',
          onClick: async () => {
            if (!confirm(`Quitter l'espace « ${hh.name} » ? Tu n'auras plus accès à ses recettes.`)) return;
            try {
              check(await sb.from('household_members').delete().eq('household_id', hh.id).eq('user_id', state.user.id));
              localStorage.removeItem('recettes:household');
              await loadHouseholds();
              rerender();
              location.hash = '#/recettes';
            } catch (e) { errorToast(e); }
          },
        }, 'Quitter cet espace'),
      ),
    ),
  );

  // Statut de l'espace : essai (quota d'imports), validé ou suspendu
  async function loadPlan() {
    const { data } = await sb.from('households').select('status, import_count').eq('id', hh.id).single();
    if (!data) return;
    const limit = 5;
    if (data.status === 'approved') {
      planBox.replaceChildren(h('div', { class: 'banner ok' }, '✅ Espace validé : imports Instagram illimités'));
    } else if (data.status === 'blocked') {
      planBox.replaceChildren(h('div', { class: 'banner danger' }, '⛔ Imports Instagram suspendus pour cet espace'));
    } else {
      const used = Math.min(data.import_count, limit);
      planBox.replaceChildren(
        h('div', { class: 'banner' },
          h('div', { class: 'grow' },
            h('div', {}, `🧪 Espace en essai : ${used}/${limit} imports Instagram utilisés`),
            h('div', { class: 'quota-bar' }, h('span', { style: { width: `${(used / limit) * 100}%` } })),
            h('small', {}, used >= limit ? 'Validation demandée à l’administrateur.' : 'Au-delà, l’administrateur doit valider ton espace.'))),
      );
    }
  }

  async function loadMembers() {
    const rows = check(await sb.from('household_members').select('user_id, display_name, role').eq('household_id', hh.id));
    members.replaceChildren(
      ...rows.map((m) =>
        h('li', {}, m.role === 'owner' ? '👑 ' : '👤 ', m.display_name, m.user_id === state.user.id ? h('span', { class: 'muted' }, ' (moi)') : null),
      ),
    );
  }

  async function loadLinks() {
    const rows = check(await sb.from('telegram_links').select('chat_id, telegram_username, linked_at').eq('household_id', hh.id));
    links.replaceChildren(
      ...(rows.length
        ? rows.map((l) =>
            h(
              'li',
              {},
              h('span', {}, '✈️ ', l.telegram_username ? '@' + l.telegram_username : `Chat ${l.chat_id}`, h('span', { class: 'muted small' }, ` · ${timeAgo(l.linked_at)}`)),
              h('button', {
                class: 'icon-btn',
                title: 'Délier',
                onClick: async () => {
                  if (!confirm('Délier ce compte Telegram ?')) return;
                  try { check(await sb.from('telegram_links').delete().eq('chat_id', l.chat_id)); loadLinks(); } catch (e) { errorToast(e); }
                },
              }, '✕'),
            ),
          )
        : [h('li', { class: 'muted small' }, 'Aucun compte lié pour le moment.')]),
    );
  }

  async function loadImports() {
    const rows = check(
      await sb.from('import_queue').select('id, url, status, error, attempts, created_at, recipe_id').eq('household_id', hh.id).order('created_at', { ascending: false }).limit(25),
    );
    imports.replaceChildren(
      ...(rows.length
        ? rows.map((r) => {
            const [icon, label] = STATUS[r.status] || ['•', r.status];
            return h(
              'li',
              { class: `import-row ${r.status}` },
              h(
                'div',
                { class: 'grow' },
                h('div', {}, `${icon} ${label}`, h('span', { class: 'muted small' }, ` · ${timeAgo(r.created_at)}${r.attempts > 1 ? ` · ${r.attempts} essais` : ''}`)),
                h('a', { class: 'small break', href: r.url, target: '_blank', rel: 'noopener' }, r.url.replace('https://www.instagram.com', '')),
                r.error ? h('div', { class: 'small error-text' }, r.error) : null,
              ),
              r.status === 'done' && r.recipe_id ? h('a', { class: 'btn small', href: `#/recettes/${r.recipe_id}` }, 'Voir') : null,
              r.status === 'error'
                ? h('button', {
                    class: 'btn small',
                    onClick: async () => {
                      try {
                        check(await sb.from('import_queue').update({ status: 'pending', attempts: 0, error: null }).eq('id', r.id));
                        toast('Remis en file d\'attente', 'success');
                        loadImports();
                      } catch (e) { errorToast(e); }
                    },
                  }, 'Relancer')
                : null,
              r.status !== 'processing'
                ? h('button', {
                    class: 'icon-btn',
                    title: 'Supprimer de l\'historique',
                    onClick: async () => {
                      try { check(await sb.from('import_queue').delete().eq('id', r.id)); loadImports(); } catch (e) { errorToast(e); }
                    },
                  }, '✕')
                : null,
            );
          })
        : [h('li', { class: 'muted small' }, 'Aucun import pour le moment.')]),
    );
  }

  try {
    await Promise.all([loadMembers(), loadLinks(), loadImports(), loadPlan()]);
  } catch (e) {
    errorToast(e);
  }
}
