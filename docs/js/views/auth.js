import { sb, check } from '../supa.js';
import { h, toast, errorToast } from '../ui.js';
import { APP_NAME } from '../config.js';
import { state, loadHouseholds } from '../state.js';

const redirectTo = () => window.location.origin + window.location.pathname;

function authShell(...content) {
  return h(
    'div',
    { class: 'auth-page' },
    h('div', { class: 'auth-card' }, h('div', { class: 'auth-logo' }, '🍳'), h('h1', {}, APP_NAME), ...content),
  );
}

/** Connexion / inscription / mot de passe oublié */
export function renderAuth(root) {
  let mode = 'login';
  const email = h('input', { type: 'email', required: true, autocomplete: 'email', placeholder: 'ton@email.fr' });
  const password = h('input', { type: 'password', required: true, minlength: 6, autocomplete: 'current-password', placeholder: '••••••••' });
  const submit = h('button', { class: 'btn primary block', type: 'submit' });
  const switchLink = h('button', { type: 'button', class: 'link' });
  const forgot = h('button', { type: 'button', class: 'link small', onClick: () => setMode('forgot') }, 'Mot de passe oublié ?');
  const pwdField = h('label', { class: 'field' }, 'Mot de passe', password);
  const subtitle = h('p', { class: 'muted center' });

  function setMode(m) {
    mode = m;
    subtitle.textContent = { login: 'Content de te revoir 👋', signup: 'Crée ton compte', forgot: 'Reçois un lien de réinitialisation' }[m];
    submit.textContent = { login: 'Se connecter', signup: "S'inscrire", forgot: 'Envoyer le lien' }[m];
    switchLink.textContent = m === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter';
    switchLink.onclick = () => setMode(m === 'login' ? 'signup' : 'login');
    pwdField.style.display = m === 'forgot' ? 'none' : '';
    password.required = m !== 'forgot';
    password.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
    forgot.style.display = m === 'login' ? '' : 'none';
  }

  const form = h(
    'form',
    {
      class: 'stack',
      onSubmit: async (e) => {
        e.preventDefault();
        submit.disabled = true;
        try {
          if (mode === 'login') {
            check(await sb.auth.signInWithPassword({ email: email.value.trim(), password: password.value }));
          } else if (mode === 'signup') {
            const data = check(
              await sb.auth.signUp({ email: email.value.trim(), password: password.value, options: { emailRedirectTo: redirectTo() } }),
            );
            if (!data.session) toast('Compte créé ! Clique sur le lien reçu par e-mail pour le confirmer.', 'success');
          } else {
            check(await sb.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: redirectTo() }));
            toast('E-mail envoyé. Vérifie ta boîte de réception.', 'success');
            setMode('login');
          }
        } catch (err) {
          errorToast(translateAuthError(err));
        } finally {
          submit.disabled = false;
        }
      },
    },
    h('label', { class: 'field' }, 'E-mail', email),
    pwdField,
    submit,
    forgot,
  );

  setMode('login');
  root.replaceChildren(authShell(subtitle, form, h('div', { class: 'center' }, switchLink)));
}

/** Après clic sur le lien "mot de passe oublié" */
export function renderRecovery(root, onDone) {
  const password = h('input', { type: 'password', required: true, minlength: 6, autocomplete: 'new-password' });
  root.replaceChildren(
    authShell(
      h('p', { class: 'muted center' }, 'Choisis un nouveau mot de passe'),
      h(
        'form',
        {
          class: 'stack',
          onSubmit: async (e) => {
            e.preventDefault();
            try {
              check(await sb.auth.updateUser({ password: password.value }));
              toast('Mot de passe modifié ✅', 'success');
              onDone();
            } catch (err) {
              errorToast(err);
            }
          },
        },
        h('label', { class: 'field' }, 'Nouveau mot de passe', password),
        h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer'),
      ),
    ),
  );
}

function translateAuthError(err) {
  const m = err?.message || '';
  if (/Invalid login credentials/i.test(m)) return new Error('E-mail ou mot de passe incorrect.');
  if (/Email not confirmed/i.test(m)) return new Error("Confirme d'abord ton e-mail (lien reçu à l'inscription).");
  if (/already registered/i.test(m)) return new Error('Un compte existe déjà avec cet e-mail.');
  if (/at least 6/i.test(m)) return new Error('Le mot de passe doit contenir au moins 6 caractères.');
  return err;
}

/** Formulaires "créer un espace" et "rejoindre un espace" (réutilisés dans les réglages) */
export function householdForms(onDone) {
  const myName = (state.user?.email || '').split('@')[0];

  const createName = h('input', { required: true, maxlength: 60, placeholder: 'Ex : Chez Luc & Léa' });
  const createMe = h('input', { required: true, maxlength: 40, value: myName });
  const joinCode = h('input', { required: true, maxlength: 8, placeholder: 'ABCD2345', style: { textTransform: 'uppercase' } });
  const joinMe = h('input', { required: true, maxlength: 40, value: myName });

  const create = h(
    'form',
    {
      class: 'card-box stack',
      onSubmit: async (e) => {
        e.preventDefault();
        try {
          const hh = check(await sb.rpc('create_household', { p_name: createName.value, p_display_name: createMe.value }));
          localStorage.setItem('recettes:household', hh.id);
          await loadHouseholds();
          toast('Espace créé 🎉', 'success');
          onDone();
        } catch (err) {
          errorToast(err);
        }
      },
    },
    h('h3', {}, '🏠 Créer un espace'),
    h('p', { class: 'muted small' }, 'Tu pourras ensuite inviter ton/ta partenaire ou ta famille avec un code.'),
    h('label', { class: 'field' }, "Nom de l'espace", createName),
    h('label', { class: 'field' }, 'Ton prénom', createMe),
    h('button', { class: 'btn primary block', type: 'submit' }, 'Créer'),
  );

  const join = h(
    'form',
    {
      class: 'card-box stack',
      onSubmit: async (e) => {
        e.preventDefault();
        try {
          const id = check(await sb.rpc('join_household', { p_code: joinCode.value, p_display_name: joinMe.value }));
          localStorage.setItem('recettes:household', id);
          await loadHouseholds();
          toast('Bienvenue dans cet espace 👋', 'success');
          onDone();
        } catch (err) {
          errorToast(err);
        }
      },
    },
    h('h3', {}, '🔑 Rejoindre un espace'),
    h('p', { class: 'muted small' }, "Demande le code d'invitation (Réglages → Mon espace)."),
    h('label', { class: 'field' }, "Code d'invitation", joinCode),
    h('label', { class: 'field' }, 'Ton prénom', joinMe),
    h('button', { class: 'btn block', type: 'submit' }, 'Rejoindre'),
  );

  return h('div', { class: 'two-cols' }, create, join);
}

export function renderOnboarding(root, onDone) {
  root.replaceChildren(
    h(
      'div',
      { class: 'auth-page' },
      h(
        'div',
        { class: 'onboarding' },
        h('div', { class: 'auth-logo' }, '🍳'),
        h('h1', { class: 'center' }, 'Ton espace recettes'),
        h('p', { class: 'muted center' }, "Un espace est partagé : recettes et liste de courses communes pour toute la maison."),
        householdForms(onDone),
        h('div', { class: 'center' }, h('button', { class: 'link', onClick: () => sb.auth.signOut() }, 'Se déconnecter')),
      ),
    ),
  );
}
