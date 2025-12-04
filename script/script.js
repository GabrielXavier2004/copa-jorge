// Initialize Firebase from runtime-generated config (firebase-config.js)
if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
  if (!firebase.apps.length) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
} else {
  console.warn('FIREBASE_CONFIG not found. Make sure firebase-config.js is generated and loaded before app scripts');
}

console.log("Firebase carregado?", typeof firebase !== "undefined");
console.log("Firebase versão detectada:", firebase.SDK_VERSION);

const db = firebase.firestore();

// Sign in anonymously for read-only access (match results updates)
if (firebase.auth) {
  firebase.auth().signInAnonymously().catch(err => {
    console.warn('Falha ao autenticar anonimamente:', err.message);
  });
} else {
  console.warn('Firebase Auth não encontrado — leitura pode ser bloqueada.');
}

const groupStageMatches = [
  { rodada: "Rodada 1", home: "bruno-fc", away: "jorge-fc", homeName: "Bruno FC", awayName: "Jorge FC" },
  { rodada: "Rodada 2", home: "pelego-fc", away: "victor-fc", homeName: "Pelego FC", awayName: "Victor FC" },
  { rodada: "Rodada 3", home: "xavier-fc", away: "bruno-fc", homeName: "Xavier FC", awayName: "Bruno FC" },
  { rodada: "Rodada 4", home: "jorge-fc", away: "pelego-fc", homeName: "Jorge FC", awayName: "Pelego FC" },
  { rodada: "Rodada 5", home: "victor-fc", away: "xavier-fc", homeName: "Victor FC", awayName: "Xavier FC" },
  { rodada: "Rodada 6", home: "bruno-fc", away: "pelego-fc", homeName: "Bruno FC", awayName: "Pelego FC" },
  { rodada: "Rodada 7", home: "jorge-fc", away: "victor-fc", homeName: "Jorge FC", awayName: "Victor FC" },
  { rodada: "Rodada 8", home: "pelego-fc", away: "xavier-fc", homeName: "Pelego FC", awayName: "Xavier FC" },
  { rodada: "Rodada 9", home: "bruno-fc", away: "victor-fc", homeName: "Bruno FC", awayName: "Victor FC" },
  { rodada: "Rodada 10", home: "jorge-fc", away: "xavier-fc", homeName: "Jorge FC", awayName: "Xavier FC" }
];

function generateKnockoutMatches(standings) {
  // standings = array já ordenado
  // ex: [{id:"bruno-fc", name:"Bruno FC"}, ...]

  if (standings.length < 5) return []; // segurança

  const first  = standings[0];
  const second = standings[1];
  const third  = standings[2];
  const fourth = standings[3];
  const fifth  = standings[4];

  return [
    {
      fase: "Repescagem",
      home: fourth.id,
      away: fifth.id,
      homeName: fourth.name,
      awayName: fifth.name,
      id: "repescagem"
    },
    {
      fase: "Semifinal 1",
      home: second.id,
      away: third.id,
      homeName: second.name,
      awayName: third.name,
      id: "semi1"
    },
    {
      fase: "Semifinal 2",
      home: first.id,
      away: "winner-repescagem",
      homeName: first.name,
      awayName: "Vencedor da Repescagem",
      id: "semi2"
    },
    {
      fase: "Final",
      home: "winner-semi1",
      away: "winner-semi2",
      homeName: "Vencedor da Semi 1",
      awayName: "Vencedor da Semi 2",
      id: "final"
    }
  ];
}

function renderAllMatches(standings) {
  const container = document.querySelector("#jogos");
  container.innerHTML = "";

  // ---------- FASE DE GRUPOS ----------
  container.innerHTML += `<h2>Fase de Grupos</h2>`;

  groupStageMatches.forEach((m, index) => {
    container.innerHTML += renderMatchCard(m, "grupo-" + (index+1));
  });

  // ---------- MATA-MATA ----------
  container.innerHTML += `<h2>Mata-mata</h2>`;

  const knockout = generateKnockoutMatches(standings);

  knockout.forEach((m, index) => {
    container.innerHTML += renderMatchCard(m, m.id);
  });
}

