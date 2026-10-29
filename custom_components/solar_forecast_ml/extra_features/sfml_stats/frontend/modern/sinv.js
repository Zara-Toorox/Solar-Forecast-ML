(() => {
    const TEXT = {
        de: {
            loading: "Laden",
            error: "Werte konnten nicht geladen werden.",
            retry: "Erneut laden",
            disabledTitle: "S-INV ist nicht eingerichtet",
            disabledText: "Die Seite erscheint, sobald die Integration solar_forecast_sinv aktiv ist.",
            emptyTitle: "Kein Wechselrichter sichtbar",
            emptyText: "S-INV ist eingerichtet, liefert aber noch keine Werte.",
            curtailed: "Abregelung aktiv",
            pvTotal: "PV gesamt",
            anker: "laut Anker-Cloud",
            mppt: "MPPT",
            voltage: "Spannung",
            current: "Strom",
            power: "Leistung",
            spark: "Verlauf, 24 Stunden",
            yield: "Tagesertrag",
            today: "Heute",
            calibrated: "Am Fühler kalibriert, Faktor {k}",
            shareToday: "Anteil am Ertrag",
            maxCurrent: "Max. Strom",
            maxVoltage: "Max. Spannung",
            maxModule: "Modul max.",
            peak: "Spitze",
            peakAt: "um",
            grid: "Netz",
            frequency: "Frequenz",
            dayRange: "Tages-Min/Max",
            battery: "Akku",
            soc: "Ladestand",
            temperature: "Temperatur",
            expansion: "Erweiterung",
            measure: "Messung",
            cloud: "Cloud",
            justNow: "gerade eben",
            minutesAgo: "vor {n} min",
            hoursAgo: "vor {n} h",
            dayChart: "Tagesverlauf",
            sinceMidnight: "seit Mitternacht",
            charge: "Laden",
            discharge: "Entladen",
            mainBattery: "Hauptakku",
            soh: "SOH",
            cells: "Zellen",
            meterImport: "Netzbezug",
            meterExport: "Einspeisung",
            module: "Modul",
            moduleDerived: "Modul (abgeleitet)",
            outdoor: "Außen",
            delta: "ΔT",
            moduleEstimated: "Modul (geschätzt)",
            learning: "Schätzung lernt noch",
            curtailedReason: "Während der Abregelung keine Schätzung",
            noAmbient: "Keine Außentemperatur",
            noCurrent: "Kein Strommesswert",
            thermal: "Modul und Außen, 24 Stunden",
            compare: "Temperaturvergleich",
            measured: "Gemessen",
            faiman: "Schätzung",
            premiumTitle: "Premium-Funktion nicht freigeschaltet",
            premiumText: "Das Vergleichsdiagramm braucht eine aktive Premium-Lizenz.",
            unitNotice: "{id} ({unit}) wird ignoriert, die Einheit passt nicht.",
            tabLive: "Live",
            tabHeatPump: "Wärmepumpe",
            tabMapping: "Zuordnung",
            hpDerived: "abgeleitet",
            hpOn: "ein",
            hpOff: "aus",
            hp_power_electric: "Elektrische Leistung",
            hp_power_thermal: "Thermische Leistung",
            hp_cop_live: "COP live",
            hp_energy_electric_today: "Strom heute",
            hp_energy_electric_total: "Strom gesamt",
            hp_energy_thermal_today: "Wärme heute",
            hp_energy_thermal_total: "Wärme gesamt",
            hp_cop_total: "JAZ",
            hp_temperature_outdoor: "Außentemperatur",
            hp_temperature_flow: "Vorlauf",
            hp_temperature_return: "Rücklauf",
            hp_temperature_dhw: "Warmwasser",
            hp_operating_mode: "Betriebsart",
            hp_compressor_running: "Verdichter",
            hp_aux_heater_active: "Heizstab",
            tabsLabel: "Seitenbereiche",
            mapLoading: "Zuordnung wird geladen",
            mapError: "Die Zuordnung konnte nicht geladen werden.",
            energyKept: "Preise, Kosten, Namen und Prognosequelle des Energie-Dashboards bleiben unverändert.",
            mapAbsent: "S-INV ist nicht eingerichtet.",
            mapEmpty: "Keine Zuordnung vorhanden.",
            targetAbsent: "Diese Integration ist nicht eingerichtet.",
            targetError: "Dieses Ziel konnte nicht gelesen werden.",
            colField: "Feld",
            colCurrent: "Aktueller Sensor",
            colSinv: "S-INV-Sensor",
            colAction: "Aktion",
            notSet: "nicht eingetragen",
            noCounterpart: "kein S-INV-Gegenstück",
            derived: "abgeleitet",
            setupOnly: "nur über die Einrichtung",
            actionAdd: "hinzufügen",
            actionReplace: "ersetzen",
            actionKeep: "behalten",
            actionConflict: "Konflikt",
            reasonUnit: "Einheit passt nicht",
            reasonDeviceClass: "Geräteklasse passt nicht",
            reasonStateClass: "Zustandsklasse passt nicht",
            reasonDouble: "Zweite Quelle derselben Energie",
            reasonEnergyDaily: "EAI erwartet Tageszähler ohne kumulative Klasse",
            targetEnergy: "Energie-Dashboard",
            targetSfml: "SFML",
            targetGpm: "GPM",
            targetEai: "EAI",
            targetWfai: "WFAI",
            targetStats: "STATS",
            targetUnknown: "Weiteres Ziel",
            fieldUnknown: "Sensorfeld",
            mapAdmin: "Die Zuordnung ist nur für die Verwaltung sichtbar.",
            apply: "Übernehmen",
            undo: "Rückgängig",
            confirmTitle: "Änderungen übernehmen",
            confirmBody: "Diese Sensoren werden im Energie-Dashboard eingetragen.",
            confirmYes: "Übernehmen",
            confirmNo: "Abbrechen",
            applyDone: "Die Zuordnung wurde übernommen.",
            undoDone: "Die Zuordnung wurde zurückgesetzt.",
            planChanged: "Die Zuordnung hat sich geändert. Nichts wurde geschrieben.",
            prefsChanged: "Das Energie-Dashboard wurde inzwischen geändert. Nichts wurde zurückgesetzt.",
            undoUsed: "Das wurde bereits rückgängig gemacht.",
            applyFailed: "Das Energie-Dashboard konnte nicht gespeichert werden.",
            undoFailed: "Die Zuordnung konnte nicht zurückgesetzt werden.",
            incompleteSource: "Diese Quelle ist unvollständig. Nichts wurde geschrieben.",
            batteryPair: "Lade- und Entladezähler werden nur zusammen übernommen.",
            sfmlBattery: "Das aktiviert die Batterie-Erkennung (has_battery).",
            sfmlPair: "PV-Batterie-Leistung und Ladestand werden nur zusammen übernommen.",
            gpmGridCharge: "Batterieladung aus dem Netz.",
            optionsReload: "Die Integration lädt sich über ihren eigenen Dialog neu.",
            statsSensors: "Die Sensoren werden über den Sensor-Schritt gespeichert. Die Übernahme gilt im laufenden Eintrag, ohne die Integration neu zu laden.",
            statsOptionsPending: "STATS-Sensoren einmal in den STATS-Optionen speichern, danach ist die Übernahme möglich.",
            eaiKeep: "Die übrigen Wärmepumpen-, Wallbox- und Automationsfelder bleiben erhalten.",
            flowOpen: "Ein Einrichtungsdialog ist bereits offen. Nichts wurde geschrieben.",
            flowRejected: "Das Formular hat die Änderung abgelehnt. Nichts wurde geschrieben.",
            missingValues: "Gespeicherte Tarifwerte fehlen. Nichts wurde geschrieben.",
            optionsMismatch: "Die übrigen Einstellungen hätten sich geändert. Der vorherige Stand wurde angefordert.",
            undoPartialSfml: "Sensoren bleiben eingetragen, Batterie-Erkennung wieder aus.",
            undoPartialGpm: "Der Sensor bleibt als leerer Eintrag stehen.",
            undoPartialEai: "Der Sensor bleibt als leeres Feld stehen.",
            rollbackIncomplete: "Der vorherige Stand ließ sich nicht wiederherstellen. Es wurde nichts weiter versucht.",
            selectRow: "Auswählen",
            fields: {
                energy: {
                    grid: {
                        stat_energy_from: "Netzbezugszähler",
                        stat_energy_to: "Einspeisezähler",
                        stat_rate: "Netzleistung",
                        stat_cost: "Kosten Netzbezug",
                        entity_energy_price: "Preis-Sensor Netzbezug",
                        number_energy_price: "Preis Netzbezug",
                        stat_compensation: "Vergütung Einspeisung",
                        entity_energy_price_export: "Preis-Sensor Einspeisung",
                        number_energy_price_export: "Preis Einspeisung",
                        cost_adjustment_day: "Tägliche Kostenkorrektur",
                        name: "Name Netz",
                        power_config: {
                            stat_rate: "Netzleistung",
                            stat_rate_inverted: "Netzleistung, umgekehrtes Vorzeichen",
                            stat_rate_from: "Leistung Netzbezug",
                            stat_rate_to: "Leistung Einspeisung",
                        },
                    },
                    solar: {
                        stat_energy_from: "Solarzähler",
                        stat_rate: "Solarleistung",
                        config_entry_solar_forecast: "Prognosequelle",
                        name: "Name Solar",
                    },
                    battery: {
                        stat_energy_from: "Zähler Entladen",
                        stat_energy_to: "Zähler Laden",
                        stat_soc: "Ladestand",
                        capacity: "Kapazität",
                        name: "Name Akku",
                        power_config: {
                            stat_rate_from: "Leistung Entladen",
                            stat_rate_to: "Leistung Laden",
                            stat_rate_inverted: "Akkuleistung, umgekehrtes Vorzeichen",
                        },
                    },
                },
                sfml: {
                    total_consumption_today: "Hausverbrauch heute",
                    rain_sensor: "Regen",
                    lux_sensor: "Helligkeit",
                    temp_sensor: "Außentemperatur",
                    wind_sensor: "Wind",
                    humidity_sensor: "Luftfeuchte",
                    pressure_sensor: "Luftdruck",
                    solar_radiation_sensor: "Einstrahlung",
                    group_1_sensor: "Modulgruppe 1",
                    group_2_sensor: "Modulgruppe 2",
                    group_3_sensor: "Modulgruppe 3",
                    group_4_sensor: "Modulgruppe 4",
                    solar_to_battery_sensor: "PV zum Akku",
                    battery_soc_sensor: "Ladestand",
                },
                gpm: {
                    battery_power_sensor: "Laden aus dem Netz",
                },
                eai: {
                    wp_power_entity: "Wärmepumpenleistung",
                    wp_energy_today: "Wärmepumpe heute",
                    outdoor_temp_entity: "Außentemperatur",
                    indoor_temp_entity: "Innentemperatur",
                    target_temp_entity: "Solltemperatur",
                    operation_mode_entity: "Betriebsart",
                    compressor_entity: "Verdichter",
                    heating_element_entity: "Heizstab",
                    dhw_temp_entity: "Warmwasser",
                    flow_temp_entity: "Vorlauf",
                    return_temp_entity: "Rücklauf",
                    starts_entity: "Starts",
                    runtime_entity: "Laufzeit",
                    runtime_heating_entity: "Laufzeit Heizen",
                    runtime_dhw_entity: "Laufzeit Warmwasser",
                    heating_element_power_entity: "Heizstableistung",
                    heating_element_energy_today_entity: "Heizstab heute",
                    thermal_energy_entity: "Wärmeenergie",
                    jaz_entity: "JAZ",
                    volume_flow_entity: "Volumenstrom",
                    source_temp_entity: "Quellentemperatur",
                    storage_temp_entity: "Speichertemperatur",
                    storage_ambient_temp_entity: "Speicherumgebung",
                    circulation_pump_entity: "Zirkulationspumpe",
                    circulation_return_temp_entity: "Zirkulation Rücklauf",
                    wallbox_power_entity: "Wallbox-Leistung",
                    wallbox_energy_today_entity: "Wallbox heute",
                    wallbox_connected_entity: "Wallbox verbunden",
                    wallbox_charging_entity: "Wallbox lädt",
                    ev_soc_entity: "Ladestand Fahrzeug",
                    ev_required_energy_entity: "Bedarf Fahrzeug",
                    ev_planned_distance_entity: "Geplante Strecke",
                    electricity_price_entity: "Strompreis",
                    feed_in_tariff_entity: "Einspeisetarif",
                },
                wfai: {
                    temperature_sensor: "Temperatur",
                    humidity_sensor: "Luftfeuchte",
                    pressure_sensor: "Luftdruck",
                    wind_speed_sensor: "Wind",
                    wind_direction_sensor: "Windrichtung",
                    rain_sensor: "Regen",
                },
                stats: {
                    sensor_home_consumption: "Hausverbrauch",
                    sensor_solar_to_house: "PV zum Haus",
                    sensor_solar_to_battery: "PV zum Akku",
                    sensor_battery_to_house: "Akku zum Haus",
                    sensor_grid_to_house: "Netz zum Haus",
                    sensor_grid_to_battery: "Netz zum Akku",
                    sensor_smartmeter_import: "Netzbezug",
                    sensor_smartmeter_export: "Einspeisung",
                    sensor_battery_power: "Akkuleistung",
                    sensor_heatpump_power: "Wärmepumpe",
                    sensor_heatingrod_power: "Heizstab",
                    sensor_wallbox_power: "Wallbox",
                },
            },
        },
        en: {
            loading: "Loading",
            error: "Values could not be loaded.",
            retry: "Retry",
            disabledTitle: "S-INV is not set up",
            disabledText: "The page appears once the solar_forecast_sinv integration is active.",
            emptyTitle: "No inverter visible",
            emptyText: "S-INV is set up, but it is not reporting values yet.",
            curtailed: "Curtailment active",
            pvTotal: "PV total",
            anker: "per Anker cloud",
            mppt: "MPPT",
            voltage: "Voltage",
            current: "Current",
            power: "Power",
            spark: "Trace, 24 hours",
            yield: "Today",
            today: "Today",
            calibrated: "Calibrated against the sensor, factor {k}",
            shareToday: "Share of yield",
            maxCurrent: "Max. current",
            maxVoltage: "Max. voltage",
            maxModule: "Module max.",
            peak: "Peak",
            peakAt: "at",
            grid: "Grid",
            frequency: "Frequency",
            dayRange: "Day min/max",
            battery: "Battery",
            soc: "State of charge",
            temperature: "Temperature",
            expansion: "Expansion",
            measure: "Reading",
            cloud: "Cloud",
            justNow: "just now",
            minutesAgo: "{n} min ago",
            hoursAgo: "{n} h ago",
            dayChart: "Today",
            sinceMidnight: "since midnight",
            charge: "Charge",
            discharge: "Discharge",
            mainBattery: "Main battery",
            soh: "SOH",
            cells: "Cells",
            meterImport: "Grid import",
            meterExport: "Grid export",
            module: "Module",
            moduleDerived: "Module (derived)",
            outdoor: "Outdoor",
            delta: "ΔT",
            moduleEstimated: "Module (estimated)",
            learning: "Estimate is still learning",
            curtailedReason: "No estimate while curtailed",
            noAmbient: "No outdoor temperature",
            noCurrent: "No current reading",
            thermal: "Module and outdoor, 24 hours",
            compare: "Temperature comparison",
            measured: "Measured",
            faiman: "Estimate",
            premiumTitle: "Premium feature is locked",
            premiumText: "The comparison chart needs an active premium licence.",
            unitNotice: "{id} ({unit}) is ignored because the unit does not match.",
            tabLive: "Live",
            tabHeatPump: "Heat pump",
            tabMapping: "Mapping",
            hpDerived: "derived",
            hpOn: "on",
            hpOff: "off",
            hp_power_electric: "Electric power",
            hp_power_thermal: "Thermal power",
            hp_cop_live: "COP live",
            hp_energy_electric_today: "Electricity today",
            hp_energy_electric_total: "Electricity total",
            hp_energy_thermal_today: "Heat today",
            hp_energy_thermal_total: "Heat total",
            hp_cop_total: "SCOP",
            hp_temperature_outdoor: "Outdoor temperature",
            hp_temperature_flow: "Flow temperature",
            hp_temperature_return: "Return temperature",
            hp_temperature_dhw: "Hot water",
            hp_operating_mode: "Operating mode",
            hp_compressor_running: "Compressor",
            hp_aux_heater_active: "Heating element",
            tabsLabel: "Page sections",
            mapLoading: "Loading mapping",
            mapError: "The mapping could not be loaded.",
            energyKept: "Prices, costs, names and the forecast source of the energy dashboard stay unchanged.",
            mapAbsent: "S-INV is not set up.",
            mapEmpty: "No mapping to show.",
            targetAbsent: "This integration is not set up.",
            targetError: "This target could not be read.",
            colField: "Field",
            colCurrent: "Current sensor",
            colSinv: "S-INV sensor",
            colAction: "Action",
            notSet: "not set",
            noCounterpart: "no S-INV counterpart",
            derived: "derived",
            setupOnly: "setup only",
            actionAdd: "add",
            actionReplace: "replace",
            actionKeep: "keep",
            actionConflict: "Conflict",
            reasonUnit: "Unit does not match",
            reasonDeviceClass: "Device class does not match",
            reasonStateClass: "State class does not match",
            reasonDouble: "A second source of the same energy",
            reasonEnergyDaily: "EAI expects a daily counter without a cumulative class.",
            targetEnergy: "Energy dashboard",
            targetSfml: "SFML",
            targetGpm: "GPM",
            targetEai: "EAI",
            targetWfai: "WFAI",
            targetStats: "STATS",
            targetUnknown: "Other target",
            fieldUnknown: "Sensor field",
            mapAdmin: "Only an administrator can view the mapping.",
            apply: "Apply",
            undo: "Undo",
            confirmTitle: "Apply changes",
            confirmBody: "These sensors will be written to the energy dashboard.",
            confirmYes: "Apply",
            confirmNo: "Cancel",
            applyDone: "The mapping was applied.",
            undoDone: "The mapping was restored.",
            planChanged: "The mapping changed. Nothing was written.",
            prefsChanged: "The energy dashboard changed in the meantime. Nothing was restored.",
            undoUsed: "This was already undone.",
            applyFailed: "The energy dashboard could not be saved.",
            undoFailed: "The mapping could not be restored.",
            incompleteSource: "This source is incomplete. Nothing was written.",
            batteryPair: "Charge and discharge meters are applied only together.",
            sfmlBattery: "This turns on battery detection (has_battery).",
            sfmlPair: "PV-to-battery power and state of charge are applied only together.",
            gpmGridCharge: "Battery charging from the grid.",
            optionsReload: "The integration reloads through its own dialog.",
            statsSensors: "Sensors are saved through the sensor step. The mapping applies in the running entry, without reloading the integration.",
            statsOptionsPending: "Save the STATS sensors once in the STATS options. Applying the mapping is possible after that.",
            eaiKeep: "The other heat-pump, wallbox, and automation fields stay as they are.",
            flowOpen: "An options dialog is already open. Nothing was written.",
            flowRejected: "The form rejected the change. Nothing was written.",
            missingValues: "Stored tariff values are missing. Nothing was written.",
            optionsMismatch: "Other settings would have changed. The previous options were requested again.",
            undoPartialSfml: "The sensors stay saved, and battery detection is off again.",
            undoPartialGpm: "The sensor stays as an empty entry.",
            undoPartialEai: "The sensor stays as an empty field.",
            rollbackIncomplete: "The previous options could not be restored. Nothing further was tried.",
            selectRow: "Select",
            fields: {
                energy: {
                    grid: {
                        stat_energy_from: "Grid import meter",
                        stat_energy_to: "Grid export meter",
                        stat_rate: "Grid power",
                        stat_cost: "Grid import cost",
                        entity_energy_price: "Grid import price sensor",
                        number_energy_price: "Grid import price",
                        stat_compensation: "Grid export compensation",
                        entity_energy_price_export: "Grid export price sensor",
                        number_energy_price_export: "Grid export price",
                        cost_adjustment_day: "Daily cost adjustment",
                        name: "Grid name",
                        power_config: {
                            stat_rate: "Grid power",
                            stat_rate_inverted: "Grid power, inverted sign",
                            stat_rate_from: "Grid import power",
                            stat_rate_to: "Grid export power",
                        },
                    },
                    solar: {
                        stat_energy_from: "Solar production meter",
                        stat_rate: "Solar production power",
                        config_entry_solar_forecast: "Forecast provider",
                        name: "Solar name",
                    },
                    battery: {
                        stat_energy_from: "Battery discharge meter",
                        stat_energy_to: "Battery charge meter",
                        stat_soc: "State of charge",
                        capacity: "Battery capacity",
                        name: "Battery name",
                        power_config: {
                            stat_rate_from: "Battery discharge power",
                            stat_rate_to: "Battery charge power",
                            stat_rate_inverted: "Battery power, inverted sign",
                        },
                    },
                },
                sfml: {
                    total_consumption_today: "Household consumption today",
                    rain_sensor: "Rain",
                    lux_sensor: "Illuminance",
                    temp_sensor: "Outdoor temperature",
                    wind_sensor: "Wind speed",
                    humidity_sensor: "Humidity",
                    pressure_sensor: "Air pressure",
                    solar_radiation_sensor: "Solar radiation",
                    group_1_sensor: "Panel group 1",
                    group_2_sensor: "Panel group 2",
                    group_3_sensor: "Panel group 3",
                    group_4_sensor: "Panel group 4",
                    solar_to_battery_sensor: "PV to battery",
                    battery_soc_sensor: "State of charge",
                },
                gpm: {
                    battery_power_sensor: "Charge from the grid",
                },
                eai: {
                    wp_power_entity: "Heat pump power",
                    wp_energy_today: "Heat pump today",
                    outdoor_temp_entity: "Outdoor temperature",
                    indoor_temp_entity: "Indoor temperature",
                    target_temp_entity: "Target temperature",
                    operation_mode_entity: "Operation mode",
                    compressor_entity: "Compressor",
                    heating_element_entity: "Heating element",
                    dhw_temp_entity: "Hot water",
                    flow_temp_entity: "Flow temperature",
                    return_temp_entity: "Return temperature",
                    starts_entity: "Starts",
                    runtime_entity: "Runtime",
                    runtime_heating_entity: "Heating runtime",
                    runtime_dhw_entity: "Hot water runtime",
                    heating_element_power_entity: "Heating element power",
                    heating_element_energy_today_entity: "Heating element today",
                    thermal_energy_entity: "Thermal energy",
                    jaz_entity: "JAZ",
                    volume_flow_entity: "Volume flow",
                    source_temp_entity: "Source temperature",
                    storage_temp_entity: "Storage temperature",
                    storage_ambient_temp_entity: "Storage ambient",
                    circulation_pump_entity: "Circulation pump",
                    circulation_return_temp_entity: "Circulation return",
                    wallbox_power_entity: "Wallbox power",
                    wallbox_energy_today_entity: "Wallbox today",
                    wallbox_connected_entity: "Wallbox connected",
                    wallbox_charging_entity: "Wallbox charging",
                    ev_soc_entity: "Vehicle state of charge",
                    ev_required_energy_entity: "Vehicle energy needed",
                    ev_planned_distance_entity: "Planned distance",
                    electricity_price_entity: "Electricity price",
                    feed_in_tariff_entity: "Feed-in tariff",
                },
                wfai: {
                    temperature_sensor: "Temperature",
                    humidity_sensor: "Humidity",
                    pressure_sensor: "Air pressure",
                    wind_speed_sensor: "Wind speed",
                    wind_direction_sensor: "Wind direction",
                    rain_sensor: "Rain",
                },
                stats: {
                    sensor_home_consumption: "House consumption",
                    sensor_solar_to_house: "PV to house",
                    sensor_solar_to_battery: "PV to battery",
                    sensor_battery_to_house: "Battery to house",
                    sensor_grid_to_house: "Grid to house",
                    sensor_grid_to_battery: "Grid to battery",
                    sensor_smartmeter_import: "Grid import",
                    sensor_smartmeter_export: "Feed-in",
                    sensor_battery_power: "Battery power",
                    sensor_heatpump_power: "Heat pump",
                    sensor_heatingrod_power: "Heating rod",
                    sensor_wallbox_power: "Wallbox",
                },
            },
        },
        pl: {
            loading: "Ładowanie",
            error: "Nie udało się wczytać wartości.",
            retry: "Wczytaj ponownie",
            disabledTitle: "S-INV nie jest skonfigurowane",
            disabledText: "Strona pojawi się, gdy integracja solar_forecast_sinv będzie aktywna.",
            emptyTitle: "Brak widocznego falownika",
            emptyText: "S-INV jest skonfigurowane, ale nie podaje jeszcze wartości.",
            curtailed: "Ograniczenie aktywne",
            pvTotal: "PV łącznie",
            anker: "wg chmury Anker",
            mppt: "MPPT",
            voltage: "Napięcie",
            current: "Prąd",
            power: "Moc",
            spark: "Przebieg, 24 godziny",
            yield: "Uzysk dnia",
            today: "Dzisiaj",
            calibrated: "Skalibrowano czujnikiem, współczynnik {k}",
            shareToday: "Udział w uzysku",
            maxCurrent: "Maks. prąd",
            maxVoltage: "Maks. napięcie",
            maxModule: "Moduł maks.",
            peak: "Szczyt",
            peakAt: "o",
            grid: "Sieć",
            frequency: "Częstotliwość",
            dayRange: "Min/maks doby",
            battery: "Akumulator",
            soc: "Stan naładowania",
            temperature: "Temperatura",
            expansion: "Rozszerzenie",
            measure: "Odczyt",
            cloud: "Chmura",
            justNow: "przed chwilą",
            minutesAgo: "{n} min temu",
            hoursAgo: "{n} godz. temu",
            dayChart: "Przebieg dnia",
            sinceMidnight: "od północy",
            charge: "Ładowanie",
            discharge: "Rozładowanie",
            mainBattery: "Akumulator główny",
            soh: "SOH",
            cells: "Ogniwa",
            meterImport: "Pobór z sieci",
            meterExport: "Oddawanie do sieci",
            module: "Moduł",
            moduleDerived: "Moduł (wyliczony)",
            outdoor: "Na zewnątrz",
            delta: "ΔT",
            moduleEstimated: "Moduł (szacowany)",
            learning: "Szacunek jeszcze się uczy",
            curtailedReason: "Brak szacunku przy ograniczeniu",
            noAmbient: "Brak temperatury zewnętrznej",
            noCurrent: "Brak pomiaru prądu",
            thermal: "Moduł i zewnątrz, 24 godziny",
            compare: "Porównanie temperatur",
            measured: "Pomiar",
            faiman: "Szacunek",
            premiumTitle: "Funkcja Premium jest zablokowana",
            premiumText: "Wykres porównawczy wymaga aktywnej licencji Premium.",
            unitNotice: "{id} ({unit}) jest ignorowane, jednostka nie pasuje.",
            tabLive: "Na żywo",
            tabHeatPump: "Pompa ciepła",
            tabMapping: "Przypisanie",
            hpDerived: "wyliczone",
            hpOn: "włączony",
            hpOff: "wyłączony",
            hp_power_electric: "Moc elektryczna",
            hp_power_thermal: "Moc cieplna",
            hp_cop_live: "COP na żywo",
            hp_energy_electric_today: "Prąd dzisiaj",
            hp_energy_electric_total: "Prąd łącznie",
            hp_energy_thermal_today: "Ciepło dzisiaj",
            hp_energy_thermal_total: "Ciepło łącznie",
            hp_cop_total: "JAZ",
            hp_temperature_outdoor: "Temperatura zewnętrzna",
            hp_temperature_flow: "Zasilanie",
            hp_temperature_return: "Powrót",
            hp_temperature_dhw: "Ciepła woda",
            hp_operating_mode: "Tryb pracy",
            hp_compressor_running: "Sprężarka",
            hp_aux_heater_active: "Grzałka",
            tabsLabel: "Sekcje strony",
            mapLoading: "Wczytywanie przypisania",
            mapError: "Nie udało się wczytać przypisania.",
            energyKept: "Ceny, koszty, nazwy i źródło prognozy panelu energii pozostają bez zmian.",
            mapAbsent: "S-INV nie jest skonfigurowane.",
            mapEmpty: "Brak przypisania.",
            targetAbsent: "Ta integracja nie jest skonfigurowana.",
            targetError: "Tego celu nie udało się odczytać.",
            colField: "Pole",
            colCurrent: "Obecny czujnik",
            colSinv: "Czujnik S-INV",
            colAction: "Akcja",
            notSet: "nie ustawiono",
            noCounterpart: "brak odpowiednika S-INV",
            derived: "wyliczone",
            setupOnly: "tylko w konfiguracji",
            actionAdd: "dodaj",
            actionReplace: "zastąp",
            actionKeep: "zostaw",
            actionConflict: "Konflikt",
            reasonUnit: "Jednostka nie pasuje",
            reasonDeviceClass: "Klasa urządzenia nie pasuje",
            reasonStateClass: "Klasa stanu nie pasuje",
            reasonDouble: "Drugie źródło tej samej energii",
            reasonEnergyDaily: "EAI oczekuje licznika dziennego bez klasy skumulowanej.",
            targetEnergy: "Panel energii",
            targetSfml: "SFML",
            targetGpm: "GPM",
            targetEai: "EAI",
            targetWfai: "WFAI",
            targetStats: "STATS",
            targetUnknown: "Inny cel",
            fieldUnknown: "Pole czujnika",
            mapAdmin: "Przypisanie widzi tylko administrator.",
            apply: "Zastosuj",
            undo: "Cofnij",
            confirmTitle: "Zastosuj zmiany",
            confirmBody: "Te czujniki zostaną wpisane w panelu energii.",
            confirmYes: "Zastosuj",
            confirmNo: "Anuluj",
            applyDone: "Przypisanie zostało zapisane.",
            undoDone: "Przypisanie zostało cofnięte.",
            planChanged: "Przypisanie się zmieniło. Nic nie zapisano.",
            prefsChanged: "Panel energii zmienił się w międzyczasie. Nic nie cofnięto.",
            undoUsed: "To zostało już cofnięte.",
            applyFailed: "Panelu energii nie udało się zapisać.",
            undoFailed: "Przypisania nie udało się cofnąć.",
            incompleteSource: "To źródło jest niekompletne. Nic nie zapisano.",
            batteryPair: "Liczniki ładowania i rozładowania są zapisywane tylko razem.",
            sfmlBattery: "To włącza wykrywanie baterii (has_battery).",
            sfmlPair: "Moc PV do baterii i stan naładowania są zapisywane tylko razem.",
            gpmGridCharge: "Ładowanie baterii z sieci.",
            optionsReload: "Integracja przeładowuje się przez własny dialog.",
            statsSensors: "Czujniki są zapisywane w kroku czujników. Przejęcie obowiązuje w działającym wpisie, bez przeładowania integracji.",
            statsOptionsPending: "Zapisz czujniki STATS raz w opcjach STATS. Potem przejęcie jest możliwe.",
            eaiKeep: "Pozostałe pola pompy ciepła, wallboxa i automatyzacji zostają bez zmian.",
            flowOpen: "Dialog opcji jest już otwarty. Nic nie zapisano.",
            flowRejected: "Formularz odrzucił zmianę. Nic nie zapisano.",
            missingValues: "Brak zapisanych wartości taryfy. Nic nie zapisano.",
            optionsMismatch: "Pozostałe ustawienia zmieniłyby się. Poprzedni stan został zażądany.",
            undoPartialSfml: "Czujniki pozostają zapisane, a wykrywanie baterii jest znowu wyłączone.",
            undoPartialGpm: "Czujnik pozostaje jako pusty wpis.",
            undoPartialEai: "Czujnik pozostaje jako puste pole.",
            rollbackIncomplete: "Nie udało się przywrócić poprzedniego stanu. Nic więcej nie próbowano.",
            selectRow: "Wybierz",
            fields: {
                energy: {
                    grid: {
                        stat_energy_from: "Licznik poboru z sieci",
                        stat_energy_to: "Licznik oddawania do sieci",
                        stat_rate: "Moc sieci",
                        stat_cost: "Koszt poboru z sieci",
                        entity_energy_price: "Czujnik ceny poboru",
                        number_energy_price: "Cena poboru z sieci",
                        stat_compensation: "Wynagrodzenie za oddawanie",
                        entity_energy_price_export: "Czujnik ceny oddawania",
                        number_energy_price_export: "Cena oddawania",
                        cost_adjustment_day: "Dzienna korekta kosztów",
                        name: "Nazwa sieci",
                        power_config: {
                            stat_rate: "Moc sieci",
                            stat_rate_inverted: "Moc sieci, odwrócony znak",
                            stat_rate_from: "Moc poboru z sieci",
                            stat_rate_to: "Moc oddawania do sieci",
                        },
                    },
                    solar: {
                        stat_energy_from: "Licznik produkcji PV",
                        stat_rate: "Moc produkcji PV",
                        config_entry_solar_forecast: "Źródło prognozy",
                        name: "Nazwa PV",
                    },
                    battery: {
                        stat_energy_from: "Licznik rozładowania",
                        stat_energy_to: "Licznik ładowania",
                        stat_soc: "Stan naładowania",
                        capacity: "Pojemność",
                        name: "Nazwa akumulatora",
                        power_config: {
                            stat_rate_from: "Moc rozładowania",
                            stat_rate_to: "Moc ładowania",
                            stat_rate_inverted: "Moc akumulatora, odwrócony znak",
                        },
                    },
                },
                sfml: {
                    total_consumption_today: "Zużycie domu dzisiaj",
                    rain_sensor: "Deszcz",
                    lux_sensor: "Natężenie światła",
                    temp_sensor: "Temperatura na zewnątrz",
                    wind_sensor: "Prędkość wiatru",
                    humidity_sensor: "Wilgotność",
                    pressure_sensor: "Ciśnienie",
                    solar_radiation_sensor: "Promieniowanie",
                    group_1_sensor: "Grupa modułów 1",
                    group_2_sensor: "Grupa modułów 2",
                    group_3_sensor: "Grupa modułów 3",
                    group_4_sensor: "Grupa modułów 4",
                    solar_to_battery_sensor: "PV do akumulatora",
                    battery_soc_sensor: "Stan naładowania",
                },
                gpm: {
                    battery_power_sensor: "Ładowanie z sieci",
                },
                eai: {
                    wp_power_entity: "Moc pompy ciepła",
                    wp_energy_today: "Pompa ciepła dzisiaj",
                    outdoor_temp_entity: "Temperatura na zewnątrz",
                    indoor_temp_entity: "Temperatura w pomieszczeniu",
                    target_temp_entity: "Temperatura zadana",
                    operation_mode_entity: "Tryb pracy",
                    compressor_entity: "Sprężarka",
                    heating_element_entity: "Grzałka",
                    dhw_temp_entity: "Ciepła woda",
                    flow_temp_entity: "Temperatura zasilania",
                    return_temp_entity: "Temperatura powrotu",
                    starts_entity: "Uruchomienia",
                    runtime_entity: "Czas pracy",
                    runtime_heating_entity: "Czas grzania",
                    runtime_dhw_entity: "Czas ciepłej wody",
                    heating_element_power_entity: "Moc grzałki",
                    heating_element_energy_today_entity: "Grzałka dzisiaj",
                    thermal_energy_entity: "Energia cieplna",
                    jaz_entity: "JAZ",
                    volume_flow_entity: "Przepływ",
                    source_temp_entity: "Temperatura źródła",
                    storage_temp_entity: "Temperatura zasobnika",
                    storage_ambient_temp_entity: "Otoczenie zasobnika",
                    circulation_pump_entity: "Pompa cyrkulacyjna",
                    circulation_return_temp_entity: "Powrót cyrkulacji",
                    wallbox_power_entity: "Moc wallboxa",
                    wallbox_energy_today_entity: "Wallbox dzisiaj",
                    wallbox_connected_entity: "Wallbox podłączony",
                    wallbox_charging_entity: "Wallbox ładuje",
                    ev_soc_entity: "Stan naładowania pojazdu",
                    ev_required_energy_entity: "Energia potrzebna pojazdowi",
                    ev_planned_distance_entity: "Planowany dystans",
                    electricity_price_entity: "Cena prądu",
                    feed_in_tariff_entity: "Taryfa oddawania",
                },
                wfai: {
                    temperature_sensor: "Temperatura",
                    humidity_sensor: "Wilgotność",
                    pressure_sensor: "Ciśnienie",
                    wind_speed_sensor: "Prędkość wiatru",
                    wind_direction_sensor: "Kierunek wiatru",
                    rain_sensor: "Deszcz",
                },
                stats: {
                    sensor_home_consumption: "Zużycie domu",
                    sensor_solar_to_house: "PV do domu",
                    sensor_solar_to_battery: "PV do akumulatora",
                    sensor_battery_to_house: "Akumulator do domu",
                    sensor_grid_to_house: "Sieć do domu",
                    sensor_grid_to_battery: "Sieć do akumulatora",
                    sensor_smartmeter_import: "Pobór z sieci",
                    sensor_smartmeter_export: "Oddawanie do sieci",
                    sensor_battery_power: "Moc akumulatora",
                    sensor_heatpump_power: "Pompa ciepła",
                    sensor_heatingrod_power: "Grzałka",
                    sensor_wallbox_power: "Wallbox",
                },
            },
        },
    };

    const LIVE_MS = 15000;
    const HISTORY_MS = 60000;
    const MPPT_KEYS = ["p1", "p2", "p3", "p4"];

    function text(key) {
        const lang = window.SFMLI18n?.current;
        const pack = TEXT[lang] || TEXT.en;
        const value = pack[key] || TEXT.en[key];
        return typeof value === "string" ? value : key;
    }

    function phrase(path) {
        const lang = window.SFMLI18n?.current;
        const found = walkText(TEXT[lang], path) || walkText(TEXT.en, path);
        return found || "";
    }

    function walkText(root, path) {
        let node = root;
        const parts = String(path || "").split(".");
        for (let index = 0; index < parts.length; index += 1) {
            if (!node || typeof node !== "object") return "";
            node = node[parts[index]];
        }
        return typeof node === "string" ? node : "";
    }

    function locale() {
        return window.SFMLI18n?.current || "de";
    }

    function formatNumber(value, digits) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "";
        return new Intl.NumberFormat(locale(), {
            maximumFractionDigits: digits,
            minimumFractionDigits: digits,
        }).format(number);
    }

    function formatMeasure(value, digits, unit) {
        const formatted = formatNumber(value, digits);
        if (!formatted) return "";
        return unit ? `${formatted} ${unit}` : formatted;
    }

    function formatSigned(value, unit) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "";
        const formatted = new Intl.NumberFormat(locale(), {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
            signDisplay: "exceptZero",
        }).format(number);
        return unit ? `${formatted} ${unit}` : formatted;
    }

    function formatShare(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "";
        return new Intl.NumberFormat(locale(), {
            style: "percent",
            maximumFractionDigits: 0,
        }).format(number);
    }

    function formatClock(iso) {
        const when = new Date(iso);
        if (Number.isNaN(when.getTime())) return "";
        return new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(when);
    }

    function ago(iso) {
        const then = Date.parse(iso);
        if (!Number.isFinite(then)) return "";
        const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
        if (minutes < 1) return text("justNow");
        if (minutes < 60) return text("minutesAgo").replace("{n}", String(minutes));
        return text("hoursAgo").replace("{n}", String(Math.round(minutes / 60)));
    }

    function reading(device, role) {
        const item = device && device.states ? device.states[role] : null;
        if (!item || item.value == null || item.value === "") return null;
        return item;
    }

    function finitePoints(points) {
        if (!Array.isArray(points)) return [];
        return points.filter((point) => Number.isFinite(Number(point && point.v)) && point.t);
    }

    function pathFrom(points) {
        const rows = finitePoints(points);
        if (rows.length < 2) return "";
        const times = rows.map((point) => Date.parse(point.t));
        const values = rows.map((point) => Number(point.v));
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (max - min < 1) {
            min -= 1;
            max += 1;
        }
        const start = Math.min(...times);
        const span = Math.max(1, Math.max(...times) - start);
        const width = 240;
        const height = 48;
        return rows.map((point, indexPoint) => {
            const time = times[indexPoint];
            const x = Number.isNaN(time) ? (indexPoint / (rows.length - 1)) * width : ((time - start) / span) * width;
            const y = 4 + (1 - (Number(point.v) - min) / (max - min)) * (height - 8);
            return `${indexPoint === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ");
    }

    function hasThermal(device) {
        const thermal = device.thermal;
        return Boolean(thermal) && (thermal.ambient_c != null || (Array.isArray(thermal.mppt) && thermal.mppt.length > 0));
    }

    function thermalSource(device, index) {
        const row = thermalRow(device, index);
        return row && (row.source === "derived" || row.source === "estimated") ? row.source : "measured";
    }

    function moduleLabel(source) {
        if (source === "derived") return text("moduleDerived");
        if (source === "estimated") return text("moduleEstimated");
        return text("module");
    }

    function thermalValue(device, index, key, unit) {
        const row = thermalRow(device, index);
        return row && row[key] != null ? formatMeasure(row[key], 1, unit) : "–";
    }

    function thermalRow(device, index) {
        const rows = device.thermal && device.thermal.mppt;
        if (!Array.isArray(rows)) return null;
        return rows.find((row) => row.index === index) || null;
    }



    function niceRange(values, zero) {
        let min = Math.min(...values);
        let max = Math.max(...values);
        if (zero) min = Math.min(0, min);
        if (max - min < 1e-9) {
            max += 1;
            if (!zero) min -= 1;
        }
        const raw = (max - min) / 4;
        const base = 10 ** Math.floor(Math.log10(raw));
        const fraction = raw / base;
        const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * base;
        const low = Math.floor(min / step + 1e-9) * step;
        const high = Math.ceil(max / step - 1e-9) * step;
        const ticks = [];
        for (let value = high; value >= low - step / 2; value -= step) ticks.push(value);
        return { min: low, max: high > low ? high : low + step, step, ticks };
    }

    const CROP_PAD = 20 * 60 * 1000;

    // Keeps the span where a series carries values (above 2 % of its peak), plus padding.
    function activeWindow(rows) {
        const values = rows.filter((point) => Number.isFinite(point.v));
        if (!values.length) return null;
        const peak = Math.max(...values.map((point) => Math.abs(point.v)));
        const active = values.filter((point) => Math.abs(point.v) > peak * 0.02);
        if (!active.length) return null;
        return { start: active[0].t - CROP_PAD, end: active[active.length - 1].t + CROP_PAD };
    }

    // Line chart with a value scale fitted to the data and hour ticks. Points are joined
    // across recorder gaps; with crop the time axis covers only the span with values.
    function lineChart(seriesList, unit, zero, crop = false) {
        const width = 640;
        const height = 200;
        let prepared = seriesList.map((series) => ({
            key: series.key,
            rows: (series.points || [])
                .map((point) => ({ t: Date.parse(point.t), v: point.v == null ? null : Number(point.v) }))
                .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v))
                .sort((a, b) => a.t - b.t),
        }));
        if (crop) {
            const windows = prepared.map((series) => activeWindow(series.rows)).filter(Boolean);
            if (windows.length) {
                const from = Math.min(...windows.map((item) => item.start));
                const to = Math.max(...windows.map((item) => item.end));
                prepared = prepared.map((series) => ({
                    key: series.key,
                    rows: series.rows.filter((point) => point.t >= from && point.t <= to),
                }));
            }
        }
        const finite = prepared.flatMap((series) => series.rows);
        if (finite.length < 2) return null;
        const times = finite.map((point) => point.t);
        const start = Math.min(...times);
        const end = Math.max(...times);
        const span = Math.max(1, end - start);
        const range = niceRange(finite.map((point) => point.v), zero);
        const xOf = (time) => ((time - start) / span) * width;
        const yOf = (value) => (1 - (value - range.min) / (range.max - range.min)) * height;
        const paths = {};
        prepared.forEach((series) => {
            paths[series.key] = series.rows
                .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(point.t).toFixed(1)} ${yOf(point.v).toFixed(1)}`)
                .join(" ");
        });
        const digits = range.step >= 1 ? 0 : range.step >= 0.1 ? 1 : 2;
        const yTicks = range.ticks.map((value, index) => ({
            top: `${((range.max - value) / (range.max - range.min)) * 100}%`,
            y: yOf(value),
            label: index === 0 ? `${formatNumber(value, digits)} ${unit}` : formatNumber(value, digits),
        }));
        return { paths, yTicks, xTicks: hourTicks(start, end), width, height };
    }

    function thermalChart(device, index) {
        const thermal = device.history && device.history.thermal;
        if (!thermal) return null;
        const row = Array.isArray(thermal.mppt) ? thermal.mppt.find((item) => item.index === index) : null;
        if (finitePoints(row && row.module).length < 2) return null;
        const chart = lineChart([
            { key: "module", points: row.module },
            { key: "ambient", points: thermal.ambient },
        ], "°C", false);
        if (!chart) return null;
        chart.source = row.source === "derived" || row.source === "estimated" ? row.source : "measured";
        return chart;
    }

    function reasonText(code) {
        if (code === "learning") return text("learning");
        if (code === "curtailed") return text("curtailedReason");
        if (code === "no_ambient") return text("noAmbient");
        if (code === "no_current") return text("noCurrent");
        return "";
    }

    function compareRows(device) {
        const thermal = device.history && device.history.thermal;
        const rows = thermal && thermal.compare;
        return Array.isArray(rows) ? rows : [];
    }

    function compareGeometry(device) {
        const rows = compareRows(device);
        if (rows.length < 2) return null;
        const pick = (key) => rows.map((row) => ({ t: row.t, v: row[key] }));
        return lineChart([
            { key: "measured", points: pick("measured_c") },
            { key: "faiman", points: pick("faiman_c") },
        ], "°C", false);
    }

    function channelStats(device, channel) {
        const rows = device.history && device.history.mppt;
        if (!Array.isArray(rows)) return null;
        return rows.find((item) => item.index === channel.index) || null;
    }

    function rangeText(block, digits, unit) {
        if (!block || block.min == null || block.max == null) return "";
        return `${formatMeasure(block.min, digits, unit)} – ${formatMeasure(block.max, digits, unit)}`;
    }

    function sourceLine(device) {
        const sources = device && device.sources;
        if (!sources) return "";
        const parts = [];
        if (sources.measure) parts.push(`${text("measure")} ${ago(sources.measure)}`);
        if (sources.cloud) parts.push(`${text("cloud")} ${ago(sources.cloud)}`);
        return parts.join(" · ");
    }


    function hourTicks(start, end) {
        const span = Math.max(1, end - start);
        const hours = span / 3600000;
        const step = [1, 2, 3, 4, 6].find((candidate) => hours / candidate <= 6) || 6;
        const format = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
        const ticks = [];
        const cursor = new Date(start);
        cursor.setMinutes(0, 0, 0);
        if (cursor.getTime() < start) cursor.setHours(cursor.getHours() + 1);
        while (cursor.getTime() <= end + 1000 && ticks.length < 12) {
            if (cursor.getHours() % step === 0) {
                const pct = ((cursor.getTime() - start) / span) * 100;
                if (pct >= -1 && pct <= 101) {
                    const clamped = Math.min(100, Math.max(0, pct));
                    ticks.push({
                        left: `${clamped.toFixed(2)}%`,
                        label: format.format(cursor),
                        align: clamped < 8 ? "start" : clamped > 92 ? "end" : "middle",
                    });
                }
            }
            cursor.setHours(cursor.getHours() + 1);
        }
        return ticks;
    }

    function dayGeometry(device) {
        const day = device.history && device.history.day;
        const power = day && day.power;
        if (!Array.isArray(power) || power.length < 2) return null;
        const width = 640;
        const height = 220;
        let peak = 0;
        const all = power.map((point) => {
            const levels = MPPT_KEYS.map((key) => {
                const value = Number(point[key]);
                return Number.isFinite(value) && value > 0 ? value : 0;
            });
            const gap = MPPT_KEYS.every((key) => point[key] == null);
            if (!gap) peak = Math.max(peak, levels.reduce((sum, value) => sum + value, 0));
            return { t: Date.parse(point.t), gap, levels };
        }).filter((row) => Number.isFinite(row.t));
        // the axis starts when production starts, not at midnight
        const producing = all.filter((row) => !row.gap && row.levels.some((value) => value > 0));
        const rows = producing.length
            ? all.filter((row) => row.t >= producing[0].t - CROP_PAD && row.t <= producing[producing.length - 1].t + CROP_PAD)
            : all;
        const times = rows.map((row) => row.t);
        if (times.length < 2) return null;
        const start = Math.min(...times);
        const span = Math.max(1, Math.max(...times) - start);
        const range = niceRange([0, peak > 0 ? peak : 1], true);
        const max = range.max;
        const xOf = (time) => ((time - start) / span) * width;
        const yOf = (value) => (1 - value / max) * height;
        const areas = [0, 1, 2, 3].map((series) => {
            const paths = [];
            let chunk = [];
            const flush = () => {
                if (chunk.length < 2) {
                    chunk = [];
                    return;
                }
                const top = chunk.map((row, indexPoint) => {
                    const below = row.levels.slice(0, series).reduce((sum, value) => sum + value, 0);
                    const command = indexPoint === 0 ? "M" : "L";
                    return `${command}${xOf(row.t).toFixed(1)} ${yOf(below + row.levels[series]).toFixed(1)}`;
                }).join(" ");
                const bottom = chunk.slice().reverse().map((row) => {
                    const below = row.levels.slice(0, series).reduce((sum, value) => sum + value, 0);
                    return `L${xOf(row.t).toFixed(1)} ${yOf(below).toFixed(1)}`;
                }).join(" ");
                paths.push(`${top} ${bottom} Z`);
                chunk = [];
            };
            rows.forEach((row) => {
                if (row.gap) return;
                if (row.levels[series] <= 0) flush();
                else chunk.push(row);
            });
            flush();
            return paths.join(" ");
        });
        const drawn = areas.map((path, index) => ({ index: index + 1, d: path })).filter((area) => area.d);
        if (!drawn.length) return null;
        const end = Math.max(...times);
        const yTicks = range.ticks.map((value, index) => ({
            top: `${((max - value) / max) * 100}%`,
            y: (1 - value / max) * height,
            label: index === 0 ? `${formatNumber(value, 0)} W` : formatNumber(value, 0),
        }));
        return {
            areas: drawn,
            series: drawn.map((area) => area.index),
            yTicks,
            xTicks: hourTicks(start, end),
            width,
            height,
        };
    }

    window.SinvPage = {
        template: `
            <section class="sinv-page">
                <nav class="sinv-tabs" role="tablist" :aria-label="text('tabsLabel')" @keydown="onMapTabKey">
                    <button id="sinv-tab-live" type="button" role="tab" :aria-selected="pageTab === 'live' ? 'true' : 'false'" aria-controls="sinv-panel-live" :tabindex="pageTab === 'live' ? 0 : -1" :class="{ active: pageTab === 'live' }" @click="selectTab('live')">{{ text('tabLive') }}</button>
                    <button v-if="hpInstalled" id="sinv-tab-heatpump" type="button" role="tab" :aria-selected="pageTab === 'heatpump' ? 'true' : 'false'" aria-controls="sinv-panel-heatpump" :tabindex="pageTab === 'heatpump' ? 0 : -1" :class="{ active: pageTab === 'heatpump' }" @click="selectTab('heatpump')">{{ text('tabHeatPump') }}</button>
                    <button id="sinv-tab-mapping" type="button" role="tab" :aria-selected="pageTab === 'mapping' ? 'true' : 'false'" aria-controls="sinv-panel-mapping" :tabindex="pageTab === 'mapping' ? 0 : -1" :class="{ active: pageTab === 'mapping' }" @click="selectTab('mapping')">{{ text('tabMapping') }}</button>
                </nav>
                <div id="sinv-panel-live" v-show="pageTab === 'live'" role="tabpanel" aria-labelledby="sinv-tab-live">
                <div v-if="loading" class="sinv-state" role="status">{{ text('loading') }}</div>
                <div v-else-if="error" class="sinv-state" role="alert">
                    <strong>{{ text('error') }}</strong>
                    <button type="button" class="button secondary" @click="reload">{{ text('retry') }}</button>
                </div>
                <div v-else-if="!live || live.feature_enabled === false" class="sinv-state" role="status">
                    <strong>{{ text('disabledTitle') }}</strong>
                    <span>{{ text('disabledText') }}</span>
                </div>
                <div v-else-if="!devices.length" class="sinv-state" role="status">
                    <strong>{{ text('emptyTitle') }}</strong>
                    <span>{{ text('emptyText') }}</span>
                </div>
                <template v-else>
                <article v-for="device in devices" :key="device.device_id" class="sinv-device">
                    <header class="sinv-device-head">
                        <div>
                            <h2>{{ device.name }}</h2>
                            <p v-if="device.model">{{ device.model }}</p>
                            <p v-if="sourceLine(device)" class="sinv-fresh">{{ sourceLine(device) }}</p>
                        </div>
                        <span v-if="device.curtailed === true" class="sinv-chip" role="status">{{ text('curtailed') }}</span>
                    </header>
                    <template v-if="device.kind === 'meter'">
                        <div class="sinv-pair">
                            <article v-if="reading(device, 'grid_to_home_power') || meterPath(device, 'grid_to_home_power')" class="sinv-card">
                                <h3>{{ text('meterImport') }}</h3>
                                <p v-if="reading(device, 'grid_to_home_power')" class="sinv-total">
                                    <strong>{{ formatMeasure(reading(device, 'grid_to_home_power').value, 0, reading(device, 'grid_to_home_power').unit || 'W') }}</strong>
                                </p>
                                <div v-if="meterChart(device, 'grid_to_home_power')" class="sinv-chart sinv-line-chart">
                                    <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'grid_to_home_power').yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                    <svg class="sinv-day" :viewBox="'0 0 ' + meterChart(device, 'grid_to_home_power').width + ' ' + meterChart(device, 'grid_to_home_power').height" role="img" :aria-label="text('spark')">
                                        <line v-for="(tick, tickIndex) in meterChart(device, 'grid_to_home_power').yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="meterChart(device, 'grid_to_home_power').width" :y1="tick.y" :y2="tick.y"></line>
                                        <path class="sinv-line-spark" :d="meterChart(device, 'grid_to_home_power').paths.value"></path>
                                    </svg>
                                    <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'grid_to_home_power').xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                </div>
                            </article>
                            <article v-if="reading(device, 'photovoltaic_to_grid_power') || meterPath(device, 'photovoltaic_to_grid_power')" class="sinv-card">
                                <h3>{{ text('meterExport') }}</h3>
                                <p v-if="reading(device, 'photovoltaic_to_grid_power')" class="sinv-total">
                                    <strong>{{ formatMeasure(reading(device, 'photovoltaic_to_grid_power').value, 0, reading(device, 'photovoltaic_to_grid_power').unit || 'W') }}</strong>
                                </p>
                                <div v-if="meterChart(device, 'photovoltaic_to_grid_power')" class="sinv-chart sinv-line-chart">
                                    <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'photovoltaic_to_grid_power').yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                    <svg class="sinv-day" :viewBox="'0 0 ' + meterChart(device, 'photovoltaic_to_grid_power').width + ' ' + meterChart(device, 'photovoltaic_to_grid_power').height" role="img" :aria-label="text('spark')">
                                        <line v-for="(tick, tickIndex) in meterChart(device, 'photovoltaic_to_grid_power').yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="meterChart(device, 'photovoltaic_to_grid_power').width" :y1="tick.y" :y2="tick.y"></line>
                                        <path class="sinv-line-spark" :d="meterChart(device, 'photovoltaic_to_grid_power').paths.value"></path>
                                    </svg>
                                    <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in meterChart(device, 'photovoltaic_to_grid_power').xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                </div>
                            </article>
                        </div>
                    </template>
                    <template v-else>
                    <p v-if="device.pv_total_w != null" class="sinv-total">
                        <span>{{ text('pvTotal') }}</span>
                        <strong>{{ formatMeasure(device.pv_total_w, 0, 'W') }}</strong>
                        <span v-if="device.anker_total_w != null" class="sinv-anker">· {{ text('anker') }}: {{ formatMeasure(device.anker_total_w, 0, 'W') }}</span>
                    </p>
                    <p v-for="notice in (device.thermal && device.thermal.notices) || []" :key="notice.kind + '-' + (notice.index || 0) + '-' + notice.entity_id" class="sinv-notice">{{ text('unitNotice').replace('{id}', notice.entity_id).replace('{unit}', notice.unit || '–') }}</p>
                    <div v-if="visibleMppt(device).length" class="sinv-mppts">
                        <article v-for="channel in visibleMppt(device)" :key="channel.index" class="sinv-card sinv-mppt-row">
                            <div class="sinv-mppt-side">
                                <header class="sinv-mppt-head">
                                    <h3>{{ text('mppt') }} {{ channel.index }}</h3>
                                    <span v-if="channel.power_w != null" class="sinv-mppt-power">
                                        <strong>{{ formatMeasure(channel.power_w, 0, 'W') }}</strong>
                                        <span v-if="channel.share != null">· {{ formatShare(channel.share) }}</span>
                                    </span>
                                </header>
                                <svg class="sinv-panel-art" viewBox="0 0 240 120" role="presentation" aria-hidden="true">
                                    <polygon class="sinv-panel-shadow" points="22,112 196,112 230,92 60,92"></polygon>
                                    <polygon class="sinv-panel-frame" points="40,14 196,10 226,96 18,104"></polygon>
                                    <polygon class="sinv-panel-glass" points="45,19 192,15 220,92 25,99"></polygon>
                                    <path class="sinv-panel-grid" d="M80,18 L71,97 M118,17 L117,96 M155,16 L163,94 M42,38 L199,34 M37,58 L206,54 M31,78 L213,73"></path>
                                </svg>
                                <div class="sinv-tiles">
                                    <div class="sinv-tile">
                                        <svg class="sinv-tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 L5 13 h6 l-1 9 l8 -12 h-6 z"></path></svg>
                                        <span class="sinv-tile-label">{{ text('voltage') }}</span>
                                        <strong class="sinv-tile-value">{{ channel.voltage_v != null ? formatMeasure(channel.voltage_v, 1, 'V') : '–' }}</strong>
                                    </div>
                                    <div class="sinv-tile">
                                        <svg class="sinv-tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8 q2.25 -3 4.5 0 t4.5 0 t4.5 0 t4.5 0 M3 13 q2.25 -3 4.5 0 t4.5 0 t4.5 0 t4.5 0 M4 19 h16"></path></svg>
                                        <span class="sinv-tile-label">{{ text('current') }}</span>
                                        <strong class="sinv-tile-value">{{ channel.current_a != null ? formatMeasure(channel.current_a, 1, 'A') : '–' }}</strong>
                                    </div>
                                    <div class="sinv-tile" :class="{ 'sinv-derived': hasThermal(device) && thermalSource(device, channel.index) !== 'measured' }">
                                        <svg class="sinv-tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4 a2 2 0 0 1 4 0 v9.5 a4 4 0 1 1 -4 0 z M12 10 v6 M16 6 h3 M16 9 h2 M16 12 h3"></path></svg>
                                        <span class="sinv-tile-label">{{ hasThermal(device) ? moduleLabel(thermalSource(device, channel.index)) : text('temperature') }}</span>
                                        <strong class="sinv-tile-value">{{ hasThermal(device) ? thermalValue(device, channel.index, 'module_c', '°C') : '–' }}</strong>
                                    </div>
                                </div>
                                <p v-if="hasThermal(device)" class="sinv-tile-foot">
                                    <span>{{ text('outdoor') }} {{ device.thermal.ambient_c != null ? formatMeasure(device.thermal.ambient_c, 1, '°C') : '–' }}</span>
                                    <span>· {{ text('delta') }} {{ thermalValue(device, channel.index, 'delta_c', 'K') }}</span>
                                    <span v-if="channel.anker_w != null">· {{ text('anker') }} {{ formatMeasure(channel.anker_w, 0, 'W') }}</span>
                                </p>
                                <p v-else-if="channel.anker_w != null" class="sinv-tile-foot">{{ text('anker') }} {{ formatMeasure(channel.anker_w, 0, 'W') }}</p>
                                <p v-if="thermalRow(device, channel.index) && thermalRow(device, channel.index).reason" class="sinv-hint">{{ reasonText(thermalRow(device, channel.index).reason) }}</p>
                                <section v-if="daySummary(device, channel).length" class="sinv-day-summary">
                                    <h4>{{ text('today') }}</h4>
                                    <dl>
                                        <div v-for="item in daySummary(device, channel)" :key="item.key">
                                            <dt>{{ item.label }}</dt>
                                            <dd>{{ item.value }} <small v-if="item.note">{{ item.note }}</small></dd>
                                        </div>
                                    </dl>
                                </section>
                            </div>
                            <div class="sinv-mppt-charts">
                                <section class="sinv-chart-block">
                                    <div class="sinv-chart-head">
                                        <span>{{ text('spark') }}</span>
                                        <div class="sinv-trace" role="group" :aria-label="text('spark')">
                                            <button type="button" :class="{ active: traceMode(device, channel) === 'v' }" @click="setTrace(device, channel, 'v')">V</button>
                                            <button type="button" :class="{ active: traceMode(device, channel) === 'a' }" @click="setTrace(device, channel, 'a')">A</button>
                                            <button type="button" :class="{ active: traceMode(device, channel) === 'w' }" @click="setTrace(device, channel, 'w')">W</button>
                                        </div>
                                    </div>
                                    <template v-if="sparkChart(device, channel)">
                                    <div class="sinv-chart sinv-line-chart">
                                        <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in sparkChart(device, channel).yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                        <svg class="sinv-day" :viewBox="'0 0 ' + sparkChart(device, channel).width + ' ' + sparkChart(device, channel).height" role="img" :aria-label="text('spark')">
                                            <line v-for="(tick, tickIndex) in sparkChart(device, channel).yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="sparkChart(device, channel).width" :y1="tick.y" :y2="tick.y"></line>
                                            <path class="sinv-line-spark" :d="sparkChart(device, channel).paths.value"></path>
                                        </svg>
                                        <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in sparkChart(device, channel).xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                    </div>
                                    </template>
                                </section>
                                <section v-if="thermalChart(device, channel.index)" class="sinv-chart-block">
                                    <div class="sinv-chart-head"><span>{{ text('thermal') }}</span></div>
                                    <div class="sinv-chart sinv-line-chart">
                                        <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in thermalChart(device, channel.index).yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                        <svg class="sinv-day" :viewBox="'0 0 ' + thermalChart(device, channel.index).width + ' ' + thermalChart(device, channel.index).height" role="img" :aria-label="text('thermal')">
                                            <line v-for="(tick, tickIndex) in thermalChart(device, channel.index).yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="thermalChart(device, channel.index).width" :y1="tick.y" :y2="tick.y"></line>
                                            <path class="sinv-line-ambient" :d="thermalChart(device, channel.index).paths.ambient"></path>
                                            <path :class="thermalChart(device, channel.index).source !== 'measured' ? 'sinv-line-derived' : 'sinv-line-module'" :d="thermalChart(device, channel.index).paths.module"></path>
                                        </svg>
                                        <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in thermalChart(device, channel.index).xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                    </div>
                                    <ul class="sinv-legend sinv-thermal-legend">
                                        <li><i :class="thermalChart(device, channel.index).source !== 'measured' ? 'sinv-swatch sinv-swatch-derived' : 'sinv-swatch sinv-swatch-1'"></i>{{ moduleLabel(thermalChart(device, channel.index).source) }}</li>
                                        <li v-if="thermalChart(device, channel.index).paths.ambient"><i class="sinv-swatch sinv-swatch-ambient"></i>{{ text('outdoor') }}</li>
                                    </ul>
                                    <p v-if="thermalChart(device, channel.index).source === 'estimated' && calibrationText(device)" class="sinv-hint">{{ calibrationText(device) }}</p>
                                </section>
                            </div>
                        </article>
                    </div>
                    <article v-if="device.dayView" class="sinv-card sinv-day-card">
                        <h3>{{ text('dayChart') }} <span>{{ text('sinceMidnight') }}</span></h3>
                        <div class="sinv-chart">
                            <div class="sinv-y-axis">
                                <span v-for="(tick, tickIndex) in device.dayView.yTicks" :key="'y-' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span>
                            </div>
                            <svg class="sinv-day" viewBox="0 0 640 220" role="img" :aria-label="text('dayChart')">
                                <line v-for="(tick, tickIndex) in device.dayView.yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" x2="640" :y1="tick.y" :y2="tick.y"></line>
                                <path v-for="area in device.dayView.areas" :key="'area-' + area.index" :class="'sinv-area sinv-area-' + area.index" :d="area.d"></path>
                                <line class="sinv-axis" x1="0" y1="219.5" x2="640" y2="219.5"></line>
                            </svg>
                            <div class="sinv-x-axis">
                                <span v-for="(tick, tickIndex) in device.dayView.xTicks" :key="'x-' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span>
                            </div>
                        </div>
                        <ul class="sinv-legend">
                            <li v-for="index in device.dayView.series" :key="index"><i :class="'sinv-swatch sinv-swatch-' + index"></i>{{ text('mppt') }} {{ index }}</li>
                        </ul>
                    </article>
                    <article v-if="showPremium(device)" class="sinv-card sinv-day-card">
                        <h3>{{ text('compare') }}</h3>
                        <div v-if="!premiumOn" class="sinv-state" role="status">
                            <strong>{{ text('premiumTitle') }}</strong>
                            <span>{{ text('premiumText') }}</span>
                        </div>
                        <template v-else-if="compareGeometry(device)">
                            <div class="sinv-chart sinv-line-chart">
                                        <div class="sinv-y-axis"><span v-for="(tick, tickIndex) in compareGeometry(device).yTicks" :key="'y' + tickIndex" :style="{ top: tick.top }">{{ tick.label }}</span></div>
                                        <svg class="sinv-day" :viewBox="'0 0 ' + compareGeometry(device).width + ' ' + compareGeometry(device).height" role="img" :aria-label="text('compare')">
                                            <line v-for="(tick, tickIndex) in compareGeometry(device).yTicks" :key="'g' + tickIndex" class="sinv-gridline" x1="0" :x2="compareGeometry(device).width" :y1="tick.y" :y2="tick.y"></line>
                                            <path class="sinv-line-module" :d="compareGeometry(device).paths.measured"></path>
                                            <path class="sinv-line-faiman" :d="compareGeometry(device).paths.faiman"></path>
                                        </svg>
                                        <div class="sinv-x-axis"><span v-for="(tick, tickIndex) in compareGeometry(device).xTicks" :key="'x' + tickIndex" :data-align="tick.align" :style="{ left: tick.left }">{{ tick.label }}</span></div>
                                    </div>
                            <ul class="sinv-legend">
                                <li><i class="sinv-swatch sinv-swatch-1"></i>{{ text('measured') }}</li>
                                <li><i class="sinv-swatch sinv-swatch-2"></i>{{ text('faiman') }}</li>
                            </ul>
                            <p v-if="calibrationText(device)" class="sinv-hint">{{ calibrationText(device) }}</p>
                        </template>
                    </article>
                    <div class="sinv-pair">
                        <article v-if="showGrid(device)" class="sinv-card">
                            <h3>{{ text('grid') }}</h3>
                            <dl class="sinv-metrics">
                                <div v-if="reading(device, 'ac_voltage')">
                                    <dt>{{ text('voltage') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'ac_voltage').value, 1, reading(device, 'ac_voltage').unit || 'V') }}</dd>
                                </div>
                                <div v-if="reading(device, 'ac_frequency')">
                                    <dt>{{ text('frequency') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'ac_frequency').value, 2, reading(device, 'ac_frequency').unit || 'Hz') }}</dd>
                                </div>
                            </dl>
                            <p v-if="rangeText(extrema(device, 'ac_voltage'), 1, 'V')" class="sinv-range">
                                {{ text('dayRange') }}
                                <strong>{{ rangeText(extrema(device, 'ac_voltage'), 1, 'V') }}</strong>
                            </p>
                            <p v-if="rangeText(extrema(device, 'ac_frequency'), 2, 'Hz')" class="sinv-range">
                                {{ text('dayRange') }}
                                <strong>{{ rangeText(extrema(device, 'ac_frequency'), 2, 'Hz') }}</strong>
                            </p>
                        </article>
                        <article v-if="showBattery(device)" class="sinv-card">
                            <h3>{{ text('battery') }}</h3>
                            <dl class="sinv-metrics">
                                <div v-if="reading(device, 'state_of_charge')">
                                    <dt>{{ text('soc') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'state_of_charge').value, 0, reading(device, 'state_of_charge').unit || '%') }}</dd>
                                </div>
                                <div v-if="device.battery && device.battery.main_soc != null">
                                    <dt>{{ text('mainBattery') }}</dt>
                                    <dd>{{ formatMeasure(device.battery.main_soc, 0, '%') }}</dd>
                                </div>
                                <div v-if="reading(device, 'battery_power_signed')">
                                    <dt>{{ text('power') }}</dt>
                                    <dd>{{ formatSigned(reading(device, 'battery_power_signed').value, reading(device, 'battery_power_signed').unit || 'W') }}</dd>
                                </div>
                                <div v-if="device.battery && device.battery.charge_w != null">
                                    <dt>{{ text('charge') }}</dt>
                                    <dd>{{ formatMeasure(device.battery.charge_w, 0, 'W') }}</dd>
                                </div>
                                <div v-if="device.battery && device.battery.discharge_w != null">
                                    <dt>{{ text('discharge') }}</dt>
                                    <dd>{{ formatMeasure(device.battery.discharge_w, 0, 'W') }}</dd>
                                </div>
                                <div v-if="reading(device, 'temperature')">
                                    <dt>{{ text('temperature') }}</dt>
                                    <dd>{{ formatMeasure(reading(device, 'temperature').value, 1, reading(device, 'temperature').unit || '°C') }}</dd>
                                </div>
                            </dl>
                            <ul v-if="device.battery && device.battery.packs && device.battery.packs.length" class="sinv-packs">
                                <li v-for="pack in device.battery.packs" :key="pack.id">
                                    <strong>{{ pack.id === 'main' ? text('mainBattery') : text('expansion') + ' ' + pack.id }}</strong>
                                    <span v-if="pack.soh != null">{{ text('soh') }} {{ formatMeasure(pack.soh, 0, '%') }}</span>
                                    <span v-if="pack.cells_v && pack.cells_v.length" class="sinv-cells">{{ text('cells') }} {{ cellList(pack.cells_v) }}</span>
                                </li>
                            </ul>
                            <ul v-if="device.expansions && device.expansions.length" class="sinv-packs">
                                <li v-for="pack in device.expansions" :key="'exp-' + pack.index">
                                    <strong>{{ text('expansion') }} {{ pack.index }}</strong>
                                    <span v-if="pack.soc != null">{{ formatMeasure(pack.soc, 0, '%') }}</span>
                                    <span v-if="pack.temperature_c != null">{{ formatMeasure(pack.temperature_c, 1, '°C') }}</span>
                                </li>
                            </ul>
                        </article>
                    </div>
                    </template>
                </article>
                </template>
                </div>
                <div v-if="hpInstalled" id="sinv-panel-heatpump" v-show="pageTab === 'heatpump'" role="tabpanel" aria-labelledby="sinv-tab-heatpump">
                    <article class="sinv-card">
                        <h3>{{ text('tabHeatPump') }}</h3>
                        <div class="sinv-pair">
                            <div v-for="reading in hpReadings" :key="reading.role" class="sinv-card">
                                <span>{{ text(reading.role) }}</span>
                                <strong>{{ hpValue(reading) }}</strong>
                                <small v-if="reading.derived" class="sinv-fresh">{{ text('hpDerived') }}</small>
                            </div>
                        </div>
                    </article>
                </div>
                <div id="sinv-panel-mapping" v-show="pageTab === 'mapping'" role="tabpanel" aria-labelledby="sinv-tab-mapping">
                    <div v-if="mapLoading" class="sinv-state" role="status">{{ text('mapLoading') }}</div>
                    <div v-else-if="mapError" class="sinv-state" role="alert">
                        <strong>{{ text('mapError') }}</strong>
                        <button type="button" class="button secondary" @click="reloadMapping">{{ text('retry') }}</button>
                    </div>
                    <div v-else-if="mapForbidden" class="sinv-state" role="status">
                        <strong>{{ text('mapAdmin') }}</strong>
                    </div>
                    <div v-else-if="!mapping || mapping.sinv_installed === false" class="sinv-state" role="status">
                        <strong>{{ text('mapAbsent') }}</strong>
                    </div>
                    <div v-else-if="!mapTargets.length" class="sinv-state" role="status">
                        <span>{{ text('mapEmpty') }}</span>
                    </div>
                    <div v-else class="sinv-map-stack">
                        <p v-if="mapNotice && !noticeTarget" class="sinv-hint" role="status">{{ mapNotice }}</p>
                        <article v-for="target in mapTargets" :key="target.id" class="sinv-card sinv-map-target">
                            <h3>{{ targetTitle(target) }}</h3>
                            <p v-if="targetBlocked(target)" class="sinv-hint">{{ target.read_error ? text('targetError') : text('targetAbsent') }}</p>
                            <p v-else-if="!visibleRows(target).length" class="sinv-hint">{{ text('mapEmpty') }}</p>
                            <div v-else class="sinv-table-wrap">
                                <table class="sinv-map-table">
                                    <thead>
                                        <tr>
                                            <th v-if="canWrite(target)" scope="col"><span class="sinv-visually-hidden">{{ text('selectRow') }}</span></th>
                                            <th scope="col">{{ text('colField') }}</th>
                                            <th scope="col">{{ text('colCurrent') }}</th>
                                            <th scope="col">{{ text('colSinv') }}</th>
                                            <th scope="col">{{ text('colAction') }}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(row, rowIndex) in visibleRows(target)" :key="row.field_id || rowIndex">
                                            <td v-if="canWrite(target)">
                                                <input v-if="canPick(target, row)" class="sinv-map-check" type="checkbox" :checked="isPicked(row)" :disabled="mapBusy" :aria-label="text('selectRow')" @change="togglePick(row)">
                                                <small v-else-if="row.options_pending === true" class="sinv-map-note">{{ text('statsOptionsPending') }}</small>
                                            </td>
                                            <td>
                                                <span>{{ fieldLabel(target, row) }}</span>
                                                <small v-if="row.flow_path === 'config_reconfigure'" class="sinv-map-note">{{ text('setupOnly') }}</small>
                                                <small v-if="batteryAddMate(target, row)" class="sinv-map-note">{{ text('batteryPair') }}</small>
                                                <small v-if="sfmlMate(target, row)" class="sinv-map-note">{{ text('sfmlPair') }}</small>
                                                <small v-if="sfmlBatteryHint(target, row)" class="sinv-map-note">{{ text('sfmlBattery') }}</small>
                                                <small v-if="gpmChargeHint(target, row)" class="sinv-map-note">{{ text('gpmGridCharge') }}</small>
                                            </td>
                                            <td>{{ sensorText(row.current) }}</td>
                                            <td>
                                                <span>{{ sensorText(row.sinv_entity_id) }}</span>
                                                <small v-if="row.sinv_derived === true" class="sinv-map-note">{{ text('derived') }}</small>
                                            </td>
                                            <td>
                                                <span class="sinv-map-status" :data-status="statusKind(row)">{{ actionLabel(row) }}</span>
                                                <small v-if="row.action === 'conflict' && row.conflict_reason" class="sinv-map-note">{{ reasonLabel(row) }}</small>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p v-if="target.id === 'energy' && !targetBlocked(target)" class="sinv-hint">{{ text('energyKept') }}</p>
                            <div v-if="canWrite(target) && !targetBlocked(target)" class="sinv-map-actions">
                                <p v-if="target.id === 'sfml' || target.id === 'gpm' || target.id === 'eai'" class="sinv-hint">{{ text('optionsReload') }}</p>
                                <p v-if="target.id === 'stats'" class="sinv-hint">{{ text('statsSensors') }}</p>
                                <button type="button" class="button" :disabled="!picked.length || mapBusy" @click="openConfirm(target)">{{ text('apply') }}</button>
                                <button type="button" class="button secondary" :disabled="!snapshotId || mapBusy" @click="undoMapping(target)">{{ text('undo') }}</button>
                            </div>
                            <p v-if="mapNotice && noticeTarget === target.id" class="sinv-hint" role="status">{{ mapNotice }}</p>
                            <div v-if="confirmOpen && pendingTarget && pendingTarget.id === target.id" class="sinv-dialog" role="dialog" aria-modal="true" :aria-label="text('confirmTitle')">
                                <h3>{{ text('confirmTitle') }}</h3>
                                <p>{{ text('confirmBody') }}</p>
                                <p v-if="pendingTarget && pendingTarget.id === 'sfml'">{{ text('sfmlBattery') }}</p>
                                <p v-if="pendingTarget && pendingTarget.id === 'gpm'">{{ text('gpmGridCharge') }}</p>
                                <p v-if="pendingTarget && pendingTarget.id === 'eai'">{{ text('eaiKeep') }}</p>
                                <p v-if="pendingTarget && (pendingTarget.id === 'sfml' || pendingTarget.id === 'gpm' || pendingTarget.id === 'eai')">{{ text('optionsReload') }}</p>
                                <p v-if="pendingTarget && pendingTarget.id === 'stats'">{{ text('statsSensors') }}</p>
                                <ul>
                                    <li v-for="row in pendingRows" :key="row.field_id">
                                        <span>{{ fieldLabel(pendingTarget, row) }}</span>
                                        <span>{{ sensorText(row.current) }}</span>
                                        <span>{{ sensorText(row.sinv_entity_id) }}</span>
                                    </li>
                                </ul>
                                <div class="sinv-map-actions">
                                    <button type="button" class="button" :disabled="mapBusy" @click="confirmApply">{{ text('confirmYes') }}</button>
                                    <button type="button" class="button secondary" :disabled="mapBusy" @click="closeConfirm">{{ text('confirmNo') }}</button>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>
        `,
        setup() {
            const live = Vue.ref(null);
            const history = Vue.ref(null);
            const loading = Vue.ref(true);
            const error = Vue.ref("");
            const pageTab = Vue.ref("live");
            const mapping = Vue.ref(null);
            const mapLoading = Vue.ref(false);
            const mapError = Vue.ref("");
            const mapForbidden = Vue.ref(false);
            const mapNotice = Vue.ref("");
            const noticeTarget = Vue.ref("");
            const mapBusy = Vue.ref(false);
            const picked = Vue.ref([]);
            const snapshotId = Vue.ref("");
            const confirmOpen = Vue.ref(false);
            const pendingRows = Vue.ref([]);
            const pendingTarget = Vue.ref(null);
            const hp = Vue.ref(null);
            const hpInstalled = Vue.computed(() => Boolean(hp.value && hp.value.installed === true));
            const hpReadings = Vue.computed(() => (hp.value && Array.isArray(hp.value.readings) ? hp.value.readings : []));
            let mapPending = false;
            const traces = Vue.reactive({});
            const premiumOn = Vue.computed(() => Boolean(history.value && history.value.premium === true));
            let alive = true;
            let liveTimer = null;
            let historyTimer = null;
            let livePending = false;
            let historyPending = false;

            const devices = Vue.computed(() => {
                const rows = (live.value && live.value.devices) || [];
                const byId = new Map(((history.value && history.value.devices) || []).map((device) => [device.device_id, device]));
                return rows.map((device) => {
                    const merged = { ...device, history: byId.get(device.device_id) || null };
                    return { ...merged, dayView: dayGeometry(merged) };
                });
            });

            async function read(url) {
                const payload = await SFMLApi.fetch(url, { authenticated: true, forceRefresh: true, ttl: 0 });
                if (payload && payload.success === false) {
                    const code = payload.error && payload.error.code;
                    throw new Error(code || "request_failed");
                }
                return payload && payload.data ? payload.data : payload;
            }

            async function refreshHeatPump() {
                try {
                    const body = await read("/api/sfml_stats/sinv/heatpump");
                    if (!alive) return;
                    hp.value = body;
                    if (pageTab.value === "heatpump" && !(body && body.installed === true)) pageTab.value = "live";
                } catch (_err) {
                    if (!alive) return;
                    hp.value = { installed: false, readings: [] };
                    if (pageTab.value === "heatpump") pageTab.value = "live";
                }
            }

            async function refreshLive() {
                if (livePending) return;
                livePending = true;
                try {
                    const body = await read("/api/sfml_stats/sinv/live");
                    if (!alive) return;
                    live.value = body;
                    error.value = "";
                    loading.value = false;
                } catch (_err) {
                    if (!alive) return;
                    if (!live.value) error.value = "load";
                    loading.value = false;
                } finally {
                    livePending = false;
                }
            }

            async function refreshHistory() {
                if (historyPending) return;
                historyPending = true;
                try {
                    const body = await read("/api/sfml_stats/sinv/history?hours=24");
                    if (!alive) return;
                    history.value = body;
                } catch (_err) {
                    if (!alive) return;
                } finally {
                    historyPending = false;
                }
            }

            function reload() {
                error.value = "";
                loading.value = !live.value;
                refreshLive();
                refreshHistory();
            }

            const mapTargets = Vue.computed(() => {
                const rows = mapping.value && mapping.value.targets;
                return Array.isArray(rows) ? rows : [];
            });

            async function refreshMapping() {
                if (mapPending) return;
                mapPending = true;
                if (!mapping.value) mapLoading.value = true;
                try {
                    const body = await read("/api/sfml_stats/sinv/mapping");
                    if (!alive) return;
                    if (!body || typeof body !== "object" || Array.isArray(body)) {
                        if (!mapping.value) mapError.value = "load";
                        return;
                    }
                    mapping.value = body;
                    mapError.value = "";
                    mapForbidden.value = false;
                } catch (err) {
                    if (!alive) return;
                    const message = String(err && err.message || "");
                    if (message.includes("403") || (err && err.code === "admin_required")) {
                        mapping.value = null;
                        mapError.value = "";
                        mapForbidden.value = true;
                        return;
                    }
                    if (!mapping.value) mapError.value = "load";
                } finally {
                    mapPending = false;
                    mapLoading.value = false;
                }
            }

            function mapTabs() {
                const tabs = ["live"];
                if (hpInstalled.value) tabs.push("heatpump");
                tabs.push("mapping");
                return tabs;
            }

            function selectTab(name) {
                if (mapTabs().indexOf(name) < 0) return;
                pageTab.value = name;
                if (name === "mapping" && !mapping.value && !mapError.value) refreshMapping();
            }

            function reloadMapping() {
                mapping.value = null;
                mapError.value = "";
                mapForbidden.value = false;
                refreshMapping();
            }

            function canWrite(target) {
                return Boolean(target && (target.id === "energy" || target.id === "sfml" || target.id === "gpm" || target.id === "eai" || target.id === "stats"));
            }

            function canPick(target, row) {
                return Boolean(canWrite(target) && row && row.writable === true && (row.action === "add" || row.action === "replace"));
            }

            function batteryAddMate(target, row) {
                const id = String(row && row.field_id || "");
                const match = id.match(/^(battery\.\d+)\.stat_energy_(from|to)$/);
                if (!match || !row || row.action !== "add") return null;
                const mateId = match[1] + ".stat_energy_" + (match[2] === "from" ? "to" : "from");
                const mate = targetRows(target).find((item) => item && item.field_id === mateId);
                if (!mate || mate.action !== "add") return null;
                return mate;
            }

            function sfmlMate(target, row) {
                if (!target || target.id !== "sfml" || !row) return null;
                const id = String(row.field_id || "");
                const match = id.match(/^(sfml\.\d+)\.(solar_to_battery_sensor|battery_soc_sensor)$/);
                if (!match || (row.action !== "add" && row.action !== "replace")) return null;
                const other = match[2] === "solar_to_battery_sensor" ? "battery_soc_sensor" : "solar_to_battery_sensor";
                const mate = targetRows(target).find((item) => item && item.field_id === match[1] + "." + other);
                if (!mate || (mate.action !== "add" && mate.action !== "replace")) return null;
                return mate;
            }

            function sfmlBatteryHint(target, row) {
                return Boolean(sfmlMate(target, row));
            }

            function gpmChargeHint(target, row) {
                return Boolean(target && target.id === "gpm" && row && String(row.field_id || "").endsWith(".battery_power_sensor") && canPick(target, row));
            }

            function isPicked(row) {
                return picked.value.indexOf(row && row.field_id) >= 0;
            }

            function togglePick(row) {
                const target = (mapTargets.value || []).find((item) => targetRows(item).some((candidate) => candidate && candidate.field_id === row.field_id));
                if (!canPick(target, row) || mapBusy.value) return;
                const mate = batteryAddMate(target, row) || sfmlMate(target, row);
                const ids = mate ? [row.field_id, mate.field_id] : [row.field_id];
                const next = picked.value.slice();
                const removing = next.indexOf(row.field_id) >= 0;
                ids.forEach((id) => {
                    const index = next.indexOf(id);
                    if (removing && index >= 0) next.splice(index, 1);
                    if (!removing && index < 0) next.push(id);
                });
                picked.value = next;
            }

            function openConfirm(target) {
                const rows = targetRows(target).filter((row) => isPicked(row) && canPick(target, row));
                if (!rows.length || mapBusy.value) return;
                pendingTarget.value = target;
                pendingRows.value = rows;
                confirmOpen.value = true;
            }

            function closeConfirm() {
                if (mapBusy.value) return;
                confirmOpen.value = false;
            }

            function noticeFor(err, kind) {
                const code = err && err.code;
                if (code === "plan_changed") return text("planChanged");
                if (code === "prefs_changed") return text("prefsChanged");
                if (code === "snapshot_used") return text("undoUsed");
                if (code === "incomplete_source") return text("incompleteSource");
                if (code === "missing_values") return text("missingValues");
                if (code === "flow_rejected") return text("flowRejected");
                if (code === "flow_in_progress") return text("flowOpen");
                if (code === "stats_options_pending") return text("statsOptionsPending");
                if (code === "options_mismatch") return text("optionsMismatch");
                if (code === "rollback_incomplete") {
                    const raw = err && err.body && err.body.error && err.body.error.keys;
                    const names = Array.isArray(raw) ? raw.filter((key) => typeof key === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(key)) : [];
                    return names.length ? text("rollbackIncomplete") + " " + names.join(", ") : text("rollbackIncomplete");
                }
                if (String(err && err.message || "").includes("409")) return text(kind === "undo" ? "prefsChanged" : "planChanged");
                return text(kind === "undo" ? "undoFailed" : "applyFailed");
            }

            async function confirmApply() {
                const rows = pendingRows.value.map((row) => row.field_id).filter((id) => typeof id === "string");
                const hash = mapping.value && mapping.value.plan_hash;
                const targetId = pendingTarget.value && pendingTarget.value.id;
                if (!rows.length || typeof hash !== "string" || mapBusy.value) return;
                if (targetId !== "energy" && targetId !== "sfml" && targetId !== "gpm" && targetId !== "eai" && targetId !== "stats") return;
                mapBusy.value = true;
                mapNotice.value = "";
                noticeTarget.value = targetId;
                try {
                    const response = await SFMLApi.postAuthenticated("/api/sfml_stats/sinv/mapping/apply", {
                        target: targetId,
                        rows,
                        plan_hash: hash,
                    });
                    const envelope = response && response.data ? response.data : response;
                    snapshotId.value = envelope && typeof envelope.snapshot_id === "string" ? envelope.snapshot_id : "";
                    picked.value = [];
                    pendingRows.value = [];
                    confirmOpen.value = false;
                    mapNotice.value = text("applyDone");
                    mapping.value = null;
                    await refreshMapping();
                } catch (err) {
                    mapNotice.value = noticeFor(err, "apply");
                } finally {
                    mapBusy.value = false;
                }
            }

            async function undoMapping(target) {
                if (!snapshotId.value || mapBusy.value) return;
                mapBusy.value = true;
                mapNotice.value = "";
                noticeTarget.value = target && typeof target.id === "string" ? target.id : "";
                try {
                    const response = await SFMLApi.postAuthenticated("/api/sfml_stats/sinv/mapping/undo", {
                        snapshot_id: snapshotId.value,
                    });
                    const envelope = response && response.data ? response.data : response;
                    snapshotId.value = "";
                    picked.value = [];
                    mapNotice.value = envelope && envelope.restored === "partial"
                        ? text(envelope.target === "gpm" ? "undoPartialGpm" : envelope.target === "eai" ? "undoPartialEai" : "undoPartialSfml")
                        : text("undoDone");
                    mapping.value = null;
                    await refreshMapping();
                } catch (err) {
                    mapNotice.value = noticeFor(err, "undo");
                } finally {
                    mapBusy.value = false;
                }
            }

            function onMapTabKey(event) {
                const tabs = mapTabs();
                const index = tabs.indexOf(pageTab.value);
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                const step = event.key === "ArrowRight" ? 1 : tabs.length - 1;
                selectTab(tabs[(index + step) % tabs.length]);
            }

            function hpValue(reading) {
                if (!reading) return "";
                const raw = reading.state;
                if (raw === null || raw === undefined || raw === "") return text("notSet");
                if (raw === "on") return text("hpOn");
                if (raw === "off") return text("hpOff");
                const unit = typeof reading.unit === "string" && reading.unit ? " " + reading.unit : "";
                return String(raw) + unit;
            }

            function targetRows(target) {
                return target && Array.isArray(target.rows) ? target.rows : [];
            }

            // energy rows without an S-INV role are prices, costs and names the apply keeps
            function visibleRows(target) {
                const rows = targetRows(target);
                if (!target || target.id !== "energy") return rows;
                return rows.filter((row) => row && row.sinv_role);
            }

            function targetBlocked(target) {
                return Boolean(target && (target.read_error || target.installed === false));
            }

            function targetTitle(target) {
                const names = {
                    energy: "targetEnergy",
                    sfml: "targetSfml",
                    gpm: "targetGpm",
                    eai: "targetEai",
                    wfai: "targetWfai",
                    stats: "targetStats",
                };
                const key = names[target && target.id];
                return key ? text(key) : text("targetUnknown");
            }

            function fieldLabel(target, row) {
                const parts = String(row && row.field_id || "").split(".");
                let path = "";
                if (target && target.id === "energy" && parts.length >= 3) {
                    path = ["fields", "energy", parts[0]].concat(parts.slice(2)).join(".");
                } else if (target && parts.length >= 3) {
                    path = ["fields", target.id].concat(parts.slice(2)).join(".");
                }
                const translated = path ? phrase(path) : "";
                if (translated) return translated;
                const label = row && row.label;
                if (typeof label === "string" && label && !/^[a-z0-9_]+$/.test(label)) return label;
                return text("fieldUnknown");
            }

            function sensorText(value) {
                if (value == null || value === "") return text("notSet");
                if (Array.isArray(value)) {
                    const parts = value.map((item) => (item == null ? "" : String(item))).filter(Boolean);
                    return parts.length ? parts.join(", ") : text("notSet");
                }
                if (typeof value === "number" && Number.isFinite(value)) {
                    return formatNumber(value, Number.isInteger(value) ? 0 : 2);
                }
                if (typeof value === "object") return text("notSet");
                return String(value);
            }

            function statusKind(row) {
                const action = row && row.action;
                if (action === "add" || action === "replace" || action === "keep" || action === "conflict") return action;
                return "none";
            }

            function actionLabel(row) {
                const kind = statusKind(row);
                if (kind === "add") return text("actionAdd");
                if (kind === "replace") return text("actionReplace");
                if (kind === "keep") return text("actionKeep");
                if (kind === "conflict") return text("actionConflict");
                return text("noCounterpart");
            }

            function reasonLabel(row) {
                const reasons = {
                    unit: "reasonUnit",
                    device_class: "reasonDeviceClass",
                    state_class: "reasonStateClass",
                    double_count: "reasonDouble",
                    invalid_power_unit: "reasonUnit",
                    invalid_energy_unit: "reasonUnit",
                    invalid_temperature_unit: "reasonUnit",
                    energy_today_not_daily: "reasonEnergyDaily",
                };
                const key = reasons[row && row.conflict_reason];
                return key ? text(key) : text("actionConflict");
            }

            function traceKey(device, channel) {
                return `${device.device_id}:${channel.index}`;
            }

            function traceMode(device, channel) {
                return traces[traceKey(device, channel)] || "w";
            }

            function setTrace(device, channel, mode) {
                traces[traceKey(device, channel)] = mode;
            }

            function tracePoints(device, channel) {
                const mode = traceMode(device, channel);
                const past = device.history;
                if (mode === "w") {
                    const row = channelStats(device, channel);
                    return row && row.power ? row.power : [];
                }
                const role = mode === "v" ? `pv_${channel.index}_voltage` : `pv_${channel.index}_current`;
                const series = past && past.series;
                return series && series[role] ? series[role] : [];
            }

            function sparkPath(device, channel) {
                return pathFrom(tracePoints(device, channel));
            }

            function dayMax(device, points) {
                const day = device.history && device.history.day;
                const from = day && day.start ? Date.parse(day.start) : 0;
                let best = null;
                (points || []).forEach((point) => {
                    const value = Number(point && point.v);
                    if (!Number.isFinite(value) || !(Date.parse(point.t) >= from)) return;
                    if (best == null || value > best.v) best = { v: value, t: point.t };
                });
                return best;
            }

            // Today's figures of one MPPT for the area below its tiles.
            function daySummary(device, channel) {
                const items = [];
                const row = channelStats(device, channel);
                if (row && row.energy_kwh != null) {
                    items.push({ key: "yield", label: text("yield"), value: formatMeasure(row.energy_kwh, 2, "kWh") });
                    const total = ((device.history && device.history.mppt) || [])
                        .reduce((sum, item) => sum + (Number(item.energy_kwh) > 0 ? Number(item.energy_kwh) : 0), 0);
                    if (total > 0) items.push({ key: "share", label: text("shareToday"), value: formatShare(row.energy_kwh / total) });
                }
                if (row && row.peak_w != null) {
                    items.push({
                        key: "peak",
                        label: text("peak"),
                        value: formatMeasure(row.peak_w, 0, "W"),
                        note: row.peak_at ? `${text("peakAt")} ${formatClock(row.peak_at)}` : "",
                    });
                }
                const series = (device.history && device.history.series) || {};
                const current = dayMax(device, series[`pv_${channel.index}_current`]);
                if (current) items.push({ key: "current", label: text("maxCurrent"), value: formatMeasure(current.v, 1, "A"), note: `${text("peakAt")} ${formatClock(current.t)}` });
                const voltage = dayMax(device, series[`pv_${channel.index}_voltage`]);
                if (voltage) items.push({ key: "voltage", label: text("maxVoltage"), value: formatMeasure(voltage.v, 1, "V"), note: `${text("peakAt")} ${formatClock(voltage.t)}` });
                const thermal = device.history && device.history.thermal;
                const moduleRow = thermal && Array.isArray(thermal.mppt) ? thermal.mppt.find((item) => item.index === channel.index) : null;
                const module = dayMax(device, moduleRow && moduleRow.module);
                if (module) items.push({ key: "module", label: text("maxModule"), value: formatMeasure(module.v, 1, "°C"), note: `${text("peakAt")} ${formatClock(module.t)}` });
                return items;
            }

            function calibrationText(device) {
                const thermal = device.history && device.history.thermal;
                const gain = thermal && thermal.calibration && Number(thermal.calibration.gain);
                if (!Number.isFinite(gain)) return "";
                return text("calibrated").replace("{k}", formatNumber(gain, 2));
            }

            function sparkChart(device, channel) {
                const mode = traceMode(device, channel);
                const unit = mode === "v" ? "V" : mode === "a" ? "A" : "W";
                return lineChart([{ key: "value", points: tracePoints(device, channel) }], unit, mode !== "v", true);
            }

            function meterChart(device, role) {
                const series = device.history && device.history.series;
                return lineChart([{ key: "value", points: series && series[role] ? series[role] : [] }], "W", true, true);
            }

            function meterPath(device, role) {
                const series = device.history && device.history.series;
                return pathFrom(series && series[role] ? series[role] : []);
            }

            function channelVisible(device, channel) {
                const row = channelStats(device, channel);
                return channel.voltage_v != null
                    || channel.current_a != null
                    || channel.power_w != null
                    || channel.anker_w != null
                    || sparkPath(device, channel) !== ""
                    || (row && (row.energy_kwh != null || row.peak_w != null));
            }

            function visibleMppt(device) {
                return (device.mppt || []).filter((channel) => channelVisible(device, channel));
            }

            function extrema(device, role) {
                const block = device.history && device.history.extrema;
                return block ? block[role] : null;
            }

            function showGrid(device) {
                return Boolean(reading(device, "ac_voltage") || reading(device, "ac_frequency") || rangeText(extrema(device, "ac_voltage"), 1, "V") || rangeText(extrema(device, "ac_frequency"), 2, "Hz"));
            }

            function showBattery(device) {
                const battery = device.battery || {};
                return Boolean(
                    reading(device, "state_of_charge")
                    || reading(device, "battery_power_signed")
                    || reading(device, "temperature")
                    || battery.charge_w != null
                    || battery.discharge_w != null
                    || battery.main_soc != null
                    || (battery.packs && battery.packs.length)
                    || (device.expansions && device.expansions.length)
                );
            }

            function showPremium(device) {
                const liveThermal = device.thermal || {};
                const past = device.history && device.history.thermal;
                const measured = (rows) => Array.isArray(rows) && rows.some((row) => row && row.source === "measured");
                return Boolean(measured(liveThermal.mppt) || (past && measured(past.mppt)) || (past && past.compare_ready === true));
            }

            function cellList(cells) {
                return cells.map((cell) => formatMeasure(cell, 3, "V")).filter(Boolean).join(" · ");
            }

            Vue.onMounted(() => {
                refreshLive();
                refreshHistory();
                refreshHeatPump();
                liveTimer = window.setInterval(() => {
                    refreshLive();
                    refreshHeatPump();
                }, LIVE_MS);
                historyTimer = window.setInterval(refreshHistory, HISTORY_MS);
            });
            Vue.onUnmounted(() => {
                alive = false;
                window.clearInterval(liveTimer);
                window.clearInterval(historyTimer);
                liveTimer = null;
                historyTimer = null;
            });

            return {
                text, loading, error, live, devices, reload, reading, formatMeasure, formatSigned, formatShare,
                formatClock, sparkPath, meterPath, meterChart, visibleMppt, extrema, rangeText, showGrid, showBattery,
                sourceLine, dayGeometry, traceMode, setTrace, stats: channelStats, cellList, daySummary, calibrationText,
                thermalRow, thermalChart, sparkChart, hasThermal, thermalSource, thermalValue, moduleLabel, compareGeometry, showPremium, premiumOn, reasonText,
                pageTab, mapping, mapLoading, mapError, mapForbidden, mapNotice, noticeTarget, mapBusy, mapTargets, selectTab, reloadMapping, onMapTabKey,
                hpInstalled, hpReadings, hpValue,
                targetRows, visibleRows, targetBlocked, targetTitle, fieldLabel, sensorText, statusKind, actionLabel, reasonLabel,
                picked, snapshotId, confirmOpen, pendingRows, pendingTarget, canWrite, canPick, batteryAddMate, sfmlMate, sfmlBatteryHint, gpmChargeHint, isPicked, togglePick, openConfirm, closeConfirm, confirmApply, undoMapping,
            };
        },
    };
})();
