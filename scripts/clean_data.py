"""Data understanding and cleaning for the MC3 tables.

Reads data/processed/*.csv (output of convert_graph.py), writes cleaned tables to
data/clean/ and a data quality report to reports/data_quality.md.
Nothing is silently dropped: every fix is recorded in a flag/reason column.

Usage: .venv/bin/python scripts/clean_data.py
"""
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / "data" / "processed"
OUT = ROOT / "data" / "clean"
REPORT = ROOT / "reports" / "data_quality.md"
WINDOW = (pd.Timestamp("2040-10-01"), pd.Timestamp("2040-10-15"))

# Spellings found in message text that do not match an entity name exactly.
EXTRA_ALIASES = {
    "Green Guardians HQ": "Green Guardians",
    "V. Miesel HQ": "V. Miesel Shipping",
    "V. Miesel": "V. Miesel Shipping",
    "Glitter's Team": "Glitters Team",
    "Sailor Shifts": "Sailor Shifts Team",
    "Ms. Conti": "Nadia Conti",
    "City Council": "Oceanus City Council",
    "Council": "Oceanus City Council",
}

# Free-text relationship attributes -> few macro-categories.
# First matching keyword wins, so more specific groups come first.
CATEGORY_RULES = {
    "coordination_type": [
        ("financial", ["payment"]),
        ("security", ["security", "enforcement"]),
        ("logistics", ["equipment", "shipping", "transfer", "crew", "staffing", "positioning",
                       "relocation", "port operations", "harbor", "transponder", "technical"]),
        ("monitoring", ["surveillance", "monitoring", "observation", "night watch", "patrol", "triangulat",
                        "sensor", "station", "sampl", "documentation", "environmental", "conservation patrol"]),
        ("meeting/communication", ["meeting", "communication", "reporting"]),
        ("event/tourism", ["event", "tour"]),
        ("operation", ["operation"]),
    ],
    "operational_role": [
        ("vessel operator", ["captain", "vessel operator"]),
        ("security", ["security"]),
        ("financial", ["financ"]),
        ("extraction/construction", ["extraction", "stabilization", "equipment", "permit"]),
        ("tourism/filming", ["tourism", "filming", "sailor shifts"]),
        ("monitoring/research", ["monitoring", "patrol", "research"]),
        ("management", ["supervis", "oversee", "oversight", "manager", "morale"]),
        ("front company", ["shell company"]),
    ],
    "jurisdiction_type": [
        ("city council", ["city council"]),
        ("harbor", ["harbor"]),
        ("conservation/protected area", ["conservation", "protected", "reef", "environmental"]),
        ("regulatory", ["regulatory", "clearance"]),
    ],
}

report = []


def section(title):
    report.append(f"\n## {title}\n")


def line(text=""):
    report.append(text)


def table(df):
    report.append(df.to_markdown() if len(df) else "_nessuna riga_")
    report.append("")


def name_lookup(entities):
    """Map every way an entity is written in messages to its canonical id."""
    lookup = {}
    for name in entities.name.dropna():
        lookup[name] = name
        if name.startswith("The "):
            lookup[name[4:]] = name
    for name in entities[entities.sub_type == "Person"].name:
        parts = name.split()
        if len(parts) == 2 and not name.startswith("The "):
            lookup.setdefault(parts[0], name)
            lookup.setdefault(parts[1], name)
    lookup.update(EXTRA_ALIASES)
    return lookup


def compile_patterns(lookup):
    names = "|".join(re.escape(k) for k in sorted(lookup, key=len, reverse=True))
    speaker = re.compile(
        rf"(?:[Tt]his is|[Ii]t'?s|[Ii]t is)\s+(?:the\s+)?({names})\b"
        rf"|\b({names})\s+(?:here\b|reporting|responding|confirming|vessel reporting|to\s)"
        rf"|^[^,]{{1,40}},\s*({names})\s*\."
    )
    addressee = re.compile(rf"^(?:Hi|Hey|Hello|Dear)?,?\s*({names})\s*[,!.:]")
    return speaker, addressee


def understand(name, df):
    section(f"Tabella `{name}`")
    line(f"Righe: **{len(df)}**, colonne: **{df.shape[1]}**.")
    line()
    miss = df.isna().mean().mul(100).round(1)
    miss = miss[miss > 0].sort_values(ascending=False).rename("% mancanti").to_frame()
    if len(miss):
        line("Valori mancanti (molti sono strutturali: l'attributo esiste solo per alcuni sub_type).")
        line()
        table(miss)


