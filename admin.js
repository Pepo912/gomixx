(() => {
  const cfg = window.GOMIXX_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("PEGAR_") && !cfg.SUPABASE_ANON_KEY.includes("PEGAR_");
  const status = document.getElementById("admin-status");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const codeForm = document.getElementById("code-create-form");
  const newCode = document.getElementById("new-code");
  const spinsBody = document.getElementById("spins-body");
  let supabase = null;

  const setStatus = (message, kind = "") => {
    status.textContent = message;
    status.className = "status " + kind;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));

  if (configured && window.supabase) {
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  } else {
    setStatus("Falta configurar Supabase. Seguí los pasos del archivo LEEME.", "error");
    loginForm.querySelector("button").disabled = true;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setStatus("Iniciando sesión…");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("No se pudo iniciar sesión. Revisá el correo, la contraseña y que el usuario esté habilitado.", "error");
      return;
    }
    dashboard.classList.remove("hidden");
    setStatus("Sesión iniciada.", "success");
    await refreshSpins();
  });

  document.getElementById("logout-button").addEventListener("click", async () => {
    await supabase.auth.signOut();
    dashboard.classList.add("hidden");
    newCode.classList.add("hidden");
    setStatus("Sesión cerrada.");
  });

  codeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const button = codeForm.querySelector("button");
    button.disabled = true;
    const orderReference = document.getElementById("order-reference").value.trim();
    setStatus("Generando código…");
    try {
      const { data, error } = await supabase.rpc("issue_purchase_code", {
        p_order_reference: orderReference || null
      });
      if (error) throw error;
      newCode.innerHTML = `<strong>Código de esta compra</strong><div class="generated-code">${esc(data)}</div><p>Entregale este código al cliente. Se puede usar una sola vez.</p><button type="button" id="copy-code" class="secondary">Copiar código</button>`;
      newCode.classList.remove("hidden");
      document.getElementById("copy-code").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(String(data));
          setStatus("Código copiado.", "success");
        } catch {
          setStatus("Seleccioná y copiá el código manualmente.", "error");
        }
      });
      document.getElementById("order-reference").value = "";
      setStatus("Código creado. Entregalo únicamente después de confirmar el pago.", "success");
    } catch (error) {
      setStatus("No se pudo crear el código. Verificá que tu usuario esté autorizado como administrador y que hayas ejecutado el SQL de instalación.", "error");
    } finally {
      button.disabled = false;
    }
  });

  async function refreshSpins() {
    if (!supabase) return;
    spinsBody.innerHTML = "<tr><td colspan='4'>Cargando…</td></tr>";
    const { data, error } = await supabase.rpc("admin_list_spins");
    if (error) {
      spinsBody.innerHTML = "<tr><td colspan='4'>No se pudieron cargar las jugadas. Confirmá que tu usuario esté registrado como administrador.</td></tr>";
      return;
    }
    if (!data || !data.length) {
      spinsBody.innerHTML = "<tr><td colspan='4'>Todavía no hay premios ganados.</td></tr>";
      return;
    }
    spinsBody.innerHTML = data.map(row => `<tr><td>${esc(new Date(row.spin_created_at).toLocaleString("es-AR"))}</td><td>${esc(row.code)}</td><td>${esc(row.order_reference || "—")}</td><td><strong>${esc(row.prize_name)}</strong><br><span class="muted">${esc(row.prize_description || "")}</span></td></tr>`).join("");
  }
  document.getElementById("refresh-button").addEventListener("click", refreshSpins);
})();