function renderMatchCard(m, id) {
  return `
    <div class="card match-card" data-match="${id}">
        <span class="match-date">${m.rodada || m.fase}</span>

        <div class="match-teams">
          <div class="team" data-team="${m.home}">
            <span class="team-dot"></span>
            <span>${m.homeName}</span>
          </div>

          <div class="score-inline">
            <span class="score-home"></span>
            <span class="vs">vs</span>
            <span class="score-away"></span>
          </div>

          <div class="team" data-team="${m.away}">
            <span class="team-dot"></span>
            <span>${m.awayName}</span>
          </div>
        </div>
    </div>
  `;
}

// ===============================
// MONTAR TABELA AUTOMATICAMENTE
// ===============================

function applyTeamColors() {
  db.collection("teams").get().then((snapshot) => {
    snapshot.forEach((doc) => {
      const teamId = doc.id;
      const color = doc.data().color;

      document.querySelectorAll(`[data-team="${teamId}"] .team-dot`)
        .forEach(dot => dot.style.backgroundColor = color);
    });
  });
}

function loadStandings() {
  const tbody = document.getElementById("standings-body");
  tbody.innerHTML = "";

  db.collection("teams")
    .onSnapshot((snapshot) => {
      console.log("📌 Times encontrados no Firestore:", snapshot.size);

      // Converter snapshot em array
      let teams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ===============================
      // ORDENAR COM CRITÉRIOS DE DESEMPATE
      // ===============================
      teams.sort((a, b) => {
        const A = a.stats;
        const B = b.stats;

        // 1. Pontos
        if (A.points !== B.points) return B.points - A.points;

        // 2. Saldo de Gols
        const saldoA = (A.goalsFor || 0) - (A.goalsAgainst || 0);
        const saldoB = (B.goalsFor || 0) - (B.goalsAgainst || 0);
        if (saldoA !== saldoB) return saldoB - saldoA;

        // 3. Gols Feitos
        if (A.goalsFor !== B.goalsFor) return B.goalsFor - A.goalsFor;

        // 4. Menos Gols Sofridos
        if (A.goalsAgainst !== B.goalsAgainst) return A.goalsAgainst - B.goalsAgainst;

        // 5. Menos cartões (amarelos + vermelhos)
        const cardsA = (A.yellowCards || 0) + (A.redCards || 0);
        const cardsB = (B.yellowCards || 0) + (B.redCards || 0);
        if (cardsA !== cardsB) return cardsA - cardsB;

        return 0;
      });

      // ===============================
      // MONTAR TABELA
      // ===============================
      tbody.innerHTML = "";
      let position = 1;

      teams.forEach(team => {
        const s = team.stats;
        const goalBalance = (s.goalsFor || 0) - (s.goalsAgainst || 0);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${position}</td>
            <td class="team-name" data-team="${team.id}">
                <span class="team-dot"></span>
                <span>${team.name}</span>
            </td>
            <td>${s.games}</td>
            <td>${s.points}</td>
            <td>${s.wins}</td>
            <td>${s.draws}</td>
            <td>${s.losses}</td>
            <td>${goalBalance >= 0 ? "+" + goalBalance : goalBalance}</td>
        `;

        tbody.appendChild(row);
        position++;
      });

      applyTeamColors();
      renderAllMatches(teams);

    }, (error) => {
      console.error("❌ ERRO AO BUSCAR TIMES:", error);
    });
}


document.addEventListener("DOMContentLoaded", () => {
  loadStandings();
});


function renderStatCard(icon, color, title, name, value) {
    return `
        <div class="card stat-card">
            <span class="material-icons-outlined stat-icon" style="color: ${color};">${icon}</span>
            <strong>${title}</strong>
            <span>${name}</span>
            <span class="stat-value">${value}</span>
        </div>
    `;
}

function renderListCard(icon, color, title, items) {
  // items: array of strings or objects already formatted
  const listItems = items.map((it, idx) => {
    return `<li><strong>${idx + 1}.</strong> ${it}</li>`;
  }).join('');

  return `
    <div class="card stat-card">
      <span class="material-icons-outlined stat-icon" style="color: ${color};">${icon}</span>
      <strong>${title}</strong>
      <ul style="list-style:none; padding-left:0; margin-top:10px; text-align:left; line-height:1.4;">${listItems}</ul>
    </div>
  `;
}

async function getTeamsMap() {
    const teamsSnapshot = await db.collection("teams").get();
    const map = {};

    teamsSnapshot.forEach(doc => {
        map[doc.id] = doc.data().name;
    });

    return map;
}

async function loadStats() {
    const statsGrid = document.getElementById("statsGrid");
    const teamsMap = await getTeamsMap();
    statsGrid.innerHTML = "<p>Carregando estatísticas...</p>";

    try {
        const playersSnap = await db.collection("players").get();
        const teamsSnap = await db.collection("teams").get();

        let players = [];
        playersSnap.forEach(doc => players.push({ id: doc.id, ...doc.data() }));

        let teams = [];
        teamsSnap.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));

    // --- Top 5 Artilheiros ---
    const topScorers = players
      .slice() // copy
      .sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0))
      .slice(0, 5);

    // --- Top 5 Assistências ---
    const topAssists = players
      .slice()
      .sort((a, b) => (b.stats?.assists || 0) - (a.stats?.assists || 0))
      .slice(0, 5);

    // --- Melhor Defesa ---
    const bestDefense = teams.slice().sort((a, b) => (a.stats?.goalsAgainst || 0) - (b.stats?.goalsAgainst || 0))[0];

    // --- Melhor Ataque (mais gols marcados) ---
    const bestAttack = teams.slice().sort((a, b) => (b.stats?.goalsFor || 0) - (a.stats?.goalsFor || 0))[0];

    // Renderiza
    statsGrid.innerHTML = "";

    // Convert top lists to readable strings
    const scorerItems = topScorers.map(p => `${p.name} — ${teamsMap[p.teamId] || '—'}: ${p.stats?.goals || 0} gols`);
    const assistItems = topAssists.map(p => `${p.name} — ${teamsMap[p.teamId] || '—'}: ${p.stats?.assists || 0} assistências`);

    statsGrid.innerHTML += renderListCard("emoji_events", "#ffb700", "Top 5 Artilheiros", scorerItems);
    statsGrid.innerHTML += renderListCard("assistant", "#007bff", "Top 5 Garçons", assistItems);

    statsGrid.innerHTML += renderStatCard(
      "security", "#28a745",
      "Melhor Defesa",
      bestDefense.name,
      `${bestDefense.stats.goalsAgainst} Gols Sofridos`
    );

    statsGrid.innerHTML += renderStatCard(
      "whatshot", "#ff5733",
      "Melhor Ataque",
      bestAttack.name,
      `${bestAttack.stats.goalsFor} Gols Marcados`
    );

    } catch (err) {
        console.error("🔥 ERRO REAL:", err.message, err);
        statsGrid.innerHTML = "<p>Erro ao carregar estatísticas.</p>";
    }
}
document.addEventListener("DOMContentLoaded", () => {
    loadStats();
});

// Listen for saved matches in Firestore and update UI (read-only on public site)
if (db) {
  try {
    db.collection('matches').onSnapshot((snap) => {
      snap.forEach(doc => {
        updateMatchCardUI(doc.id, doc.data());
      });
    });
  } catch (err) {
    console.warn('Não foi possível escutar matches no Firestore:', err.message || err);
  }
}