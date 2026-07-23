(() => {
  const content = document.getElementById("content");
  const layout = document.querySelector(".layout");
  if (!content || !layout) return;

  const icons = [
    ["schnellstart", "🚀"], ["installation", "🧩"], ["seiten", "🗂️"],
    ["home", "🏠"], ["solar", "☀️"], ["wetter", "🌦️"],
    ["energie", "⚡"], ["smart", "🔋"], ["einstellungen", "⚙️"],
    ["prognose", "🧠"], ["zahlen", "📊"], ["kein-bug", "💡"],
    ["fehler", "🔧"], ["faq", "❓"], ["glossar", "📖"]
  ];

  const iconFor = (id) => icons.find(([part]) => id.includes(part))?.[1] || "📘";

  const sidebarNav = document.querySelector(".sidebar .nav");
  if (sidebarNav) {
    sidebarNav.insertAdjacentHTML("afterbegin", [
      '<a class="nav-link level-1" href="#sensoren-und-config-flow">Einrichtung &amp; Sensoren</a>',
      '<a class="nav-link level-2" href="#flow-grundkonfiguration">Grundkonfiguration</a>',
      '<a class="nav-link level-2" href="#flow-energiefluesse">Energieflüsse</a>',
      '<a class="nav-link level-2" href="#flow-akku-zusatzdaten">Akku &amp; Zusatzdaten</a>',
      '<a class="nav-link level-2" href="#flow-verbraucher">Verbraucher</a>',
      '<a class="nav-link level-2" href="#flow-verbraucher-details">Verbraucher-Details</a>',
      '<a class="nav-link level-2" href="#flow-smart-charging">Smart Charging</a>',
      '<a class="nav-link level-2" href="#flow-erweitert">Erweitert</a>'
    ].join(""));
  }

  content.querySelectorAll("h1[id], h2[id]").forEach((heading) => {
    const icon = document.createElement("span");
    icon.className = "section-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconFor(heading.id);
    heading.prepend(icon);
  });

  const firstTitle = content.querySelector("h1");
  const firstIntro = firstTitle?.nextElementSibling;
  if (firstTitle && firstIntro) {
    const hero = document.createElement("section");
    hero.className = "doc-hero";
    hero.innerHTML = "<h2>Alles verstehen. Schnell finden. Sicher einordnen.</h2><p>Das Online-Handbuch führt von der Einrichtung über jede Seite und Karte bis zur Fehlerdiagnose.</p>";
    firstIntro.after(hero);

    const cards = document.createElement("div");
    cards.className = "card-grid";
    cards.innerHTML = [
      ["⚡", "Schnell starten", "Pflichtsensoren prüfen und erste Werte einordnen."],
      ["🗺️", "Seiten entdecken", "Classic und Modern sowie alle Karten gezielt nachschlagen."],
      ["🔧", "Probleme lösen", "Typische Zustände von echten Fehlern unterscheiden."]
    ].map(([icon, title, text]) => `<div class="feature-card"><span>${icon}</span><strong>${title}</strong><p>${text}</p></div>`).join("");
    hero.after(cards);
  }

  const visuals = {
    "schnellstart": "docs-assets/diagrams/data-flow.svg",
    "energiefluss": "docs-assets/diagrams/energy-flow.svg?v=4-20260721",
    "prognosevergleich": "docs-assets/diagrams/p10-comparison.svg",
    "wetter-energie-nur-modern": "docs-assets/diagrams/weather-to-energy.svg",
    "morning-forecast": "docs-assets/workflows/morning-forecast.svg"
  };

  Object.entries(visuals).forEach(([id, src]) => {
    const heading = document.getElementById(id);
    if (!heading) return;
    const image = document.createElement("img");
    image.className = "chapter-visual";
    image.src = src;
    image.alt = heading.textContent.trim();
    image.loading = "lazy";
    heading.after(image);
  });

  const screenshots = {
    "home": [["Classic", "docs-assets/screenshots/classic-home.png"], ["Modern", "docs-assets/screenshots/modern-home.png"]],
    "solar": [["Classic", "docs-assets/screenshots/classic-solar.png"], ["Modern", "docs-assets/screenshots/modern-solar.png"]],
    "wetter": [["Classic", "docs-assets/screenshots/classic-weather.png"], ["Modern", "docs-assets/screenshots/modern-weather.png"]],
    "energie-finanzen": [["Classic", "docs-assets/screenshots/classic-energy.png"], ["Modern", "docs-assets/screenshots/modern-energy-finance.png"]],
    "smart-charging": [["Classic", "docs-assets/screenshots/classic-smart.png"], ["Modern", "docs-assets/screenshots/modern-smart-charging.png"]],
    "einstellungen": [["Classic", "docs-assets/screenshots/classic-options.png"], ["Modern", "docs-assets/screenshots/modern-system-status.png"]],
    "prognosequalitat-nur-modern": [["Modern", "docs-assets/screenshots/modern-forecast-intelligence.png"]],
    "wetter-energie-nur-modern": [["Modern", "docs-assets/screenshots/modern-weather-energy.png"]]
  };

  Object.entries(screenshots).forEach(([id, entries]) => {
    const heading = document.getElementById(id);
    if (!heading) return;
    const gallery = document.createElement("figure");
    gallery.className = entries.length > 1 ? "screenshot-gallery" : "screenshot-gallery single";
    gallery.innerHTML = entries.map(([label, src]) => `<div><span class="screenshot-label">${label}</span><img src="${src}" alt="${heading.textContent.trim()} in der ${label}-Oberfläche" loading="lazy"></div>`).join("");
    const caption = document.createElement("figcaption");
    caption.textContent = `Aktueller Entwicklungsstand · Aufnahme vom 21. Juli 2026`;
    gallery.append(caption);
    heading.after(gallery);
  });

  const quickstart = document.getElementById("schnellstart");
  if (quickstart) {
    const callout = document.createElement("aside");
    callout.className = "callout tip";
    callout.innerHTML = "<strong>✅ Empfehlung</strong>Beginne mit Land und Hausverbrauch. Ergänze optionale Energieflüsse erst, wenn Richtung und Einheit sicher geprüft sind.";
    quickstart.after(callout);
  }

  const sensorSearch = document.getElementById("sensorSearch");
  const sensorStatus = document.getElementById("sensorSearchStatus");
  const sensorRows = [...content.querySelectorAll("[data-sensor-row]")];
  const sensorSections = [...content.querySelectorAll("[data-sensor-section]")];
  if (sensorSearch && sensorStatus && sensorRows.length) {
    const updateSensorResults = () => {
      const query = sensorSearch.value.trim().toLocaleLowerCase("de");
      let matches = 0;
      sensorRows.forEach((row) => {
        const visible = !query || row.textContent.toLocaleLowerCase("de").includes(query);
        row.classList.toggle("sensor-row-hidden", !visible);
        if (visible) matches += 1;
      });
      sensorSections.forEach((section) => {
        const hasVisibleRows = [...section.querySelectorAll("[data-sensor-row]")]
          .some((row) => !row.classList.contains("sensor-row-hidden"));
        section.classList.toggle("sensor-section-empty", Boolean(query) && !hasVisibleRows);
      });
      sensorStatus.textContent = query
        ? `${matches} passende ${matches === 1 ? "Sensorbeschreibung" : "Sensorbeschreibungen"}`
        : `${sensorRows.length} Sensorfelder aus allen Config-Flows`;
    };
    sensorSearch.addEventListener("input", updateSensorResults);
    updateSensorResults();
  }

  const noBug = document.getElementById("das-ist-wahrscheinlich-kein-bug");
  if (noBug) {
    const callout = document.createElement("aside");
    callout.className = "callout warn";
    callout.innerHTML = "<strong>🐞 Häufiges Missverständnis</strong>Fehlende Historie, noch nicht abgeschlossene Tage oder unveröffentlichte Preisdaten sind häufig erwartete Zustände.";
    noBug.after(callout);
  }

  const chapters = [...content.querySelectorAll("h1[id]")];
  chapters.slice(1).forEach((heading, index) => {
    const next = chapters[index + 2];
    const previous = chapters[index];
    const tools = document.createElement("nav");
    tools.className = "page-tools";
    tools.setAttribute("aria-label", "Kapitel-Navigation");
    tools.innerHTML = `${previous ? `<a href="#${previous.id}">← Vorherige Seite</a>` : ""}${next ? `<a href="#${next.id}">Nächste Seite →</a>` : ""}<a href="#sfml-stats-handbuch-version-2">⌂ Startseite</a><a href="#fehlerdiagnose">🔧 Fehlerdiagnose</a><a href="#das-ist-wahrscheinlich-kein-bug">💡 Kein Bug?</a>`;
    heading.before(tools);
  });

  const toc = document.createElement("aside");
  toc.className = "toc-right";
  toc.setAttribute("aria-label", "Auf dieser Seite");
  toc.innerHTML = "<strong>Auf dieser Seite</strong>" + [...content.querySelectorAll("h1[id]")].slice(1).map((heading) => `<a href="#${heading.id}">${heading.textContent.trim()}</a>`).join("");
  layout.append(toc);

  const smartChargingLink = document.querySelector('.nav-link[href="#smart-charging"]');
  if (smartChargingLink) {
    smartChargingLink.href = "#funktionen";
    smartChargingLink.textContent = "Funktionen";
    smartChargingLink.className = "nav-link level-1";
    const featureLinks = [
      ["#funktion-eai-waermepumpe", "EAI: Wärmepumpe & Gebäude"],
      ["#funktion-eai-wallbox", "EAI: Wallbox & Mobilität"],
      ["#smart-charge-smc-funktion", "Smart Charge"],
      ["#funktion-s-plus", "S-Plus"],
      ["#funktion-amortisation", "Amortisation"],
      ["#funktion-wirkungsgrade", "Wirkungsgrade"],
      ["#funktion-akku", "Akku"],
      ["#funktion-hardware-kapazitaet", "Hardware- & Kapazitäts-Analysen"]
    ];
    let insertionPoint = smartChargingLink;
    featureLinks.forEach(([href, label]) => {
      const featureLink = document.createElement("a");
      featureLink.className = "nav-link level-2";
      featureLink.href = href;
      featureLink.textContent = label;
      insertionPoint.after(featureLink);
      insertionPoint = featureLink;
    });
  }
})();