def clean_messages(msgs, entities):
    lookup = name_lookup(entities)
    speaker_re, addressee_re = compile_patterns(lookup)

    def parse(text):
        head = text[:120]
        sp = speaker_re.search(head)
        ad = addressee_re.search(head)
        spk = lookup[next(g for g in sp.groups() if g)] if sp else None
        adr = lookup[ad.group(1)] if ad else None
        return pd.Series({"claimed_sender": spk, "claimed_receiver": adr if adr != spk else None})

    m = msgs.join(msgs.content.apply(parse))
    m["self_loop"] = m.sender == m.receiver
    m["sender_mismatch"] = m.claimed_sender.notna() & (m.claimed_sender != m.sender)
    m["receiver_mismatch"] = m.claimed_receiver.notna() & (m.claimed_receiver != m.receiver)

    # The text is the primary source; the graph was extracted from it.
    m["sender_clean"] = m.claimed_sender.fillna(m.sender)
    m["receiver_clean"] = m.claimed_receiver.fillna(m.receiver)
    # If the fix produced a self-loop, the original receiver is the better guess.
    loop = m.sender_clean == m.receiver_clean
    m.loc[loop & (m.receiver != m.sender_clean), "receiver_clean"] = m.receiver
    m.loc[loop & (m.sender != m.receiver_clean), "receiver_clean"] = m.sender
    m["self_loop_clean"] = m.sender_clean == m.receiver_clean

    reasons = []
    for _, r in m.iterrows():
        rs = []
        if r.sender_clean != r.sender:
            rs.append("sender_from_text")
        if r.receiver_clean != r.receiver:
            rs.append("receiver_from_text")
        reasons.append(";".join(rs))
    m["fix_reason"] = reasons

    # Same text + time + cleaned endpoints = one message extracted twice.
    m["is_duplicate"] = m.duplicated(["timestamp", "content", "sender_clean", "receiver_clean"], keep="first")
    m["same_text_other_receiver"] = m.duplicated(["timestamp", "content"], keep=False) & ~m.is_duplicate

    kind = entities.set_index("name").sub_type
    m["sender_clean_type"] = m.sender_clean.map(kind)
    m["receiver_clean_type"] = m.receiver_clean.map(kind)

    section("Messaggi: mittente/destinatario dal testo")
    line("Nel testo chi scrive spesso si firma (`X here`, `this is X`) e saluta il destinatario (`Y, ...`). "
         "Confronto queste firme con mittente/destinatario del grafo.")
    line()
    tot = pd.Series({
        "messaggi": len(m),
        "con firma riconosciuta": m.claimed_sender.notna().sum(),
        "con destinatario nel saluto": m.claimed_receiver.notna().sum(),
        "self-loop originali": m.self_loop.sum(),
        "mittente diverso dalla firma": m.sender_mismatch.sum(),
        "destinatario diverso dal saluto": m.receiver_mismatch.sum(),
        "righe corrette (almeno un campo)": (m.fix_reason != "").sum(),
        "self-loop dopo pulizia": m.self_loop_clean.sum(),
        "duplicati esatti dopo pulizia": m.is_duplicate.sum(),
    }).rename("n").to_frame()
    table(tot)
    line("Coppie (mittente nel grafo → firma nel testo) più frequenti. Quelle ricorrenti tra persona e barca "
         "sono **indizi di pseudonimi/identità condivise** (Q3), non necessariamente errori:")
    line()
    pairs = (m[m.sender_mismatch].groupby(["sender", "claimed_sender"]).size()
             .sort_values(ascending=False).head(15).rename("n").to_frame())
    table(pairs)
    return m


def clean_events(events):
    ev = events.copy()
    ev["timestamp"] = pd.to_datetime(ev.timestamp, errors="coerce")
    ev["ts_missing"] = ev.timestamp.isna()
    ev["time_outlier"] = ev.timestamp.notna() & ~ev.timestamp.between(*WINDOW, inclusive="left")
    section("Eventi: qualità temporale")
    q = ev.groupby("sub_type").agg(n=("id", "size"), ts_mancanti=("ts_missing", "sum"),
                                    fuori_finestra=("time_outlier", "sum"))
    table(q[(q.ts_mancanti > 0) | (q.fuori_finestra > 0)])
    out = ev[ev.time_outlier][["id", "sub_type", "timestamp"]]
    if len(out):
        line("Eventi fuori dalla finestra 1–14 ottobre 2040:")
        line()
        table(out.set_index("id"))
    return ev


def categorize(value, rules):
    if pd.isna(value):
        return None
    text = value.lower()
    for group, keywords in rules:
        if any(k in text for k in keywords):
            return group
    return "other"


