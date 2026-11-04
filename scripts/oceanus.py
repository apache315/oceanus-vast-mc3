"""Shared definitions for the Oceanus data: groups, palette, themes, cited hours, chains, similarity.

Same rules as the exploration notebook (analysis/build_esplorazione.py), kept in one place for the app export.
"""
import re

import networkx as nx
import pandas as pd

GROUPS = ["Operazione Nemo Reef", "Controllo e istituzioni", "Alias", "Investigatori", "Altri"]
GROUP_COLORS = dict(zip(GROUPS, ["#D55E00", "#009E73", "#CC79A7", "#0072B2", "#cfcfcf"]))
# Louvain gives unnamed communities: each one is named after a well-known member.
ANCHOR = {"Mako": "Operazione Nemo Reef", "Oceanus City Council": "Controllo e istituzioni",
          "Mrs. Money": "Alias", "Clepper Jensen": "Investigatori"}

KEY_DATES = [{"t": "2040-10-10T09:54:00", "label": "annuncio chiusura"},
             {"t": "2040-10-11T06:00:00", "label": "chiusura Nemo Reef"}]
RADIO_WINDOW = [8, 14]

TOPICS = {
    "Nemo Reef": r"nemo reef",
    "permessi": r"permit|authoriz|clearance",
    "soldi / pagamenti": r"payment|fund|money|financ|\bfees?\b|\bpay\b",
    "attrezzature / lavori": r"equipment|foundation|construct|install|stabiliz|concrete",
    "sorveglianza / pattuglie": r"patrol|surveil|monitor|\bwatch",
    "ambiente / conservazione": r"conservation|environment|water quality|wildlife|coral",
    "evento Sailor Shift": r"sailor|video|film|concert|music|\bevent\b",
    "segretezza": r"discreet|radar|encrypt|secre|confiden|delta-3|quiet|facade",
    "chiusura dell'area": r"closure|closed|restricted",
    "natura / tempo libero": r"bird|dolphin|whale|shearwater",
}

# Times written in the text: 0500, 05:00, 5 AM, 7PM; not codes like #CR-7844.
TIME_RE = re.compile(
    r"(?<![#\w-])(?:(?P<hh>[01]\d|2[0-3])[:.]?(?P<mm>[0-5]\d)(?![\d%-])(?:\s*(?:hours|hrs)\b)?"
    r"|(?P<h12>1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?P<ap>[AaPp])\.?[Mm]\b)")


def mentioned_hours(text):
    return [int(t.group("hh")) if t.group("hh") else int(t.group("h12")) % 12 + (12 if t.group("ap").lower() == "p" else 0)
            for t in TIME_RE.finditer(text)]


def themes_of(text):
    low = text.lower()
    return [name for name, pattern in TOPICS.items() if re.search(pattern, low)]


def assign_groups(messages):
    """Louvain communities on the cleaned message graph (seed 1), named via ANCHOR."""
    m = messages[messages.sender_clean != messages.receiver_clean]
    G = nx.Graph()
    for (a, b), w in m.groupby(["sender_clean", "receiver_clean"]).size().items():
        G.add_edge(a, b, weight=G.get_edge_data(a, b, {"weight": 0})["weight"] + w)
    groups = {}
    for c in nx.community.louvain_communities(G, weight="weight", seed=1):
        label = next((v for k, v in ANCHOR.items() if k in c), "Altri")
        groups.update({n: label for n in c})
    return groups


def find_chains(messages, window="15min"):
    """A writes to B and, within the window, B writes to someone other than A (first such message)."""
    m = messages.sort_values("timestamp")
    win = pd.Timedelta(window)
    rows = []
    for _, x in m.iterrows():
        nxt = m[(m.timestamp > x.timestamp) & (m.timestamp <= x.timestamp + win)
                & (m.sender_clean == x.receiver_clean) & (m.receiver_clean != x.sender_clean)]
        if len(nxt):
            y = nxt.iloc[0]
            rows.append(dict(a=x.sender_clean, b=x.receiver_clean, c=y.receiver_clean, m1=x.msg_id, m2=y.msg_id))
    return pd.DataFrame(rows, columns=["a", "b", "c", "m1", "m2"])


def similarity(m_all, kind, alias, min_msgs=5, min_sim=0.3):
    """Cosine similarity of interlocutors: rows = alias-like names + Davis, Rodriguez, Nadia; columns = people and vessels."""
    und = pd.concat([m_all[["sender", "receiver"]].set_axis(["a", "b"], axis=1),
                     m_all[["receiver", "sender"]].set_axis(["a", "b"], axis=1)])
    vec = und[und.a != und.b].groupby(["a", "b"]).size().unstack(fill_value=0)
    vec = vec[vec.sum(axis=1) >= min_msgs]
    norm = vec.div((vec ** 2).sum(axis=1) ** 0.5, axis=0)
    sim = (norm @ norm.T).rename_axis(index=None, columns=None)
    rows = [a for a in alias if a in sim.index] + [p for p in ["Davis", "Rodriguez", "Nadia Conti"] if p in sim.index]
    cols = [c for c in sim.columns if kind.get(c) in ("Person", "Vessel") and c not in rows]
    s = sim.loc[rows, cols].stack().reset_index().set_axis(["a", "b", "sim"], axis=1)
    keep = s.groupby("b").sim.max().loc[lambda v: v >= min_sim].index
    return s[s.b.isin(keep)].reset_index(drop=True)


# Group-in-a-box layout (Rodrigues et al. 2011): each group gets its own area, laid out on its internal messages.
GROUP_CENTRES = {"Controllo e istituzioni": (-1.0, 0.35), "Operazione Nemo Reef": (1.0, 0.35), "Alias": (0.45, -1.05),
                 "Investigatori": (-0.85, -1.05), "Altri": (0, -1.6)}


def group_layout(groups, pair_counts):
    """groups: {actor: group}; pair_counts: {(a, b): n}. Returns {actor: (x, y)} normalised to [0, 1]."""
    G = nx.Graph()
    G.add_nodes_from(groups)
    for (a, b), n in pair_counts.items():
        G.add_edge(a, b, weight=G.get_edge_data(a, b, {"weight": 0})["weight"] + n)
    pos = {}
    for g, (cx, cy) in GROUP_CENTRES.items():
        members = sorted(a for a, grp in groups.items() if grp == g)
        if not members:
            continue
        # rebuild the subgraph with sorted nodes and edges: networkx is only reproducible with a fixed order
        sub = nx.Graph()
        sub.add_nodes_from(members)
        sub.add_weighted_edges_from(sorted((min(u, v), max(u, v), d["weight"]) for u, v, d in G.subgraph(members).edges(data=True)))
        local = (nx.spring_layout(sub, weight="weight", seed=3, k=2.0, iterations=400)
                 if len(members) > 1 else {members[0]: (0, 0)})
        r = 0.42 * len(members) ** 0.5
        for a, (x, y) in local.items():
            pos[a] = (cx + x * r, cy + y * r)
    xs, ys = [p[0] for p in pos.values()], [p[1] for p in pos.values()]
    span = max(max(xs) - min(xs), max(ys) - min(ys))
    return {a: ((x - min(xs)) / span, (y - min(ys)) / span) for a, (x, y) in pos.items()}
