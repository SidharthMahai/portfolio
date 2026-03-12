document.documentElement.classList.add("js");

function initTheme() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const storageKey = "portfolio-theme";
  const systemDefault = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  let activeTheme = systemDefault;

  try {
    const savedTheme = window.localStorage.getItem(storageKey);
    if (savedTheme === "dark" || savedTheme === "light") {
      activeTheme = savedTheme;
    }
  } catch (_error) {
    activeTheme = systemDefault;
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("theme-dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    toggle.textContent = isDark ? "Light" : "Dark";
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }

  applyTheme(activeTheme);

  toggle.addEventListener("click", () => {
    activeTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
    applyTheme(activeTheme);
    try {
      window.localStorage.setItem(storageKey, activeTheme);
    } catch (_error) {
      // Ignore storage errors and keep runtime theme only.
    }
  });
}

function initThreeScene() {
  if (!window.THREE) return;

  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const keyLight = new THREE.PointLight(0xffffff, 1.8, 100);
  keyLight.position.set(4, 3, 8);
  scene.add(keyLight);

  const blobA = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.4, 8),
    new THREE.MeshStandardMaterial({
      color: 0xcde4ff,
      metalness: 0.05,
      roughness: 0.22,
      transparent: true,
      opacity: 0.92,
    })
  );
  blobA.position.set(-2.35, 0.2, -0.1);
  world.add(blobA);

  const blobB = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.1, 0.28, 140, 24),
    new THREE.MeshStandardMaterial({
      color: 0xbaf3dc,
      metalness: 0.15,
      roughness: 0.25,
      transparent: true,
      opacity: 0.88,
    })
  );
  blobB.position.set(2.1, -0.2, 0.65);
  world.add(blobB);

  const wireShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.75, 1),
    new THREE.MeshBasicMaterial({
      color: 0xb5bcff,
      wireframe: true,
      transparent: true,
      opacity: 0.23,
    })
  );
  world.add(wireShell);

  const particles = new THREE.BufferGeometry();
  const count = 550;
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    points[i] = (Math.random() - 0.5) * 26;
    points[i + 1] = (Math.random() - 0.5) * 18;
    points[i + 2] = (Math.random() - 0.5) * 20;
  }
  particles.setAttribute("position", new THREE.BufferAttribute(points, 3));

  const stardust = new THREE.Points(
    particles,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.45,
    })
  );
  scene.add(stardust);

  let mouseX = 0;
  let mouseY = 0;
  let scrollY = 0;

  window.addEventListener("pointermove", (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
  });

  window.addEventListener("scroll", () => {
    scrollY = window.scrollY || 0;
  });

  function animate() {
    requestAnimationFrame(animate);

    blobA.rotation.x += 0.0032;
    blobA.rotation.y += 0.0024;
    blobB.rotation.x -= 0.0028;
    blobB.rotation.y += 0.004;

    wireShell.rotation.y += 0.0018;
    wireShell.rotation.x -= 0.0008;

    world.rotation.y += (mouseX * 0.7 - world.rotation.y) * 0.03;
    world.rotation.x += (-mouseY * 0.5 - world.rotation.x) * 0.03;

    camera.position.y += (-scrollY / 1300 - camera.position.y) * 0.04;
    camera.position.x += (mouseX * 0.85 - camera.position.x) * 0.02;
    camera.lookAt(0, 0, 0);

    stardust.rotation.y += 0.00045;
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function initTilt() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".tilt-card").forEach((card) => {
    if (card.dataset.tiltReady === "true") return;
    card.dataset.tiltReady = "true";

    if (prefersReducedMotion) return;

    const isHero = card.classList.contains("hero");
    const maxRotate = isHero ? 5.5 : 7;
    const lift = isHero ? 8 : 6;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    function animateTilt() {
      currentX += (targetX - currentX) * 0.24;
      currentY += (targetY - currentY) * 0.24;
      card.style.transform = `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg) translateZ(${lift}px)`;

      if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
        frame = window.requestAnimationFrame(animateTilt);
      } else {
        frame = 0;
      }
    }

    function queueTilt() {
      if (frame) return;
      frame = window.requestAnimationFrame(animateTilt);
    }

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      targetY = (x - 0.5) * maxRotate * 2;
      targetX = (0.5 - y) * maxRotate * 1.6;
      queueTilt();
    });

    card.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      queueTilt();
    });
  });
}

