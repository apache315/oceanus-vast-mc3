"""Manual coding from reading the messages (Q3, Q4). Every entry points to a message id, so it can be checked."""

ACTION_TYPES = ["ottiene i permessi", "paga chi deve controllare", "fa sparire o ripulisce documenti",
                "mente o depista i controlli", "segue i lavori a Nemo Reef", "copertura turistica"]
P, S, D, M, L, C = ACTION_TYPES

# (message number, action type, who acts, source, summary)
ACTIONS = [
    (21, P, "Boss", "diretta", "cerca una «scappatoia» nelle zone protette di Nemo Reef"),
    (249, D, "Boss", "diretta", "ordina di distruggere i documenti che collegano a Mako"),
    (312, C, "Boss", "diretta", "vuole documenti delle barche che mostrino «solo turismo»"),
    (328, P, "Nadia Conti", "indiretta", "Remora: «si occupa personalmente dei permessi per Nemo Reef»"),
    (331, D, "Nadia Conti", "diretta", "annulla il corridoio speciale e chiede di distruggere i documenti"),
    (334, M, "Nadia Conti", "diretta", "al Council: «non sapevo di approvazioni di permessi»"),
    (366, S, "Boss", "diretta", "chiede di mascherare le tracce dei soldi"),
    (388, P, "Nadia Conti", "indiretta", "Remora: «ha fatto firmare il commissario Torres in poche ore»"),
    (389, P, "Boss", "indiretta", "Glitters ringrazia Boss per i permessi accelerati con Torres"),
    (520, P, "Nadia Conti", "diretta", "lo staff di Sailor Shift la ringrazia per l'aiuto con i permessi"),
    (521, D, "Nadia Conti", "diretta", "a Davis: «creare subito una traccia di carte pulita»"),
    (529, S, "Nadia Conti", "diretta", "offre a Liam Thorne il doppio perché l'Harbor Master «collabori»"),
    (535, S, "Nadia Conti", "diretta", "Liam: pattuglie spostate a nostro favore, «porta il pagamento»"),
    (538, L, "Nadia Conti", "diretta", "rivede le attrezzature per le fondazioni: «restiamo sotto i radar»"),
    (584, M, "Nadia Conti", "diretta", "a Marlin: «deviazioni temporanee, niente di cui preoccuparsi»"),
    (588, P, "Nadia Conti", "indiretta", "Davis: «operiamo con il permesso #CR-7844», discrezione"),
    (601, L, "Nadia Conti", "diretta", "Elise: «costruzione subacquea permanente confermata»"),
    (739, M, "Boss", "diretta", "Liam: «ritarderò l'autorizzazione del ROV di EcoVigil»"),
    (753, M, "Nadia Conti", "diretta", "Liam: EcoVigil sospetta, bisogna ripulire le operazioni"),
    (795, M, "Nadia Conti", "diretta", "sposta l'attrezzatura: «EcoVigil la gestisco io»"),
    (847, P, "Nadia Conti", "diretta", "«documentazione per #CR-7844 completa», vede The Middleman"),
    (869, L, "Nadia Conti", "diretta", "ordina il trasporto finale di attrezzatura, protocolli cifrati"),
    (940, C, "Nadia Conti", "indiretta", "Glitters: «Nadia ha approvato tutto», autorizzazione Delta-3"),
    (943, C, "Nadia Conti", "diretta", "Remora: «facciata turistica mantenuta», chiede l'ok per le luci subacquee"),
    (536, "prova contraria", "Nadia Conti", "diretta", "contesta a Neptune i «lavori di fondazione fuori dagli accordi»"),
]

# Short annotations written on the page-4 chart, at the key evidence (message number → text)
STORY_NOTES = {
    331: "5/10 chiede di distruggere i documenti",
    334: "5/10 al Council: «non sapevo dei permessi»",
    529: "8/10 offre a Liam Thorne il doppio",
    536: "8/10 contesta i lavori «fuori dagli accordi»",
    943: "14/10 «facciata turistica mantenuta»",
}

# Same news or same contact for two names: (pair, clue, message about the first, message about the second)
ALIAS_CLUES = [
    (("Boss", "Nadia Conti"), "ringraziati per i permessi firmati da Torres", 389, 388),
    (("Boss", "Nadia Conti"), "Liam Thorne avvisa del ROV di EcoVigil", 739, 753),
    (("Boss", "Nadia Conti"), "chiedono di distruggere documenti", 249, 331),
    (("Boss", "Nadia Conti"), "lavorano con The Accountant", 726, 538),
    (("Boss", "Nadia Conti"), "incontrano The Middleman", 11, 847),
]