def normalize_categories(r):
    section("Relazioni: normalizzazione dei campi testuali")
    line("I valori originali sono testo libero con varianti di scrittura (es. `Captain`/`captain`, "
         "`Equipment transfer`/`equipment transfer`). Si conservano in `<campo>` e si aggiungono "
         "`<campo>_norm` (minuscolo, spazi puliti) e `<campo>_group` (macro-categoria per parola chiave).")
    line()
    for col, rules in CATEGORY_RULES.items():
        r[f"{col}_norm"] = r[col].str.strip().str.lower()
        r[f"{col}_group"] = r[col].map(lambda v: categorize(v, rules))
        line(f"**`{col}`**: {r[col].nunique()} valori originali → {r[f'{col}_norm'].nunique()} normalizzati "
             f"→ {r[f'{col}_group'].nunique()} gruppi.")
        line()
        mapping = (r.dropna(subset=[col]).groupby(f"{col}_group")[f"{col}_norm"]
                   .agg(lambda s: ", ".join(sorted(set(s)))).rename("valori"))
        counts = r[f"{col}_group"].value_counts().rename("n")
        table(pd.concat([counts, mapping], axis=1))
    # Roles that are just an entity name: the extractor put the target in the role field.
    names = set(r.source) | set(r.target)
    misplaced = r.operational_role.isin(names | {"Sailor Shifts", "Intern", "Harbor Response"})
    r["operational_role_is_entity"] = misplaced
    line(f"`operational_role` con un nome di entità al posto del ruolo: **{misplaced.sum()}** righe "
         f"(flag `operational_role_is_entity`).")
    line()
    return r


def clean_relationships(rels):
    r = rels.copy()
    r = normalize_categories(r)
    r["pair_key"] = ["|".join(sorted(p)) for p in zip(r.source, r.target)]
    r["is_duplicate"] = r.duplicated(["rel_type", "pair_key"], keep="first")
    r["self_relation"] = r.source == r.target
    section("Relazioni")
    line(f"Relazioni: **{len(r)}**; duplicate (stesso tipo e coppia): **{r.is_duplicate.sum()}**; "
         f"auto-relazioni: **{r.self_relation.sum()}**.")
    line()
    table(r.groupby("rel_type").agg(n=("rel_id", "size"), orientate=("directed", "sum"),
                                    duplicate=("is_duplicate", "sum")))
    return r


def entity_activity(entities, m, rels, ee):
    act = entities[["id", "name", "sub_type"]].set_index("name")
    act["msg_sent"] = m.sender_clean.value_counts()
    act["msg_received"] = m.receiver_clean.value_counts()
    act["relations"] = pd.concat([rels.source, rels.target]).value_counts()
    act["events"] = ee.entity_id.value_counts()
    act = act.fillna(0).astype({c: int for c in ["msg_sent", "msg_received", "relations", "events"]})
    act["is_alias_like"] = act.index.str.match(r"^(The |Mrs\. |Boss$|Small Fry$)")
    section("Entità: attività dopo la pulizia")
    line("Entità senza nessun messaggio (presenti solo in relazioni/eventi):")
    line()
    table(act[(act.msg_sent + act.msg_received) == 0])
    return act.reset_index()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    msgs = pd.read_csv(IN / "messages.csv", parse_dates=["timestamp"])
    entities = pd.read_csv(IN / "entities.csv")
    events = pd.read_csv(IN / "events.csv")
    rels = pd.read_csv(IN / "relationships.csv")
    ee = pd.read_csv(IN / "event_entities.csv")
    edges = pd.read_csv(IN / "edges.csv")

    report.append("# Data understanding & cleaning — MC3\n")
    report.append("Generato da `scripts/clean_data.py`. Le righe non vengono eliminate: le correzioni sono in colonne "
                  "`*_clean` e i problemi in colonne flag.")
    section("Panoramica")
    line(f"- Entità {len(entities)}, eventi {len(events)} (di cui messaggi {len(msgs)}), relazioni {len(rels)}, "
         f"archi {len(edges)} (inferiti {edges.is_inferred.mean():.0%}).")
    line(f"- Messaggi tra {msgs.timestamp.min()} e {msgs.timestamp.max()}, ore {msgs.hour.min()}–{msgs.hour.max()}.")
    for name, df in [("entities", entities), ("events", events), ("relationships", rels)]:
        understand(name, df)

    m = clean_messages(msgs, entities)
    ev = clean_events(events)
    r = clean_relationships(rels)
    act = entity_activity(entities, m, r, ee)

    m.to_csv(OUT / "messages.csv", index=False)
    m[~m.is_duplicate & ~m.self_loop_clean].to_csv(OUT / "messages_analysis.csv", index=False)
    ev.to_csv(OUT / "events.csv", index=False)
    r.to_csv(OUT / "relationships.csv", index=False)
    act.to_csv(OUT / "entity_activity.csv", index=False)
    REPORT.write_text("\n".join(report))

    print(f"messages: {len(m)} rows, fixed {(m.fix_reason != '').sum()}, "
          f"duplicates {m.is_duplicate.sum()}, self-loops {m.self_loop.sum()} -> {m.self_loop_clean.sum()}")
    print(f"messages_analysis.csv: {(~m.is_duplicate & ~m.self_loop_clean).sum()} rows")
    print(f"events: ts missing {ev.ts_missing.sum()}, outliers {ev.time_outlier.sum()}")
    print(f"relationships: duplicates {r.is_duplicate.sum()}")
    print(f"report -> {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
