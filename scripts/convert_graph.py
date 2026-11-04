"""Convert the MC3 knowledge graph (node-link JSON) into flat CSV tables.

Usage: .venv/bin/python scripts/convert_graph.py [graph.json] [out_dir]
"""
import json
import sys
from itertools import combinations
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
GRAPH = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "MC3_release" / "MC3_graph.json"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "data" / "processed"

# Valid observation window: anything outside is flagged as an outlier, not dropped.
WINDOW = (pd.Timestamp("2040-10-01"), pd.Timestamp("2040-10-15"))


def load(path):
    g = json.load(open(path))
    nodes = pd.DataFrame(g["nodes"])
    edges = pd.DataFrame(g["edges"]).rename(columns={"id": "orig_id"})
    # Original edge ids are duplicated or missing: use a fresh positional id.
    edges.insert(0, "edge_id", range(len(edges)))
    edges["type"] = edges["type"].fillna("participates")
    return nodes, edges


def add_time_columns(df, col="timestamp"):
    df[col] = pd.to_datetime(df[col], errors="coerce")
    df["date"] = df[col].dt.date
    df["hour"] = df[col].dt.hour
    df["weekday"] = df[col].dt.day_name()
    df["time_outlier"] = df[col].notna() & ~df[col].between(*WINDOW, inclusive="left")
    return df


def build_messages(nodes, edges):
    sent = edges[edges.type == "sent"][["source", "target"]].set_axis(["sender", "msg_id"], axis=1)
    recv = edges[edges.type == "received"][["source", "target"]].set_axis(["msg_id", "receiver"], axis=1)
    comms = nodes[nodes.sub_type == "Communication"][["id", "timestamp", "content"]]
    msgs = comms.rename(columns={"id": "msg_id"}).merge(sent, on="msg_id", how="left").merge(recv, on="msg_id", how="left")
    kind = nodes.set_index("id")["sub_type"]
    msgs["sender_type"] = msgs.sender.map(kind)
    msgs["receiver_type"] = msgs.receiver.map(kind)
    msgs = add_time_columns(msgs)
    cols = ["msg_id", "timestamp", "date", "hour", "weekday", "time_outlier",
            "sender", "sender_type", "receiver", "receiver_type", "content"]
    return msgs[cols].sort_values("timestamp")


def build_relationships(nodes, edges):
    """Resolve reified Relationship nodes into entity-entity rows.

    1 in-edge + 1 out-edge -> directed (source -> target).
    Otherwise (e.g. Colleagues, Friends) all attached entities sit on one side -> undirected pairs.
    """
    ntype = nodes.set_index("id")["type"]
    rel_nodes = nodes[nodes.type == "Relationship"].set_index("id")
    part = edges[edges.type == "participates"]
    ins = part[part.target.isin(rel_nodes.index)].groupby("target")["source"].apply(list)
    outs = part[part.source.isin(rel_nodes.index)].groupby("source")["target"].apply(list)

    rows = []
    for rid, rel in rel_nodes.iterrows():
        src, dst = ins.get(rid, []), outs.get(rid, [])
        if len(src) == 1 and len(dst) == 1:
            pairs, directed = [(src[0], dst[0])], True
        else:
            pairs, directed = list(combinations(sorted(src + dst), 2)), False
        for a, b in pairs:
            rows.append({"rel_id": rid, "rel_type": rel.sub_type, "source": a, "target": b,
                         "source_type": ntype.get(a), "target_type": ntype.get(b), "directed": directed})
    rels = pd.DataFrame(rows)
    attrs = rel_nodes.drop(columns=["type", "sub_type", "label"]).dropna(axis=1, how="all")
    return rels.merge(attrs, left_on="rel_id", right_index=True, how="left")


def build_event_entities(nodes, edges):
    """Which entities take part in which non-communication events."""
    ntype = nodes.set_index("id")["type"]
    part = edges[edges.type == "participates"].copy()
    part["src_t"], part["dst_t"] = part.source.map(ntype), part.target.map(ntype)
    a = part[(part.src_t == "Entity") & (part.dst_t == "Event")]
    b = part[(part.src_t == "Event") & (part.dst_t == "Entity")]
    ev = pd.concat([
        pd.DataFrame({"event_id": a.target, "entity_id": a.source, "direction": "entity_to_event", "is_inferred": a.is_inferred}),
        pd.DataFrame({"event_id": b.source, "entity_id": b.target, "direction": "event_to_entity", "is_inferred": b.is_inferred}),
    ])
    info = nodes.set_index("id")[["sub_type", "timestamp"]].rename(columns={"sub_type": "event_type"})
    return ev.merge(info, left_on="event_id", right_index=True)


def build_evidence(nodes, edges):
    kind = nodes.set_index("id")
    ev = edges[edges.type == "evidence_for"][["edge_id", "source", "target", "is_inferred"]].copy()
    ev["source_type"] = ev.source.map(kind.sub_type)
    ev["target_kind"] = ev.target.map(kind.type)
    ev["target_type"] = ev.target.map(kind.sub_type)
    return ev


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    nodes, edges = load(GRAPH)

    tables = {
        "nodes": nodes,
        "edges": edges,
        "entities": nodes[nodes.type == "Entity"].dropna(axis=1, how="all"),
        "events": add_time_columns(nodes[nodes.type == "Event"].dropna(axis=1, how="all").copy()),
        "messages": build_messages(nodes, edges),
        "relationships": build_relationships(nodes, edges),
        "event_entities": build_event_entities(nodes, edges),
        "evidence": build_evidence(nodes, edges),
    }
    for name, df in tables.items():
        df.to_csv(OUT / f"{name}.csv", index=False)
        print(f"{name + '.csv':22} {len(df):5} rows  {df.shape[1]:2} cols")


if __name__ == "__main__":
    main()
