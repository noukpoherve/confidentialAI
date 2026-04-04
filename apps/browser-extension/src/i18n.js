/**
 * UI strings for Confidential Agent (English / French).
 * Loaded before options.js, popup.js, and contentScript.js.
 */
(function initI18n(global) {
  const UI_LOCALE_KEY = "uiLocale";
  const SUPPORTED = Object.freeze(["en", "fr"]);

  function detectDefaultLocale() {
    try {
      const lang = (navigator.language || "en").slice(0, 2).toLowerCase();
      return lang === "fr" ? "fr" : "en";
    } catch {
      return "en";
    }
  }

  function normalizeLocale(raw) {
    if (raw === "fr" || raw === "en") return raw;
    return detectDefaultLocale();
  }

  /**
   * @param {string} key
   * @param {string} locale
   * @param {Record<string, string | number>|undefined} vars
   */
  function t(key, locale, vars) {
    const loc = normalizeLocale(locale);
    let s = MESSAGES[loc]?.[key] ?? MESSAGES.en[key] ?? key;
    if (vars && typeof s === "string") {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(vars[k]));
      });
    }
    return s;
  }

  async function getUiLocale() {
    try {
      const data = await chrome.storage.sync.get([UI_LOCALE_KEY]);
      if (data[UI_LOCALE_KEY] === "en" || data[UI_LOCALE_KEY] === "fr") {
        return data[UI_LOCALE_KEY];
      }
    } catch (_) {
      /* ignore */
    }
    return detectDefaultLocale();
  }

  /**
   * Apply [data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-html], [data-i18n-aria-label]
   */
  function applyDocumentI18n(root, locale) {
    const loc = normalizeLocale(locale);
    const doc = root && root.querySelectorAll ? root : document;
    doc.documentElement.lang = loc;

    doc.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key, loc);
    });
    doc.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (key) el.innerHTML = t(key, loc);
    });
    doc.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key && "placeholder" in el) el.placeholder = t(key, loc);
    });
    doc.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (!key) return;
      const text = t(key, loc);
      if (el.tagName === "TITLE") {
        el.textContent = text;
      } else {
        el.title = text;
      }
    });
    doc.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      if (key) el.setAttribute("aria-label", t(key, loc));
    });
  }

  const MESSAGES = {
    en: {
      language_section_title: "Language",
      language_section_subtitle: "Interface language for the extension (popup, settings, on-page messages)",
      language_en: "English",
      language_fr: "Français",

      opt_page_title: "Confidential Agent — Settings",
      opt_brand: "Confidential Agent",
      opt_settings: "Settings",
      opt_save: "Save settings",
      opt_account_title: "Account",
      opt_account_subtitle: "Sync your settings and platform list across devices",
      opt_account_blurb:
        "Sign in to save your platform list to your account. Each user manages their own platforms independently.",
      opt_email_ph: "Email address",
      opt_password_ph: "Password",
      opt_login: "Log in",
      opt_signup: "Sign up",
      opt_synced: "Settings synced to your account",
      opt_logout: "Log out",
      opt_api_title: "API Connection",
      opt_api_subtitle: "Backend service URL",
      opt_quick_presets: "Quick presets",
      opt_preset_local: "Local · localhost:8080",
      opt_preset_prod: "Production · Koyeb",
      opt_backend_url: "Backend URL",
      opt_backend_url_ph: "http://localhost:8080",
      opt_test_connection: "Test connection",
      opt_api_custom_hint:
        "For a custom API host, save settings once and approve the permission prompt so the extension can reach your server.",
      opt_active_base: "Active base URL: {{url}}",
      opt_env_local: "Environment: local development (no extra host permission).",
      opt_env_production: "Environment: production API (no extra host permission).",
      opt_env_custom: "Environment: custom API — Chrome will ask to allow this host when you save.",
      opt_protection_title: "Protection",
      opt_protection_subtitle: "Core guardrail and anonymization settings",
      opt_guardrail: "Enable guardrail",
      opt_guardrail_desc: "Master switch. When off, no analysis is performed on any platform.",
      opt_auto_anon: "Auto-anonymize sensitive data",
      opt_auto_anon_desc:
        "When on, the AI automatically redacts detected sensitive fragments instead of asking you to edit manually.",
      opt_imgmod_title: "Image Moderation",
      opt_imgmod_subtitle: "Scan uploads for sensitive visual content",
      opt_imgmod_enable: "Enable image moderation",
      opt_imgmod_enable_desc:
        "Every image you attach or paste is analyzed before upload. Detects sexual content, graphic violence, hate symbols, self-harm and harassment. Works on AI platforms and social networks.",
      opt_imgmod_note_html:
        "Requires an OpenAI API key on the backend. Uses <strong>omni-moderation-latest</strong>. If no key is configured the extension fails open — uploads are not blocked.",
      opt_platforms_title: "Protected Platforms",
      opt_platforms_subtitle: "Choose which platforms are monitored",
      opt_ai_badge: "AI",
      opt_ai_group: "AI Assistants",
      opt_social_badge: "SOCIAL",
      opt_social_group: "Social Networks",
      opt_custom_title: "My Custom Platforms",
      opt_custom_subtitle: "Your personal list — synced to your account when logged in",
      opt_login_sync_badge: "Login to sync",
      opt_no_custom: "No custom platforms added yet.",
      opt_add_platform: "Add a platform",
      opt_domain_ph: "example.com or full URL with path",
      opt_domain_hint:
        "Enter a domain (e.g. example.com) to protect the whole site, or a full URL with a path to protect only that page and subpaths (e.g. https://github.com/org/repo/pull/1).",
      opt_domain_invalid: "Invalid domain or URL. Use a host like example.com or a full https:// URL.",
      opt_label_ph: "Label (optional)",
      opt_text_dlp: "Text DLP",
      opt_image_mod_short: "Image moderation",
      opt_add_btn: "+ Add",
      opt_save_notice: "Settings saved",
      opt_fill_auth: "Please fill in email and password.",
      opt_invalid_url: "Invalid backend URL.",
      opt_url_scheme: "URL must start with http:// or https://.",
      opt_perm_denied: "Allow host access for this API, or use Local / Production presets.",
      opt_perm_error: "Permission error",
      opt_domain_empty: "Please enter a domain (e.g. example.com).",
      opt_domain_dup: "This site or URL rule is already in your list.",
      opt_save_perm_fail: "Could not obtain permission for this API URL.",
      opt_saved_synced: "Settings saved & synced to your account.",
      opt_saved_local: "Settings saved locally.",
      opt_conn_ok: "Connection OK — /health responded successfully.",
      opt_conn_fail: "Connection failed: {{msg}}",
      opt_logged_in: "Logged in. Settings synced from your account.",
      opt_logged_out: "Logged out.",
      opt_notice_local_saved: "Backend URL saved: local (http://localhost:8080).",
      opt_notice_prod_saved: "Backend URL saved: production.",
      opt_remove_title: "Remove",
      opt_badge_img: "IMG",
      opt_badge_txt: "TXT",

      pop_subtitle: "AI Privacy Guardrail",
      pop_toggle_title: "Enable / disable guardrail",
      pop_paused: "Guardrail paused — prompts unprotected",
      pop_status_connecting: "Connecting…",
      pop_status_checking: "Checking API endpoint",
      pop_api_ok: "API Connected",
      pop_api_err: "API Error",
      pop_api_unreachable: "API Unreachable",
      pop_no_platform: "No AI platform detected",
      pop_protected: "Protected",
      pop_not_monitored: "Not monitored",
      pop_stat_analyzed: "Analyzed",
      pop_stat_blocked: "Blocked",
      pop_settings: "Settings",

      cs_ext_refresh: "Extension updated — please refresh this tab to restore protection.",
      cs_unknown_msg_err: "Unknown extension messaging error",
      cs_title_block: "Prompt blocked",
      cs_title_warn: "Sensitive data detected",
      cs_title_anon: "Prompt will be anonymized",
      cs_brand_subtitle: "Confidential Agent",
      cs_close_aria: "Close",
      cs_risk_score: "Risk score",
      cs_desc_block: "This prompt cannot be sent. Remove the flagged data before retrying.",
      cs_desc_warn: "Review the detected content. You can auto-filter or edit manually before sending.",
      cs_desc_anon: "Sensitive data will be replaced with placeholders before the prompt is sent.",
      cs_edit_label_anon: "Anonymized prompt — review before sending",
      cs_edit_label_manual: "Your prompt — edit to remove sensitive data",
      cs_btn_auto_send: "Auto-filter & send",
      cs_btn_edit: "Edit",
      cs_btn_hide_editor: "Hide editor",
      cs_btn_send_edited: "Send edited",
      cs_btn_cancel: "Cancel",
      cs_modal_err: "Unknown modal rendering error",
      cs_rephrase_title: "Language improvement suggested",
      cs_rephrase_sub: "Confidential Agent · Tone moderation",
      cs_rephrase_desc_suggestions:
        "Offensive or aggressive language was detected. Choose a kinder alternative, edit manually, or send the original.",
      cs_rephrase_desc_none: "Offensive or aggressive language was detected. Please review your message.",
      cs_suggested_alt: "Suggested alternatives",
      cs_option_n: "Option {{n}}",
      cs_option_1: "💡 Option 1",
      cs_option_2: "💡 Option 2",
      cs_option_3: "💡 Option 3",
      cs_use_this: "Use this ✓",
      cs_edit_tone: "Your message — edit to improve tone",
      cs_edit_manually: "Edit manually",
      cs_send_edited: "Send edited",
      cs_send_original: "Send original",
      cs_rephrase_err: "Unknown error",
      cs_toast_cancel: "Cancel",
      cs_toast_confirm: "Confirm",
      cs_keep_visible: "Keep visible",
      cs_hide: "Hide",
      cs_flagged_image_banner:
        "🛡  Flagged image — remove it from your message, then click confirm to unlock Send.",
      cs_unlock_send: "I've removed it — unlock Send ✓",
      cs_det_API_KEY: "🔑 API Key",
      cs_det_PASSWORD: "🔒 Password",
      cs_det_TOKEN: "🎫 Token",
      cs_det_EMAIL: "✉ Email",
      cs_det_PHONE: "📞 Phone",
      cs_det_IBAN: "🏦 IBAN",
      cs_det_SWIFT_BIC: "🏛 SWIFT/BIC",
      cs_det_LEGAL_HR: "📋 HR / health / family",
      cs_det_SOURCE_CODE: "💻 Source code",
      cs_det_INTERNAL_URL: "🔗 Internal URL",
      cs_det_PROMPT_INJECTION: "⚠ Injection",
      cs_det_LLM_SENSITIVE: "🤖 Semantic PII",
      cs_det_TOXIC_LANGUAGE: "💬 Toxic language",
      cs_det_HARMFUL_URL: "🔗 Harmful link",
      // spaCy NER semantic labels (API uses French codes; show English in UI when locale is en)
      cs_det_PERSONNE: "👤 Person",
      cs_det_LIEU: "📍 Location",
      cs_det_ORGANISATION: "🏢 Organization",
      cs_det_DATE: "📅 Date",
      cs_det_HORAIRE: "🕐 Time",
      "cs_det_INFORMATION_FINANCIÈRE": "💰 Financial information",
      cs_det_INFORMATION_PERSONNELLE: "📋 Personal information",
      cs_repr_TOXIC_LANGUAGE: "💬 Offensive language",
      cs_repr_AGGRESSION: "😠 Aggression",
      cs_repr_PROFANITY: "🤬 Profanity",
      cs_repr_INSULT: "🗣 Insult",
      cs_repr_HATE_SPEECH: "⛔ Hate speech",
      cs_repr_HARASSMENT: "🚨 Harassment",
      cs_img_block_title: "Image blocked",
      cs_img_warn_title: "Sensitive image detected",
      cs_img_filename: "image",
      cs_img_status_block: "Upload prevented — content policy violation",
      cs_img_status_warn: "Potentially violates content policy",
      cs_detected_content: "Detected content",
      cs_img_desc_block:
        "This image cannot be uploaded. It contains content that violates safety policies.",
      cs_img_desc_warn:
        "This image may contain sensitive content. Uploading could violate platform policies.",
      cs_remove_image: "Remove image",
      cs_send_anyway: "Send anyway ⚠️",
      cs_analyzing_image: "Analyzing image…",
      cs_analyzing_paste: "Analyzing pasted image…",
      cs_remove_blocked: "🚫 Remove the blocked image before posting.",
      cs_auto_block: "Critical data redacted",
      cs_auto_warn: "Sensitive content removed",
      cs_auto_anon: "Personal data anonymized",
      cs_auto_generic: "Data anonymized",
      cs_auto_sent: "{{label}} — prompt sent automatically.",
      cs_auto_fail: "Could not auto-redact — please review and edit manually.",
      cs_msg_not_sent: "Message not sent. You can edit and retry.",
      cs_sending_original: "Sending original message.",
      cs_msg_updated: "Message updated — click Send to submit.",
      cs_msg_empty: "Message is empty. Please edit and retry.",
      cs_fallback_confirm: "Review panel could not be rendered. Apply auto-filter and continue?",
      cs_prompt_auto_filtered: "Prompt auto-filtered. Review it, then click Send.",
      cs_prompt_not_sent: "Prompt not sent. You can edit and retry.",
      cs_prompt_not_sent_alt: "Prompt not sent. You can edit and retry.",
      cs_manual_empty: "Prompt is empty. Please edit and retry.",
      cs_confirm_placeholders: "This prompt already contains redacted placeholders. Send it now?",
      cs_confirm_placeholders_ok: "No further redaction needed — this prompt already contains placeholders. Send now?",
      cs_could_not_redact: "Sensitive data could not be automatically redacted. Please edit the prompt manually to remove the flagged content.",
      cs_edited_ready: "Your edited prompt is ready. Click Send when ready.",
      cs_no_auto_redact: "No automatic redaction could be applied for this content. Please edit manually.",
      cs_auto_filtered_review: "Prompt auto-filtered. Review it, then click Send.",
      cs_scanning: "🔍 Scanning AI response…",
      cs_response_clean: "✅ Response scanned — no sensitive content.",
      cs_response_anon: "Sensitive data anonymized in response.",
      cs_response_warn: "This AI response may contain sensitive data.",
      cs_response_blurred: "Sensitive content has been blurred in this response.",
      cs_response_flagged: "Confidential Agent flagged this response as potentially sensitive. Review carefully before using.",
      cs_mask_hidden: "Response hidden by Confidential Agent.",
      cs_mask_offensive: "Response hidden — potentially offensive content.",
      cs_toxic_with_samples: "This AI response contains potentially offensive language ({{samples}}). Review before using.",
      cs_toxic_generic: "This AI response contains potentially offensive or aggressive language. Review before using.",
    },
    fr: {
      language_section_title: "Langue",
      language_section_subtitle:
        "Langue de l’interface de l’extension (popup, paramètres, messages sur la page)",
      language_en: "English",
      language_fr: "Français",

      opt_page_title: "Confidential Agent — Paramètres",
      opt_brand: "Confidential Agent",
      opt_settings: "Paramètres",
      opt_save: "Enregistrer",
      opt_account_title: "Compte",
      opt_account_subtitle: "Synchronisez vos réglages et la liste de plateformes entre appareils",
      opt_account_blurb:
        "Connectez-vous pour enregistrer votre liste de plateformes sur votre compte. Chaque utilisateur gère ses propres plateformes.",
      opt_email_ph: "Adresse e-mail",
      opt_password_ph: "Mot de passe",
      opt_login: "Connexion",
      opt_signup: "Créer un compte",
      opt_synced: "Paramètres synchronisés avec votre compte",
      opt_logout: "Déconnexion",
      opt_api_title: "Connexion API",
      opt_api_subtitle: "URL du service backend",
      opt_quick_presets: "Préréglages",
      opt_preset_local: "Local · localhost:8080",
      opt_preset_prod: "Production · Koyeb",
      opt_backend_url: "URL du backend",
      opt_backend_url_ph: "http://localhost:8080",
      opt_test_connection: "Tester la connexion",
      opt_api_custom_hint:
        "Pour un hôte API personnalisé, enregistrez une fois les paramètres et acceptez la demande d’autorisation pour que l’extension puisse joindre votre serveur.",
      opt_active_base: "URL de base active : {{url}}",
      opt_env_local: "Environnement : développement local (aucune autorisation d’hôte supplémentaire).",
      opt_env_production: "Environnement : API de production (aucune autorisation d’hôte supplémentaire).",
      opt_env_custom:
        "Environnement : API personnalisée — Chrome demandera d’autoriser cet hôte à l’enregistrement.",
      opt_protection_title: "Protection",
      opt_protection_subtitle: "Garde-fou et anonymisation",
      opt_guardrail: "Activer le garde-fou",
      opt_guardrail_desc: "Interrupteur principal. S’il est désactivé, aucune analyse n’est effectuée.",
      opt_auto_anon: "Anonymiser automatiquement les données sensibles",
      opt_auto_anon_desc:
        "Si activé, l’IA masque automatiquement les fragments sensibles détectés au lieu de vous demander une édition manuelle.",
      opt_imgmod_title: "Modération d’images",
      opt_imgmod_subtitle: "Analyser les fichiers joints pour détecter du contenu sensible",
      opt_imgmod_enable: "Activer la modération d’images",
      opt_imgmod_enable_desc:
        "Chaque image jointe ou collée est analysée avant l’envoi. Détecte contenu sexuel, violence graphique, symboles de haine, automutilation et harcèlement. Fonctionne sur les plateformes d’IA et les réseaux sociaux.",
      opt_imgmod_note_html:
        "Nécessite une clé API OpenAI côté backend. Utilise <strong>omni-moderation-latest</strong>. Sans clé, l’extension reste permissive — les envois ne sont pas bloqués.",
      opt_platforms_title: "Plateformes protégées",
      opt_platforms_subtitle: "Choisissez les plateformes surveillées",
      opt_ai_badge: "IA",
      opt_ai_group: "Assistants IA",
      opt_social_badge: "SOCIAL",
      opt_social_group: "Réseaux sociaux",
      opt_custom_title: "Mes plateformes personnalisées",
      opt_custom_subtitle: "Votre liste personnelle — synchronisée avec le compte si connecté",
      opt_login_sync_badge: "Connexion pour sync",
      opt_no_custom: "Aucune plateforme personnalisée pour l’instant.",
      opt_add_platform: "Ajouter une plateforme",
      opt_domain_ph: "exemple.com ou URL complète avec chemin",
      opt_domain_hint:
        "Indiquez un domaine (ex. exemple.com) pour tout le site, ou une URL complète avec un chemin pour limiter la protection à cette page et ses sous-chemins (ex. https://github.com/org/repo/pull/1).",
      opt_domain_invalid: "Domaine ou URL invalide. Utilisez un hôte du type exemple.com ou une URL https:// complète.",
      opt_label_ph: "Libellé (facultatif)",
      opt_text_dlp: "Texte DLP",
      opt_image_mod_short: "Modération image",
      opt_add_btn: "+ Ajouter",
      opt_save_notice: "Paramètres enregistrés",
      opt_fill_auth: "Veuillez saisir l’e-mail et le mot de passe.",
      opt_invalid_url: "URL du backend invalide.",
      opt_url_scheme: "L’URL doit commencer par http:// ou https://.",
      opt_perm_denied:
        "Autorisez l’accès à cet hôte pour cette API, ou utilisez les préréglages Local / Production.",
      opt_perm_error: "Erreur d’autorisation",
      opt_domain_empty: "Veuillez saisir un domaine (ex. exemple.com).",
      opt_domain_dup: "Ce site ou cette règle d’URL est déjà dans votre liste.",
      opt_save_perm_fail: "Impossible d’obtenir l’autorisation pour cette URL d’API.",
      opt_saved_synced: "Paramètres enregistrés et synchronisés avec votre compte.",
      opt_saved_local: "Paramètres enregistrés localement.",
      opt_conn_ok: "Connexion OK — /health a répondu correctement.",
      opt_conn_fail: "Échec de la connexion : {{msg}}",
      opt_logged_in: "Connecté. Paramètres synchronisés depuis votre compte.",
      opt_logged_out: "Déconnecté.",
      opt_notice_local_saved: "URL du backend enregistrée : local (http://localhost:8080).",
      opt_notice_prod_saved: "URL du backend enregistrée : production.",
      opt_remove_title: "Retirer",
      opt_badge_img: "IMG",
      opt_badge_txt: "TXT",

      pop_subtitle: "Garde-fou confidentialité IA",
      pop_toggle_title: "Activer / désactiver le garde-fou",
      pop_paused: "Garde-fou en pause — invites non protégées",
      pop_status_connecting: "Connexion…",
      pop_status_checking: "Vérification du point de terminaison API",
      pop_api_ok: "API connectée",
      pop_api_err: "Erreur API",
      pop_api_unreachable: "API inaccessible",
      pop_no_platform: "Aucune plateforme IA détectée",
      pop_protected: "Protégé",
      pop_not_monitored: "Non surveillé",
      pop_stat_analyzed: "Analysés",
      pop_stat_blocked: "Bloqués",
      pop_settings: "Paramètres",

      cs_ext_refresh: "Extension mise à jour — actualisez cet onglet pour rétablir la protection.",
      cs_unknown_msg_err: "Erreur de messagerie d’extension inconnue",
      cs_title_block: "Invite bloquée",
      cs_title_warn: "Données sensibles détectées",
      cs_title_anon: "L’invite sera anonymisée",
      cs_brand_subtitle: "Confidential Agent",
      cs_close_aria: "Fermer",
      cs_risk_score: "Score de risque",
      cs_desc_block: "Cette invite ne peut pas être envoyée. Supprimez les données signalées puis réessayez.",
      cs_desc_warn:
        "Examinez le contenu détecté. Vous pouvez filtrer automatiquement ou modifier manuellement avant l’envoi.",
      cs_desc_anon: "Les données sensibles seront remplacées par des marqueurs avant l’envoi de l’invite.",
      cs_edit_label_anon: "Invite anonymisée — vérifiez avant envoi",
      cs_edit_label_manual: "Votre invite — modifiez pour retirer les données sensibles",
      cs_btn_auto_send: "Filtrer et envoyer",
      cs_btn_edit: "Modifier",
      cs_btn_hide_editor: "Masquer l’éditeur",
      cs_btn_send_edited: "Envoyer la version modifiée",
      cs_btn_cancel: "Annuler",
      cs_modal_err: "Erreur d’affichage du panneau de révision",
      cs_rephrase_title: "Amélioration du langage suggérée",
      cs_rephrase_sub: "Confidential Agent · Modération de ton",
      cs_rephrase_desc_suggestions:
        "Langage offensant ou agressif détecté. Choisissez une variante plus neutre, modifiez manuellement ou envoyez l’original.",
      cs_rephrase_desc_none: "Langage offensant ou agressif détecté. Veuillez relire votre message.",
      cs_suggested_alt: "Suggestions alternatives",
      cs_option_n: "Option {{n}}",
      cs_option_1: "💡 Option 1",
      cs_option_2: "💡 Option 2",
      cs_option_3: "💡 Option 3",
      cs_use_this: "Utiliser ceci ✓",
      cs_edit_tone: "Votre message — modifiez pour adoucir le ton",
      cs_edit_manually: "Modifier manuellement",
      cs_send_edited: "Envoyer la version modifiée",
      cs_send_original: "Envoyer l’original",
      cs_rephrase_err: "Erreur inconnue",
      cs_toast_cancel: "Annuler",
      cs_toast_confirm: "Confirmer",
      cs_keep_visible: "Garder visible",
      cs_hide: "Masquer",
      cs_flagged_image_banner:
        "🛡  Image signalée — retirez-la du message, puis confirmez pour déverrouiller Envoyer.",
      cs_unlock_send: "C’est retiré — déverrouiller Envoyer ✓",
      cs_det_API_KEY: "🔑 Clé API",
      cs_det_PASSWORD: "🔒 Mot de passe",
      cs_det_TOKEN: "🎫 Jeton",
      cs_det_EMAIL: "✉ E-mail",
      cs_det_PHONE: "📞 Téléphone",
      cs_det_IBAN: "🏦 IBAN",
      cs_det_SWIFT_BIC: "🏛 SWIFT/BIC",
      cs_det_LEGAL_HR: "📋 RH / santé / famille",
      cs_det_SOURCE_CODE: "💻 Code source",
      cs_det_INTERNAL_URL: "🔗 URL interne",
      cs_det_PROMPT_INJECTION: "⚠ Injection",
      cs_det_LLM_SENSITIVE: "🤖 PII sémantique",
      cs_det_TOXIC_LANGUAGE: "💬 Langage toxique",
      cs_det_HARMFUL_URL: "🔗 Lien nuisible",
      cs_det_PERSONNE: "👤 Personne",
      cs_det_LIEU: "📍 Lieu",
      cs_det_ORGANISATION: "🏢 Organisation",
      cs_det_DATE: "📅 Date",
      cs_det_HORAIRE: "🕐 Horaire",
      "cs_det_INFORMATION_FINANCIÈRE": "💰 Information financière",
      cs_det_INFORMATION_PERSONNELLE: "📋 Information personnelle",
      cs_repr_TOXIC_LANGUAGE: "💬 Langage offensant",
      cs_repr_AGGRESSION: "😠 Agressivité",
      cs_repr_PROFANITY: "🤬 Grossièretés",
      cs_repr_INSULT: "🗣 Insulte",
      cs_repr_HATE_SPEECH: "⛔ Discours de haine",
      cs_repr_HARASSMENT: "🚨 Harcèlement",
      cs_img_block_title: "Image bloquée",
      cs_img_warn_title: "Image sensible détectée",
      cs_img_filename: "image",
      cs_img_status_block: "Envoi empêché — violation des règles de contenu",
      cs_img_status_warn: "Peut violer les règles de contenu",
      cs_detected_content: "Contenu détecté",
      cs_img_desc_block:
        "Cette image ne peut pas être téléversée. Elle contient du contenu contraire aux règles de sécurité.",
      cs_img_desc_warn:
        "Cette image peut contenir du contenu sensible. L’envoi pourrait violer les règles de la plateforme.",
      cs_remove_image: "Retirer l’image",
      cs_send_anyway: "Envoyer quand même ⚠️",
      cs_analyzing_image: "Analyse de l’image…",
      cs_analyzing_paste: "Analyse de l’image collée…",
      cs_remove_blocked: "🚫 Retirez l’image bloquée avant de publier.",
      cs_auto_block: "Données critiques masquées",
      cs_auto_warn: "Contenu sensible retiré",
      cs_auto_anon: "Données personnelles anonymisées",
      cs_auto_generic: "Données anonymisées",
      cs_auto_sent: "{{label}} — invite envoyée automatiquement.",
      cs_auto_fail: "Anonymisation auto impossible — vérifiez et modifiez manuellement.",
      cs_msg_not_sent: "Message non envoyé. Vous pouvez modifier et réessayer.",
      cs_sending_original: "Envoi du message d’origine.",
      cs_msg_updated: "Message mis à jour — cliquez sur Envoyer pour soumettre.",
      cs_msg_empty: "Message vide. Modifiez et réessayez.",
      cs_fallback_confirm:
        "Le panneau de révision n’a pas pu s’afficher. Appliquer le filtre auto et continuer ?",
      cs_prompt_auto_filtered: "Invite filtrée automatiquement. Vérifiez-la, puis cliquez sur Envoyer.",
      cs_prompt_not_sent: "Invite non envoyée. Vous pouvez modifier et réessayer.",
      cs_prompt_not_sent_alt: "Invite non envoyée. Vous pouvez modifier et réessayer.",
      cs_manual_empty: "Invite vide. Modifiez et réessayez.",
      cs_confirm_placeholders: "Cette invite contient déjà des marqueurs masqués. L’envoyer maintenant ?",
      cs_confirm_placeholders_ok:
        "Plus d’anonymisation nécessaire — cette invite contient déjà des marqueurs. Envoyer maintenant ?",
      cs_could_not_redact:
        "Les données sensibles n’ont pas pu être masquées automatiquement. Modifiez l’invite manuellement pour retirer le contenu signalé.",
      cs_edited_ready: "Votre invite modifiée est prête. Cliquez sur Envoyer quand vous êtes prêt.",
      cs_no_auto_redact: "Aucun masquage automatique possible pour ce contenu. Modifiez manuellement.",
      cs_auto_filtered_review: "Invite filtrée automatiquement. Vérifiez-la, puis cliquez sur Envoyer.",
      cs_scanning: "🔍 Analyse de la réponse de l’IA…",
      cs_response_clean: "✅ Réponse analysée — aucun contenu sensible.",
      cs_response_anon: "Données sensibles anonymisées dans la réponse.",
      cs_response_warn: "Cette réponse de l’IA peut contenir des données sensibles.",
      cs_response_blurred: "Le contenu sensible a été flouté dans cette réponse.",
      cs_response_flagged:
        "Confidential Agent a signalé cette réponse comme potentiellement sensible. Vérifiez avant utilisation.",
      cs_mask_hidden: "Réponse masquée par Confidential Agent.",
      cs_mask_offensive: "Réponse masquée — contenu potentiellement offensant.",
      cs_toxic_with_samples:
        "Cette réponse contient un langage potentiellement offensant ({{samples}}). Vérifiez avant utilisation.",
      cs_toxic_generic:
        "Cette réponse contient un langage potentiellement offensant ou agressif. Vérifiez avant utilisation.",
    },
  };

  function detectionLabel(detectionType, locale) {
    const k = `cs_det_${detectionType}`;
    const s = t(k, locale);
    return s === k || s === `cs_det_${detectionType}` ? detectionType : s;
  }

  function rephraseLabel(detectionType, locale) {
    const k = `cs_repr_${detectionType}`;
    const s = t(k, locale);
    return s === k || s === `cs_repr_${detectionType}` ? detectionType : s;
  }

  /**
   * French spaCy bracket tags from the API → English tags inside [...] when UI is English.
   * Keys must match `app.agents.afe._map_spacy_label` outputs.
   */
  const FR_NER_BRACKET_INNER_TO_EN = {
    PERSONNE: "PERSON",
    LIEU: "LOCATION",
    ORGANISATION: "ORGANIZATION",
    DATE: "DATE",
    HORAIRE: "TIME",
    INFORMATION_FINANCIÈRE: "FINANCIAL_INFO",
    INFORMATION_PERSONNELLE: "PERSONAL_INFO",
  };

  /**
   * Rewrite [PERSONNE] → [PERSON], etc. for display when locale is en.
   */
  function localizeNerBracketPlaceholders(text, locale) {
    if (!text || normalizeLocale(locale) !== "en") return text;
    let out = String(text);
    for (const [frInner, enInner] of Object.entries(FR_NER_BRACKET_INNER_TO_EN)) {
      out = out.split(`[${frInner}]`).join(`[${enInner}]`);
    }
    return out;
  }

  global.ConfidentialAgentI18n = {
    UI_LOCALE_KEY,
    SUPPORTED,
    detectDefaultLocale,
    normalizeLocale,
    getUiLocale,
    t,
    applyDocumentI18n,
    detectionLabel,
    rephraseLabel,
    localizeNerBracketPlaceholders,
    FR_NER_BRACKET_INNER_TO_EN,
    MESSAGES,
  };
})(typeof self !== "undefined" ? self : window);