function initSpotlight() {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    });
  });
}

function initReveal() {
  const items = [...document.querySelectorAll(".reveal")];
  if (!items.length) return;

  document.querySelectorAll("[data-stagger]").forEach((group) => {
    const staggerStep = Math.max(0, Number(group.dataset.stagger) || 80);
    [...group.children]
      .filter((child) => child.classList && child.classList.contains("reveal"))
      .forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * staggerStep, 420)}ms`;
        item.dataset.delayReady = "true";
      });
  });

  items.forEach((item, index) => {
    if (item.dataset.delayReady === "true") return;
    item.style.transitionDelay = `${Math.min(index * 55, 260)}ms`;
    item.dataset.delayReady = "true";
  });

  if (!window.IntersectionObserver) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  items.forEach((el) => {
    if (el.classList.contains("visible")) return;
    observer.observe(el);
  });
}

function initTerminalAnchors() {
  const terminalSection = document.getElementById("terminal");
  if (!terminalSection) return;

  function terminalTop() {
    const topbar = document.querySelector(".topbar");
    const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 0;
    const offset = window.innerWidth <= 930 ? 16 : topbarHeight + 20;
    return Math.max(0, terminalSection.getBoundingClientRect().top + window.scrollY - offset);
  }

  document.querySelectorAll('a[href="#terminal"]').forEach((link) => {
    if (link.dataset.terminalBind === "true") return;
    link.dataset.terminalBind = "true";

    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({ top: terminalTop(), behavior: "auto" });
    });
  });

  if (window.location.hash === "#terminal") {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: terminalTop(), behavior: "auto" });
    });
  }
}

function initTerminal() {
  const output = document.getElementById("terminal-output");
  const form = document.getElementById("terminal-form");
  const input = document.getElementById("terminal-input");
  const state = document.getElementById("terminal-state");
  const shell = document.querySelector(".terminal-shell");
  if (!output || !form || !input || !state || !shell) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const history = [];
  let historyIndex = -1;
  let queue = Promise.resolve();

  const commands = {
    help: {
      aliases: ["?", "ls", "menu"],
      run: () => [
        { text: "Available portfolio commands:", kind: "success" },
        { text: "help      list available commands", kind: "muted" },
        { text: "whoami    current role and engineering profile", kind: "muted" },
        { text: "expertise show ranked strengths", kind: "muted" },
        { text: "stack     inspect core technologies", kind: "muted" },
        { text: "github    jump to repository explorer", kind: "muted" },
        { text: "focus     inspect current engineering focus", kind: "muted" },
        { text: "clear     reset console output", kind: "muted" },
      ],
    },
    whoami: {
      aliases: ["profile", "about"],
      run: () => [
        { text: "Sidharth Mahai", kind: "success" },
        { text: "Software Developer at ExxonMobil", kind: "output" },
        { text: "6 years in full-stack product engineering", kind: "output" },
        { text: "Strong in React, Next.js, Angular, .NET, Git, Azure, and CI/CD", kind: "output" },
      ],
    },
    expertise: {
      aliases: ["cat expertise.rankings", "rankings"],
      run: () => [
        { text: "UI Development..............4.8/5", kind: "output" },
        { text: "Backend Development.........4.6/5", kind: "output" },
        { text: "Python + API Delivery.......3.7/5", kind: "output" },
        { text: "Cloud, CI/CD & Release Ops..4.4/5", kind: "output" },
        { text: "Code Collaboration..........4.7/5", kind: "output" },
        { text: "System Design & Ownership...4.3/5", kind: "output" },
      ],
    },
    stack: {
      aliases: ["skills", "cat skill-matrix.json"],
      run: () => [
        {
          text: '{ "strong": ["React.js", "Next.js", "Angular", ".NET", "Git", "Azure", "CI/CD"] }',
          kind: "output",
        },
        {
          text: '{ "medium": ["Python", "FastAPI", "IIS"], "working": ["AI integration", "system ownership"] }',
          kind: "output",
        },
      ],
    },
    github: {
      aliases: ["git profile --summary", "repos"],
      run: () => [
        { text: "GitHub module live.", kind: "success" },
        { text: "Repository cards are public-only and sorted by latest push.", kind: "output" },
        { text: "Use the language chips below to filter the grid.", kind: "muted" },
      ],
    },
    focus: {
      aliases: ["show current_focus --all", "current"],
      run: () => [
        { text: "1. End-to-end full-stack delivery", kind: "output" },
        { text: "2. Scalable frontend and API architecture", kind: "output" },
        { text: "3. Azure platform reliability and CI/CD", kind: "output" },
        { text: "4. AI-assisted developer workflows", kind: "output" },
      ],
    },
    clear: {
      aliases: ["reset"],
      run: () => [],
    },
  };

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function setState(label, isRunning) {
    state.textContent = label;
    state.classList.toggle("is-running", Boolean(isRunning));
  }

  function appendLine(kind) {
    const line = document.createElement("div");
    line.className = `terminal-line ${kind || "output"}`;
    output.appendChild(line);
    return line;
  }

  async function typeLine(text, kind) {
    const line = appendLine(kind);
    if (prefersReducedMotion || kind === "command") {
      line.textContent = text;
      output.scrollTop = output.scrollHeight;
      return;
    }

    for (let index = 0; index <= text.length; index += 1) {
      line.textContent = text.slice(0, index);
      output.scrollTop = output.scrollHeight;
      await wait(Math.min(18, Math.max(8, 160 / Math.max(text.length, 1))));
    }
  }

  function resolveCommand(raw) {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return null;

    return (
      Object.entries(commands).find(([key, config]) => {
        if (key === normalized) return true;
        return config.aliases.includes(normalized);
      }) || null
    );
  }

  async function runCommand(raw, options = {}) {
    const command = raw.trim();
    if (!command) return;

    if (!options.skipHistory) {
      history.push(command);
      historyIndex = history.length;
    }

    await typeLine(`visitor@sidharth:~$ ${command}`, "command");

    const match = resolveCommand(command);
    if (!match) {
      setState("error", false);
      await typeLine(`Command not found: ${command}`, "error");
      await typeLine("Run `help` to inspect available commands.", "muted");
      setState("ready", false);
      return;
    }

    const [key, config] = match;
    if (key === "clear") {
      output.innerHTML = "";
      setState("ready", false);
      return;
    }

    if (key === "github") {
      document.getElementById("github")?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }

    setState("running", true);
    const lines = config.run();
    for (const line of lines) {
      await typeLine(line.text, line.kind);
    }
    setState("ready", false);
  }

  function enqueue(command, options) {
    queue = queue
      .then(() => runCommand(command, options))
      .catch(() => setState("ready", false));
    return queue;
  }

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const { command } = button.dataset;
      if (!command) return;
      document.querySelectorAll("[data-command]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      enqueue(command);
      input.value = "";
      window.setTimeout(() => button.classList.remove("is-active"), 900);
      input.focus();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;
    enqueue(command);
    input.value = "";
  });

  shell.addEventListener("click", () => {
    input.focus();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      if (!history.length) return;
      event.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex] || "";
      return;
    }

    if (event.key === "ArrowDown") {
      if (!history.length) return;
      event.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] || "";
    }
  });

  setState("booting", true);
  enqueue("help", { skipHistory: true });
  queue = queue.then(async () => {
    setState("ready", false);
    await typeLine("Interactive shell online. Type a command or use the presets.", "muted");
  });
}

function initGithub() {
  const repoGrid = document.getElementById("github-repos");
  const stats = document.getElementById("github-stats");
  const filters = document.getElementById("github-filters");
  if (!repoGrid || !stats || !filters) return;

  const fallbackRepos = [
    {
      name: "Similarity",
      html_url: "https://github.com/SidharthMahai/Similarity",
      language: "HTML",
      pushed_at: "2025-08-14T15:57:39Z",
      description: "Frontend project for interaction and visual patterns.",
    },
    {
      name: "Returnify",
      html_url: "https://github.com/SidharthMahai/Returnify",
      language: "JavaScript",
      pushed_at: "2025-04-08T05:58:47Z",
      description: "Frontend project focused on workflow-oriented UX.",
    },
    {
      name: "TaxAnuman",
      html_url: "https://github.com/SidharthMahai/TaxAnuman",
      language: "JavaScript",
      pushed_at: "2023-04-29T10:40:45Z",
      description: "Frontend project exploring tax calculation flows and UI handling.",
    },
    {
      name: "TickTasks",
      html_url: "https://github.com/SidharthMahai/TickTasks",
      language: "TypeScript",
      pushed_at: "2022-09-27T07:03:09Z",
      description: "Frontend project for task management interaction patterns.",
    },
  ];

  let activeFilter = "All";
  let currentRepos = [];
  const frontendLanguages = new Set(["html", "javascript", "typescript", "css"]);

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function languageAccent(language) {
    const accents = {
      TypeScript: "#4663ff",
      JavaScript: "#f5b43b",
      HTML: "#ff8d68",
      CSS: "#6dc7ff",
      Python: "#57c3a9",
      "C#": "#7a7cff",
      Shell: "#8ce6b8",
      Unknown: "#9aa9c2",
    };

    return accents[language] || "#59b5ff";
  }

  function projectSummary(repo) {
    const language = String(repo.language || "Unknown");
    const normalized = language.toLowerCase();

    if (frontendLanguages.has(normalized)) {
      return "Frontend project focused on UI behavior and client-side development.";
    }

    return repo.description || "Software project exploring backend and platform concepts.";
  }

  function renderSummary(repos) {
    const chips = [
      "live github sync",
      "frontend projects",
      "public repos only",
      "sorted by latest push",
      ...[...new Set(repos.map((repo) => repo.language || "Unknown"))].slice(0, 4),
    ];

    stats.innerHTML = chips
      .map((chip) => `<article class="mini"><p>${escapeHtml(chip)}</p></article>`)
      .join("");
  }

  function renderFilters(repos) {
    const options = [
      "All",
      ...[...new Set(repos.map((repo) => repo.language || "Unknown"))].sort((left, right) =>
        left.localeCompare(right)
      ),
    ];

    filters.innerHTML = options
      .map(
        (option) => `
          <button
            type="button"
            class="filter-chip ${option === activeFilter ? "is-active" : ""}"
            data-filter="${escapeHtml(option)}"
          >
            ${escapeHtml(option)}
          </button>
        `
      )
      .join("");
  }

  function renderRepoGrid() {
    const filteredRepos =
      activeFilter === "All"
        ? currentRepos
        : currentRepos.filter((repo) => (repo.language || "Unknown") === activeFilter);

    if (!filteredRepos.length) {
      repoGrid.innerHTML = `
        <article class="repo-card">
          <h3>No repositories in this filter</h3>
          <p>Try another language filter or switch back to All.</p>
        </article>
      `;
      return;
    }

    const revealDirections = ["reveal-left", "reveal-up", "reveal-right"];

    repoGrid.innerHTML = filteredRepos
      .slice(0, 8)
      .map(
        (repo, index) => `
        <article class="repo-card repo-card-v${(index % 3) + 1} tilt-card reveal ${
          revealDirections[index % revealDirections.length]
        }" style="--repo-accent: ${languageAccent(
          repo.language || "Unknown"
        )}">
          <h3>${escapeHtml(repo.name)}</h3>
          <p>${escapeHtml(projectSummary(repo))}</p>
          <div class="repo-meta">
            <span class="repo-chip">${escapeHtml(repo.language || "Unknown")}</span>
            <span class="repo-chip">updated ${formatDate(repo.pushed_at)}</span>
          </div>
          <a class="repo-link" href="${escapeHtml(
            repo.html_url
          )}" target="_blank" rel="noreferrer">open repo -></a>
        </article>
      `
      )
      .join("");

    initTilt();
    initReveal();
  }

  function renderGitHub(repos) {
    currentRepos = [...repos].sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    renderSummary(currentRepos);
    renderFilters(currentRepos);
    renderRepoGrid();
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter || "All";
    renderFilters(currentRepos);
    renderRepoGrid();
  });

  fetch("https://api.github.com/users/SidharthMahai/repos?per_page=100&sort=updated")
    .then((res) => {
      if (!res.ok) throw new Error("GitHub fetch failed");
      return res.json();
    })
    .then((data) => {
      const publicRepos = Array.isArray(data) ? data.filter((repo) => !repo.fork) : [];
      renderGitHub(publicRepos.length ? publicRepos : fallbackRepos);
    })
    .catch(() => renderGitHub(fallbackRepos));
}

initTheme();
initThreeScene();
initTilt();
initSpotlight();
initReveal();
initTerminalAnchors();
initTerminal();
initGithub();
