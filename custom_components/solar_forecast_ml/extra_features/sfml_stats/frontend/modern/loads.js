(() => {
    const PROTOCOL = "sfml-consumers-bridge-v1";
    const BRIDGE_PATH = "/sfml-stats-consumers-bridge";
    const OPERATIONS = new Set(["status", "saveSettings", "acknowledge", "addConsumer", "updateConsumer", "deleteConsumer", "setActive", "resume", "arm", "disarm"]);
    const CONDITION_TYPES = ["pv_surplus", "cheapest_hours", "price_below", "time_window", "battery_soc_min"];
    const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
    const CONSUMER_FIELDS = ["name", "kind", "priority", "nominal_power_w", "min_surplus_w", "entity_id", "ready_entity", "match", "conditions", "min_runtime_min", "min_off_min", "deadline", "duration_min", "objective", "earliest_day", "door_entity", "door_openings"];

    const I18N = {
        de: {
            title: "Verbraucher",
            tabsLabel: "Bereiche der Verbraucher-Seite",
            "tab.devices": "Geräte", "tab.log": "Protokoll", "tab.settings": "Einstellungen",
            "introKicker": "Premium · Programme & Regeln",
            "introTitle": "Geräte schalten, wenn es sich lohnt",
            "introLead": "Trag deine Geräte ein und sag, wann sie laufen sollen.",
            "introBody": "Ich prüfe jede Minute PV-Überschuss, Strompreis, Uhrzeit und Batteriestand und schalte ein Gerät genau dann ein, wenn deine Bedingungen erfüllt sind. Programmgeräte wie die Spülmaschine bekommen ein Startfenster bis zu deiner Frist.",
            "introClose": "Du behältst die Kontrolle: Jedes Gerät hat seinen eigenen Schalter, und was du von Hand schaltest, geht immer vor.",
            "guide.title": "So funktioniert die Steuerung",
            "guide.principleTitle": "So arbeitet die Steuerung",
            "guide.principle": "Jede Minute prüfe ich für jedes aktive Gerät seine Bedingungen. Treffen sie zu, schalte ich ein, sonst aus. Fehlt ein Messwert oder ein Preis, gilt die Bedingung als nicht erfüllt und das Gerät bleibt aus. Ein neues Gerät startet mit ausgeschalteter Regelung, du aktivierst es pro Gerät.",
            "guide.surplusTitle": "PV-Überschuss",
            "guide.surplus": "Das Gerät startet, wenn mehr Strom ins Netz geht als der eingetragene Mindest-Überschuss, und das etwa zwei Minuten lang stabil. Es läuft weiter, solange mindestens die Hälfte davon übrig bleibt. Der eigene Verbrauch des Geräts zählt dabei nicht als fehlender Überschuss. Reicht der Überschuss nicht für alle Geräte, bekommt ihn das Gerät mit der kleinsten Priorität-Zahl zuerst.",
            "guide.cheapestTitle": "Günstigste Stunden",
            "guide.cheapest": "Das Gerät läuft in den günstigsten N Stunden nach dem Preis aus dem Grid Price Monitor. „Heute“ nimmt die günstigsten Stunden des Kalendertags, „Nächste 24 Stunden“ vergleicht rollierend ab jetzt. Die Preise für morgen liegen meist ab dem Nachmittag vor, vorher gibt es für morgen kein Fenster.",
            "guide.priceTitle": "Preisgrenze",
            "guide.price": "Das Gerät läuft in jeder Stunde, deren Preis höchstens so hoch ist wie deine Grenze in ct/kWh. Ohne Preis bleibt es aus.",
            "guide.windowTitle": "Zeitfenster",
            "guide.window": "Das Gerät darf nur an den gewählten Wochentagen zwischen Start und Ende laufen. Fenster über Mitternacht sind möglich, zum Beispiel 22:00 bis 06:00.",
            "guide.batteryTitle": "Batterie mindestens",
            "guide.battery": "Das Gerät läuft nur, wenn der Batteriestand mindestens so hoch ist wie eingetragen. So bleibt genug Energie für das Haus.",
            "guide.matchTitle": "Eine reicht oder alle",
            "guide.match": "Bei „Eine reicht“ genügt eine erfüllte Bedingung, zum Beispiel Überschuss oder günstige Stunde. Bei „Alle müssen zutreffen“ müssen alle gleichzeitig stimmen, zum Beispiel günstiger Preis und Batterie ab 60 %.",
            "guide.programTitle": "Programmgeräte",
            "guide.program": "Spülmaschine, Waschmaschine und Co. werden nicht ein- und ausgeschaltet, sondern einmal gestartet. Drücke nach dem Beladen „Beladen, jetzt planen“, oder lass den Freigabe-Sensor des Geräts das erledigen. Ich suche dann den besten Start bis zur Frist, nach Preis, nach PV-Ertrag oder nach beidem. „Erst morgen“ legt den Start auf den Folgetag. Zum geplanten Zeitpunkt betätige ich die Start-Entität, sofern das Gerät freigegeben ist. Ein laufendes Programm breche ich nie ab.",
            "guide.priorityTitle": "Priorität",
            "guide.priority": "Eine kleine Zahl heißt: zuerst. Die Priorität entscheidet, welches Gerät den Überschuss zuerst bekommt. Wallbox, Wärmepumpe und Batterie aus dem EMS laufen unabhängig davon, ihr Verbrauch senkt den messbaren Überschuss.",
            "guide.protectTitle": "Schutz für deine Geräte",
            "guide.protect": "Mindestlaufzeit und Mindestpause verhindern ständiges Takten, höchstens 6 Schaltungen pro Stunde und ein Start pro Durchlauf. Schaltest du ein Gerät selbst, pausiere ich es zwei Stunden. Mit dem Gesamtschalter in den Einstellungen stoppt alles sofort.",
            "fDoor": "Tür-Sensor (optional)", "fDoorOpenings": "Öffnungen bis bereit", "helpDoor": "Mit Tür-Sensor meldet sich das Gerät selbst bereit: Nach einem Lauf zählt jede Öffnung, beim Schließen nach der eingestellten Zahl wird geplant. Erst Ausräumen, dann Einräumen heißt 2. Ohne Sensor bleibt „Beladen, jetzt planen“.", "doorCount": "Tür {n}/{m} geöffnet seit dem letzten Lauf", "reason.door": "Tür: beladen erkannt", "guide.doorTitle": "Tür-Erkennung", "guide.door": "Trägst du bei einem Programmgerät einen Tür-Sensor ein, zähle ich nach einem beendeten Lauf, wie oft die Tür geöffnet wird. Wird sie nach der eingestellten Zahl von Öffnungen wieder geschlossen, gilt das Gerät als beladen und ich plane den Start. Das ist eine Schätzung: Öffnest du die Tür ohne zu beladen, kann eine Leerfahrt entstehen. Ohne Tür-Sensor meldest du das Gerät mit „Beladen, jetzt planen“ bereit, hier oder auf der Dashboard-Karte.",
            "view.start": "Start", "view.surplus": "Überschuss", "view.price": "Preis", "view.loads": "Programme & Regeln", "view.log": "Protokoll", "intro.surplus": "Hier stehen Geräte mit An/Aus-Schalter, die laufen, sobald deine Anlage mehr erzeugt, als das Haus braucht. Ein Gerät steht immer nur in einem Reiter, so schaltet nichts doppelt.", "intro.price": "Hier stehen Geräte mit An/Aus-Schalter, die in einem Preisfenster laufen: unter einem Preis oder in den günstigsten Stunden, auf Wunsch nur in einem Zeitraum. Ein Gerät steht immer nur in einem Reiter.", "addSurplus": "Überschuss-Gerät hinzufügen", "addPrice": "Preis-Gerät hinzufügen", "empty.surplus": "Noch kein Gerät, das bei Überschuss läuft.", "empty.price": "Noch kein Gerät mit Preisfenster.", "empty.loads": "Noch kein Programmgerät und keine eigene Regel.", "helpPriceWindow": "Das Gerät läuft, solange das Preisfenster passt, und schaltet danach wieder aus.", "fPriceMode": "Preisfenster", "priceModeBelow": "Unter einem Preis", "priceModeCheapest": "Günstigste Stunden", "useWindow": "Nur in einem Zeitraum", "useWindowHelp": "Zum Beispiel nur nachts von 22:00 bis 06:00.", "mode.surplus.title": "Überschuss", "mode.surplus.does": "Schaltet Geräte mit An/Aus-Schalter ein, wenn deine Anlage mehr erzeugt, als das Haus braucht.", "mode.surplus.good": "Gut für Boiler, Heizstab oder Poolpumpe: Strom, den du sonst für wenig Geld einspeist.", "mode.price.title": "Preis", "mode.price.does": "Schaltet Geräte in einem Preisfenster ein: unter einem Preis oder in den günstigsten Stunden.", "mode.price.good": "Gut mit dynamischem Tarif für alles, was in billigen Stunden laufen kann.", "mode.loads.title": "Programme & Regeln", "mode.loads.does": "Programmgeräte wie Spül- oder Waschmaschine bekommen ein Startfenster bis zu deiner Frist, dazu eigene Regeln mit mehreren Bedingungen.", "mode.loads.good": "Gut für Geräte, die einmal starten und durchlaufen, auch mit Tür-Erkennung.", "modeCount": "{n} aktiv", "open": "Öffnen", "settingsTitle": "Einstellungen",
            "hubble.demo": "Das sind Beispieldaten, mit Premium siehst du hier deine Geräte.", "hubble.startHead": "Ich steuere gerade {n} Geräte für dich.", "hubble.startEmpty": "Noch steuere ich keine Geräte für dich.", "hubble.nextDevice": "Als Nächstes startet {name} um {time}.", "hubble.surplusNow": "Gerade gehen {v} Überschuss ins Netz.", "hubble.surplusEmpty": "Hier trägst du Geräte ein, die deinen Sonnenstrom nutzen sollen.", "hubble.surplusMissing": "Mir fehlt gerade das Überschusssignal, deshalb bleiben die Geräte aus.", "hubble.surplusRunning": "Gerade laufen {n} Geräte mit deinem Überschuss.", "hubble.surplusIdle": "Der Überschuss reicht gerade für kein Gerät.", "hubble.surplusHow": "Ein Gerät startet, wenn sein Mindest-Überschuss etwa zwei Minuten stabil anliegt.", "hubble.priceEmpty": "Hier trägst du Geräte ein, die laufen, wenn Strom günstig ist.", "hubble.priceMissing": "Mir fehlt gerade der Strompreis, deshalb bleiben die Geräte aus.", "hubble.priceNow": "Strom kostet gerade {v} ct/kWh.", "hubble.priceTomorrow": "Die Preise für morgen kommen meist am Nachmittag.", "hubble.programRunning": "{name} läuft gerade.", "hubble.programPlanned": "{name} startet um {time}.", "hubble.programWaiting": "Gerade wartet kein Programm auf seinen Start.", "hubble.programEmpty": "Hier trägst du Programmgeräte wie die Spülmaschine ein.", "hubble.programDoor": "Bei {name} wurde die Tür {n} von {m} Mal geöffnet.", "hubble.programHow": "Drücke nach dem Beladen „Beladen, jetzt planen“, oder lass die Tür das erledigen.", "hubble.logToday": "Heute habe ich {n} Mal geschaltet.", "hubble.logQuiet": "Heute habe ich noch nichts geschaltet.", "hubble.logLast": "Zuletzt: {name}, {action} um {time}, {reason}.",
            "hubble.startHeadOne": "Ich steuere gerade ein Gerät für dich.", "hubble.surplusRunningOne": "Gerade läuft ein Gerät mit deinem Überschuss.", "hubble.logTodayOne": "Heute habe ich einmal geschaltet.",
            "view.live": "Live", "view.akku": "Akku (SMC)", "intro.start.kicker": "Energiemanagement", "intro.start.title": "Was das EMS für dich steuert", "intro.start.lead": "Dein Solarstrom und günstiger Netzstrom gehen dorthin, wo sie am meisten bringen.", "intro.start.body": "Jeder Bereich hat seinen eigenen Reiter: Live, Akku, Überschuss, Preis sowie Programme & Regeln. Ein Gerät gehört immer nur zu einem Bereich, deshalb schaltet nichts doppelt.", "intro.start.close": "Wähle unten einen Bereich, um ihn einzurichten oder nachzusehen, was gerade passiert.", "intro.start.guide": "So funktioniert das EMS", "intro.live.kicker": "Live", "intro.live.title": "Was das EMS gerade plant", "intro.live.lead": "Hier siehst du, was jetzt sinnvoll ist, warum, und was als Nächstes kommt.", "intro.live.body": "Ich rechne mit deiner Solarprognose, dem Strompreis und dem Akkustand. Die EMS-Automatik schaltet nur Wallbox, Wärmepumpe und die Akku-Netzladung des EMS.", "intro.live.close": "Geräte unter Überschuss, Preis sowie Programme & Regeln steuerst du in ihren eigenen Reitern.", "intro.live.guide": "So funktioniert die EMS-Automatik", "intro.surplus.kicker": "Überschuss", "intro.surplus.title": "Sonnenstrom selbst nutzen", "intro.surplus.lead": "Geräte mit An/Aus-Schalter laufen, sobald deine Anlage mehr erzeugt, als das Haus braucht.", "intro.surplus.body": "Trag Leistung und Mindest-Überschuss ein. Ich schalte ein, wenn genug Strom ins Netz ginge, und wieder aus, wenn es nicht mehr reicht. Reicht der Überschuss nicht für alle, entscheidet die Priorität.", "intro.surplus.close": "Ein Gerät steht immer nur in einem Reiter, so schaltet nichts doppelt.", "intro.surplus.guide": "So funktioniert der Überschuss", "intro.price.kicker": "Preis", "intro.price.title": "Strom nutzen, wenn er günstig ist", "intro.price.lead": "Geräte mit An/Aus-Schalter laufen in deinem Preisfenster.", "intro.price.body": "Wähle „Unter einem Preis“ oder „Günstigste Stunden“ und auf Wunsch einen Zeitraum, zum Beispiel nur nachts. Die Preise kommen aus dem Grid Price Monitor.", "intro.price.close": "Ein Gerät steht immer nur in einem Reiter, so schaltet nichts doppelt.", "intro.price.guide": "So funktioniert das Preisfenster", "intro.loads.kicker": "Programme & Regeln", "intro.loads.title": "Geräte schalten, wenn es sich lohnt", "intro.loads.lead": "Programmgeräte bekommen ein Startfenster, eigene Regeln verbinden mehrere Bedingungen.", "intro.loads.body": "Spül- oder Waschmaschine startest du nicht mehr selbst: Nach dem Beladen suche ich den besten Start bis zu deiner Frist, nach Preis, PV oder beidem. Für alles andere kombinierst du Bedingungen wie Überschuss, Preis, Zeitfenster und Akkustand.", "intro.loads.close": "Du behältst die Kontrolle: Jedes Gerät hat seinen eigenen Schalter, und was du von Hand schaltest, geht immer vor.", "intro.loads.guide": "So funktionieren Programme und Regeln", "intro.log.kicker": "Protokoll", "intro.log.title": "Was wann geschaltet wurde", "intro.log.lead": "Jede Schaltung steht hier mit Uhrzeit, Grund und Messwerten.", "intro.log.body": "So kannst du jederzeit nachvollziehen, warum ein Gerät lief oder aus blieb, und ob ein Schaltbefehl angekommen ist.", "intro.log.close": "Die neuesten Einträge stehen oben, gespeichert werden die letzten 250.", "intro.log.guide": "So liest du das Protokoll", "guide.startAreasTitle": "Die Bereiche", "guide.startAreas": "Live zeigt, was das EMS gerade plant. Akku (SMC) lädt den Akku in günstigen Stunden aus dem Netz. Überschuss schaltet Geräte mit Sonnenstrom, Preis in günstigen Stunden. Programme & Regeln startet Spül- und Waschmaschine und verbindet mehrere Bedingungen.", "guide.startOneTabTitle": "Ein Gerät, ein Bereich", "guide.startOneTab": "Der Reiter eines Geräts ergibt sich aus seinen Regeln. Ein Gerät taucht deshalb nie in zwei Reitern auf und wird nie doppelt geschaltet.", "guide.startSafetyTitle": "Was dich schützt", "guide.startSafety": "Ich schalte erst, wenn du den Haftungshinweis bestätigt und das Gerät aktiviert hast. Fehlen Daten, bleibt es aus. Schaltest du selbst, pausiere ich. Der Gesamtschalter unter Programme & Regeln stoppt alles.", "guide.liveModesTitle": "Beobachten, Bestätigen, Automatik", "guide.liveModes": "Beim Beobachten plant und erklärt das EMS nur. Beim Bestätigen schlägt es Schaltungen vor, die du einzeln freigibst. In der Automatik schaltet es freigegebene Geräte selbst.", "guide.liveDevicesTitle": "Welche Geräte das EMS schaltet", "guide.liveDevices": "Nur Wallbox, Wärmepumpe und die Akku-Netzladung des EMS, und auch die nur, wenn du sie unter Geräte freigegeben hast. Geräte aus den anderen Reitern haben ihren eigenen Schalter.", "guide.liveSafetyTitle": "Prüfung vor jeder Schaltung", "guide.liveSafety": "Vor jeder Schaltung prüft das EMS Freigabe, Datenlage und Schutzregeln erneut. Nach einer Handbedienung pausiert es das Gerät.", "guide.liveChartTitle": "Prognose und Deckung lesen", "guide.liveChart": "Das Diagramm zeigt pro Stunde PV-Ertrag, Bedarf und Strompreis. Daraus ergibt sich, wann Laden, Heizen oder Fahren am günstigsten ist.", "guide.logReasonsTitle": "Gründe lesen", "guide.logReasons": "Jeder Eintrag nennt die Regel, die gegriffen hat, zum Beispiel „PV-Überschuss reicht“ oder „Günstige Stunde“, dazu Überschuss, Preis oder Akkustand im Moment der Schaltung.", "guide.logManualTitle": "Von Hand geschaltet", "guide.logManual": "Schaltest du ein Gerät selbst, steht hier „Pausiert“. Ich greife dann zwei Stunden nicht ein oder bis du „Fortsetzen“ drückst.", "guide.logFailedTitle": "Schalten fehlgeschlagen", "guide.logFailed": "Hat ein Gerät den Befehl nicht angenommen, steht hier der Fehler. Prüfe dann, ob es erreichbar ist und, bei Programmgeräten, ob Fernstart aktiv ist.", "mode.live.title": "Live und Automatik", "mode.live.does": "Was jetzt sinnvoll ist, warum, und was als Nächstes kommt.", "mode.live.good": "Gut, um auf einen Blick zu sehen, was heute passiert.", "mode.akku.title": "Akku (SMC)", "mode.akku.does": "Smart Charging lädt den Akku in günstigen Stunden aus dem Netz, wenn die Sonne den Bedarf nicht deckt.", "mode.akku.good": "Gut mit dynamischem Tarif und schwacher Sonnenprognose.", "hubble.programRunningUntil": "Es ist voraussichtlich gegen {time} fertig.", "hubble.programRunningHow": "Ein laufendes Programm breche ich nie ab.", "hubble.programPlannedHow": "Fertig bis {deadline}, gewählt nach {goal}. Zum Verschieben drückst du beim Gerät „Planung abbrechen“.", "goal.price": "günstigstem Preis", "goal.pv": "meister PV", "goal.both": "Preis und PV",
            "intro.akku.kicker": "Akku (SMC)", "intro.akku.title": "Den Akku aus dem Netz laden, wenn es sich rechnet", "intro.akku.lead": "Hubble schaltet die Netzladung deines Akkus ein und aus, so wie es für dich am meisten bringt.", "intro.akku.body": "Dafür arbeiten vier Module zusammen: GPM kennt den Strompreis, STATS kennt Akkustand und Hausverbrauch, EAI kennt deinen durchschnittlichen Hausverbrauch für Wochentag und Jahreszeit, und SFML liefert die Solarprognose. Zusammen mit deinem Ziel, zum Beispiel Wirtschaftlichkeit oder Zielladung, entscheidet Hubble, ob sich die Netzladung gerade lohnt.", "intro.akku.close": "Reicht die Sonne, bleibt die Netzladung aus. Fehlen Preis oder Akkustand, lädt Hubble nicht aus dem Netz.", "intro.akku.guide": "So funktioniert Smart Charging", "guide.smcSourcesTitle": "Woher die Daten kommen", "guide.smcSources": "Grid Price Monitor (GPM) liefert den Strompreis jeder Stunde und deine Preisschwellen. STATS misst Akkustand und Hausverbrauch. EAI kennt deinen durchschnittlichen Verbrauch für Wochentag und Jahreszeit. Solar Forecast ML (SFML) sagt voraus, wie viel die Sonne heute und morgen liefert.", "guide.smcModesTitle": "Dein Ziel: die Modi", "guide.smcModes": "„Nur die Lücke“ lädt nur so viel, wie Sonne und Akku für den erwarteten Verbrauch nicht decken. „Bis zum Zielstand“ lädt in einer günstigen Stunde bis zu deinem Zielstand. „Beides“ verbindet die zwei.", "guide.smcLimitsTitle": "Zielstand, Unter- und Obergrenze", "guide.smcLimits": "Der Zielstand gilt in günstigen Stunden. Die Untergrenze ist der niedrigste Zielstand, die Obergrenze wird aus dem Netz nie überschritten.", "guide.smcForceTitle": "Preisgrenze und Force-Preis", "guide.smcForce": "Unter der Preisgrenze ist eine Stunde günstig. Unter dem Force-Preis lädt Hubble immer bis zur Obergrenze, unabhängig von der Prognose. Beide Schwellen stellst du in GPM ein.", "guide.smcSwitchTitle": "Der Ladeschalter", "guide.smcSwitch": "Smart Charging schaltet den Ladeschalter deines Akkus, den du unter Einstellungen → Solar Forecast Stats → Konfigurieren → Batterie hinterlegst. Ohne Schalter wird nur empfohlen, aber nicht geschaltet.", "guide.smcSafetyTitle": "Wann nicht geladen wird", "guide.smcSafety": "Ohne Strompreis, ohne Akkustand oder ohne Batteriekapazität bleibt die Netzladung aus. Tagsüber hält Hubble Platz für die Sonne frei, wenn die Prognose sie füllen kann.",
            "cdesc.pv_surplus": "Schaltet ein, wenn genug Überschuss ins Netz geht, und bleibt an, solange mindestens die Hälfte übrig ist.",
            "cdesc.cheapest_hours": "Schaltet in den günstigsten Stunden nach Strompreis ein.",
            "cdesc.price_below": "Schaltet in jeder Stunde ein, deren Preis unter deiner Grenze liegt.",
            "cdesc.time_window": "Schaltet nur an den gewählten Tagen zwischen Start und Ende ein.",
            "cdesc.battery_soc_min": "Schaltet nur ein, wenn die Batterie mindestens so voll ist.",
            "helpSwitchable": "Das Gerät wird ein- und ausgeschaltet. Die Leistung brauche ich, um den Überschuss richtig zu verteilen.",
            "helpProgram": "Das Gerät wird einmal gestartet. Der Freigabe-Sensor (zum Beispiel „Fernstart aktiv“) sorgt dafür, dass nur gestartet wird, wenn es bereit ist.",
            "helpGuards": "Mindestlaufzeit und Mindestpause schützen das Gerät vor ständigem Ein- und Ausschalten.",
            "helpObjective": "Ich suche den besten Start zwischen jetzt (oder morgen 00:00) und der Frist: günstigster Preis, meiste PV oder beides ausgewogen.",
            "matchAnyHelp": "Eine erfüllte Bedingung reicht zum Einschalten.",
            "matchAllHelp": "Alle Bedingungen müssen gleichzeitig erfüllt sein.",
            "kpiActive": "Aktive Geräte",
            "kpiNext": "Nächster Start",
            "fScope": "Zeitraum",
            noticeTitle: "Wichtiger Hinweis",
            noticeText: "Diese Steuerung schaltet Geräte selbstständig. Für Schäden wird nicht gehaftet. Beobachte neue Geräte in den ersten Tagen, nutze nur dafür geeignete Geräte und sichere sie zusätzlich ab.",
            ackLabel: "Ich habe den Hinweis gelesen und übernehme die Verantwortung für die geschalteten Geräte.",
            ackButton: "Bestätigen", ackDone: "Hinweis bestätigt",
            demoText: "Demo: Das sind Beispieldaten. Mit einer gültigen Premium-Lizenz kannst du hier eigene Geräte anlegen und schalten lassen.",
            loading: "Lade Verbraucher …", loadFailed: "Die Verbraucher konnten nicht geladen werden.",
            empty: "Noch kein Gerät angelegt.", add: "Gerät hinzufügen", edit: "Bearbeiten", remove: "Löschen",
            confirmDelete: "Wirklich löschen?", cancel: "Abbrechen", save: "Speichern",
            active: "Regelung aktiv", activeHint: "Erst nach der Bestätigung des Hinweises möglich.",
            resume: "Fortsetzen", arm: "Beladen, jetzt planen", disarm: "Planung abbrechen",
            kindSwitchable: "Schaltbar", kindProgram: "Programmgerät",
            fName: "Name", fKind: "Typ", fPriority: "Priorität (1 = zuerst)", fPower: "Leistung (W)", fMinSurplus: "Mindest-Überschuss zum Start (W)",
            fEntity: "Schalter-Entität", fEntityProgram: "Start-Entität", fReady: "Freigabe-Sensor (optional)",
            fMatch: "Bedingungen verknüpfen", matchAny: "Eine reicht", matchAll: "Alle müssen zutreffen",
            fConditions: "Bedingungen", addCondition: "Bedingung hinzufügen", noConditions: "Ohne Bedingung schaltet das Gerät nie.",
            fMinRuntime: "Mindestlaufzeit (Min)", fMinOff: "Mindestpause (Min)",
            fDeadline: "Fertig bis (Uhrzeit)", fDuration: "Laufzeit (Min)", fObjective: "Ziel", fEarliest: "Frühester Start",
            objPrice: "Günstigster Preis", objPv: "Meiste PV", objBoth: "Preis und PV",
            earlyToday: "Ab jetzt", earlyTomorrow: "Erst morgen",
            "ctype.pv_surplus": "PV-Überschuss", "ctype.cheapest_hours": "Günstigste Stunden", "ctype.price_below": "Preis unter Grenze",
            "ctype.time_window": "Zeitfenster", "ctype.battery_soc_min": "Batterie mindestens",
            scopeToday: "Heute", scopeRolling: "Nächste 24 Stunden", fHours: "Anzahl Stunden", fMaxCt: "Preis bis (ct/kWh)", fPercent: "Ladestand ab (%)",
            fDays: "Tage", fStart: "Von", fEnd: "Bis",
            "cond.pv_surplus": "PV-Überschuss", "cond.cheapest_hours": "In den {hours} günstigsten Stunden ({scope})",
            "cond.price_below": "Preis bis {max_ct} ct/kWh", "cond.time_window": "{start} bis {end}", "cond.battery_soc_min": "Batterie ab {percent} %",
            inSurplus: "Überschuss", inBattery: "Batterie", inPricesToday: "Preise heute", inPricesTomorrow: "Preise morgen", inForecast: "PV-Prognose",
            yes: "da", no: "fehlt",
            "state.on": "An", "state.off": "Aus", "state.inactive": "Nicht aktiv", "state.paused": "Pausiert",
            "state.idle": "Wartet", "state.armed": "Bereit", "state.planned": "Geplant", "state.started": "Läuft", "state.done": "Fertig",
            planAt: "Start {start}, Ende {end}", planLate: "Frist zu knapp, Start sofort",
            nextStart: "Nächster Start: {start} bis {end}", nextNeedsSurplus: " (wenn der Überschuss reicht)", nextSurplus: "Startet bei Überschuss ab {w} W",
            previewAt: "Würde starten: {start}, Ende {end} (nach „Beladen, jetzt planen“)", previewLate: "Würde sofort starten (Frist zu knapp)",
            logEmpty: "Noch keine Schaltungen.", logTime: "Zeit", logDevice: "Gerät", logAction: "Aktion", logReason: "Grund", logDetail: "Messwerte",
            "action.on": "Eingeschaltet", "action.off": "Ausgeschaltet", "action.start": "Programm gestartet", "action.armed": "Bereit gemeldet",
            "action.disarmed": "Planung abgebrochen", "action.paused": "Pausiert", "action.resumed": "Fortgesetzt", "action.activated": "Aktiviert",
            "action.deactivated": "Deaktiviert", "action.write_failed": "Schalten fehlgeschlagen", "action.disclaimer_acknowledged": "Hinweis bestätigt",
            master: "Gesamtschalter", masterHelp: "Aus: Es wird nichts geschaltet, laufende Regeln pausieren.", masterOn: "Steuerung an", masterOff: "Steuerung aus",
            baseLoad: "Grundlast des Hauses (W)", baseLoadHelp: "Wird bei der PV-Planung von Programmgeräten vom Ertrag abgezogen.",
            "reason.pv_surplus": "PV-Überschuss reicht", "reason.surplus_budget": "Kein freier Überschuss für dieses Gerät", "reason.surplus_unavailable": "Das Überschusssignal fehlt gerade",
            "reason.surplus_not_stable": "Überschuss noch nicht stabil", "reason.cheapest_hour": "Günstige Stunde", "reason.not_cheapest_hour": "Keine der günstigsten Stunden",
            "reason.price_below": "Preis unter der Grenze", "reason.price_above_limit": "Preis über der Grenze", "reason.price_unavailable": "Der Preis fehlt",
            "reason.battery_ok": "Batterie ausreichend", "reason.battery_low": "Batterie zu niedrig", "reason.soc_unavailable": "Batteriestand fehlt",
            "reason.in_window": "Im Zeitfenster", "reason.outside_window": "Außerhalb des Zeitfensters", "reason.all_met": "Alle Bedingungen erfüllt", "reason.none_met": "Keine Bedingung erfüllt",
            "reason.no_conditions": "Keine Bedingung eingetragen", "reason.min_runtime": "Mindestlaufzeit läuft noch", "reason.min_off_time": "Mindestpause läuft noch",
            "reason.cycle_limit": "Zu viele Schaltungen in der letzten Stunde", "reason.one_start_per_cycle": "Ein Start pro Durchlauf",
            "reason.manual_override": "Von Hand geschaltet, Regelung pausiert", "reason.entity_unavailable": "Das Gerät ist nicht erreichbar",
            "reason.inactive": "Regelung nicht aktiv", "reason.license_required": "Premium-Lizenz nötig", "reason.waiting_for_arm": "Wartet auf „Beladen, jetzt planen“",
            "reason.planned": "Start geplant", "reason.deadline_too_tight": "Frist zu knapp, Start sofort", "reason.forecast_unavailable": "Die PV-Prognose fehlt",
            "reason.waiting_ready": "Wartet auf die Freigabe am Gerät", "reason.program_running": "Programm läuft", "reason.pending": "Wird geprüft",
            "reason.planned_start": "Geplanter Start", "reason.user": "Von dir", "reason.ready_entity": "Freigabe am Gerät", "reason.invalid_program": "Programmdaten ungültig",
            errGeneric: "Das hat nicht geklappt.",
            "err.disclaimer_required": "Bestätige zuerst den Hinweis.", "err.premium_required": "Dafür ist eine gültige Premium-Lizenz nötig.",
            "err.invalid_entity": "Die Entität fehlt oder ist nicht erlaubt.", "err.entity_needs_program": "Buttons und Scripts gehören zum Typ „Programmgerät“. Wähle diesen Typ.", typeHint: "Ein Button oder Script startet nur ein Programm. Wechsle auf „Programmgerät“.", switchType: "Auf Programmgerät wechseln", "err.invalid_name": "Der Name fehlt oder ist zu lang.",
            "err.invalid_power": "Die Leistung ist ungültig.", "err.invalid_deadline": "Die Uhrzeit ist ungültig.", "err.too_many": "Das Limit an Geräten ist erreicht.",
        },
        en: {
            title: "Smart loads",
            tabsLabel: "Smart loads sections",
            "tab.devices": "Devices", "tab.log": "Log", "tab.settings": "Settings",
            "introKicker": "Premium · Programs & rules",
            "introTitle": "Switch devices when it pays off",
            "introLead": "Add your devices and tell me when they should run.",
            "introBody": "Every minute I check PV surplus, electricity price, time of day and battery level, and switch a device exactly when your conditions are met. Program devices like the dishwasher get a start window up to your deadline.",
            "introClose": "You stay in control: every device has its own switch, and whatever you switch by hand always wins.",
            "guide.title": "How the control works",
            "guide.principleTitle": "How it works",
            "guide.principle": "Every minute I check the conditions of each active device. If they apply I switch on, otherwise off. If a reading or a price is missing, the condition counts as not met and the device stays off. A new device starts with control switched off; you activate it per device.",
            "guide.surplusTitle": "PV surplus",
            "guide.surplus": "The device starts when more power is fed into the grid than the minimum surplus you entered, stable for about two minutes. It keeps running while at least half of that remains. The device's own consumption does not count as missing surplus. If the surplus does not cover all devices, the one with the lowest priority number gets it first.",
            "guide.cheapestTitle": "Cheapest hours",
            "guide.cheapest": "The device runs in the cheapest N hours by the price from the Grid Price Monitor. “Today” takes the cheapest hours of the calendar day, “Next 24 hours” compares on a rolling basis from now. Tomorrow's prices usually arrive in the afternoon; before that there is no window for tomorrow.",
            "guide.priceTitle": "Price limit",
            "guide.price": "The device runs in every hour whose price is at most your limit in ct/kWh. Without a price it stays off.",
            "guide.windowTitle": "Time window",
            "guide.window": "The device may only run on the chosen weekdays between start and end. Windows across midnight are possible, for example 22:00 to 06:00.",
            "guide.batteryTitle": "Battery at least",
            "guide.battery": "The device only runs if the battery level is at least as high as entered. That keeps enough energy for the house.",
            "guide.matchTitle": "One or all",
            "guide.match": "With “One is enough” a single met condition is enough, for example surplus or a cheap hour. With “All must apply” all must hold at the same time, for example a cheap price and battery from 60 %.",
            "guide.programTitle": "Program devices",
            "guide.program": "Dishwashers, washing machines and the like are not switched on and off but started once. After loading, press “Loaded, plan now”, or let the device's release sensor do it. I then look for the best start up to the deadline, by price, by PV yield or both. “Not before tomorrow” moves the start to the next day. At the planned time I operate the start entity, provided the device is released. A running program is never aborted.",
            "guide.priorityTitle": "Priority",
            "guide.priority": "A small number means first. Priority decides which device gets the surplus first. Wallbox, heat pump and battery from the EMS run independently; their consumption lowers the measurable surplus.",
            "guide.protectTitle": "Protection for your devices",
            "guide.protect": "Minimum run time and minimum pause prevent constant cycling, at most 6 switches per hour and one start per pass. If you switch a device yourself I pause it for two hours. The master switch in the settings stops everything at once.",
            "fDoor": "Door sensor (optional)", "fDoorOpenings": "Openings until ready", "helpDoor": "With a door sensor the device reports itself ready: after a run every opening counts, and closing after the set number plans the start. Unloading then loading means 2. Without a sensor, “Loaded, plan now” stays.", "doorCount": "Door opened {n}/{m} since the last run", "reason.door": "Door: loading detected", "guide.doorTitle": "Door detection", "guide.door": "If you set a door sensor for a program device, I count how often the door is opened after a finished run. When it closes after the set number of openings, the device counts as loaded and I plan the start. This is an estimate: opening the door without loading can lead to an empty run. Without a door sensor you mark the device ready with “Loaded, plan now”, here or on the dashboard card.",
            "view.start": "Start", "view.surplus": "Surplus", "view.price": "Price", "view.loads": "Programs & rules", "view.log": "Log", "intro.surplus": "Devices with an on/off switch that run as soon as your system produces more than the house needs. A device is always in one tab only, so nothing switches twice.", "intro.price": "Devices with an on/off switch that run in a price window: below a price or in the cheapest hours, optionally only in a time window. A device is always in one tab only.", "addSurplus": "Add surplus device", "addPrice": "Add price device", "empty.surplus": "No device that runs on surplus yet.", "empty.price": "No device with a price window yet.", "empty.loads": "No program device and no custom rule yet.", "helpPriceWindow": "The device runs while the price window applies and switches off afterwards.", "fPriceMode": "Price window", "priceModeBelow": "Below a price", "priceModeCheapest": "Cheapest hours", "useWindow": "Only in a time window", "useWindowHelp": "For example only at night from 22:00 to 06:00.", "mode.surplus.title": "Surplus", "mode.surplus.does": "Switches on devices with an on/off switch when your system produces more than the house needs.", "mode.surplus.good": "Good for a water heater, heating rod or pool pump: power you would otherwise feed in for little money.", "mode.price.title": "Price", "mode.price.does": "Switches devices on in a price window: below a price or in the cheapest hours.", "mode.price.good": "Good with a dynamic tariff for anything that can run in cheap hours.", "mode.loads.title": "Programs & rules", "mode.loads.does": "Program devices like dishwashers or washing machines get a start window up to your deadline, plus custom rules with several conditions.", "mode.loads.good": "Good for devices that start once and run through, also with door detection.", "modeCount": "{n} active", "open": "Open", "settingsTitle": "Settings",
            "hubble.demo": "This is example data; with Premium you see your devices here.", "hubble.startHead": "I am controlling {n} devices for you.", "hubble.startEmpty": "I am not controlling any devices for you yet.", "hubble.nextDevice": "Next, {name} starts at {time}.", "hubble.surplusNow": "Right now {v} of surplus goes to the grid.", "hubble.surplusEmpty": "Add devices here that should use your solar power.", "hubble.surplusMissing": "The surplus signal is missing, so the devices stay off.", "hubble.surplusRunning": "{n} devices are running on your surplus.", "hubble.surplusIdle": "The surplus is not enough for any device right now.", "hubble.surplusHow": "A device starts once its minimum surplus has been stable for about two minutes.", "hubble.priceEmpty": "Add devices here that run when power is cheap.", "hubble.priceMissing": "The electricity price is missing, so the devices stay off.", "hubble.priceNow": "Power costs {v} ct/kWh right now.", "hubble.priceTomorrow": "Tomorrow's prices usually arrive in the afternoon.", "hubble.programRunning": "{name} is running.", "hubble.programPlanned": "{name} starts at {time}.", "hubble.programWaiting": "No program is waiting for its start.", "hubble.programEmpty": "Add program devices like the dishwasher here.", "hubble.programDoor": "The door of {name} was opened {n} of {m} times.", "hubble.programHow": "After loading, press “Loaded, plan now”, or let the door do it.", "hubble.logToday": "I switched {n} times today.", "hubble.logQuiet": "I have not switched anything today.", "hubble.logLast": "Last: {name}, {action} at {time}, {reason}.",
            "hubble.startHeadOne": "I am controlling one device for you.", "hubble.surplusRunningOne": "One device is running on your surplus.", "hubble.logTodayOne": "I switched once today.",
            "view.live": "Live", "view.akku": "Battery (SMC)", "intro.start.kicker": "Energy management", "intro.start.title": "What the EMS controls for you", "intro.start.lead": "Your solar power and cheap grid power go where they help most.", "intro.start.body": "Every area has its own tab: Live, Battery, Surplus, Price and Programs & rules. A device always belongs to one area only, so nothing switches twice.", "intro.start.close": "Pick an area below to set it up or see what is happening right now.", "intro.start.guide": "How the EMS works", "intro.live.kicker": "Live", "intro.live.title": "What the EMS is planning", "intro.live.lead": "See what makes sense now, why, and what comes next.", "intro.live.body": "I work with your solar forecast, the electricity price and the battery level. The EMS automation only switches the wallbox, the heat pump and the EMS battery grid charge.", "intro.live.close": "Devices under Surplus, Price and Programs & rules are controlled in their own tabs.", "intro.live.guide": "How the EMS automation works", "intro.surplus.kicker": "Surplus", "intro.surplus.title": "Use your own solar power", "intro.surplus.lead": "Devices with an on/off switch run as soon as your system produces more than the house needs.", "intro.surplus.body": "Enter power and minimum surplus. I switch on when enough power would go to the grid and off again when it is no longer enough. If the surplus does not cover all devices, priority decides.", "intro.surplus.close": "A device is always in one tab only, so nothing switches twice.", "intro.surplus.guide": "How surplus works", "intro.price.kicker": "Price", "intro.price.title": "Use power when it is cheap", "intro.price.lead": "Devices with an on/off switch run in your price window.", "intro.price.body": "Choose “Below a price” or “Cheapest hours” and optionally a time window, for example only at night. Prices come from the Grid Price Monitor.", "intro.price.close": "A device is always in one tab only, so nothing switches twice.", "intro.price.guide": "How the price window works", "intro.loads.kicker": "Programs & rules", "intro.loads.title": "Switch devices when it pays off", "intro.loads.lead": "Program devices get a start window, custom rules combine several conditions.", "intro.loads.body": "You no longer start the dishwasher or washing machine yourself: after loading I find the best start up to your deadline, by price, PV or both. For everything else you combine conditions like surplus, price, time window and battery level.", "intro.loads.close": "You stay in control: every device has its own switch, and whatever you switch by hand always wins.", "intro.loads.guide": "How programs and rules work", "intro.log.kicker": "Log", "intro.log.title": "What was switched when", "intro.log.lead": "Every switch is listed with time, reason and readings.", "intro.log.body": "So you can always see why a device ran or stayed off, and whether a command arrived.", "intro.log.close": "The newest entries are on top; the last 250 are kept.", "intro.log.guide": "How to read the log", "guide.startAreasTitle": "The areas", "guide.startAreas": "Live shows what the EMS is planning. Battery (SMC) charges the battery from the grid in cheap hours. Surplus switches devices with solar power, Price in cheap hours. Programs & rules starts dishwashers and washing machines and combines several conditions.", "guide.startOneTabTitle": "One device, one area", "guide.startOneTab": "A device's tab follows from its rules. So a device never appears in two tabs and is never switched twice.", "guide.startSafetyTitle": "What protects you", "guide.startSafety": "I only switch once you have confirmed the liability notice and activated the device. If data is missing it stays off. If you switch yourself, I pause. The master switch under Programs & rules stops everything.", "guide.liveModesTitle": "Observe, confirm, automatic", "guide.liveModes": "In Observe the EMS only plans and explains. In Confirm it proposes switches you release one by one. In Automatic it switches released devices itself.", "guide.liveDevicesTitle": "Which devices the EMS switches", "guide.liveDevices": "Only the wallbox, the heat pump and the EMS battery grid charge, and only if you released them under devices. Devices from the other tabs have their own switch.", "guide.liveSafetyTitle": "Check before every switch", "guide.liveSafety": "Before every switch the EMS checks release, data and protection rules again. After a manual change it pauses the device.", "guide.liveChartTitle": "Reading forecast and coverage", "guide.liveChart": "The chart shows PV yield, demand and electricity price per hour. That tells you when charging, heating or driving is cheapest.", "guide.logReasonsTitle": "Reading reasons", "guide.logReasons": "Every entry names the rule that applied, for example “PV surplus is enough” or “Cheap hour”, plus surplus, price or battery level at that moment.", "guide.logManualTitle": "Switched by hand", "guide.logManual": "If you switch a device yourself, it shows “Paused”. I then stay out for two hours or until you press “Resume”.", "guide.logFailedTitle": "Switching failed", "guide.logFailed": "If a device did not accept the command, the error is shown here. Check that it is reachable and, for program devices, that remote start is active.", "mode.live.title": "Live and automation", "mode.live.does": "What makes sense now, why, and what comes next.", "mode.live.good": "Good to see at a glance what happens today.", "mode.akku.title": "Battery (SMC)", "mode.akku.does": "Smart Charging charges the battery from the grid in cheap hours when the sun does not cover demand.", "mode.akku.good": "Good with a dynamic tariff and a weak solar forecast.", "hubble.programRunningUntil": "It should be done around {time}.", "hubble.programRunningHow": "I never abort a running program.", "hubble.programPlannedHow": "Done by {deadline}, chosen by {goal}. To move it, press “Cancel planning” at the device.", "goal.price": "lowest price", "goal.pv": "most PV", "goal.both": "price and PV",
            "intro.akku.kicker": "Battery (SMC)", "intro.akku.title": "Charge the battery from the grid when it pays off", "intro.akku.lead": "Hubble switches your battery's grid charging on and off in the way that helps you most.", "intro.akku.body": "Four modules work together: GPM knows the electricity price, STATS knows the battery level and house consumption, EAI knows your average house consumption for the weekday and season, and SFML provides the solar forecast. Together with your goal, for example economy or a target charge, Hubble decides whether grid charging pays off right now.", "intro.akku.close": "If the sun is enough, grid charging stays off. If the price or battery level is missing, Hubble does not charge from the grid.", "intro.akku.guide": "How Smart Charging works", "guide.smcSourcesTitle": "Where the data comes from", "guide.smcSources": "Grid Price Monitor (GPM) provides the price of every hour and your price thresholds. STATS measures battery level and house consumption. EAI knows your average consumption for the weekday and season. Solar Forecast ML (SFML) predicts how much the sun delivers today and tomorrow.", "guide.smcModesTitle": "Your goal: the modes", "guide.smcModes": "“Gap only” charges just what sun and battery will not cover for the expected consumption. “Up to target” charges up to your target level in a cheap hour. “Both” combines the two.", "guide.smcLimitsTitle": "Target, lower and upper limit", "guide.smcLimits": "The target level applies in cheap hours. The lower limit is the lowest target, and the upper limit is never exceeded from the grid.", "guide.smcForceTitle": "Price limit and force price", "guide.smcForce": "Below the price limit an hour is cheap. Below the force price Hubble always charges up to the upper limit, regardless of the forecast. You set both thresholds in GPM.", "guide.smcSwitchTitle": "The charge switch", "guide.smcSwitch": "Smart Charging switches your battery's charge switch, which you set under Settings → Solar Forecast Stats → Configure → Battery. Without a switch it only recommends and does not switch.", "guide.smcSafetyTitle": "When it does not charge", "guide.smcSafety": "Without electricity price, battery level or battery capacity, grid charging stays off. During the day Hubble keeps room for the sun if the forecast can fill it.",
            "cdesc.pv_surplus": "Switches on when enough surplus is fed in and stays on while at least half remains.",
            "cdesc.cheapest_hours": "Switches on in the cheapest hours by electricity price.",
            "cdesc.price_below": "Switches on in every hour whose price is below your limit.",
            "cdesc.time_window": "Switches on only on the chosen days between start and end.",
            "cdesc.battery_soc_min": "Switches on only if the battery is at least this full.",
            "helpSwitchable": "The device is switched on and off. I need its power to share the surplus correctly.",
            "helpProgram": "The device is started once. The release sensor (for example “remote start active”) makes sure it only starts when it is ready.",
            "helpGuards": "Minimum run time and minimum pause protect the device from constant switching.",
            "helpObjective": "I look for the best start between now (or tomorrow 00:00) and the deadline: lowest price, most PV or both balanced.",
            "matchAnyHelp": "One met condition is enough to switch on.",
            "matchAllHelp": "All conditions must be met at the same time.",
            "kpiActive": "Active devices",
            "kpiNext": "Next start",
            "fScope": "Period",
            noticeTitle: "Important notice",
            noticeText: "This control switches devices on its own. No liability is accepted for damage. Watch new devices closely in the first days, only use devices that are suited for it and protect them separately.",
            ackLabel: "I have read the notice and take responsibility for the devices that are switched.",
            ackButton: "Confirm", ackDone: "Notice confirmed",
            demoText: "Demo: this is example data. With a valid Premium licence you can add your own devices here and have them switched.",
            loading: "Loading smart loads …", loadFailed: "The smart loads could not be loaded.",
            empty: "No device added yet.", add: "Add device", edit: "Edit", remove: "Delete",
            confirmDelete: "Really delete?", cancel: "Cancel", save: "Save",
            active: "Control active", activeHint: "Possible only after you confirm the notice.",
            resume: "Resume", arm: "Loaded, plan now", disarm: "Cancel planning",
            kindSwitchable: "Switchable", kindProgram: "Program device",
            fName: "Name", fKind: "Type", fPriority: "Priority (1 = first)", fPower: "Power (W)", fMinSurplus: "Minimum surplus to start (W)",
            fEntity: "Switch entity", fEntityProgram: "Start entity", fReady: "Ready sensor (optional)",
            fMatch: "Combine conditions", matchAny: "One is enough", matchAll: "All must apply",
            fConditions: "Conditions", addCondition: "Add condition", noConditions: "Without a condition the device never switches.",
            fMinRuntime: "Minimum run time (min)", fMinOff: "Minimum pause (min)",
            fDeadline: "Finished by (time)", fDuration: "Run time (min)", fObjective: "Goal", fEarliest: "Earliest start",
            objPrice: "Lowest price", objPv: "Most PV", objBoth: "Price and PV",
            earlyToday: "From now", earlyTomorrow: "Not before tomorrow",
            "ctype.pv_surplus": "PV surplus", "ctype.cheapest_hours": "Cheapest hours", "ctype.price_below": "Price below limit",
            "ctype.time_window": "Time window", "ctype.battery_soc_min": "Battery at least",
            scopeToday: "Today", scopeRolling: "Next 24 hours", fHours: "Number of hours", fMaxCt: "Price up to (ct/kWh)", fPercent: "Charge from (%)",
            fDays: "Days", fStart: "From", fEnd: "To",
            "cond.pv_surplus": "PV surplus", "cond.cheapest_hours": "In the {hours} cheapest hours ({scope})",
            "cond.price_below": "Price up to {max_ct} ct/kWh", "cond.time_window": "{start} to {end}", "cond.battery_soc_min": "Battery from {percent} %",
            inSurplus: "Surplus", inBattery: "Battery", inPricesToday: "Prices today", inPricesTomorrow: "Prices tomorrow", inForecast: "PV forecast",
            yes: "present", no: "missing",
            "state.on": "On", "state.off": "Off", "state.inactive": "Not active", "state.paused": "Paused",
            "state.idle": "Waiting", "state.armed": "Ready", "state.planned": "Planned", "state.started": "Running", "state.done": "Done",
            planAt: "Start {start}, end {end}", planLate: "Deadline too tight, starting now",
            nextStart: "Next start: {start} to {end}", nextNeedsSurplus: " (if the surplus is enough)", nextSurplus: "Starts with surplus from {w} W",
            previewAt: "Would start: {start}, end {end} (after “Loaded, plan now”)", previewLate: "Would start right away (deadline too tight)",
            logEmpty: "No switching yet.", logTime: "Time", logDevice: "Device", logAction: "Action", logReason: "Reason", logDetail: "Readings",
            "action.on": "Switched on", "action.off": "Switched off", "action.start": "Program started", "action.armed": "Marked ready",
            "action.disarmed": "Planning cancelled", "action.paused": "Paused", "action.resumed": "Resumed", "action.activated": "Activated",
            "action.deactivated": "Deactivated", "action.write_failed": "Switching failed", "action.disclaimer_acknowledged": "Notice confirmed",
            master: "Master switch", masterHelp: "Off: nothing is switched and running rules pause.", masterOn: "Control on", masterOff: "Control off",
            baseLoad: "Base load of the house (W)", baseLoadHelp: "Subtracted from the yield when planning PV for program devices.",
            "reason.pv_surplus": "PV surplus is enough", "reason.surplus_budget": "No free surplus for this device", "reason.surplus_unavailable": "The surplus signal is missing right now",
            "reason.surplus_not_stable": "Surplus not stable yet", "reason.cheapest_hour": "Cheap hour", "reason.not_cheapest_hour": "Not one of the cheapest hours",
            "reason.price_below": "Price below the limit", "reason.price_above_limit": "Price above the limit", "reason.price_unavailable": "The price is missing",
            "reason.battery_ok": "Battery sufficient", "reason.battery_low": "Battery too low", "reason.soc_unavailable": "Battery level is missing",
            "reason.in_window": "Inside the time window", "reason.outside_window": "Outside the time window", "reason.all_met": "All conditions met", "reason.none_met": "No condition met",
            "reason.no_conditions": "No condition entered", "reason.min_runtime": "Minimum run time still running", "reason.min_off_time": "Minimum pause still running",
            "reason.cycle_limit": "Too many switches in the last hour", "reason.one_start_per_cycle": "One start per pass",
            "reason.manual_override": "Switched by hand, control paused", "reason.entity_unavailable": "The device is not reachable",
            "reason.inactive": "Control not active", "reason.license_required": "Premium licence required", "reason.waiting_for_arm": "Waiting for “Loaded, plan now”",
            "reason.planned": "Start planned", "reason.deadline_too_tight": "Deadline too tight, starting now", "reason.forecast_unavailable": "The PV forecast is missing",
            "reason.waiting_ready": "Waiting for the release on the device", "reason.program_running": "Program running", "reason.pending": "Being checked",
            "reason.planned_start": "Planned start", "reason.user": "By you", "reason.ready_entity": "Release on the device", "reason.invalid_program": "Program data invalid",
            errGeneric: "That did not work.",
            "err.disclaimer_required": "Confirm the notice first.", "err.premium_required": "A valid Premium licence is required.",
            "err.invalid_entity": "The entity is missing or not allowed.", "err.entity_needs_program": "Buttons and scripts belong to the type “Program device”. Choose that type.", typeHint: "A button or script only starts a program. Switch to “Program device”.", switchType: "Switch to program device", "err.invalid_name": "The name is missing or too long.",
            "err.invalid_power": "The power is invalid.", "err.invalid_deadline": "The time is invalid.", "err.too_many": "The device limit is reached.",
        },
        pl: {
            title: "Odbiorniki",
            tabsLabel: "Sekcje strony odbiorników",
            "tab.devices": "Urządzenia", "tab.log": "Dziennik", "tab.settings": "Ustawienia",
            "introKicker": "Premium · Programy i reguły",
            "introTitle": "Włączaj urządzenia, gdy się to opłaca",
            "introLead": "Dodaj swoje urządzenia i powiedz, kiedy mają pracować.",
            "introBody": "Co minutę sprawdzam nadwyżkę PV, cenę prądu, porę dnia i stan baterii i włączam urządzenie dokładnie wtedy, gdy Twoje warunki są spełnione. Urządzenia z programem, jak zmywarka, dostają okno startu do Twojego terminu.",
            "introClose": "Zachowujesz kontrolę: każde urządzenie ma własny przełącznik, a to, co włączysz ręcznie, zawsze ma pierwszeństwo.",
            "guide.title": "Jak działa sterowanie",
            "guide.principleTitle": "Jak to działa",
            "guide.principle": "Co minutę sprawdzam warunki każdego aktywnego urządzenia. Jeśli są spełnione, włączam, w przeciwnym razie wyłączam. Gdy brakuje pomiaru lub ceny, warunek uznaję za niespełniony i urządzenie zostaje wyłączone. Nowe urządzenie startuje z wyłączonym sterowaniem, aktywujesz je osobno.",
            "guide.surplusTitle": "Nadwyżka PV",
            "guide.surplus": "Urządzenie startuje, gdy do sieci trafia więcej prądu niż wpisana minimalna nadwyżka, stabilnie przez około dwie minuty. Pracuje dalej, dopóki zostaje co najmniej połowa tej wartości. Własny pobór urządzenia nie liczy się jako brak nadwyżki. Jeśli nadwyżka nie starcza dla wszystkich, pierwsze dostaje urządzenie z najmniejszym numerem priorytetu.",
            "guide.cheapestTitle": "Najtańsze godziny",
            "guide.cheapest": "Urządzenie pracuje w najtańszych N godzinach według ceny z Grid Price Monitor. „Dziś” bierze najtańsze godziny dnia kalendarzowego, „Następne 24 godziny” porównuje kroczą od teraz. Ceny na jutro zwykle pojawiają się po południu, wcześniej na jutro nie ma okna.",
            "guide.priceTitle": "Limit ceny",
            "guide.price": "Urządzenie pracuje w każdej godzinie, w której cena nie przekracza Twojego limitu w ct/kWh. Bez ceny zostaje wyłączone.",
            "guide.windowTitle": "Okno czasowe",
            "guide.window": "Urządzenie może pracować tylko w wybrane dni tygodnia między startem a końcem. Okna przez północ są możliwe, np. od 22:00 do 06:00.",
            "guide.batteryTitle": "Bateria co najmniej",
            "guide.battery": "Urządzenie pracuje tylko wtedy, gdy stan baterii jest co najmniej tak wysoki jak wpisany. Dzięki temu zostaje dość energii dla domu.",
            "guide.matchTitle": "Jeden lub wszystkie",
            "guide.match": "Przy „Wystarczy jeden” wystarczy jeden spełniony warunek, np. nadwyżka lub tania godzina. Przy „Wszystkie muszą być spełnione” wszystkie muszą zgadzać się naraz, np. niska cena i bateria od 60 %.",
            "guide.programTitle": "Urządzenia z programem",
            "guide.program": "Zmywarki, pralki i podobne nie są włączane i wyłączane, tylko raz uruchamiane. Po załadowaniu naciśnij „Załadowane, planuj” albo pozwól to zrobić czujnikowi gotowości urządzenia. Szukam wtedy najlepszego startu do terminu: według ceny, uzysku PV lub obu. „Dopiero jutro” przesuwa start na następny dzień. O zaplanowanej porze uruchamiam encję startu, jeśli urządzenie jest zwolnione. Działającego programu nigdy nie przerywam.",
            "guide.priorityTitle": "Priorytet",
            "guide.priority": "Mała liczba oznacza: najpierw. Priorytet decyduje, które urządzenie dostaje nadwyżkę jako pierwsze. Wallbox, pompa ciepła i bateria z EMS działają niezależnie, ich pobór obniża mierzalną nadwyżkę.",
            "guide.protectTitle": "Ochrona urządzeń",
            "guide.protect": "Minimalny czas pracy i minimalna przerwa zapobiegają ciągłemu przełączaniu, najwyżej 6 przełączeń na godzinę i jeden start na cykl. Jeśli sam przełączysz urządzenie, wstrzymuję je na dwie godziny. Wyłącznik główny w ustawieniach zatrzymuje wszystko od razu.",
            "fDoor": "Czujnik drzwi (opcjonalnie)", "fDoorOpenings": "Otwarcia do gotowości", "helpDoor": "Z czujnikiem drzwi urządzenie samo zgłasza gotowość: po cyklu liczy się każde otwarcie, a zamknięcie po ustawionej liczbie planuje start. Najpierw wyjmowanie, potem wkładanie to 2. Bez czujnika zostaje „Załadowane, planuj”.", "doorCount": "Drzwi otwarte {n}/{m} od ostatniego cyklu", "reason.door": "Drzwi: wykryto załadunek", "guide.doorTitle": "Wykrywanie drzwi", "guide.door": "Jeśli ustawisz czujnik drzwi dla urządzenia z programem, po zakończonym cyklu liczę, ile razy drzwi są otwierane. Gdy zamkną się po ustawionej liczbie otwarć, urządzenie uznaję za załadowane i planuję start. To szacunek: otwarcie drzwi bez załadunku może dać pusty cykl. Bez czujnika drzwi zgłaszasz gotowość przyciskiem „Załadowane, planuj”, tutaj lub na karcie pulpitu.",
            "view.start": "Start", "view.surplus": "Nadwyżka", "view.price": "Cena", "view.loads": "Programy i reguły", "view.log": "Dziennik", "intro.surplus": "Urządzenia z przełącznikiem wł./wył., które pracują, gdy instalacja produkuje więcej, niż potrzebuje dom. Urządzenie jest zawsze tylko w jednej zakładce, więc nic nie przełącza się podwójnie.", "intro.price": "Urządzenia z przełącznikiem wł./wył., które pracują w oknie cenowym: poniżej ceny lub w najtańszych godzinach, opcjonalnie tylko w wybranym czasie. Urządzenie jest zawsze tylko w jednej zakładce.", "addSurplus": "Dodaj urządzenie na nadwyżkę", "addPrice": "Dodaj urządzenie cenowe", "empty.surplus": "Brak urządzenia pracującego na nadwyżce.", "empty.price": "Brak urządzenia z oknem cenowym.", "empty.loads": "Brak urządzenia z programem i własnej reguły.", "helpPriceWindow": "Urządzenie pracuje, dopóki pasuje okno cenowe, a potem się wyłącza.", "fPriceMode": "Okno cenowe", "priceModeBelow": "Poniżej ceny", "priceModeCheapest": "Najtańsze godziny", "useWindow": "Tylko w wybranym czasie", "useWindowHelp": "Na przykład tylko w nocy od 22:00 do 06:00.", "mode.surplus.title": "Nadwyżka", "mode.surplus.does": "Włącza urządzenia z przełącznikiem wł./wył., gdy instalacja produkuje więcej, niż potrzebuje dom.", "mode.surplus.good": "Dobre dla bojlera, grzałki lub pompy basenowej: prąd, który inaczej oddasz do sieci za niewiele.", "mode.price.title": "Cena", "mode.price.does": "Włącza urządzenia w oknie cenowym: poniżej ceny lub w najtańszych godzinach.", "mode.price.good": "Dobre przy taryfie dynamicznej dla wszystkiego, co może pracować w tanich godzinach.", "mode.loads.title": "Programy i reguły", "mode.loads.does": "Urządzenia z programem, jak zmywarka czy pralka, dostają okno startu do Twojego terminu, a do tego własne reguły z kilkoma warunkami.", "mode.loads.good": "Dobre dla urządzeń, które startują raz i pracują do końca, także z wykrywaniem drzwi.", "modeCount": "{n} aktywne", "open": "Otwórz", "settingsTitle": "Ustawienia",
            "hubble.demo": "To dane przykładowe, z Premium zobaczysz tu swoje urządzenia.", "hubble.startHead": "Steruję teraz {n} urządzeniami.", "hubble.startEmpty": "Jeszcze nie steruję żadnym urządzeniem.", "hubble.nextDevice": "Następne startuje {name} o {time}.", "hubble.surplusNow": "Teraz {v} nadwyżki trafia do sieci.", "hubble.surplusEmpty": "Dodaj tu urządzenia, które mają korzystać z prądu ze słońca.", "hubble.surplusMissing": "Brakuje sygnału nadwyżki, więc urządzenia zostają wyłączone.", "hubble.surplusRunning": "{n} urządzeń pracuje na Twojej nadwyżce.", "hubble.surplusIdle": "Nadwyżka nie wystarcza teraz dla żadnego urządzenia.", "hubble.surplusHow": "Urządzenie startuje, gdy jego minimalna nadwyżka jest stabilna przez około dwie minuty.", "hubble.priceEmpty": "Dodaj tu urządzenia, które pracują, gdy prąd jest tani.", "hubble.priceMissing": "Brakuje ceny prądu, więc urządzenia zostają wyłączone.", "hubble.priceNow": "Prąd kosztuje teraz {v} ct/kWh.", "hubble.priceTomorrow": "Ceny na jutro pojawiają się zwykle po południu.", "hubble.programRunning": "{name} pracuje.", "hubble.programPlanned": "{name} startuje o {time}.", "hubble.programWaiting": "Żaden program nie czeka na start.", "hubble.programEmpty": "Dodaj tu urządzenia z programem, jak zmywarka.", "hubble.programDoor": "Drzwi {name} otwarto {n} z {m} razy.", "hubble.programHow": "Po załadowaniu naciśnij „Załadowane, planuj” albo pozwól zrobić to drzwiom.", "hubble.logToday": "Dziś przełączyłem {n} razy.", "hubble.logQuiet": "Dziś niczego jeszcze nie przełączyłem.", "hubble.logLast": "Ostatnio: {name}, {action} o {time}, {reason}.",
            "hubble.startHeadOne": "Steruję teraz jednym urządzeniem.", "hubble.surplusRunningOne": "Jedno urządzenie pracuje na Twojej nadwyżce.", "hubble.logTodayOne": "Dziś przełączyłem raz.",
            "view.live": "Na żywo", "view.akku": "Bateria (SMC)", "intro.start.kicker": "Zarządzanie energią", "intro.start.title": "Czym steruje dla Ciebie EMS", "intro.start.lead": "Twój prąd ze słońca i tani prąd z sieci trafiają tam, gdzie dają najwięcej.", "intro.start.body": "Każdy obszar ma własną zakładkę: Na żywo, Bateria, Nadwyżka, Cena oraz Programy i reguły. Urządzenie należy zawsze tylko do jednego obszaru, więc nic nie przełącza się podwójnie.", "intro.start.close": "Wybierz obszar poniżej, aby go skonfigurować lub zobaczyć, co się teraz dzieje.", "intro.start.guide": "Jak działa EMS", "intro.live.kicker": "Na żywo", "intro.live.title": "Co EMS teraz planuje", "intro.live.lead": "Zobacz, co ma teraz sens, dlaczego i co będzie dalej.", "intro.live.body": "Liczę na podstawie prognozy słonecznej, ceny prądu i stanu baterii. Automatyka EMS przełącza tylko wallbox, pompę ciepła i ładowanie baterii z sieci przez EMS.", "intro.live.close": "Urządzeniami w zakładkach Nadwyżka, Cena oraz Programy i reguły sterujesz w ich własnych zakładkach.", "intro.live.guide": "Jak działa automatyka EMS", "intro.surplus.kicker": "Nadwyżka", "intro.surplus.title": "Korzystaj z własnego prądu ze słońca", "intro.surplus.lead": "Urządzenia z przełącznikiem wł./wył. pracują, gdy instalacja produkuje więcej, niż potrzebuje dom.", "intro.surplus.body": "Wpisz moc i minimalną nadwyżkę. Włączam, gdy do sieci trafiłoby dość prądu, i wyłączam, gdy już nie wystarcza. Gdy nadwyżka nie starcza dla wszystkich, decyduje priorytet.", "intro.surplus.close": "Urządzenie jest zawsze tylko w jednej zakładce, więc nic nie przełącza się podwójnie.", "intro.surplus.guide": "Jak działa nadwyżka", "intro.price.kicker": "Cena", "intro.price.title": "Korzystaj z prądu, gdy jest tani", "intro.price.lead": "Urządzenia z przełącznikiem wł./wył. pracują w Twoim oknie cenowym.", "intro.price.body": "Wybierz „Poniżej ceny” lub „Najtańsze godziny” i opcjonalnie okno czasowe, np. tylko w nocy. Ceny pochodzą z Grid Price Monitor.", "intro.price.close": "Urządzenie jest zawsze tylko w jednej zakładce, więc nic nie przełącza się podwójnie.", "intro.price.guide": "Jak działa okno cenowe", "intro.loads.kicker": "Programy i reguły", "intro.loads.title": "Włączaj urządzenia, gdy się to opłaca", "intro.loads.lead": "Urządzenia z programem dostają okno startu, własne reguły łączą kilka warunków.", "intro.loads.body": "Zmywarki i pralki nie uruchamiasz już sam: po załadowaniu szukam najlepszego startu do Twojego terminu, według ceny, PV lub obu. Dla wszystkiego innego łączysz warunki jak nadwyżka, cena, okno czasowe i stan baterii.", "intro.loads.close": "Zachowujesz kontrolę: każde urządzenie ma własny przełącznik, a to, co włączysz ręcznie, zawsze ma pierwszeństwo.", "intro.loads.guide": "Jak działają programy i reguły", "intro.log.kicker": "Dziennik", "intro.log.title": "Co i kiedy zostało przełączone", "intro.log.lead": "Każde przełączenie jest tu z godziną, powodem i pomiarami.", "intro.log.body": "Dzięki temu zawsze widzisz, dlaczego urządzenie pracowało lub było wyłączone i czy polecenie dotarło.", "intro.log.close": "Najnowsze wpisy są na górze, przechowywanych jest ostatnich 250.", "intro.log.guide": "Jak czytać dziennik", "guide.startAreasTitle": "Obszary", "guide.startAreas": "Na żywo pokazuje, co planuje EMS. Bateria (SMC) ładuje baterię z sieci w tanich godzinach. Nadwyżka włącza urządzenia prądem ze słońca, Cena w tanich godzinach. Programy i reguły uruchamiają zmywarkę i pralkę oraz łączą kilka warunków.", "guide.startOneTabTitle": "Jedno urządzenie, jeden obszar", "guide.startOneTab": "Zakładka urządzenia wynika z jego reguł. Urządzenie nigdy nie pojawia się w dwóch zakładkach i nigdy nie jest przełączane podwójnie.", "guide.startSafetyTitle": "Co Cię chroni", "guide.startSafety": "Przełączam dopiero, gdy potwierdzisz informację o odpowiedzialności i aktywujesz urządzenie. Gdy brakuje danych, zostaje wyłączone. Gdy przełączysz sam, robię pauzę. Wyłącznik główny w Programach i regułach zatrzymuje wszystko.", "guide.liveModesTitle": "Obserwuj, potwierdzaj, automatyka", "guide.liveModes": "W trybie Obserwuj EMS tylko planuje i wyjaśnia. W trybie Potwierdzaj proponuje przełączenia, które zatwierdzasz pojedynczo. W automatyce sam przełącza zwolnione urządzenia.", "guide.liveDevicesTitle": "Które urządzenia przełącza EMS", "guide.liveDevices": "Tylko wallbox, pompę ciepła i ładowanie baterii z sieci przez EMS, i tylko gdy zwolniłeś je w urządzeniach. Urządzenia z innych zakładek mają własny przełącznik.", "guide.liveSafetyTitle": "Sprawdzenie przed każdym przełączeniem", "guide.liveSafety": "Przed każdym przełączeniem EMS ponownie sprawdza zwolnienie, dane i reguły ochrony. Po ręcznej zmianie wstrzymuje urządzenie.", "guide.liveChartTitle": "Jak czytać prognozę i pokrycie", "guide.liveChart": "Wykres pokazuje dla każdej godziny uzysk PV, zapotrzebowanie i cenę prądu. Widać z niego, kiedy ładowanie, grzanie lub jazda są najtańsze.", "guide.logReasonsTitle": "Jak czytać powody", "guide.logReasons": "Każdy wpis podaje regułę, która zadziałała, np. „Nadwyżka PV wystarcza” lub „Tania godzina”, oraz nadwyżkę, cenę lub stan baterii w chwili przełączenia.", "guide.logManualTitle": "Przełączone ręcznie", "guide.logManual": "Gdy sam przełączysz urządzenie, pojawi się „Wstrzymano”. Nie ingeruję wtedy przez dwie godziny lub do naciśnięcia „Wznów”.", "guide.logFailedTitle": "Przełączenie nie powiodło się", "guide.logFailed": "Gdy urządzenie nie przyjęło polecenia, widać tu błąd. Sprawdź, czy jest dostępne, a przy urządzeniach z programem, czy zdalny start jest aktywny.", "mode.live.title": "Na żywo i automatyka", "mode.live.does": "Co ma teraz sens, dlaczego i co będzie dalej.", "mode.live.good": "Dobre, aby jednym spojrzeniem zobaczyć, co dziś się dzieje.", "mode.akku.title": "Bateria (SMC)", "mode.akku.does": "Smart Charging ładuje baterię z sieci w tanich godzinach, gdy słońce nie pokrywa zapotrzebowania.", "mode.akku.good": "Dobre przy taryfie dynamicznej i słabej prognozie słonecznej.", "hubble.programRunningUntil": "Powinno skończyć się około {time}.", "hubble.programRunningHow": "Działającego programu nigdy nie przerywam.", "hubble.programPlannedHow": "Gotowe do {deadline}, wybrane według: {goal}. Aby przesunąć, naciśnij „Anuluj planowanie” przy urządzeniu.", "goal.price": "najniższa cena", "goal.pv": "najwięcej PV", "goal.both": "cena i PV",
            "intro.akku.kicker": "Bateria (SMC)", "intro.akku.title": "Ładuj baterię z sieci, gdy to się opłaca", "intro.akku.lead": "Hubble włącza i wyłącza ładowanie baterii z sieci tak, jak jest to dla Ciebie najkorzystniejsze.", "intro.akku.body": "Współpracują tu cztery moduły: GPM zna cenę prądu, STATS zna stan baterii i zużycie domu, EAI zna Twoje średnie zużycie dla dnia tygodnia i pory roku, a SFML dostarcza prognozę słoneczną. Razem z Twoim celem, na przykład opłacalnością lub poziomem docelowym, Hubble decyduje, czy ładowanie z sieci teraz się opłaca.", "intro.akku.close": "Gdy słońce wystarcza, ładowanie z sieci zostaje wyłączone. Gdy brakuje ceny lub stanu baterii, Hubble nie ładuje z sieci.", "intro.akku.guide": "Jak działa Smart Charging", "guide.smcSourcesTitle": "Skąd pochodzą dane", "guide.smcSources": "Grid Price Monitor (GPM) dostarcza cenę każdej godziny i Twoje progi cenowe. STATS mierzy stan baterii i zużycie domu. EAI zna Twoje średnie zużycie dla dnia tygodnia i pory roku. Solar Forecast ML (SFML) przewiduje, ile da słońce dziś i jutro.", "guide.smcModesTitle": "Twój cel: tryby", "guide.smcModes": "„Tylko luka” ładuje tylko tyle, ile słońce i bateria nie pokryją przy oczekiwanym zużyciu. „Do celu” ładuje w taniej godzinie do poziomu docelowego. „Oba” łączy jedno z drugim.", "guide.smcLimitsTitle": "Cel, dolna i górna granica", "guide.smcLimits": "Poziom docelowy obowiązuje w tanich godzinach. Dolna granica to najniższy cel, a górnej granicy ładowanie z sieci nigdy nie przekracza.", "guide.smcForceTitle": "Próg cenowy i cena wymuszona", "guide.smcForce": "Poniżej progu cenowego godzina jest tania. Poniżej ceny wymuszonej Hubble zawsze ładuje do górnej granicy, niezależnie od prognozy. Oba progi ustawiasz w GPM.", "guide.smcSwitchTitle": "Przełącznik ładowania", "guide.smcSwitch": "Smart Charging przełącza przełącznik ładowania baterii, który ustawiasz w Ustawienia → Solar Forecast Stats → Konfiguruj → Bateria. Bez przełącznika tylko zaleca, ale nie przełącza.", "guide.smcSafetyTitle": "Kiedy nie ładuje", "guide.smcSafety": "Bez ceny prądu, stanu baterii lub pojemności baterii ładowanie z sieci zostaje wyłączone. W dzień Hubble zostawia miejsce na słońce, jeśli prognoza może je wypełnić.",
            "cdesc.pv_surplus": "Włącza, gdy do sieci trafia dość nadwyżki, i trzyma włączone, dopóki zostaje co najmniej połowa.",
            "cdesc.cheapest_hours": "Włącza w najtańszych godzinach według ceny prądu.",
            "cdesc.price_below": "Włącza w każdej godzinie, w której cena jest poniżej Twojego limitu.",
            "cdesc.time_window": "Włącza tylko w wybrane dni między startem a końcem.",
            "cdesc.battery_soc_min": "Włącza tylko, gdy bateria jest co najmniej tak naładowana.",
            "helpSwitchable": "Urządzenie jest włączane i wyłączane. Potrzebuję jego mocy, aby poprawnie rozdzielić nadwyżkę.",
            "helpProgram": "Urządzenie jest raz uruchamiane. Czujnik gotowości (np. „zdalny start aktywny”) dba, by startowało tylko gdy jest gotowe.",
            "helpGuards": "Minimalny czas pracy i minimalna przerwa chronią urządzenie przed ciągłym przełączaniem.",
            "helpObjective": "Szukam najlepszego startu między teraz (lub jutro 00:00) a terminem: najniższa cena, najwięcej PV lub oba w równowadze.",
            "matchAnyHelp": "Jeden spełniony warunek wystarczy do włączenia.",
            "matchAllHelp": "Wszystkie warunki muszą być spełnione jednocześnie.",
            "kpiActive": "Aktywne urządzenia",
            "kpiNext": "Następny start",
            "fScope": "Okres",
            noticeTitle: "Ważna informacja",
            noticeText: "To sterowanie włącza urządzenia samodzielnie. Za szkody nie ponosimy odpowiedzialności. Obserwuj nowe urządzenia w pierwszych dniach, używaj tylko odpowiednich urządzeń i zabezpiecz je dodatkowo.",
            ackLabel: "Przeczytałem informację i biorę odpowiedzialność za włączane urządzenia.",
            ackButton: "Potwierdź", ackDone: "Informacja potwierdzona",
            demoText: "Demo: to dane przykładowe. Z ważną licencją Premium możesz tu dodać własne urządzenia i pozwolić im się włączać.",
            loading: "Ładowanie odbiorników …", loadFailed: "Nie udało się wczytać odbiorników.",
            empty: "Nie dodano jeszcze urządzenia.", add: "Dodaj urządzenie", edit: "Edytuj", remove: "Usuń",
            confirmDelete: "Na pewno usunąć?", cancel: "Anuluj", save: "Zapisz",
            active: "Sterowanie aktywne", activeHint: "Możliwe dopiero po potwierdzeniu informacji.",
            resume: "Wznów", arm: "Załadowane, planuj", disarm: "Anuluj planowanie",
            kindSwitchable: "Włączane", kindProgram: "Urządzenie z programem",
            fName: "Nazwa", fKind: "Typ", fPriority: "Priorytet (1 = pierwszy)", fPower: "Moc (W)", fMinSurplus: "Minimalna nadwyżka do startu (W)",
            fEntity: "Encja przełącznika", fEntityProgram: "Encja startu", fReady: "Czujnik gotowości (opcjonalnie)",
            fMatch: "Łączenie warunków", matchAny: "Wystarczy jeden", matchAll: "Wszystkie muszą być spełnione",
            fConditions: "Warunki", addCondition: "Dodaj warunek", noConditions: "Bez warunku urządzenie nigdy się nie włączy.",
            fMinRuntime: "Minimalny czas pracy (min)", fMinOff: "Minimalna przerwa (min)",
            fDeadline: "Gotowe do (godzina)", fDuration: "Czas pracy (min)", fObjective: "Cel", fEarliest: "Najwcześniejszy start",
            objPrice: "Najniższa cena", objPv: "Najwięcej PV", objBoth: "Cena i PV",
            earlyToday: "Od teraz", earlyTomorrow: "Dopiero jutro",
            "ctype.pv_surplus": "Nadwyżka PV", "ctype.cheapest_hours": "Najtańsze godziny", "ctype.price_below": "Cena poniżej limitu",
            "ctype.time_window": "Okno czasowe", "ctype.battery_soc_min": "Bateria co najmniej",
            scopeToday: "Dziś", scopeRolling: "Następne 24 godziny", fHours: "Liczba godzin", fMaxCt: "Cena do (ct/kWh)", fPercent: "Naładowanie od (%)",
            fDays: "Dni", fStart: "Od", fEnd: "Do",
            "cond.pv_surplus": "Nadwyżka PV", "cond.cheapest_hours": "W {hours} najtańszych godzinach ({scope})",
            "cond.price_below": "Cena do {max_ct} ct/kWh", "cond.time_window": "{start} do {end}", "cond.battery_soc_min": "Bateria od {percent} %",
            inSurplus: "Nadwyżka", inBattery: "Bateria", inPricesToday: "Ceny dziś", inPricesTomorrow: "Ceny jutro", inForecast: "Prognoza PV",
            yes: "jest", no: "brak",
            "state.on": "Włączone", "state.off": "Wyłączone", "state.inactive": "Nieaktywne", "state.paused": "Wstrzymane",
            "state.idle": "Czeka", "state.armed": "Gotowe", "state.planned": "Zaplanowane", "state.started": "Pracuje", "state.done": "Zakończone",
            planAt: "Start {start}, koniec {end}", planLate: "Termin zbyt krótki, start od razu",
            nextStart: "Następny start: {start} do {end}", nextNeedsSurplus: " (jeśli nadwyżka wystarczy)", nextSurplus: "Startuje przy nadwyżce od {w} W",
            previewAt: "Wystartowałoby: {start}, koniec {end} (po „Załadowane, planuj”)", previewLate: "Wystartowałoby od razu (termin zbyt krótki)",
            logEmpty: "Brak jeszcze przełączeń.", logTime: "Czas", logDevice: "Urządzenie", logAction: "Działanie", logReason: "Powód", logDetail: "Pomiary",
            "action.on": "Włączono", "action.off": "Wyłączono", "action.start": "Program uruchomiony", "action.armed": "Zgłoszono gotowość",
            "action.disarmed": "Planowanie anulowane", "action.paused": "Wstrzymano", "action.resumed": "Wznowiono", "action.activated": "Aktywowano",
            "action.deactivated": "Dezaktywowano", "action.write_failed": "Przełączenie nie powiodło się", "action.disclaimer_acknowledged": "Informacja potwierdzona",
            master: "Wyłącznik główny", masterHelp: "Wyłączony: nic się nie przełącza, działające reguły są wstrzymane.", masterOn: "Sterowanie włączone", masterOff: "Sterowanie wyłączone",
            baseLoad: "Obciążenie bazowe domu (W)", baseLoadHelp: "Odejmowane od uzysku przy planowaniu PV dla urządzeń z programem.",
            "reason.pv_surplus": "Nadwyżka PV wystarcza", "reason.surplus_budget": "Brak wolnej nadwyżki dla tego urządzenia", "reason.surplus_unavailable": "Brak sygnału nadwyżki",
            "reason.surplus_not_stable": "Nadwyżka jeszcze niestabilna", "reason.cheapest_hour": "Tania godzina", "reason.not_cheapest_hour": "To nie jedna z najtańszych godzin",
            "reason.price_below": "Cena poniżej limitu", "reason.price_above_limit": "Cena powyżej limitu", "reason.price_unavailable": "Brak ceny",
            "reason.battery_ok": "Bateria wystarcza", "reason.battery_low": "Bateria zbyt słaba", "reason.soc_unavailable": "Brak stanu baterii",
            "reason.in_window": "W oknie czasowym", "reason.outside_window": "Poza oknem czasowym", "reason.all_met": "Wszystkie warunki spełnione", "reason.none_met": "Żaden warunek nie jest spełniony",
            "reason.no_conditions": "Nie wpisano warunku", "reason.min_runtime": "Minimalny czas pracy trwa", "reason.min_off_time": "Minimalna przerwa trwa",
            "reason.cycle_limit": "Zbyt wiele przełączeń w ostatniej godzinie", "reason.one_start_per_cycle": "Jeden start na cykl",
            "reason.manual_override": "Przełączone ręcznie, sterowanie wstrzymane", "reason.entity_unavailable": "Urządzenie jest niedostępne",
            "reason.inactive": "Sterowanie nieaktywne", "reason.license_required": "Wymagana licencja Premium", "reason.waiting_for_arm": "Czeka na „Załadowane, planuj”",
            "reason.planned": "Start zaplanowany", "reason.deadline_too_tight": "Termin zbyt krótki, start od razu", "reason.forecast_unavailable": "Brak prognozy PV",
            "reason.waiting_ready": "Czeka na zwolnienie na urządzeniu", "reason.program_running": "Program pracuje", "reason.pending": "Sprawdzanie",
            "reason.planned_start": "Zaplanowany start", "reason.user": "Przez Ciebie", "reason.ready_entity": "Zwolnienie na urządzeniu", "reason.invalid_program": "Nieprawidłowe dane programu",
            errGeneric: "To się nie udało.",
            "err.disclaimer_required": "Najpierw potwierdź informację.", "err.premium_required": "Wymagana jest ważna licencja Premium.",
            "err.invalid_entity": "Encja nie istnieje lub jest niedozwolona.", "err.entity_needs_program": "Przyciski i skrypty należą do typu „Urządzenie z programem”. Wybierz ten typ.", typeHint: "Przycisk lub skrypt tylko uruchamia program. Przełącz na „Urządzenie z programem”.", switchType: "Przełącz na urządzenie z programem", "err.invalid_name": "Brak nazwy lub jest zbyt długa.",
            "err.invalid_power": "Nieprawidłowa moc.", "err.invalid_deadline": "Nieprawidłowa godzina.", "err.too_many": "Osiągnięto limit urządzeń.",
        },
    };

    const language = () => {
        const lang = window.SFMLI18n?.current;
        return I18N[lang] ? lang : "de";
    };
    const t = (key, params) => {
        const pack = I18N[language()];
        let value = pack[key] ?? I18N.de[key] ?? key;
        if (params) {
            Object.keys(params).forEach((name) => { value = value.replaceAll(`{${name}}`, String(params[name])); });
        }
        return value;
    };
    const randomId = () => {
        if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "");
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    };
    const messageSize = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
    const parentHass = (hostWindow) => {
        let current = hostWindow;
        while (current.parent && current.parent !== current) {
            const parent = current.parent;
            try {
                if (parent.location.origin !== hostWindow.location.origin) return null;
                const hass = parent.document.querySelector("home-assistant")?.hass;
                if (hass && typeof hass.callApi === "function") return hass;
            } catch (_error) {
                return null;
            }
            current = parent;
        }
        return null;
    };

    function requestError(error) {
        const source = error && typeof error === "object" ? error : {};
        const nested = source.body?.error || source.error;
        let code = "";
        if (nested && typeof nested === "object" && nested.code) code = String(nested.code);
        else if (typeof nested === "string" && nested && !nested.includes(" ")) code = nested;
        else if (typeof source.code === "string") code = source.code;
        const wrapped = new Error(String(nested?.message || source.message || code || "request_failed"));
        wrapped.code = (code || "request_failed").slice(0, 80);
        return wrapped;
    }

    class ConsumersBridgeClient {
        constructor(hostWindow) {
            this.hostWindow = hostWindow;
            this.origin = hostWindow.location.origin;
            this.iframe = null;
            this.pending = new Map();
            this.nonce = randomId();
            this.initialized = false;
            this.destroyed = false;
            this.hass = null;
            this.onMessage = (event) => this.handleMessage(event);
            this.ready = new Promise((resolve, reject) => {
                this.resolveReady = resolve;
                this.rejectReady = reject;
            });
        }

        mount(host) {
            if (this.destroyed || !host || this.iframe) return;
            this.hass = parentHass(this.hostWindow);
            if (this.hass?.callApi) {
                this.initialized = true;
                this.resolveReady();
                return;
            }
            const iframe = document.createElement("iframe");
            iframe.className = "loads-bridge-frame";
            iframe.title = "bridge";
            iframe.setAttribute("aria-hidden", "true");
            iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
            iframe.tabIndex = -1;
            host.appendChild(iframe);
            this.iframe = iframe;
            this.hostWindow.addEventListener("message", this.onMessage);
            iframe.src = BRIDGE_PATH;
            this.readyTimer = this.hostWindow.setTimeout(() => this.rejectReady(new Error("timeout")), 10000);
        }

        handleMessage(event) {
            const accepted = event.source === this.iframe?.contentWindow
                && event.origin === this.origin
                && event.data?.protocol === PROTOCOL;
            if (!accepted || this.destroyed) return;
            try { if (messageSize(event.data) > 1024 * 1024) return; } catch (_error) { return; }
            const message = event.data;
            if (message.type === "READY" && !this.initialized) {
                this.iframe.contentWindow.postMessage({ protocol: PROTOCOL, type: "INIT", nonce: this.nonce }, this.origin);
                return;
            }
            if (message.type === "INITIALIZED" && message.nonce === this.nonce && !this.initialized) {
                this.initialized = true;
                this.hostWindow.clearTimeout(this.readyTimer);
                this.resolveReady();
                return;
            }
            if (message.type !== "RESPONSE" || message.nonce !== this.nonce) return;
            const pending = this.pending.get(message.requestId);
            if (!pending) return;
            this.pending.delete(message.requestId);
            this.hostWindow.clearTimeout(pending.timer);
            if (message.success === true) pending.resolve(message.data);
            else pending.reject(requestError(message.error));
        }

        async request(operation, payload = {}) {
            if (this.destroyed || !OPERATIONS.has(operation)) throw new Error("unavailable");
            await this.ready;
            const id = payload.id;
            const routes = {
                status: ["GET", "status"],
                saveSettings: ["POST", "settings"],
                acknowledge: ["POST", "disclaimer"],
                addConsumer: ["POST", "consumers"],
                updateConsumer: ["PUT", `consumers/${id}`],
                deleteConsumer: ["DELETE", `consumers/${id}`],
                setActive: ["POST", `consumers/${id}/active`],
                resume: ["POST", `consumers/${id}/resume`],
                arm: ["POST", `consumers/${id}/arm`],
                disarm: ["POST", `consumers/${id}/disarm`],
            };
            const route = routes[operation];
            if (this.hass?.callApi) {
                try {
                    return await this.hass.callApi(route[0], `sfml_stats/loads/${route[1]}`, writeBody(operation, payload));
                } catch (error) {
                    throw requestError(error);
                }
            }
            const requestId = randomId();
            return new Promise((resolve, reject) => {
                const timer = this.hostWindow.setTimeout(() => {
                    this.pending.delete(requestId);
                    reject(new Error("timeout"));
                }, 15000);
                this.pending.set(requestId, { resolve, reject, timer });
                this.iframe.contentWindow.postMessage({
                    protocol: PROTOCOL, type: "REQUEST", nonce: this.nonce, requestId, operation, payload,
                }, this.origin);
            });
        }

        destroy() {
            this.destroyed = true;
            this.hostWindow.removeEventListener("message", this.onMessage);
            this.hostWindow.clearTimeout(this.readyTimer);
            if (!this.initialized) this.resolveReady();
            this.pending.forEach((pending) => {
                this.hostWindow.clearTimeout(pending.timer);
                pending.reject(new Error("closed"));
            });
            this.pending.clear();
            this.iframe?.remove();
            this.iframe = null;
        }
    }

    function writeBody(operation, payload) {
        if (operation === "setActive") return { active: payload.active === true };
        if (operation === "acknowledge") return { acknowledged: true };
        if (operation === "saveSettings") {
            return { master_enabled: payload.master_enabled === true, base_load_w: Number(payload.base_load_w) };
        }
        if (operation === "addConsumer" || operation === "updateConsumer") {
            const body = {};
            for (const key of CONSUMER_FIELDS) {
                if (Object.prototype.hasOwnProperty.call(payload, key)) body[key] = payload[key];
            }
            return body;
        }
        return undefined;
    }

    const blankDraft = (kind = "switchable") => ({
        id: "", name: "", kind, priority: 5, nominal_power_w: 1000, min_surplus_w: 1000,
        entity_id: "", ready_entity: "", match: "any", conditions: [],
        min_runtime_min: 5, min_off_min: 3, deadline: "07:00", duration_min: 120,
        objective: "both", earliest_day: "today", door_entity: "", door_openings: 2,
        priceMode: "below", maxCt: 20, hours: 3, scope: "today",
        useWindow: false, winDays: [...WEEKDAYS], winStart: "22:00", winEnd: "06:00",
    });

    const PRICE_TYPES = new Set(["price_below", "cheapest_hours", "time_window"]);

    // One device, one tab: the tab follows from the rules, so a device never shows twice
    function modeOf(item) {
        if (item.kind === "program") return "loads";
        const types = (item.conditions || []).map((cond) => cond.type);
        if (types.length === 1 && types[0] === "pv_surplus") return "surplus";
        const priceOnly = types.length > 0
            && types.every((type) => PRICE_TYPES.has(type))
            && types.filter((type) => type !== "time_window").length === 1
            && types.filter((type) => type === "time_window").length <= 1
            && (item.match === "all" || types.length === 1);
        return priceOnly ? "price" : "loads";
    }

    const conditionDefaults = {
        pv_surplus: () => ({ type: "pv_surplus" }),
        cheapest_hours: () => ({ type: "cheapest_hours", scope: "today", hours: 1 }),
        price_below: () => ({ type: "price_below", max_ct: 20 }),
        time_window: () => ({ type: "time_window", days: [...WEEKDAYS], start: "10:00", end: "16:00" }),
        battery_soc_min: () => ({ type: "battery_soc_min", percent: 50 }),
    };

    const INTRO_GUIDES = {
        start: ["startAreas", "startOneTab", "priority", "startSafety"],
        live: ["liveModes", "liveDevices", "liveSafety", "liveChart"],
        akku: ["smcSources", "smcModes", "smcLimits", "smcForce", "smcSwitch", "smcSafety"],
        surplus: ["surplus", "priority", "protect", "principle"],
        price: ["price", "cheapest", "window", "protect"],
        loads: ["program", "door", "match", "battery", "window", "principle", "protect"],
        log: ["logReasons", "logManual", "logFailed"],
    };

    // One intro for every EMS tab: same hero card and the same "how it works" section
    window.SfmlTabIntro = {
        props: { topic: { type: String, required: true } },
        template: `
            <header class="loads-hero-band">
                <p class="loads-kicker">{{ t('intro.' + topic + '.kicker') }}</p>
                <h3>{{ t('intro.' + topic + '.title') }}</h3>
                <p class="loads-lead">{{ t('intro.' + topic + '.lead') }}</p>
                <p>{{ t('intro.' + topic + '.body') }}</p>
                <p class="loads-close">{{ t('intro.' + topic + '.close') }}</p>
                <div v-if="$slots.default" class="loads-chips"><slot></slot></div>
                <details class="loads-guide">
                    <summary>{{ t('intro.' + topic + '.guide') }}</summary>
                    <section v-for="part in parts" :key="part">
                        <h4>{{ t('guide.' + part + 'Title') }}</h4>
                        <p>{{ t('guide.' + part) }}</p>
                    </section>
                </details>
            </header>
        `,
        setup(props) {
            const parts = Vue.computed(() => INTRO_GUIDES[props.topic] || []);
            return { t, parts };
        },
    };
    window.SfmlLoadsI18n = { t };

    window.LoadsPage = {
        props: { view: { type: String, default: "loads" } },
        emits: ["open", "summary"],
        template: `
            <section class="loads-page" :class="{ inline: view === 'start' }" :aria-label="t('view.' + view)">
                <div ref="bridgeHost" class="loads-bridge-host" aria-hidden="true"></div>
                <p v-if="message" class="loads-message" role="alert">{{ message }}</p>
                <div v-if="loading" class="loads-state" role="status">{{ t('loading') }}</div>
                <template v-else-if="status">
                    <div v-if="view === 'start'" class="loads-stack">
                        <div class="loads-grid">
                            <article v-for="mode in modeCards" :key="mode" class="loads-card loads-mode-card">
                                <header>
                                    <strong>{{ t('mode.' + mode + '.title') }}</strong>
                                    <span v-if="!['live', 'akku'].includes(mode)" class="loads-pill" :class="countFor(mode) ? 'ok' : 'muted'">{{ t('modeCount', { n: countFor(mode) }) }}</span>
                                </header>
                                <p class="loads-reason">{{ t('mode.' + mode + '.does') }}</p>
                                <p class="loads-meta">{{ t('mode.' + mode + '.good') }}</p>
                                <p v-if="nextFor(mode)" class="loads-plan">{{ t('kpiNext') }}: {{ timeText(nextFor(mode)) }}</p>
                                <div class="loads-card-actions"><button type="button" @click="$emit('open', mode)">{{ t('open') }}</button></div>
                            </article>
                        </div>
                    </div>

                    <div v-else-if="view === 'log'" class="loads-stack">
                        <hubble-say class="loads-hubble" :tone="hubble.tone" :headline="hubble.headline" :detail="hubble.detail"></hubble-say>
                        <sfml-tab-intro topic="log"></sfml-tab-intro>
                        <div v-if="!status.audit.length" class="loads-state"><strong>{{ t('logEmpty') }}</strong></div>
                        <div v-else class="loads-card loads-table-wrap">
                            <table class="loads-table">
                                <thead><tr><th>{{ t('logTime') }}</th><th>{{ t('logDevice') }}</th><th>{{ t('logAction') }}</th><th>{{ t('logReason') }}</th><th>{{ t('logDetail') }}</th></tr></thead>
                                <tbody><tr v-for="(row, index) in status.audit" :key="index">
                                    <td>{{ timeText(row.at) }}</td><td>{{ deviceName(row.id) }}</td><td>{{ actionText(row.action) }}</td><td>{{ reasonText(row.reason) }}</td><td>{{ detailText(row) }}</td>
                                </tr></tbody>
                            </table>
                        </div>
                    </div>

                    <div v-else class="loads-stack">
                        <hubble-say class="loads-hubble" :tone="hubble.tone" :headline="hubble.headline" :detail="hubble.detail"></hubble-say>
                        <sfml-tab-intro :topic="view">
                            <span v-if="view === 'surplus'" class="loads-pill" :class="status.inputs.surplus_w == null ? 'warn' : 'ok'">{{ t('inSurplus') }}: {{ surplusText }}</span>
                            <template v-else>
                                <span class="loads-pill" :class="status.inputs.prices_today ? 'ok' : 'warn'">{{ t('inPricesToday') }}: {{ t(status.inputs.prices_today ? 'yes' : 'no') }}</span>
                                <span class="loads-pill" :class="status.inputs.prices_tomorrow ? 'ok' : 'muted'">{{ t('inPricesTomorrow') }}: {{ t(status.inputs.prices_tomorrow ? 'yes' : 'no') }}</span>
                                <span v-if="view === 'loads'" class="loads-pill" :class="status.inputs.forecast ? 'ok' : 'muted'">{{ t('inForecast') }}: {{ t(status.inputs.forecast ? 'yes' : 'no') }}</span>
                            </template>
                        </sfml-tab-intro>

                        <aside class="loads-notice" role="note">
                            <strong>{{ t('noticeTitle') }}</strong>
                            <p>{{ t('noticeText') }}</p>
                            <div v-if="isLive && !acknowledged" class="loads-ack">
                                <label class="loads-check"><input type="checkbox" v-model="ackChecked"><span>{{ t('ackLabel') }}</span></label>
                                <button type="button" class="primary" :disabled="!ackChecked || busy" @click="acknowledge">{{ t('ackButton') }}</button>
                            </div>
                            <span v-else-if="isLive" class="loads-pill ok">{{ t('ackDone') }}</span>
                        </aside>
                        <p v-if="isDemo" class="loads-demo" role="status">{{ t('demoText') }}</p>

                        <div class="loads-manage-head">
                            <h3>{{ t('view.' + view) }}</h3>
                            <button type="button" class="primary" :disabled="!isLive || busy" @click="beginAdd">{{ t(view === 'surplus' ? 'addSurplus' : view === 'price' ? 'addPrice' : 'add') }}</button>
                        </div>

                        <form v-if="editorOpen && view !== 'loads'" class="loads-editor" @submit.prevent="saveSimple">
                            <h3>{{ draft.id ? t('edit') : t(view === 'surplus' ? 'addSurplus' : 'addPrice') }}</h3>
                            <div class="loads-section">
                                <div class="loads-fields">
                                    <label>{{ t('fName') }}<input type="text" v-model="draft.name" maxlength="60" required></label>
                                    <label>{{ t('fEntity') }}
                                        <input type="text" v-model="draft.entity_id" list="loads-entities-switchable" placeholder="switch.example" required autocomplete="off">
                                    </label>
                                    <label>{{ t('fPower') }}<input type="number" v-model.number="draft.nominal_power_w" min="0" max="50000" step="10" required></label>
                                    <label v-if="view === 'surplus'">{{ t('fMinSurplus') }}<input type="number" v-model.number="draft.min_surplus_w" min="0" max="50000" step="10"></label>
                                    <label>{{ t('fPriority') }}<input type="number" v-model.number="draft.priority" min="1" max="9" step="1"></label>
                                </div>
                                <datalist id="loads-entities-switchable"><option v-for="item in entityChoices('switchable')" :key="item.id" :value="item.id">{{ item.name }}</option></datalist>
                                <p class="loads-hint">{{ t(view === 'surplus' ? 'cdesc.pv_surplus' : 'helpPriceWindow') }}</p>
                            </div>
                            <div v-if="view === 'price'" class="loads-section">
                                <label>{{ t('fPriceMode') }}
                                    <select v-model="draft.priceMode"><option value="below">{{ t('priceModeBelow') }}</option><option value="cheapest">{{ t('priceModeCheapest') }}</option></select>
                                </label>
                                <div class="loads-fields">
                                    <label v-if="draft.priceMode === 'below'">{{ t('fMaxCt') }}<input type="number" v-model.number="draft.maxCt" step="0.1" required></label>
                                    <template v-else>
                                        <label>{{ t('fHours') }}<input type="number" v-model.number="draft.hours" min="1" max="12" step="1"></label>
                                        <label>{{ t('fScope') }}
                                            <select v-model="draft.scope"><option value="today">{{ t('scopeToday') }}</option><option value="next_24h">{{ t('scopeRolling') }}</option></select>
                                        </label>
                                    </template>
                                </div>
                                <label class="loads-switch">
                                    <input type="checkbox" v-model="draft.useWindow">
                                    <span class="loads-switch-track"><span></span></span>
                                    <span class="loads-switch-copy"><strong>{{ t('useWindow') }}</strong><small>{{ t('useWindowHelp') }}</small></span>
                                </label>
                                <template v-if="draft.useWindow">
                                    <div class="loads-days" role="group" :aria-label="t('fDays')">
                                        <button v-for="day in weekdays" :key="day" type="button" :class="{ on: draft.winDays.includes(day) }" :aria-pressed="draft.winDays.includes(day) ? 'true' : 'false'" @click="toggleDraftDay(day)">{{ dayName(day) }}</button>
                                    </div>
                                    <div class="loads-fields">
                                        <label>{{ t('fStart') }}<input type="time" v-model="draft.winStart"></label>
                                        <label>{{ t('fEnd') }}<input type="time" v-model="draft.winEnd"></label>
                                    </div>
                                </template>
                            </div>
                            <div class="loads-section">
                                <div class="loads-fields">
                                    <label>{{ t('fMinRuntime') }}<input type="number" v-model.number="draft.min_runtime_min" min="0" max="720" step="1"></label>
                                    <label>{{ t('fMinOff') }}<input type="number" v-model.number="draft.min_off_min" min="0" max="720" step="1"></label>
                                </div>
                                <p class="loads-hint">{{ t('helpGuards') }}</p>
                            </div>
                            <div class="loads-form-actions">
                                <button type="button" @click="editorOpen = false">{{ t('cancel') }}</button>
                                <button type="submit" class="primary" :disabled="busy">{{ t('save') }}</button>
                            </div>
                        </form>
                        <form v-if="editorOpen && view === 'loads'" class="loads-editor" @submit.prevent="saveDraft">
                            <h3>{{ draft.id ? t('edit') : t('add') }}</h3>
                            <div class="loads-section">
                                <div class="loads-fields">
                                    <label>{{ t('fName') }}<input type="text" v-model="draft.name" maxlength="60" required></label>
                                    <label v-if="!draft.id">{{ t('fKind') }}
                                        <select v-model="draft.kind"><option value="switchable">{{ t('kindSwitchable') }}</option><option value="program">{{ t('kindProgram') }}</option></select>
                                    </label>
                                    <label>{{ draft.kind === 'program' ? t('fEntityProgram') : t('fEntity') }}
                                        <input type="text" v-model="draft.entity_id" :list="'loads-entities-' + draft.kind" placeholder="switch.example" required autocomplete="off">
                                    </label>
                                    <label v-if="draft.kind === 'program'">{{ t('fReady') }}
                                        <input type="text" v-model="draft.ready_entity" list="loads-entities-ready" placeholder="binary_sensor.example" autocomplete="off">
                                    </label>
                                    <label>{{ t('fPower') }}<input type="number" v-model.number="draft.nominal_power_w" min="0" max="50000" step="10" required></label>
                                    <label v-if="draft.kind === 'switchable'">{{ t('fMinSurplus') }}<input type="number" v-model.number="draft.min_surplus_w" min="0" max="50000" step="10"></label>
                                    <label>{{ t('fPriority') }}<input type="number" v-model.number="draft.priority" min="1" max="9" step="1"></label>
                                </div>
                                <p v-if="typeMismatch" class="loads-hint loads-hint-warn" role="alert">{{ t('typeHint') }}
                                    <button type="button" @click="draft.kind = 'program'">{{ t('switchType') }}</button></p>
                                <p class="loads-hint">{{ t(draft.kind === 'program' ? 'helpProgram' : 'helpSwitchable') }}</p>
                                <datalist :id="'loads-entities-' + draft.kind"><option v-for="item in entityChoices(draft.kind)" :key="item.id" :value="item.id">{{ item.name }}</option></datalist>
                                <datalist id="loads-entities-ready"><option v-for="item in entityChoices('ready')" :key="item.id" :value="item.id">{{ item.name }}</option></datalist>
                            </div>

                            <div v-if="draft.kind === 'switchable'" class="loads-section">
                                <h4>{{ t('fConditions') }}</h4>
                                <label>{{ t('fMatch') }}
                                    <select v-model="draft.match"><option value="any">{{ t('matchAny') }}</option><option value="all">{{ t('matchAll') }}</option></select>
                                </label>
                                <p class="loads-hint">{{ t(draft.match === 'all' ? 'matchAllHelp' : 'matchAnyHelp') }}</p>
                                <p v-if="!draft.conditions.length" class="loads-hint">{{ t('noConditions') }}</p>
                                <div v-for="(cond, index) in draft.conditions" :key="index" class="loads-condition">
                                    <strong>{{ t('ctype.' + cond.type) }}</strong>
                                    <p class="loads-hint">{{ t('cdesc.' + cond.type) }}</p>
                                    <template v-if="cond.type === 'cheapest_hours'">
                                        <label>{{ t('fHours') }}<input type="number" v-model.number="cond.hours" min="1" max="12" step="1"></label>
                                        <label>{{ t('fScope') }}
                                            <select v-model="cond.scope"><option value="today">{{ t('scopeToday') }}</option><option value="next_24h">{{ t('scopeRolling') }}</option></select>
                                        </label>
                                    </template>
                                    <label v-else-if="cond.type === 'price_below'">{{ t('fMaxCt') }}<input type="number" v-model.number="cond.max_ct" step="0.1"></label>
                                    <label v-else-if="cond.type === 'battery_soc_min'">{{ t('fPercent') }}<input type="number" v-model.number="cond.percent" min="0" max="100" step="1"></label>
                                    <template v-else-if="cond.type === 'time_window'">
                                        <div class="loads-days" role="group" :aria-label="t('fDays')">
                                            <button v-for="day in weekdays" :key="day" type="button" :class="{ on: cond.days.includes(day) }" :aria-pressed="cond.days.includes(day) ? 'true' : 'false'" @click="toggleDay(cond, day)">{{ dayName(day) }}</button>
                                        </div>
                                        <div class="loads-fields">
                                            <label>{{ t('fStart') }}<input type="time" v-model="cond.start"></label>
                                            <label>{{ t('fEnd') }}<input type="time" v-model="cond.end"></label>
                                        </div>
                                    </template>
                                    <div class="loads-card-actions"><button type="button" class="loads-danger" @click="draft.conditions.splice(index, 1)">{{ t('remove') }}</button></div>
                                </div>
                                <label>{{ t('addCondition') }}
                                    <select v-model="newCondition" @change="addCondition"><option value="">…</option><option v-for="type in conditionTypes" :key="type" :value="type">{{ t('ctype.' + type) }}</option></select>
                                </label>
                                <div class="loads-fields">
                                    <label>{{ t('fMinRuntime') }}<input type="number" v-model.number="draft.min_runtime_min" min="0" max="720" step="1"></label>
                                    <label>{{ t('fMinOff') }}<input type="number" v-model.number="draft.min_off_min" min="0" max="720" step="1"></label>
                                </div>
                                <p class="loads-hint">{{ t('helpGuards') }}</p>
                            </div>

                            <div v-else class="loads-section">
                                <div class="loads-fields">
                                    <label>{{ t('fDuration') }}<input type="number" v-model.number="draft.duration_min" min="5" max="720" step="5"></label>
                                    <label>{{ t('fDeadline') }}<input type="time" v-model="draft.deadline" required></label>
                                    <label>{{ t('fObjective') }}
                                        <select v-model="draft.objective"><option value="price">{{ t('objPrice') }}</option><option value="pv">{{ t('objPv') }}</option><option value="both">{{ t('objBoth') }}</option></select>
                                    </label>
                                    <label>{{ t('fEarliest') }}
                                        <select v-model="draft.earliest_day"><option value="today">{{ t('earlyToday') }}</option><option value="tomorrow">{{ t('earlyTomorrow') }}</option></select>
                                    </label>
                                </div>
                                <p class="loads-hint">{{ t('helpObjective') }}</p>
                                <div class="loads-fields">
                                    <label>{{ t('fDoor') }}
                                        <input type="text" v-model="draft.door_entity" list="loads-entities-door" placeholder="binary_sensor.example_door" autocomplete="off">
                                    </label>
                                    <label>{{ t('fDoorOpenings') }}<input type="number" v-model.number="draft.door_openings" min="1" max="5" step="1" :disabled="!draft.door_entity"></label>
                                </div>
                                <datalist id="loads-entities-door"><option v-for="item in entityChoices('door')" :key="item.id" :value="item.id">{{ item.name }}</option></datalist>
                                <p class="loads-hint">{{ t('helpDoor') }}</p>
                            </div>
                            <div class="loads-form-actions">
                                <button type="button" @click="editorOpen = false">{{ t('cancel') }}</button>
                                <button type="submit" class="primary" :disabled="busy">{{ t('save') }}</button>
                            </div>
                        </form>

                        <div v-if="!visibleConsumers.length" class="loads-state"><strong>{{ t('empty.' + view) }}</strong></div>
                        <div class="loads-grid">
                            <article v-for="item in visibleConsumers" :key="item.id" class="loads-card" :data-state="stateKey(item)">
                                <header>
                                    <strong>{{ item.name }}</strong>
                                    <span class="loads-pill" :class="stateClass(item)">{{ t('state.' + stateKey(item)) }}</span>
                                </header>
                                <p class="loads-meta">{{ item.kind === 'program' ? t('kindProgram') : t('kindSwitchable') }} · {{ item.nominal_power_w }} W · {{ item.entity_id }}</p>
                                <p class="loads-reason">{{ reasonText(item.reason) }}</p>
                                <ul v-if="item.kind === 'switchable'" class="loads-rules">
                                    <li v-for="(cond, index) in item.conditions" :key="index">{{ conditionText(cond) }}</li>
                                </ul>
                                <p v-if="item.kind === 'switchable' && item.active && !item.is_on && item.next_window" class="loads-plan">{{ t('nextStart', { start: timeText(item.next_window.start), end: timeText(item.next_window.end) }) }}{{ item.next_window.needs_surplus ? t('nextNeedsSurplus') : '' }}</p>
                                <p v-else-if="item.kind === 'switchable' && item.active && !item.is_on && hasSurplusRule(item)" class="loads-meta">{{ t('nextSurplus', { w: Math.round(item.min_surplus_w) }) }}</p>
                                <p v-else-if="item.kind === 'program' && item.plan" class="loads-plan">{{ item.plan.late ? t('planLate') : t('planAt', { start: timeText(item.plan.start), end: timeText(item.plan.end) }) }}</p>
                                <p v-if="item.kind === 'program' && item.active && item.door_entity && ['idle', 'done'].includes(item.state)" class="loads-meta">{{ t('doorCount', { n: item.door_opens || 0, m: item.door_openings || 2 }) }}</p>
                                <p v-if="item.kind === 'program' && !item.plan && item.active && item.preview" class="loads-meta">{{ item.preview.late ? t('previewLate') : t('previewAt', { start: timeText(item.preview.start), end: timeText(item.preview.end) }) }}</p>
                                <label class="loads-switch">
                                    <input type="checkbox" :checked="item.active" :disabled="!isLive || busy || (!item.active && !acknowledged)" @change="toggleActive(item, $event.target.checked)">
                                    <span class="loads-switch-track"><span></span></span>
                                    <span class="loads-switch-copy"><strong>{{ t('active') }}</strong><small v-if="!acknowledged && isLive && !item.active">{{ t('activeHint') }}</small></span>
                                </label>
                                <div class="loads-card-actions">
                                    <button v-if="item.paused" type="button" :disabled="!isLive || busy" @click="run('resume', { id: item.id })">{{ t('resume') }}</button>
                                    <button v-if="item.kind === 'program' && item.active && ['idle', 'done'].includes(item.state)" type="button" class="primary" :disabled="!isLive || busy" @click="run('arm', { id: item.id })">{{ t('arm') }}</button>
                                    <button v-if="item.kind === 'program' && ['armed', 'planned'].includes(item.state)" type="button" :disabled="!isLive || busy" @click="run('disarm', { id: item.id })">{{ t('disarm') }}</button>
                                    <button type="button" :disabled="!isLive || busy" @click="beginEdit(item)">{{ t('edit') }}</button>
                                    <button v-if="pendingDelete !== item.id" type="button" class="loads-danger" :disabled="!isLive || busy" @click="pendingDelete = item.id">{{ t('remove') }}</button>
                                    <span v-else class="loads-confirm">
                                        <button type="button" class="loads-danger-solid" :disabled="busy" @click="confirmDelete(item)">{{ t('confirmDelete') }}</button>
                                        <button type="button" @click="pendingDelete = ''">{{ t('cancel') }}</button>
                                    </span>
                                </div>
                            </article>
                        </div>

                        <details v-if="view === 'loads'" class="loads-guide">
                            <summary>{{ t('settingsTitle') }}</summary>
                    <form class="loads-form" @submit.prevent="saveSettings">
                        <div class="loads-section">
                            <label class="loads-switch">
                                <input type="checkbox" v-model="settings.master_enabled" :disabled="!isLive">
                                <span class="loads-switch-track"><span></span></span>
                                <span class="loads-switch-copy"><strong>{{ t('master') }} · {{ settings.master_enabled ? t('masterOn') : t('masterOff') }}</strong><small>{{ t('masterHelp') }}</small></span>
                            </label>
                        </div>
                        <div class="loads-section">
                            <label>{{ t('baseLoad') }}<input type="number" v-model.number="settings.base_load_w" min="0" max="20000" step="10" :disabled="!isLive"></label>
                            <p class="loads-hint">{{ t('baseLoadHelp') }}</p>
                        </div>
                        <div class="loads-form-actions"><button type="submit" class="primary" :disabled="!isLive || busy">{{ t('save') }}</button></div>
                    </form>
                        </details>
                    </div>
                </template>
            </section>
        `,
        setup(props, { emit }) {
            const loading = Vue.ref(true);
            const message = Vue.ref("");
            const status = Vue.ref(null);
            const busy = Vue.ref(false);
            const ackChecked = Vue.ref(false);
            const editorOpen = Vue.ref(false);
            const draft = Vue.reactive(blankDraft());
            const pendingDelete = Vue.ref("");
            const newCondition = Vue.ref("");
            const hassTick = Vue.ref(0);
            const bridgeHost = Vue.ref(null);
            const settings = Vue.reactive({ master_enabled: true, base_load_w: 300 });
            const modeCards = ["live", "akku", "surplus", "price", "loads"];
            const guideParts = ["principle", "surplus", "cheapest", "price", "window", "battery", "match", "program", "door", "priority", "protect"];
            let bridge = null;
            let timer = null;

            const isDemo = Vue.computed(() => status.value?.mode === "demo");
            const isLive = Vue.computed(() => status.value?.mode === "live");
            const acknowledged = Vue.computed(() => Boolean(status.value?.settings?.disclaimer_ack_at));
            const consumers = Vue.computed(() => status.value?.consumers || []);
            const visibleConsumers = Vue.computed(() => consumers.value.filter((item) => modeOf(item) === props.view));
            const countFor = (mode) => consumers.value.filter((item) => item.active && modeOf(item) === mode).length;
            const nextFor = (mode) => {
                const stamps = consumers.value
                    .filter((item) => item.active && modeOf(item) === mode)
                    .map((item) => (item.kind === "program"
                        ? (item.plan || item.preview)?.start
                        : (!item.is_on ? item.next_window?.start : null)))
                    .filter(Boolean)
                    .sort();
                return stamps[0] || null;
            };
            const canToggle = Vue.computed(() => isLive.value && acknowledged.value && !busy.value);
            const activeCount = Vue.computed(() => consumers.value.filter((item) => item.active).length);
            const nextStartText = Vue.computed(() => {
                const stamps = consumers.value
                    .filter((item) => item.active)
                    .map((item) => (item.kind === "program"
                        ? (item.plan || item.preview)?.start
                        : (!item.is_on ? item.next_window?.start : null)))
                    .filter(Boolean)
                    .sort();
                return stamps.length ? timeText(stamps[0]) : "–";
            });
            const surplusText = Vue.computed(() => {
                const value = status.value?.inputs?.surplus_w;
                return value === null || value === undefined ? "–" : `${Math.round(value)} W`;
            });
            const batteryText = Vue.computed(() => {
                const value = status.value?.inputs?.battery_soc;
                return value === null || value === undefined ? "–" : `${Math.round(value)} %`;
            });

            const typeMismatch = Vue.computed(() => draft.kind === "switchable" && /^(button|script)\./.test(String(draft.entity_id || "").trim().toLowerCase()));

            Vue.watch(() => draft.entity_id, (value) => {
                if (!draft.id && draft.kind === "switchable" && /^(button|script)\./.test(String(value || "").trim().toLowerCase())) {
                    draft.kind = "program";
                }
            });

            function entityChoices(kind) {
                hassTick.value;
                const domains = {
                    switchable: ["switch.", "input_boolean."],
                    program: ["button.", "script.", "switch.", "input_boolean."],
                    ready: ["binary_sensor.", "input_boolean.", "switch."],
                    door: ["binary_sensor."],
                }[kind] || [];
                const states = parentHass(window)?.states || {};
                return Object.values(states)
                    .filter((item) => domains.some((prefix) => item.entity_id.startsWith(prefix)))
                    .map((item) => ({ id: item.entity_id, name: String(item.attributes?.friendly_name || item.entity_id) }))
                    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
                    .slice(0, 400);
            }

            function applyStatus(payload) {
                const body = payload && payload.data ? payload.data : payload;
                status.value = body;
                if (body?.settings) {
                    settings.master_enabled = body.settings.master_enabled !== false;
                    settings.base_load_w = Number(body.settings.base_load_w);
                }
            }
            async function refresh() {
                try {
                    applyStatus(await bridge.request("status"));
                    if (!busy.value) message.value = "";
                } catch (_error) {
                    message.value = t("loadFailed");
                } finally {
                    loading.value = false;
                    hassTick.value += 1;
                }
            }
            function errorText(error) {
                const code = String(error?.code || "");
                const known = I18N[language()][`err.${code}`] || I18N.de[`err.${code}`];
                return known || error?.message || t("errGeneric");
            }
            async function run(operation, payload = {}) {
                busy.value = true;
                message.value = "";
                try {
                    await bridge.request(operation, payload);
                    await refresh();
                    return true;
                } catch (error) {
                    message.value = errorText(error);
                    return false;
                } finally {
                    busy.value = false;
                }
            }
            const acknowledge = () => run("acknowledge");
            function toggleActive(item, checked) {
                return run("setActive", { id: item.id, active: checked });
            }
            function beginAdd() {
                Object.assign(draft, blankDraft(props.view === "loads" ? "program" : "switchable"));
                editorOpen.value = true;
            }
            function beginEdit(item) {
                Object.assign(draft, blankDraft(item.kind), {
                    id: item.id, name: item.name, kind: item.kind, priority: item.priority,
                    nominal_power_w: item.nominal_power_w, min_surplus_w: item.min_surplus_w,
                    entity_id: item.entity_id, ready_entity: item.ready_entity || "", match: item.match,
                    conditions: JSON.parse(JSON.stringify(item.conditions || [])),
                    min_runtime_min: item.min_runtime_min, min_off_min: item.min_off_min,
                    deadline: item.deadline, duration_min: item.duration_min,
                    objective: item.objective, earliest_day: item.earliest_day,
                    door_entity: item.door_entity || "", door_openings: item.door_openings || 2,
                });
                const below = (item.conditions || []).find((cond) => cond.type === "price_below");
                const cheapest = (item.conditions || []).find((cond) => cond.type === "cheapest_hours");
                const windowRule = (item.conditions || []).find((cond) => cond.type === "time_window");
                if (below) Object.assign(draft, { priceMode: "below", maxCt: below.max_ct });
                if (cheapest) Object.assign(draft, { priceMode: "cheapest", hours: cheapest.hours, scope: cheapest.scope });
                if (windowRule) {
                    Object.assign(draft, { useWindow: true, winDays: [...windowRule.days], winStart: windowRule.start, winEnd: windowRule.end });
                }
                editorOpen.value = true;
            }
            function toggleDraftDay(day) {
                const set = new Set(draft.winDays);
                if (set.has(day)) set.delete(day); else set.add(day);
                draft.winDays = [...set].sort();
            }
            async function saveSimple() {
                const conditions = [];
                if (props.view === "surplus") {
                    conditions.push({ type: "pv_surplus" });
                } else if (draft.priceMode === "cheapest") {
                    conditions.push({ type: "cheapest_hours", hours: Number(draft.hours), scope: draft.scope });
                } else {
                    conditions.push({ type: "price_below", max_ct: Number(draft.maxCt) });
                }
                if (props.view === "price" && draft.useWindow) {
                    conditions.push({ type: "time_window", days: [...draft.winDays], start: draft.winStart, end: draft.winEnd });
                }
                const power = Number(draft.nominal_power_w);
                const body = {
                    name: draft.name.trim(), kind: "switchable", priority: Number(draft.priority),
                    nominal_power_w: power, entity_id: draft.entity_id.trim(),
                    min_surplus_w: props.view === "surplus" ? Number(draft.min_surplus_w) : power,
                    match: props.view === "surplus" ? "any" : "all",
                    conditions,
                    min_runtime_min: Number(draft.min_runtime_min),
                    min_off_min: Number(draft.min_off_min),
                };
                const ok = draft.id
                    ? await run("updateConsumer", { ...body, id: draft.id })
                    : await run("addConsumer", body);
                if (ok) editorOpen.value = false;
            }
            function draftPayload() {
                const body = {
                    name: draft.name.trim(), kind: draft.kind, priority: Number(draft.priority),
                    nominal_power_w: Number(draft.nominal_power_w), entity_id: draft.entity_id.trim(),
                };
                if (draft.kind === "switchable") {
                    body.min_surplus_w = Number(draft.min_surplus_w);
                    body.match = draft.match;
                    body.conditions = JSON.parse(JSON.stringify(draft.conditions));
                    body.min_runtime_min = Number(draft.min_runtime_min);
                    body.min_off_min = Number(draft.min_off_min);
                } else {
                    body.ready_entity = draft.ready_entity.trim() || null;
                    body.duration_min = Number(draft.duration_min);
                    body.deadline = draft.deadline;
                    body.objective = draft.objective;
                    body.earliest_day = draft.earliest_day;
                    body.door_entity = draft.door_entity.trim() || null;
                    body.door_openings = Number(draft.door_openings);
                    body.min_surplus_w = Number(draft.nominal_power_w);
                }
                return body;
            }
            async function saveDraft() {
                const body = draftPayload();
                const ok = draft.id
                    ? await run("updateConsumer", { ...body, id: draft.id })
                    : await run("addConsumer", body);
                if (ok) editorOpen.value = false;
            }
            async function confirmDelete(item) {
                pendingDelete.value = "";
                await run("deleteConsumer", { id: item.id });
            }
            function addCondition() {
                if (!newCondition.value || draft.conditions.length >= 8) { newCondition.value = ""; return; }
                draft.conditions.push(conditionDefaults[newCondition.value]());
                newCondition.value = "";
            }
            function toggleDay(cond, day) {
                const set = new Set(cond.days);
                if (set.has(day)) set.delete(day); else set.add(day);
                cond.days = [...set].sort();
            }
            const dayName = (day) => new Date(2024, 0, 1 + day).toLocaleDateString(language(), { weekday: "short" });
            async function saveSettings() {
                await run("saveSettings", { master_enabled: settings.master_enabled, base_load_w: settings.base_load_w });
            }

            const stateKey = (item) => {
                if (!item.active) return "inactive";
                if (item.paused) return "paused";
                if (item.kind === "program") return item.state || "idle";
                return item.is_on ? "on" : "off";
            };
            const stateClass = (item) => {
                const key = stateKey(item);
                if (["on", "started"].includes(key)) return "ok";
                if (["paused"].includes(key)) return "warn";
                if (["planned", "armed"].includes(key)) return "info";
                return "muted";
            };
            const reasonText = (code) => {
                const key = `reason.${code}`;
                const pack = I18N[language()];
                return pack[key] || I18N.de[key] || String(code || "");
            };
            const actionText = (code) => {
                const key = `action.${code}`;
                return I18N[language()][key] || I18N.de[key] || String(code || "");
            };
            const timeText = (iso) => {
                if (!iso) return "–";
                const date = new Date(iso);
                return Number.isNaN(date.getTime()) ? "–" : date.toLocaleString(language(), { weekday: "short", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
            };
            const hasSurplusRule = (item) => (item.conditions || []).some((cond) => cond.type === "pv_surplus");
            const deviceName = (id) => consumers.value.find((item) => item.id === id)?.name || id || "–";
            const conditionText = (cond) => t(`cond.${cond.type}`, {
                ...cond,
                scope: cond.scope === "next_24h" ? t("scopeRolling") : t("scopeToday"),
            });
            const detailText = (row) => {
                const parts = [];
                if (row.surplus_w !== undefined) parts.push(`${row.surplus_w} W`);
                if (row.price_ct_kwh !== undefined) parts.push(`${row.price_ct_kwh} ct`);
                if (row.soc_percent !== undefined) parts.push(`${row.soc_percent} %`);
                return parts.join(" · ") || "–";
            };

            const nextOf = (items) => items
                .filter((item) => item.active)
                .map((item) => ({ item, at: item.kind === "program" ? (item.plan || item.preview)?.start : (!item.is_on ? item.next_window?.start : null) }))
                .filter((entry) => entry.at)
                .sort((left, right) => String(left.at).localeCompare(String(right.at)))[0] || null;
            const clock = (iso) => {
                const date = new Date(iso);
                return Number.isNaN(date.getTime()) ? "–" : date.toLocaleTimeString(language(), { hour: "2-digit", minute: "2-digit" });
            };
            const watts = (value) => (value == null ? null : Math.abs(value) >= 1000 ? `${(value / 1000).toLocaleString(language(), { maximumFractionDigits: 2 })} kW` : `${Math.round(value)} W`);
            function hubbleFor(view) {
                const body = status.value || {};
                const inputs = body.inputs || {};
                const all = consumers.value;
                const mine = view === "start" || view === "log" ? all : all.filter((item) => modeOf(item) === view);
                const active = mine.filter((item) => item.active);
                const demo = body.mode === "demo";
                const parts = [];
                if (demo) parts.push(t("hubble.demo"));
                const surplus = watts(inputs.surplus_w);
                const next = nextOf(mine);
                if (view === "start") {
                    const headline = active.length ? t(active.length === 1 ? "hubble.startHeadOne" : "hubble.startHead", { n: active.length }) : t("hubble.startEmpty");
                    if (next) parts.unshift(t("hubble.nextDevice", { name: next.item.name, time: clock(next.at) }));
                    if (surplus) parts.unshift(t("hubble.surplusNow", { v: surplus }));
                    return { tone: demo ? "demo" : active.length ? "ok" : "idle", headline, detail: parts.join(" ") };
                }
                if (view === "surplus") {
                    const running = active.filter((item) => item.is_on).length;
                    let headline;
                    if (!mine.length) headline = t("hubble.surplusEmpty");
                    else if (inputs.surplus_w == null) headline = t("hubble.surplusMissing");
                    else if (running) headline = t(running === 1 ? "hubble.surplusRunningOne" : "hubble.surplusRunning", { n: running });
                    else headline = t("hubble.surplusIdle");
                    if (surplus) parts.unshift(t("hubble.surplusNow", { v: surplus }));
                    parts.push(t("hubble.surplusHow"));
                    return { tone: demo ? "demo" : inputs.surplus_w == null && mine.length ? "warn" : running ? "ok" : "idle", headline, detail: parts.join(" ") };
                }
                if (view === "price") {
                    const price = inputs.price_ct_kwh;
                    const headline = !mine.length
                        ? t("hubble.priceEmpty")
                        : price == null ? t("hubble.priceMissing") : t("hubble.priceNow", { v: Number(price).toLocaleString(language(), { maximumFractionDigits: 1 }) });
                    if (next) parts.unshift(t("hubble.nextDevice", { name: next.item.name, time: clock(next.at) }));
                    if (!inputs.prices_tomorrow && mine.length) parts.push(t("hubble.priceTomorrow"));
                    return { tone: demo ? "demo" : price == null && mine.length ? "warn" : "ok", headline, detail: parts.join(" ") };
                }
                if (view === "loads") {
                    const planned = active.find((item) => item.kind === "program" && item.state === "planned" && item.plan?.start);
                    const running = active.find((item) => item.kind === "program" && item.state === "started");
                    let headline;
                    if (running) headline = t("hubble.programRunning", { name: running.name });
                    else if (planned) headline = t("hubble.programPlanned", { name: planned.name, time: clock(planned.plan.start) });
                    else if (mine.length) headline = t("hubble.programWaiting");
                    else headline = t("hubble.programEmpty");
                    const door = active.find((item) => item.kind === "program" && item.door_entity && ["idle", "done"].includes(item.state));
                    if (running) {
                        parts.push(running.plan?.end ? t("hubble.programRunningUntil", { time: clock(running.plan.end) }) : t("hubble.programRunningHow"));
                    } else if (planned) {
                        parts.push(t("hubble.programPlannedHow", { deadline: planned.deadline || "–", goal: t(`goal.${planned.objective || "both"}`) }));
                    } else {
                        parts.push(door ? t("hubble.programDoor", { name: door.name, n: door.door_opens || 0, m: door.door_openings || 2 }) : t("hubble.programHow"));
                    }
                    return { tone: demo ? "demo" : running || planned ? "ok" : "idle", headline, detail: parts.join(" ") };
                }
                const today = new Date().toDateString();
                const switched = (body.audit || []).filter((row) => ["on", "off", "start"].includes(row.action) && new Date(row.at).toDateString() === today);
                const last = (body.audit || [])[0];
                const headline = switched.length ? t(switched.length === 1 ? "hubble.logTodayOne" : "hubble.logToday", { n: switched.length }) : t("hubble.logQuiet");
                if (last) parts.push(t("hubble.logLast", { action: actionText(last.action), name: deviceName(last.id), time: clock(last.at), reason: reasonText(last.reason) }));
                return { tone: demo ? "demo" : "idle", headline, detail: parts.join(" ") };
            }
            const hubble = Vue.computed(() => hubbleFor(props.view));
            Vue.watch(() => [status.value, props.view], () => {
                if (props.view === "start" && status.value) emit("summary", hubbleFor("start"));
            });

            Vue.onMounted(() => {
                bridge = new ConsumersBridgeClient(window);
                bridge.mount(bridgeHost.value);
                refresh();
                timer = window.setInterval(() => { if (!document.hidden) refresh(); }, 30000);
            });
            Vue.onUnmounted(() => {
                window.clearInterval(timer);
                bridge?.destroy();
            });

            return {
                t, hubble, modeCards, visibleConsumers, countFor, nextFor, toggleDraftDay, saveSimple, loading, message, status, busy, ackChecked, isDemo, isLive, acknowledged, consumers, canToggle,
                surplusText, batteryText, typeMismatch, guideParts, activeCount, nextStartText, editorOpen, draft, pendingDelete, newCondition, settings, bridgeHost,
                weekdays: WEEKDAYS, conditionTypes: CONDITION_TYPES,
                entityChoices, acknowledge, toggleActive, beginAdd, beginEdit, saveDraft, confirmDelete, addCondition, toggleDay, dayName, saveSettings, run,
                stateKey, stateClass, hasSurplusRule, reasonText, actionText, timeText, deviceName, conditionText, detailText,
            };
        },
    };
})();
