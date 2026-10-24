(() => {
  const cfg = window.GOMIXX_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("PEGAR_") && !cfg.SUPABASE_ANON_KEY.includes("PEGAR_");
  const status = document.getElementById("status");
  const form = document.getElementById("code-form");
  const codeInput = document.getElementById("purchase-code");
  const verifyButton = document.getElementById("verify-button");
  const spinButton = document.getElementById("spin-button");
  const wheel = document.getElementById("wheel");
  const result = document.getElementById("result");
  let supabase = null;
  let validCode = "";
  let busy = false;

  const setStatus = (message, kind = "") => {
    status.textContent = message;
    status.className = "status " + kind;
  };

  if (configured && window.supabase) {
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  } else {
    setStatus("Falta configurar Supabase. Seguí los pasos del archivo LEEME.", "error");
    form.querySelector("button").disabled = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase || busy) return;
    validCode = "";
    spinButton.disabled = true;
    result.classList.add("hidden");
    const code = codeInput.value.trim().toUpperCase();
    if (!code) return;
    busy = true;
    verifyButton.disabled = true;
    setStatus("Validando código…");
    try {
      // La verificación definitiva ocurre al girar en el servidor; acá solo se prepara el flujo.
      // No se revela si el código existe hasta que se intenta usar la función segura.
      validCode = code;
      setStatus("Código ingresado. Cuando pulses girar, el servidor comprobará que sea válido y no esté usado.", "success");
      spinButton.disabled = false;
      spinButton.textContent = "Girar la ruleta";
    } catch (error) {
      setStatus("No se pudo validar el código. Probá de nuevo.", "error");
    } finally {
      busy = false;
      verifyButton.disabled = false;
    }
  });

  spinButton.addEventListener("click", async () => {
    if (!supabase || !validCode || busy) return;
    busy = true;
    spinButton.disabled = true;
    verifyButton.disabled = true;
    result.classList.add("hidden");
    setStatus("¡Girando! Estamos validando tu compra…");
    wheel.classList.remove("spinning");
    // Reiniciar animación CSS y comenzar otra vez.
    void wheel.offsetWidth;
    wheel.classList.add("spinning");
    try {
      const { data, error } = await supabase.rpc("spin_with_code", { p_code: validCode });
      if (error) throw error;
      const prize = data && data.prize_name;
      const description = data && data.prize_description;
      const rotation = 1440 + Math.floor(Math.random() * 720);
      wheel.style.setProperty("--final-rotation", `${rotation}deg`);
      window.setTimeout(() => {
        result.innerHTML = "";
        const heading = document.createElement("h3");
        heading.textContent = "¡Ganaste " + prize + "!";
        const detail = document.createElement("p");
        detail.textContent = description || "Guardá este resultado para canjearlo en tu próxima compra.";
        const ticket = document.createElement("p");
        ticket.className = "prize-code";
        ticket.textContent = "Código usado: " + validCode;
        result.append(heading, detail, ticket);
        result.classList.remove("hidden");
        setStatus("Premio registrado. ¡Gracias por comprar en Gomixx!", "success");
        spinButton.textContent = "Este código ya fue utilizado";
        validCode = "";
        codeInput.value = "";
        verifyButton.disabled = false;
        busy = false;
      }, 1800);
    } catch (error) {
      wheel.classList.remove("spinning");
      setStatus(error.message && error.message.toLowerCase().includes("used")
        ? "Este código ya fue utilizado. Cada compra habilita un solo giro."
        : "No pudimos validar el código. Revisá que sea correcto y que corresponda a una compra registrada.", "error");
      spinButton.disabled = true;
      spinButton.textContent = "Validá tu compra para girar";
      validCode = "";
      busy = false;
      verifyButton.disabled = false;
    }
  });
})();
