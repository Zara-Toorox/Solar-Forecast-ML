/* English compatibility catalogue for Modern components that predate keyed i18n. */
(function installModernEnglish() {
    if (window.SFMLI18n?.current !== "en") return;

    const translations = new Map([
        ["Zuhause im Energiefluss", "Home energy flow"],
        ["Energie", "Energy"], ["Tagesverlauf", "Daily profile"], ["TAGESVERLAUF", "DAILY PROFILE"], ["Keine Daten", "No data"], ["KEINE DATEN", "NO DATA"],
        ["PV zu Haus", "PV to home"], ["Akku zu Haus", "Battery to home"],
        ["PV zu Haus:", "PV to home:"], [". Akku zu Haus:", ". Battery to home:"],
        ["Akku zu Haus:", "Battery to home:"], [". PV zu Netz:", ". PV to grid:"],
        ["🔋 Akku-Ladestand", "🔋 Battery state of charge"],
        ["heute", "today"], ["Heute", "Today"], ["Noch", "Remaining"], ["bis zur Tagesprognose", "to the daily forecast"],
        ["Wetter jetzt", "Weather now"], ["WETTER JETZT", "WEATHER NOW"], ["Außensensor", "Outdoor sensor"],
        ["Bewölkt", "Cloudy"], ["Teilweise bewölkt", "Partly cloudy"], ["Sonnig", "Sunny"], ["Klare Nacht", "Clear night"],
        ["Strahlung", "Radiation"], ["Solarprognose", "Solar forecast"], ["von", "of"], ["Tagesprognose", "Daily forecast"],
        ["Prognosegüte", "Forecast accuracy"], ["PROGNOSEGÜTE", "FORECAST ACCURACY"], ["Autarkie", "Autarky"], ["Strompreis", "Electricity price"],
        ["Heute · SFML-Stundenprofil", "Today · SFML hourly profile"], ["HEUTE · SFML-STUNDENPROFIL", "TODAY · SFML HOURLY PROFILE"],
        ["Solarverlauf, Forecast und konservativer Tagesplan", "Solar profile, forecast and conservative daily plan"],
        ["Forecast öffnen →", "Open forecast →"], ["Ist bisher", "Actual so far"], ["P10 konservativ", "P10 conservative"],
        ["Stand", "Progress"], ["kWh je Stunde", "kWh per hour"], ["Ist", "Actual"],
        ["Modellkorridor", "Model range"], ["Konservativer Planverlauf", "Conservative plan"],
        ["System & Lernen", "System & learning"], ["saubere Lernstunden heute", "clean learning hours today"],
        ["Tagesfortschritt wird ermittelt.", "Determining daily progress."], ["PV zu Netz", "PV to grid"], ["Netz zu Haus", "Grid to home"],
        ["Energie jetzt", "Energy now"], ["Energie ", "Energy "], ["Tagesprognose.", "daily forecast."],
        ["0 saubere Lernstunden heute", "0 clean learning hours today"],
        ["Noch keine Stundenwerte für heute vorhanden.", "No hourly values are available for today yet."],
        ["Solar heute", "Solar today"], ["Wetter & Warnungen", "Weather & warnings"],
        ["Zuhause", "Home"], ["Akku", "Battery"], ["Netz", "Grid"], ["Haus", "Home"],
        ["Energieflüsse", "Energy flows"], ["Aktive Energieflüsse", "Active energy flows"],
        ["Wetter aktuell", "Current weather"], ["Wetter-App", "Weather app"],
        ["Solarprognose", "Solar forecast"], ["Heutige Solarprognose", "Solar forecast today"],
        ["Stündlicher Solar-Istwert, Forecast, Modellkorridor und proportional abgeleiteter konservativer Planverlauf", "Hourly actual solar value, forecast, model range and proportionally derived conservative plan"],

        ["Wärmepumpe intelligent verstehen", "Understand your heat pump intelligently"],
        ["Erklärt den Betrieb, prognostiziert den Bedarf und findet die besten Energiezeitfenster.", "Explains operation, forecasts demand and identifies the best energy windows."],
        ["Vorschau", "Preview"], ["Übersicht", "Overview"], ["Live-Betrieb", "Live operation"],
        ["Prognose", "Forecast"], ["Effizienz", "Efficiency"], ["Gebäude", "Building"],
        ["Energieeinsatz", "Energy use"], ["Diagnose", "Diagnostics"],
        ["Interaktive Premium-Demo", "Interactive premium demo"],
        ["Alle gezeigten Werte sind realistische Mock-Daten und keine Messwerte deiner Anlage.", "All values shown are realistic mock data and are not measurements from your installation."],
        ["Mit EAI werden dieselben Ansichten aus deinen Sensoren berechnet.", "With EAI, the same views are calculated from your sensors."],
        ["Alle Fahrzeug-, Wallbox-, Preis- und Energiewerte sind realistische Mock-Daten.", "All vehicle, wallbox, price and energy values are realistic mock data."],
        ["SFML-Historie und die Prognosequellen sind realistische Beispieldaten.", "SFML history and forecast sources are realistic sample data."],
        ["Lizenz beim Anbieter anfordern", "Request a licence from the provider"],
        ["Datenstatus: Premium-Demo", "Data status: premium demo"], ["Datenstatus: bereit", "Data status: ready"],
        ["Datenstatus: eingeschränkt", "Data status: limited"], ["Datenstatus: nicht verfügbar", "Data status: unavailable"],
        ["Datenstatus: nicht prüfbar", "Data status: cannot be verified"],
        ["DATENSTATUS: PREMIUM-DEMO", "DATA STATUS: PREMIUM DEMO"],
        ["Alle Werte dieser Ansicht sind gekennzeichnete Beispieldaten.", "All values in this view are labelled sample data."],
        ["Messwerte, Prognosen und Modellergebnisse werden in ihren Beschreibungen getrennt ausgewiesen.", "Measurements, forecasts and model results are identified separately in their descriptions."],
        ["Mindestens eine zugeordnete Messgröße ist nicht aktuell oder nicht ausreichend belastbar; abhängige Werte werden zurückgehalten.", "At least one assigned measurement is stale or insufficiently reliable; dependent values are withheld."],
        ["Die erforderliche Datengrundlage ist noch nicht vollständig nutzbar. Details stehen in der Diagnose.", "The required data basis is not yet fully usable. Details are available under Diagnostics."],
        ["Messwerte, Prognosen und Modellergebnisse werden nur angezeigt, wenn ihre Grundlage belastbar ist.", "Measurements, forecasts and model results are shown only when their basis is reliable."],
        ["Der Provider liefert keinen eindeutigen Datenstatus. Details stehen in der Diagnose.", "The provider does not supply an unambiguous data status. Details are available under Diagnostics."],
        ["EAI wird geladen …", "Loading EAI …"], ["Daten nicht verfügbar", "Data unavailable"],
        ["EAI-Daten konnten nicht geladen werden. Technische Details stehen im Home-Assistant-Protokoll.", "EAI data could not be loaded. Technical details are available in the Home Assistant log."],
        ["Interaktives Beratungsszenario", "Interactive advisory scenario"],
        ["Was könnte ein besser genutztes PV-Zeitfenster wert sein?", "What could a better-used PV window be worth?"],
        ["Der Rechner gibt Empfehlungen. EAI schaltet oder steuert deine Wärmepumpe nicht.", "The calculator provides recommendations. EAI does not switch or control your heat pump."],
        ["Simulation · keine Einspargarantie", "Simulation · no savings guarantee"],
        ["Dynamischer Mock-Tarif", "Dynamic mock tariff"], ["Mock-Tarif", "Mock tariff"], ["Mock-Tarifdaten", "Mock tariff data"],
        ["Heutige PV-Deckung der Wärmepumpe", "Heat-pump PV coverage today"], ["Jährlicher Wärmebedarf", "Annual heat demand"],
        ["Orientierungswert pro Jahr", "Estimated annual value"], ["weniger Netzbezug im dargestellten Szenario", "less grid import in the illustrated scenario"],
        ["Warmwasser oder thermischen Speicher bevorzugt in dieses PV-Fenster legen", "Prefer this PV window for hot water or thermal storage"],
        ["Mit genutzten Zeitfenstern", "Using the recommended windows"], ["Beratung", "Advisory plan"],
        ["24-Stunden-Potenzial", "24-hour potential"],
        ["Vorher und empfohlenes Zeitfenster – keine ausgeführten Schaltungen", "Before and recommended window – no switching actions performed"],
        ["STATS-Preisbasis", "STATS price basis"], ["gewichteter Abrechnungspreis", "weighted billing price"],
        ["konfigurierter Tarif", "configured tariff"], ["aktueller STATS-Preis", "current STATS price"],
        ["Annahmen", "Assumptions"], ["Einspeisevergütung", "feed-in tariff"],
        ["und maximal 18 % zeitlich nutzbarer Wärmepumpenstrom.", "and at most 18% of heat-pump electricity that can be shifted in time."],
        ["Grundgebühren werden nicht als Einsparung gerechnet.", "Base fees are not counted as savings."],
        ["Das Ergebnis ist eine Modellrechnung, keine Steuerung und keine Garantie.", "The result is a model calculation, not a control action or guarantee."],
        ["Warum läuft sie gerade?", "Why is it running now?"], ["Noch keine Erklärung verfügbar", "No explanation available yet"],
        ["Vertrauen", "confidence"], ["Tägliches Energie-Briefing", "Daily energy briefing"],
        ["Briefing wird vorbereitet", "Preparing briefing"], ["Bestes Wärmepumpen-PV-Fenster", "Best heat-pump PV window"],
        ["Noch kein belastbares Wärmepumpen-PV-Fenster erkannt.", "No reliable heat-pump PV window has been identified yet."],
        ["Betriebsbeobachtung", "Operation monitoring"], ["Gebäude-Fingerabdruck", "Building fingerprint"],
        ["Speicher- & Zirkulationsverluste", "Storage & circulation losses"], ["Wo verschwindet die gespeicherte Wärme?", "Where does the stored heat go?"],
        ["Speicher", "Storage"], ["Heizraum", "Plant room"], ["Referenztemperatur", "Reference temperature"],
        ["Passiver Speicherverlust", "Passive storage loss"], ["Noch nicht belastbar", "Not reliable yet"],
        ["Plausibilitätsprüfung läuft", "Plausibility check in progress"], ["Zirkulationsverlust", "Circulation loss"],
        ["Noch nicht ermittelt", "Not determined yet"], ["nur bei ausreichenden Schaltbeobachtungen", "only with sufficient switching observations"],
        ["24-h-Schätzung", "24-hour estimate"], ["ausstehend", "pending"],
        ["72 Stunden · mit Unsicherheitsband", "72 hours · with uncertainty range"],
        ["Wärmepumpenbedarf und PV-Potenzial", "Heat-pump demand and PV potential"],
        ["KEPLER erklärt die Empfehlung", "KEPLER explains the recommendation"], ["Prognose wird eingeordnet", "Assessing forecast"],
        ["Mittlere Unsicherheit", "Average uncertainty"], ["Das Band zeigt die aktuelle Modellspanne transparent und ist keine Garantie.", "The range transparently shows current model uncertainty and is not a guarantee."],
        ["Unsicherheit", "Uncertainty"], ["Haupttreiber", "Main drivers"], ["Nicht verfügbar", "Unavailable"], ["· Nicht verfügbar", "· Unavailable"],
        ["Premium-Modul nicht freigeschaltet", "Premium module not unlocked"], ["Für diesen Bereich wird", "This area requires"],
        ["benötigt.", "."], ["Lizenz beim Anbieter anfordern und anschließend im EAI-Config-Flow hinterlegen.", "Request a licence from the provider and then enter it in the EAI configuration flow."],
        ["Geprüfte Energiebilanz · gleicher Prognosezeitraum", "Verified energy balance · same forecast period"],
        ["PV verfügbar", "PV available"], ["Haus", "Home"], ["Wärmepumpe", "Heat pump"], ["Speicherreserve", "Battery reserve"],
        ["Kalibrierungsreserve", "Calibration reserve"], ["Wallbox-PV-Budget", "Wallbox PV budget"],
        ["Unverplant / Einspeisung", "Unallocated / export"],

        ["Laden, wenn Energie wirklich passt", "Charge when the energy conditions are right"],
        ["Energy AI · E-Mobilität", "Energy AI · E-mobility"], ["ENERGY AI · E-MOBILITÄT", "ENERGY AI · E-MOBILITY"],
        ["PV-Prognose, Wärmepumpenbedarf, Strompreis und Abfahrtsziel in einem gemeinsamen Beratungsplan.", "PV forecast, heat-pump demand, electricity price and departure target in one advisory plan."],
        ["Keine Steuerung", "No control"], ["Wallbox-Leistung", "Wallbox power"], ["Aktuell gemessene Leistungsaufnahme.", "Currently measured power draw."],
        ["Energie heute", "Energy today"], ["Heute gemessene Wallbox-Energie.", "Wallbox energy measured today."],
        ["Verbindung", "Connection"], ["Der Verbindungsstatus wird von der Datenquelle nicht eindeutig geliefert.", "The data source does not provide an unambiguous connection status."],
        ["Wallbox noch nicht eingerichtet", "Wallbox not configured yet"], ["Aktiviere die Wallbox-Funktion und ordne Leistung sowie eine Quelle für den Ladebedarf zu.", "Enable the wallbox feature and assign power plus a source for charging demand."],
        ["Die Wallbox-Planung konnte nicht geladen werden. Technische Details stehen im Home-Assistant-Protokoll.", "Wallbox planning could not be loaded. Technical details are available in the Home Assistant log."],
        ["Was kostet die nächste Ladung – jetzt oder geplant?", "What will the next charge cost – now or as planned?"],
        ["Die Regler verändern ausschließlich diese Simulation. Es wird kein Fahrzeug und keine Wallbox geschaltet.", "The controls affect this simulation only. No vehicle or wallbox is switched."],
        ["Ladestand bekannt", "State of charge known"], ["Ladeenergie angeben", "Specify charging energy"], ["Fahrt planen", "Plan a trip"],
        ["Ladeeffizienz", "Charging efficiency"], ["Sofort laden", "Charge now"], ["Providerdaten nicht belastbar", "Provider data not reliable"],
        ["Beratungsplan", "Advisory plan"], ["PV-Allokation nicht belastbar", "PV allocation not reliable"],
        ["Rechnerischer Vorteil", "Calculated benefit"], ["keine belastbare Kostenrechnung", "no reliable cost calculation"],
        ["Providerstunden fehlen. Es wird kein Ladefenster und kein Rest-PV erzeugt.", "Provider hours are missing. No charging window or residual PV is generated."],
        ["Die Wallbox-Planung verwendet ausschließlich vollständige, providerbestätigte Intervalle.", "Wallbox planning uses only complete, provider-confirmed intervals."],
        ["EAI-Provider erklärt die Empfehlung", "EAI provider explains the recommendation"], ["Planung nicht verfügbar", "Planning unavailable"],
        ["Der Provider hat keinen belastbaren Ladeplan freigegeben.", "The provider has not released a reliable charging plan."],
        ["Prognoseunsicherheit", "Forecast uncertainty"], ["Kein belastbares PV-Prognoseband", "No reliable PV forecast range"],
        ["Providerbestätigte Planungsintervalle", "Provider-confirmed planning intervals"],
        ["Haus, Wärme, Reserve und Laden teilen sich denselben PV-Haushalt", "Home, heat, reserve and charging share the same PV budget"],
        ["Reserve", "Reserve"], ["Preis", "Price"], ["Preisquelle", "Price source"],
        ["Hausbedarf, Wärmepumpe, Speicherreserve und Kalibrierungsreserve werden in dieser Reihenfolge vor der Wallbox-Freigabe berücksichtigt.", "Home demand, heat pump, battery reserve and calibration reserve are considered in this order before wallbox allocation."],
        ["Abfahrt", "Departure"], ["Wird ermittelt", "Being determined"], ["Abfahrtsbereitschaft nicht verfügbar", "Departure readiness unavailable"],
        ["Empfohlenes Fenster", "Recommended window"], ["Ladebedarf", "Charging demand"],
        ["Wallbox-Energie inklusive Ladeverlusten · Frontend-Simulation", "Wallbox energy including charging losses · frontend simulation"],
        ["PV-Anteil", "PV share"], ["Keine belastbare Provider-Allokation", "No reliable provider allocation"],
        ["Netzanteil", "Grid share"], ["Keine belastbare Stundenplanung", "No reliable hourly plan"],
        ["Ziel und Zeitraum", "Target and period"], ["Kosten geplant", "Planned cost"], ["Passive Signale", "Passive signals"],
        ["EAI stellt Sensoren und Binärsensoren bereit. Deine Home-Assistant-Automation entscheidet selbst.", "EAI provides sensors and binary sensors. Your Home Assistant automation makes its own decisions."],
        ["Beratung statt Steuerung", "Advice, not control"], ["EAI ruft keine Wallbox-Dienste auf, verändert keine Ladeleistung und startet keinen Ladevorgang. Kosten und PV-Anteil sind Modellwerte ohne Garantie.", "EAI does not call wallbox services, change charging power or start a charging process. Costs and PV share are model values without guarantee."],

        ["PV-Budget-Allokation", "PV budget allocation"], ["Ein gemeinsamer Zeitraum, eine feste Prioritätsreihenfolge", "One shared period, one fixed priority order"],
        ["Bestätigte PV-Prognose für denselben Zeitraum", "Confirmed PV forecast for the same period"], ["Prognostizierte Energie", "Forecast energy"],
        ["PV-Budget danach", "PV budget remaining"], ["Herkunft", "Source"], ["EAI-Provider · PV-Prognose", "EAI provider · PV forecast"],
        ["Hausbedarf zuerst", "Home demand first"], ["Hausbedarf wird vor allen weiteren Stufen abgezogen", "Home demand is deducted before all subsequent stages"],
        ["Gesamtbedarf", "Total demand"], ["PV für Hausbedarf", "PV for home demand"], ["EAI-Provider · Hausbedarfsprognose", "EAI provider · home-demand forecast"],
        ["Elektrischer Bedarf nach vorrangigem Hausbedarf", "Electrical demand after priority home demand"], ["PV für Wärmepumpe", "PV for heat pump"],
        ["EAI-Provider · Wärmepumpenprognose", "EAI provider · heat-pump forecast"], ["Reservierter PV-Anteil für den Batteriespeicher", "PV share reserved for battery storage"],
        ["Für Speicher reserviert", "Reserved for storage"], ["EAI-Provider · Speicherreserve", "EAI provider · battery reserve"],
        ["Kalibrier-/Sicherheitsreserve", "Calibration / safety reserve"], ["Konservativer Abschlag vor der Wallbox-Freigabe", "Conservative deduction before wallbox allocation"],
        ["Nicht zusätzlich verplant", "Not additionally allocated"], ["EAI-Provider · Prognosekalibrierung", "EAI provider · forecast calibration"],
        ["Verbleibender PV-Überschuss", "Remaining PV surplus"], ["Nach Haus, Wärmepumpe, Speicher und Sicherheitsreserve", "After home, heat pump, storage and safety reserve"],
        ["Für Wallbox freigegeben", "Allocated to wallbox"], ["EAI-Provider · geschlossene PV-Allokation", "EAI provider · closed PV allocation"],
        ["Netzergebnis separat", "Grid result separately"], ["Explizite Providerwerte; fehlende Netzenergie wird nicht rekonstruiert", "Explicit provider values; missing grid energy is not reconstructed"],
        ["Haus aus Netz", "Home from grid"], ["Wärmepumpe aus Netz", "Heat pump from grid"], ["Netz gesamt", "Grid total"],
        ["Nicht zugeordnet / erwartbare Einspeisung", "Unallocated / expected export"], ["PV-Rest nach dem freigegebenen Wallbox-Budget", "PV remaining after the allocated wallbox budget"],

        ["Vergangenheit verstehen. Jetzt sehen. Zukunft planen.", "Understand the past. See the present. Plan the future."],
        ["Die lokale Messhistorie ist verfügbar. Weather Fusion AI lädt die aktuelle Stunden- und Tagesprognose; bis dahin werden bewusst keine Nullwerte oder Wetterbehauptungen angezeigt.", "Local measurement history is available. Weather Fusion AI is loading the current hourly and daily forecast; until then, no zero values or unsupported weather claims are shown."],
        ["Keine Steuerung · klare lokale Einordnung", "No control · clear local context"],
        ["Die Wetterauswertung konnte nicht geladen werden. Die Verbindung wird automatisch erneut geprüft.", "The weather analysis could not be loaded. The connection will be checked again automatically."],
        ["Live", "Live"], ["Lokale Historie", "Local history"], ["Aktuelle Messwerte", "Current measurements"],
        ["Temperatur", "Temperature"], ["Wetterstation", "Weather station"], ["Luftfeuchte", "Humidity"], ["Taupunkt ca.", "Dew point approx."],
        ["Luftdruck", "Air pressure"], ["normaler Bereich", "normal range"], ["Wind", "Wind"], ["Richtung unbekannt", "Direction unknown"],
        ["Aktuelle Regenrate", "Current rainfall rate"], ["Wetterstation · Intensität", "Weather station · intensity"],
        ["Aktuelle Quelle", "Current source"], ["Quelle des aktuellen Werts", "Source of the current value"],
        ["Historie", "History"], ["SFML-Wetterstation · Recorder", "SFML weather station · Recorder"], ["Abdeckung", "coverage"],
        ["Nächste", "Next"], ["Stunden", "hours"], ["erwarteter Niederschlag", "expected precipitation"], ["erwarteter Bereich", "expected range"],
        ["Warnlage", "Warning status"], ["Ruhig", "Calm"], ["aktive Hinweise", "active notices"],
        ["Historie → Jetzt → Prognose", "History → now → forecast"], ["Deine Wetter-Zeitreise", "Your weather timeline"],
        ["Feuchte", "Humidity"], ["Temperatur: SFML-Wetterstation / Recorder und Prognose", "Temperature: SFML weather station / Recorder and forecast"],
        ["Letzte 24 Stunden gemessen · nächste 48 Stunden Prognose", "Last 24 hours measured · next 48 hours forecast"],
        ["Jetzt", "Now"], ["Weather Fusion Prognose", "Weather Fusion forecast"], ["Prognose-Spielraum", "Forecast range"],
        ["Nächste Stunden", "Next hours"], ["Wann ändert sich das Wetter?", "When will the weather change?"], ["Stündlich", "Hourly"],
        ["Regen", "rain"], ["Quelldaten widersprüchlich", "Source data inconsistent"], ["⚠ Quelldaten widersprüchlich", "⚠ Source data inconsistent"],
        ["STUNDEN", "HOURS"],
        ["Wetterhinweise", "Weather notices"], ["Was du jetzt wissen solltest", "What you should know now"],
        ["Aktuell wurden keine besonderen Wetterhinweise erkannt.", "No notable weather notices are currently detected."],
        ["Die nächsten Tage", "The next few days"], ["Klare Tagesaussage statt Zahlenfriedhof", "Clear daily outlook instead of a wall of numbers"],
        ["Die Wetterlage bleibt überwiegend ruhig", "Weather conditions remain mostly calm"], ["Es wird heiß und belastend", "Hot and strenuous conditions are expected"],
        ["Kräftiger Regen ist zu erwarten", "Heavy rain is expected"], ["laut Quelle · widersprüchlich zur Niederschlagsmenge", "according to source · inconsistent with precipitation amount"],
        ["Regenrisiko", "rain risk"], ["Wind bis", "Wind up to"], ["Verfügbare Wetterquellen", "Available weather sources"],
        ["Vier Wetterlinsen: WFAI, HUBBLE, Kepler und Wetterstation", "Four weather perspectives: WFAI, HUBBLE, Kepler and weather station"],
        ["Quellen verfügbar", "sources available"], ["Quelle verfügbar", "source available"], ["lokale Prognose", "local forecast"],
        ["SFML-Sensoren", "SFML sensors"], ["Zeit", "Time"], ["Spanne verfügbarer Quellen", "Range of available sources"],
        ["Wetterstation zeigt die in SFML hinterlegten Sensoren. HUBBLE zeigt den Wetterblend aus der SFML-Datenbank, WFAI die lokale Prognose und Kepler den Prognose-Snapshot. „—“ bedeutet nicht verfügbar; 0,0 °C Spanne bedeutet, dass die verfügbaren Quellen übereinstimmen.", "The weather station shows sensors configured in SFML. HUBBLE shows the weather blend from the SFML database, WFAI the local forecast and Kepler the forecast snapshot. ‘—’ means unavailable; a 0.0 °C range means the available sources agree."],
        ["Wetterjahr an deinem Standort", "Weather year at your location"], ["Dieses Jahr im Vergleich", "This year in comparison"],
        ["gesamt", "overall"], ["Aktuell", "Current"], ["Vor einem Jahr", "One year ago"], ["Daten seit", "Data since"],
        ["Tage", "days"], ["Regentage", "Rainy days"], ["Globalstrahlung", "global radiation"], ["Maximum Globalstrahlung", "Maximum global radiation"],
        ["Monatsklima", "Monthly climate"], ["Bandbreite und Mittelwert", "Range and average"], ["Regenbilanz", "Rainfall balance"],
        ["Intensität, Regentage und Trockenphasen", "Intensity, rainy days and dry spells"], ["höchste gemessene Regenrate", "highest measured rainfall rate"],
        ["Tage mit Regen", "days with rain"], ["längste Trockenphase", "longest dry spell"], ["Lokale Rekorde", "Local records"],
        ["Was deine Station wirklich gemessen hat", "What your station actually measured"], ["Kältester Tag", "Coldest day"], ["Wärmster Tag", "Warmest day"],
        ["Stärkster Wind", "Strongest wind"], ["Tiefster Luftdruck", "Lowest air pressure"], ["Höchster Luftdruck", "Highest air pressure"],
        ["Prognose gegen Messung", "Forecast versus measurement"], ["Wie gut trifft Weather Fusion deinen Standort?", "How accurately does Weather Fusion predict your location?"],
        ["Zuletzt wechselhafter", "More variable recently"], ["Vorlauf", "Lead time"], ["Vergleiche", "Comparisons"], ["Typische Abweichung", "Typical deviation"],
        ["Früher gespeicherte Weather-Fusion-Prognosen werden mit SFML-Stationsmessungen gepaart. Das zeigt die Standortgüte für diese Datenbasis.", "Previously stored Weather Fusion forecasts are paired with SFML station measurements. This shows location accuracy for this data basis."],
        ["Dienstag", "Tuesday"], ["Mittwoch", "Wednesday"], ["Donnerstag", "Thursday"], ["Freitag", "Friday"], ["Samstag", "Saturday"], ["Sonntag", "Sunday"], ["Montag", "Monday"],
        ["März", "March"], ["Mai", "May"], ["Juni", "June"], ["Juli", "July"], ["Okt.", "Oct."], ["Dez.", "Dec."],

        ["Premium · auditierbare Messwerte", "Premium · auditable measurements"], ["Energie-Korrekturen", "Energy corrections"],
        ["Abgeschlossene Tageswerte für Netzbezug, Netzeinspeisung und PV-Ertrag sicher berichtigen.", "Safely correct completed daily values for grid import, grid export and PV yield."],
        ["Admin · lokal oder HA Cloud", "Admin · local or HA Cloud"], ["Dynamische Tarife", "Dynamic tariffs"],
        ["Der Tages-Energiewert wird korrigiert. Historische Stundenkosten bleiben unverändert und werden nicht als exakt korrigiert ausgewiesen.", "The daily energy value is corrected. Historical hourly costs remain unchanged and are not presented as precisely corrected."],
        ["Sichere Home-Assistant-Verbindung wird hergestellt …", "Establishing secure Home Assistant connection …"],
        ["Noch nicht verfügbar", "Not available yet"],
        ["Live: Gewichteter STATS-Preis, Tarif, Einspeisevergütung sowie EAI-Prognosedaten wurden vorbelegt. Die Rechnung bleibt eine Simulation.", "Live: Weighted STATS price, tariff, feed-in tariff and EAI forecast data have been prefilled. The calculation remains a simulation."],
        ["Betriebsgrund noch nicht sicher bestimmbar", "Operating reason cannot yet be determined reliably"],
        ["Die Aussage basiert nur auf den aktuell verfügbaren Betriebs- und Temperatursignalen.", "This statement is based only on the currently available operating and temperature signals."],
        ["Einrichtung noch nicht vollständig. Gebäudemodell 0 % angelernt.", "Setup is not yet complete. Building model learning is at 0%."],
        ["Die priorisierten Diagnosehinweise prüfen", "Review the prioritised diagnostic notices"],
        ["Messdaten für Betriebsbeobachtung fehlen", "Measurement data for operation monitoring is missing"],
        ["Prüfe die unter Datenquellen genannten Pflichtmessungen. Nach gültigen Messwerten beginnt die 24-stündige Betriebsbeobachtung automatisch.", "Check the required measurements listed under Data sources. Once valid measurements are available, the 24-hour operation monitoring starts automatically."],
        ["Innenraumsensor noch nicht verfügbar", "Indoor sensor not available yet"],
        ["Ohne Innentemperatur kann das Gebäudeverhalten nicht belastbar gelernt werden. 0 von 24 Beobachtungsstunden · Lernfortschritt: 0 %.", "Without indoor temperature, building behaviour cannot be learned reliably. 0 of 24 observation hours · learning progress: 0%."],
        ["PV-Anteil Wärmepumpe", "Heat-pump PV share"], ["Netzbezug Wärmepumpe erwartet", "Expected heat-pump grid import"],
        ["Keine belastbare Kostenrechnung", "No reliable cost calculation"], ["LADEBEDARF", "CHARGING DEMAND"],
        ["JETZT · WETTERSTATION", "NOW · WEATHER STATION"], ["SFML-Wetterstation / Recorder", "SFML weather station / Recorder"],
        ["📊 Hardware- & Kapazitäts-Analysen (2026)", "📊 Hardware & capacity analysis (2026)"],
        ["Akku-Dimensionierung", "Battery sizing"], ["Beurteilung der Batteriekapazität", "Battery capacity assessment"],
        ["Vollladungs-Tage", "Full-charge days"], ["Ungenutzter Überschuss", "Unused surplus"],
        ["Speicherbarer Export bei vollem Akku, begrenzt auf späteren Netzbezug", "Export that could be stored with a full battery, limited to later grid import"],
        ["Durchschnittlicher täglicher Bedarf", "Average daily demand"], ["Durchschnittliche Unabhängigkeit vom Netz", "Average grid independence"],
        ["Akku-Durchsatz & Zyklen", "Battery throughput & cycles"], ["Vollzyklen-Äquivalent", "Equivalent full cycles"],
        ["Gesamt-Ertrag", "Total yield"], ["Durchschnittlicher Ertrag pro Tag", "Average yield per day"],
    ]);

    const dynamicTranslations = [
        [/^(.+) heute$/, "$1 today"],
        [/^(.+) Prognosegüte$/, "$1 forecast accuracy"],
        [/^(\d+) saubere Lernstunden heute$/, "$1 clean learning hours today"],
        [/^Noch (.+) bis zur Tagesprognose\.$/, "$1 remaining to the daily forecast."],
        [/^von (.+) Tagesprognose$/, "of $1 daily forecast"],
        [/^Akku zu Haus: (.+)\. PV zu Netz: (.+)\.$/, "Battery to home: $1. PV to grid: $2."],
        [/^PV zu Haus: (.+)\. Akku zu Haus: (.+)\.$/, "PV to home: $1. Battery to home: $2."],
        [/^Netz zu Haus: (.+)\.$/, "Grid to home: $1."],
        [/^(\d+) unvollständiger Tag ist enthalten \((\d+) Stunden\); Tageswerte werden nicht hochgerechnet\.$/, "$1 incomplete day is included ($2 hours); daily values are not extrapolated."],
        [/^Explizite Providerwerte; fehlende Netzenergie wird nicht rekonstruiert · (.+?)(?: Uhr)?$/, "Explicit provider values; missing grid energy is not reconstructed · $1"],
        [/^PV-Rest nach dem freigegebenen Wallbox-Budget · (.+)$/, "PV remaining after the allocated wallbox budget · $1"],
        [/^STATS-Preisbasis: gewichteter Abrechnungspreis, Dynamisch \(GPM\)\. Annahmen: COP (.+), (.+) ct\/kWh Einspeisevergütung und maximal 18 % zeitlich nutzbarer Wärmepumpenstrom\. Grundgebühren werden nicht als Einsparung gerechnet\. Das Ergebnis ist eine Modellrechnung, keine Steuerung und keine Garantie\.$/, "STATS price basis: weighted billing price, dynamic (GPM). Assumptions: COP $1, $2 ct/kWh feed-in tariff and at most 18% of heat-pump electricity that can be shifted in time. Base fees are not counted as savings. The result is a model calculation, not a control action or guarantee."],
        [/^(.+ kWh) weniger Netzbezug im dargestellten Szenario$/, "$1 less grid import in the illustrated scenario"],
        [/^(\d+) % Vertrauen$/, "$1% confidence"],
        [/^PV-Prognose (.+) kWh$/, "PV forecast $1 kWh"],
        [/^Wärmepumpenbedarf (.+) kWh, Band (.+)–(.+) kWh$/, "Heat-pump demand $1 kWh, range $2–$3 kWh"],
        [/^Hausgrundlast (.+) kWh bereits berücksichtigt$/, "Home base load $1 kWh already considered"],
        [/^Speicherreserve (.+) kWh bereits berücksichtigt$/, "Battery reserve $1 kWh already considered"],
        [/^Preisquelle: gewichteter STATS-Abrechnungspreis und Stundenpreise\. Hausbedarf, Wärmepumpe, Speicherreserve und Kalibrierungsreserve werden in dieser Reihenfolge vor der Wallbox-Freigabe berücksichtigt\.$/, "Price source: weighted STATS billing price and hourly prices. Home demand, heat pump, battery reserve and calibration reserve are considered in this order before wallbox allocation."],
        [/^Nicht verfügbar kWh$/, "Unavailable kWh"],
        [/^Die Wetterlage bleibt überwiegend ruhig\. Die Temperatur liegt zwischen (.+) und (.+)\. In den nächsten (\d+) Stunden meldet die Prognose (.+) · (.+) % laut Quelle · widersprüchlich zur Niederschlagsmenge Regenrisiko und Wind bis (.+)\.$/, "Weather conditions remain mostly calm. Temperatures range between $1 and $2. For the next $3 hours, the forecast reports $4 · $5% rain risk according to the source, inconsistent with precipitation amount, and wind up to $6."],
        [/^Nächste (\d+) Stunden$/, "Next $1 hours"],
        [/^Prognose-Spielraum ± (.+)$/, "Forecast range ± $1"],
        [/^(\d+) % Regen$/, "$1% rain"],
        [/^(.+) laut Quelle · widersprüchlich zur Niederschlagsmenge Regenrisiko$/, "$1 according to the source · inconsistent with precipitation amount and rain risk"],
        [/^(\d+) Quellen verfügbar$/, "$1 sources available"],
        [/^(.+) · lokale Prognose$/, "$1 · local forecast"],
        [/^📡 Wetterstation$/, "📡 Weather station"],
        [/^(\d+) Tage$/, "$1 days"],
        [/^(\d+)–(\d+) STUNDEN(.*)$/, "$1–$2 HOURS$3"],
        [/^(.+) STUNDEN$/, "$1 HOURS"],
        [/^Akku an (\d+) von (\d+) Tagen voll geladen \((.+)%\)$/, "Battery fully charged on $1 of $2 days ($3%)"],
        [/^Bewertet mit (.+) ct\/kWh nach Einspeisevergütung \((.+) ct\/kWh\) und Speicherverlusten$/, "Valued at $1 ct/kWh after feed-in tariff ($2 ct/kWh) and storage losses"],
        [/^Dein Akku \((.+) kWh\) ist optimal dimensioniert\. Eine Vergrößerung hätte bisher nur (.+) € Netto-Ersparnis gebracht\.$/, "Your battery ($1 kWh) is optimally sized. Increasing its capacity would have delivered only €$2 in net savings so far."],
        [/^Geladene Energie \(PV: (.+)%, Netz: (.+)%\)$/, "Charged energy (PV: $1%, grid: $2%)"],
        ["Was jetzt tun", "What to do now"], ["Energiemanagement", "Energy management"],
        ["Was darf das EMS tun?", "What may EMS do?"], ["Freigaben und Sollzustand", "Approvals and desired state"],
        ["Nächstes Fenster:", "Next window:"], ["Festtarif", "Fixed tariff"],
        ["Günstigste Reststunde", "Cheapest remaining hour"], ["Netzspitze", "Grid peak"],
        ["Verschiebepotenzial", "Shift potential"], ["Restlicher Überschuss", "Remaining surplus"],
        ["EMS ist nur für Administratoren", "EMS is available to administrators only"],
        ["Pausiert", "Paused"], ["Strompreis", "Electricity price"],
    ];
    function translate(value) {
        const output = String(value ?? "");
        const core = output.trim();
        let translated = translations.get(core);
        if (!translated) {
            for (const [pattern, replacement] of dynamicTranslations) {
                if (!pattern.test(core)) continue;
                translated = core.replace(pattern, replacement);
                break;
            }
        }
        if (!translated) return output;
        const start = output.indexOf(core);
        return output.slice(0, start) + translated + output.slice(start + core.length);
    }

    function translateSingleNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const translated = translate(node.nodeValue);
            if (translated !== node.nodeValue) node.nodeValue = translated;
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        for (const attribute of ["aria-label", "title", "placeholder"]) {
            if (!node.hasAttribute(attribute)) continue;
            const value = node.getAttribute(attribute);
            const translated = translate(value);
            if (translated !== value) node.setAttribute(attribute, translated);
        }
    }

    function translateNode(root) {
        if (!root) return;
        translateSingleNode(root);
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) translateSingleNode(node);
    }

    window.SFMLI18n.translateModernEnglish = translate;
    const start = () => {
        translateNode(document.body);
        new MutationObserver((records) => {
            for (const record of records) {
                if (record.type === "characterData") translateNode(record.target);
                for (const node of record.addedNodes) translateNode(node);
            }
        }).observe(document.body, { childList: true, characterData: true, subtree: true });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
})();
