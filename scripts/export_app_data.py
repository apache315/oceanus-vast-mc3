"""Export the JSON files the web app reads (app/public/data/).

Usage: .venv/bin/python scripts/export_app_data.py
Input: data/clean/ and data/processed/ (from convert_graph.py and clean_data.py).
"""
import json
import re
from pathlib import Path

import pandas as pd

from manual_coding import ACTION_TYPES, ACTIONS, STORY_NOTES
from oceanus import GROUP_COLORS, GROUPS, KEY_DATES, RADIO_WINDOW, TOPICS, assign_groups, group_layout, mentioned_hours, themes_of

ROOT = Path(__file__).resolve().parent.parent
CLEAN, PROC = ROOT / "data" / "clean", ROOT / "data" / "processed"


def msg_id(n):
    return f"Event_Communication_{n}"


def export(out_dir=ROOT / "app" / "public" / "data"):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    m = pd.read_csv(CLEAN / "messages_analysis.csv", parse_dates=["timestamp"]).sort_values("timestamp")
    act = pd.read_csv(CLEAN / "entity_activity.csv").set_index("name")
    evidence = pd.read_csv(PROC / "evidence.csv")
    groups = assign_groups(m)
    kind = act.sub_type.to_dict()

    names = pd.concat([m.sender_clean, m.receiver_clean])
    sent, received = m.sender_clean.value_counts(), m.receiver_clean.value_counts()
    actors = [dict(id=n, type=kind.get(n, "Person"), group=groups.get(n, "Altri"),
                   sent=int(sent.get(n, 0)), received=int(received.get(n, 0)),
                   alias=bool(act.is_alias_like.get(n, False)))
              for n in sorted(names.unique())]

    messages = [dict(id=x.msg_id, t=x.timestamp.isoformat(), **{"from": x.sender_clean}, to=x.receiver_clean,
                     radioFrom=x.sender, radioTo=x.receiver,
                     signedAs=x.claimed_sender if isinstance(x.claimed_sender, str) else None, text=x.content, themes=themes_of(x.content), hours=mentioned_hours(x.content))
                for x in m.itertuples()]

    ids = set(m.msg_id)
    ev = evidence[evidence.source.isin(ids)]
    message_events = [dict(msg=x.source, event=x.target, type=x.target_type, inferred=bool(x.is_inferred))
                      for x in ev.itertuples()]

    actions = [dict(msg=msg_id(n), action=a, actor=who, source=src, summary=s) for n, a, who, src, s in ACTIONS]
    meta = dict(groups=[dict(name=g, color=GROUP_COLORS[g]) for g in GROUPS], keyDates=KEY_DATES, topics=TOPICS,
                radioWindow=RADIO_WINDOW, actionTypes=ACTION_TYPES,
                storyNotes={msg_id(n): t for n, t in STORY_NOTES.items()})

    actor_ids = {a["id"] for a in actors}
    rel = pd.read_csv(CLEAN / "relationships.csv")
    rel = rel[~rel.is_duplicate & rel.source.isin(actor_ids) & rel.target.isin(actor_ids)]
    support = evidence[evidence.target.isin(rel.rel_id) & evidence.source.isin(ids)].groupby("target").source.apply(sorted).to_dict()
    relations = [dict(id=r.rel_id, type=r.rel_type, source=r.source, target=r.target, support=support.get(r.rel_id, []))
                 for r in rel.itertuples()]

    # a person is also mentioned by first name ("Nadia"), when no other actor shares that word
    words = pd.Series([w for a in actor_ids for w in a.split()]).value_counts()
    patterns = {a: [a] + ([a.split()[0]] if kind.get(a) == "Person" and " " in a and words[a.split()[0]] == 1 else [])
                for a in actor_ids}
    mentions = [dict(msg=x.msg_id, name=a) for x in m.itertuples() for a, pats in sorted(patterns.items())
                if a not in (x.sender_clean, x.receiver_clean)
                and any(re.search(r"\b" + re.escape(p_) + r"\b", x.content) for p_ in pats)]

    pairs = m[m.sender_clean != m.receiver_clean].groupby(["sender_clean", "receiver_clean"]).size().to_dict()
    layout = {a: [round(x, 4), round(y, 4)] for a, (x, y) in group_layout({a["id"]: a["group"] for a in actors}, pairs).items()}

    files = dict(actors=actors, relations=relations, mentions=mentions, layout=layout, messages=messages, message_events=message_events,
                 actions=actions, meta=meta)
    for name, data in files.items():
        (out_dir / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, allow_nan=False), encoding="utf-8")


if __name__ == "__main__":
    export()
