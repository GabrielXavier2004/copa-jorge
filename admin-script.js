// admin-script.js - Admin page with editor enabled
// This file is similar to script.js but includes the full editor UI

let db;

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

// Check authentication on load
document.addEventListener('DOMContentLoaded', async () => {
  db = firebase.firestore();
  const user = await checkAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('user-email').textContent = user.email;
  loadMatches();
});

// Logout handler
function handleLogout() {
  logout();
  localStorage.removeItem('currentUser');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 100);
}

function generateKnockoutMatches(standings) {
  if (standings.length < 5) return [];
  const first  = standings[0];
  const second = standings[1];
  const third  = standings[2];
  const fourth = standings[3];
  const fifth  = standings[4];

  return [
    { fase: "Repescagem", home: fourth.id, away: fifth.id, homeName: fourth.name, awayName: fifth.name, id: "repescagem" },
    { fase: "Semifinal 1", home: second.id, away: third.id, homeName: second.name, awayName: third.name, id: "semi1" },
    { fase: "Semifinal 2", home: first.id, away: "winner-repescagem", homeName: first.name, awayName: "Vencedor da Repescagem", id: "semi2" },
    { fase: "Final", home: "winner-semi1", away: "winner-semi2", homeName: "Vencedor da Semi 1", awayName: "Vencedor da Semi 2", id: "final" }
  ];
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

        <div class="match-actions" style="display: flex; justify-content: center; margin-top: 10px;">
            <button class="btn edit-btn">Editar</button>
        </div>
    </div>
  `;
}

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

// Wire event listeners for editor functionality
function wireEditorListeners() {
  // Open editor
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.removeEventListener('click', handleEditClick);
    btn.addEventListener('click', handleEditClick);
  });

  // Close modal
  document.removeEventListener('click', handleModalClick);
  document.addEventListener('click', handleModalClick);

  // Add goal/card buttons
  const addGoalBtn = document.getElementById('add-goal');
  const addCardBtn = document.getElementById('add-card');
  const saveBtn = document.getElementById('save-match');
  const cancelBtn = document.getElementById('cancel-match');
  const penaltiesCheckbox = document.getElementById('went-to-penalties');

  if (addGoalBtn) {
    addGoalBtn.removeEventListener('click', handleAddGoal);
    addGoalBtn.addEventListener('click', handleAddGoal);
  }

  if (addCardBtn) {
    addCardBtn.removeEventListener('click', handleAddCard);
    addCardBtn.addEventListener('click', handleAddCard);
  }

  if (saveBtn) {
    saveBtn.removeEventListener('click', handleSaveMatch);
    saveBtn.addEventListener('click', handleSaveMatch);
  }

  if (cancelBtn) {
    cancelBtn.removeEventListener('click', handleCancelMatch);
    cancelBtn.addEventListener('click', handleCancelMatch);
  }

  if (penaltiesCheckbox) {
    penaltiesCheckbox.removeEventListener('change', updatePenaltyVisibility);
    penaltiesCheckbox.addEventListener('change', updatePenaltyVisibility);
  }
}

function updatePenaltyVisibility() {
  const checkbox = document.getElementById('went-to-penalties');
  const resultDiv = document.getElementById('penalty-result');
  if (checkbox.checked) {
    resultDiv.style.display = 'block';
  } else {
    resultDiv.style.display = 'none';
    document.getElementById('penalty-winner').value = '';
  }
}
function handleEditClick(e) {
  const card = e.target.closest('.match-card');
  openMatchEditorFromCard(card);
}

function handleModalClick(e) {
  if (e.target.id === 'modal-close' || e.target.id === 'cancel-match' || e.target.classList.contains('modal-backdrop')) {
    closeMatchEditor();
  }
}

function handleAddGoal(e) {
  (async () => {
    const modal = document.getElementById('match-editor-modal');
    const homeId = modal.dataset.home;
    const awayId = modal.dataset.away;
    const homePlayers = homeId ? await getPlayersForTeam(homeId) : [];
    const awayPlayers = awayId ? await getPlayersForTeam(awayId) : [];
    addGoalRow({}, homePlayers, awayPlayers);
  })();
}

function handleAddCard(e) {
  (async () => {
    const modal = document.getElementById('match-editor-modal');
    const homeId = modal.dataset.home;
    const awayId = modal.dataset.away;
    const homePlayers = homeId ? await getPlayersForTeam(homeId) : [];
    const awayPlayers = awayId ? await getPlayersForTeam(awayId) : [];
    addCardRow({}, homePlayers, awayPlayers);
  })();
}

function handleCancelMatch(e) {
  closeMatchEditor();
}

function handleSaveMatch(e) {
  (async () => {
    const modal = document.getElementById('match-editor-modal');
    const matchId = modal.dataset.matchId;
    const homeId = modal.dataset.home;
    const awayId = modal.dataset.away;
    if (!matchId || !homeId || !awayId) return;

    const homeScore = parseInt(document.getElementById('home-score').value) || 0;
    const awayScore = parseInt(document.getElementById('away-score').value) || 0;

    const goals = [];
    document.querySelectorAll('#goals-list .event-row').forEach(r => {
      const sel = r.querySelector('select');
      const playerSel = r.querySelectorAll('select')[1];
      const assistSel = r.querySelectorAll('select')[2];
      const minute = r.querySelector('input[type="number"]')?.value || '';
      goals.push({ team: sel.value, player: playerSel?.value || '', assist: assistSel?.value || '', minute });
    });

    const cards = [];
    document.querySelectorAll('#cards-list .event-row').forEach(r => {
      const sel = r.querySelector('select');
      const playerSel = r.querySelectorAll('select')[1];
      const typeSel = r.querySelectorAll('select')[2] || r.querySelectorAll('select')[1];
      const minute = r.querySelector('input[type="number"]')?.value || '';
      cards.push({ team: sel.value, player: playerSel?.value || '', type: typeSel?.value || 'yellow', minute });
    });

    // Dados de pênaltis
    const wentToPenalties = document.getElementById('went-to-penalties').checked;
    const penaltyWinner = wentToPenalties ? document.getElementById('penalty-winner').value : '';

    const payload = { 
      homeScore, 
      awayScore, 
      goals, 
      cards,
      wentToPenalties,
      penaltyWinner,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    };

    try {
      await saveMatchToFirestore(matchId, payload, homeId, awayId);
      updateMatchCardUI(matchId, payload);
    } catch (err) {
      console.error('Erro salvando partida:', err);
      const all = getStoredMatches();
      all[matchId] = { homeScore, awayScore, goals, cards, wentToPenalties, penaltyWinner };
      saveStoredMatches(all);
      updateMatchCardUI(matchId, all[matchId]);
    }

    closeMatchEditor();
  })();
}

function loadMatches() {
  try {
    db.collection("teams").get().then((snapshot) => {
      let teams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      teams.sort((a, b) => {
        const A = a.stats || {};
        const B = b.stats || {};
        if ((B.points || 0) !== (A.points || 0)) return (B.points || 0) - (A.points || 0);
        const saldoA = (A.goalsFor || 0) - (A.goalsAgainst || 0);
        const saldoB = (B.goalsFor || 0) - (B.goalsAgainst || 0);
        if (saldoA !== saldoB) return saldoB - saldoA;
        if ((B.goalsFor || 0) !== (A.goalsFor || 0)) return (B.goalsFor || 0) - (A.goalsFor || 0);
        if ((A.goalsAgainst || 0) !== (B.goalsAgainst || 0)) return (A.goalsAgainst || 0) - (B.goalsAgainst || 0);
        return 0;
      });

      renderAllMatches(teams);
      applyTeamColors();
      
      // Listen to match updates
      listenToMatches();
    }).catch(err => {
      console.error('Erro ao carregar times:', err);
      renderAllMatches([]);
      listenToMatches();
    });
  } catch (err) {
    console.error('Erro em loadMatches:', err);
  }
}

function listenToMatches() {
  if (db) {
    try {
      db.collection('matches').onSnapshot((snap) => {
        snap.forEach(doc => {
          updateMatchCardUI(doc.id, doc.data());
        });
      });
    } catch (err) {
      console.warn('Erro escutando matches:', err.message || err);
    }
  }
}

function renderAllMatches(standings) {
  const container = document.querySelector("#jogos");
  container.innerHTML = "";
  container.innerHTML += `<h2>Fase de Grupos</h2>`;
  groupStageMatches.forEach((m, index) => {
    container.innerHTML += renderMatchCard(m, "grupo-" + (index+1));
  });
  container.innerHTML += `<h2>Mata-mata</h2>`;
  const knockout = generateKnockoutMatches(standings);
  knockout.forEach((m) => {
    container.innerHTML += renderMatchCard(m, m.id);
  });
  
  // Wire event listeners for edit buttons
  wireEditorListeners();
}

// ========== EDITOR FUNCTIONS (from script.js) ==========

function getStoredMatches() {
  try {
    return JSON.parse(localStorage.getItem('matchesData') || '{}');
  } catch (e) {
    return {};
  }
}

function saveStoredMatches(obj) {
  localStorage.setItem('matchesData', JSON.stringify(obj));
}

function openMatchEditorFromCard(card) {
  if (!card) return;
  (async () => {
    const matchId = card.dataset.match;
    const teamDivs = card.querySelectorAll('.match-teams .team');
    const homeId = teamDivs[0]?.dataset.team || 'home';
    const awayId = teamDivs[1]?.dataset.team || 'away';
    const homeName = (teamDivs[0]?.querySelectorAll('span')[1]?.textContent || 'Time A').trim();
    const awayName = (teamDivs[1]?.querySelectorAll('span')[1]?.textContent || 'Time B').trim();

    const homePlayers = await getPlayersForTeam(homeId);
    const awayPlayers = await getPlayersForTeam(awayId);

    const stored = await db.collection('matches').doc(matchId).get().then(s => s.exists ? s.data() : (getStoredMatches()[matchId] || {}));

    const modal = document.getElementById('match-editor-modal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    document.getElementById('modal-title').textContent = `Editar — ${card.querySelector('.match-date')?.textContent || matchId}`;
    document.getElementById('home-name').textContent = homeName;
    document.getElementById('away-name').textContent = awayName;

    document.getElementById('home-score').value = stored.homeScore ?? 0;
    document.getElementById('away-score').value = stored.awayScore ?? 0;

    const goalsList = document.getElementById('goals-list');
    const cardsList = document.getElementById('cards-list');
    goalsList.innerHTML = '';
    cardsList.innerHTML = '';

    (stored.goals || []).forEach(g => addGoalRow(g, homePlayers, awayPlayers));
    (stored.cards || []).forEach(c => addCardRow(c, homePlayers, awayPlayers));

    if (!(stored.goals && stored.goals.length)) addGoalRow({}, homePlayers, awayPlayers);
    if (!(stored.cards && stored.cards.length)) addCardRow({}, homePlayers, awayPlayers);

    // Carregar dados de pênaltis
    document.getElementById('went-to-penalties').checked = stored.wentToPenalties ?? false;
    document.getElementById('penalty-winner').value = stored.penaltyWinner ?? '';
    updatePenaltyVisibility();

    modal.dataset.matchId = matchId;
    modal.dataset.home = homeId;
    modal.dataset.away = awayId;
  })();
}

function closeMatchEditor() {
  const modal = document.getElementById('match-editor-modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  delete modal.dataset.matchId;
}

function addGoalRow(goal = {}, homePlayers = [], awayPlayers = []) {
  const list = document.getElementById('goals-list');
  const row = document.createElement('div');
  row.className = 'event-row';

  const teamSelect = document.createElement('select');
  const optA = document.createElement('option'); optA.value = 'home'; optA.textContent = 'Casa';
  const optB = document.createElement('option'); optB.value = 'away'; optB.textContent = 'Fora';
  teamSelect.appendChild(optA); teamSelect.appendChild(optB);
  teamSelect.value = goal.team || 'home';

  const playerSelect = document.createElement('select');
  const playersFor = teamSelect.value === 'home' ? homePlayers : awayPlayers;
  function populatePlayerOptions(sel, players) {
    sel.innerHTML = '';
    const blank = document.createElement('option'); blank.value = ''; blank.textContent = '-- Gol --'; sel.appendChild(blank);
    players.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
  }
  populatePlayerOptions(playerSelect, playersFor);

  const assistSelect = document.createElement('select');
  function populateAssistOptions(sel, players) {
    sel.innerHTML = '';
    const blank = document.createElement('option'); blank.value = ''; blank.textContent = '-- Assistência --'; sel.appendChild(blank);
    players.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
  }
  populateAssistOptions(assistSelect, playersFor);

  const minuteInput = document.createElement('input'); minuteInput.type = 'number'; minuteInput.placeholder = 'Min'; minuteInput.min = 0; minuteInput.value = goal.minute || '';
  const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'remove-event'; removeBtn.textContent = 'Remover';
  removeBtn.addEventListener('click', () => row.remove());

  teamSelect.addEventListener('change', () => {
    const players = teamSelect.value === 'home' ? homePlayers : awayPlayers;
    populatePlayerOptions(playerSelect, players);
    populateAssistOptions(assistSelect, players);
  });

  if (goal.player) {
    const opt = Array.from(playerSelect.options).find(o => o.value === goal.player);
    if (opt) playerSelect.value = goal.player;
    else {
      const byName = homePlayers.concat(awayPlayers).find(p => p.name === goal.player);
      if (byName) playerSelect.value = byName.id;
    }
  }
  if (goal.assist) {
    const optA = Array.from(assistSelect.options).find(o => o.value === goal.assist);
    if (optA) assistSelect.value = goal.assist;
    else {
      const byNameA = homePlayers.concat(awayPlayers).find(p => p.name === goal.assist);
      if (byNameA) assistSelect.value = byNameA.id;
    }
  }

  row.appendChild(teamSelect);
  row.appendChild(playerSelect);
  row.appendChild(assistSelect);
  row.appendChild(minuteInput);
  row.appendChild(removeBtn);
  list.appendChild(row);
}

function addCardRow(card = {}, homePlayers = [], awayPlayers = []) {
  const list = document.getElementById('cards-list');
  const row = document.createElement('div');
  row.className = 'event-row';

  const teamSelect = document.createElement('select');
  const optA = document.createElement('option'); optA.value = 'home'; optA.textContent = 'Casa';
  const optB = document.createElement('option'); optB.value = 'away'; optB.textContent = 'Fora';
  teamSelect.appendChild(optA); teamSelect.appendChild(optB);
  teamSelect.value = card.team || 'home';

  const playerSelect = document.createElement('select');
  function populatePlayers(sel, players) {
    sel.innerHTML = '';
    const blank = document.createElement('option'); blank.value = ''; blank.textContent = '-- Jogador --'; sel.appendChild(blank);
    players.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
  }
  populatePlayers(playerSelect, teamSelect.value === 'home' ? homePlayers : awayPlayers);

  const typeSelect = document.createElement('select');
  const yellow = document.createElement('option'); yellow.value = 'yellow'; yellow.textContent = 'Amarelo';
  const red = document.createElement('option'); red.value = 'red'; red.textContent = 'Vermelho';
  typeSelect.appendChild(yellow); typeSelect.appendChild(red);
  typeSelect.value = card.type || 'yellow';

  const minuteInput = document.createElement('input'); minuteInput.type = 'number'; minuteInput.placeholder = 'Min'; minuteInput.min = 0; minuteInput.value = card.minute || '';
  const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'remove-event'; removeBtn.textContent = 'Remover';
  removeBtn.addEventListener('click', () => row.remove());

  teamSelect.addEventListener('change', () => {
    populatePlayers(playerSelect, teamSelect.value === 'home' ? homePlayers : awayPlayers);
  });

  if (card.player) playerSelect.value = card.player;

  row.appendChild(teamSelect);
  row.appendChild(playerSelect);
  row.appendChild(typeSelect);
  row.appendChild(minuteInput);
  row.appendChild(removeBtn);
  list.appendChild(row);
}

document.addEventListener('click', (e) => {
  if (e.target.matches('.edit-btn')) {
    const card = e.target.closest('.match-card');
    openMatchEditorFromCard(card);
  }

  if (e.target.id === 'modal-close' || e.target.id === 'cancel-match' || e.target.classList.contains('modal-backdrop')) {
    closeMatchEditor();
  }

  if (e.target.id === 'add-goal') {
    (async () => {
      const modal = document.getElementById('match-editor-modal');
      const homeId = modal.dataset.home;
      const awayId = modal.dataset.away;
      const homePlayers = homeId ? await getPlayersForTeam(homeId) : [];
      const awayPlayers = awayId ? await getPlayersForTeam(awayId) : [];
      addGoalRow({}, homePlayers, awayPlayers);
    })();
  }
  if (e.target.id === 'add-card') {
    (async () => {
      const modal = document.getElementById('match-editor-modal');
      const homeId = modal.dataset.home;
      const awayId = modal.dataset.away;
      const homePlayers = homeId ? await getPlayersForTeam(homeId) : [];
      const awayPlayers = awayId ? await getPlayersForTeam(awayId) : [];
      addCardRow({}, homePlayers, awayPlayers);
    })();
  }

  if (e.target.id === 'save-match') {
    (async () => {
      const modal = document.getElementById('match-editor-modal');
      const matchId = modal.dataset.matchId;
      const homeId = modal.dataset.home;
      const awayId = modal.dataset.away;
      if (!matchId || !homeId || !awayId) return;

      const homeScore = parseInt(document.getElementById('home-score').value) || 0;
      const awayScore = parseInt(document.getElementById('away-score').value) || 0;

      const goals = [];
      document.querySelectorAll('#goals-list .event-row').forEach(r => {
        const sel = r.querySelector('select');
        const playerSel = r.querySelectorAll('select')[1];
        const assistSel = r.querySelectorAll('select')[2];
        const minute = r.querySelector('input[type="number"]')?.value || '';
        goals.push({ team: sel.value, player: playerSel?.value || '', assist: assistSel?.value || '', minute });
      });

      const cards = [];
      document.querySelectorAll('#cards-list .event-row').forEach(r => {
        const sel = r.querySelector('select');
        const playerSel = r.querySelectorAll('select')[1];
        const typeSel = r.querySelectorAll('select')[2] || r.querySelectorAll('select')[1];
        const minute = r.querySelector('input[type="number"]')?.value || '';
        cards.push({ team: sel.value, player: playerSel?.value || '', type: typeSel?.value || 'yellow', minute });
      });

      const payload = { homeScore, awayScore, goals, cards, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };

      try {
        await saveMatchToFirestore(matchId, payload, homeId, awayId);
        updateMatchCardUI(matchId, payload);
      } catch (err) {
        console.error('Erro salvando partida:', err);
        const all = getStoredMatches();
        all[matchId] = { homeScore, awayScore, goals, cards };
        saveStoredMatches(all);
        updateMatchCardUI(matchId, all[matchId]);
      }

      closeMatchEditor();
    })();
  }
});

async function getPlayersForTeam(teamId) {
  try {
    let snap = await db.collection('players').where('teamId', '==', teamId).get();
    if (snap.empty) {
      snap = await db.collection('players').where('team', '==', teamId).get();
    }
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, name: d.data().name }));
    return arr;
  } catch (err) {
    console.error('Erro ao buscar jogadores:', err);
    return [];
  }
}

async function saveMatchToFirestore(matchId, payload, homeId, awayId) {
  const matchRef = db.collection('matches').doc(matchId);

  await db.runTransaction(async (tx) => {
    const prevSnap = await tx.get(matchRef);
    const prev = prevSnap.exists ? prevSnap.data() : null;

    const homeRef = db.collection('teams').doc(homeId);
    const awayRef = db.collection('teams').doc(awayId);

    const homeSnap = await tx.get(homeRef);
    const awaySnap = await tx.get(awayRef);

    const homeStats = (homeSnap.exists && homeSnap.data().stats) ? { ...homeSnap.data().stats } : { games:0, points:0, goalsFor:0, goalsAgainst:0, wins:0, draws:0, losses:0 };
    const awayStats = (awaySnap.exists && awaySnap.data().stats) ? { ...awaySnap.data().stats } : { games:0, points:0, goalsFor:0, goalsAgainst:0, wins:0, draws:0, losses:0 };

    const prevHomeGoals = prev?.homeScore ?? null;
    const prevAwayGoals = prev?.awayScore ?? null;

    const newHomeGoals = payload.homeScore;
    const newAwayGoals = payload.awayScore;
    const wentToPenalties = payload.wentToPenalties || false;
    const penaltyWinner = payload.penaltyWinner || '';
    const isGroupStage = matchId.startsWith('grupo-');

    // Função para calcular pontos normais (sem pênaltis)
    const pointsFor = (gf, ga) => gf > ga ? 3 : (gf === ga ? 1 : 0);

    // Função para calcular pontos com pênaltis (apenas fase de grupos)
    const calculatePoints = (homeG, awayG, penalties, winner) => {
      if (homeG > awayG) return { home: 3, away: 0 };
      if (awayG > homeG) return { home: 0, away: 3 };
      if (homeG === awayG && !penalties) return { home: 1, away: 1 };
      if (homeG === awayG && penalties && isGroupStage) {
        if (winner === 'home') return { home: 2, away: 1 };
        if (winner === 'away') return { home: 1, away: 2 };
      }
      return { home: 1, away: 1 };
    };

    // Revert previous match if exists
    if (prev) {
      homeStats.goalsFor = (homeStats.goalsFor || 0) - (prevHomeGoals || 0);
      homeStats.goalsAgainst = (homeStats.goalsAgainst || 0) - (prevAwayGoals || 0);
      homeStats.games = (homeStats.games || 0) - 1;
      
      const prevPoints = calculatePoints(prevHomeGoals, prevAwayGoals, prev.wentToPenalties, prev.penaltyWinner);
      homeStats.points = (homeStats.points || 0) - prevPoints.home;
      
      if (prevHomeGoals > prevAwayGoals) homeStats.wins = (homeStats.wins || 0) - 1;
      else if (prevHomeGoals === prevAwayGoals && (!prev.wentToPenalties || !isGroupStage)) homeStats.draws = (homeStats.draws || 0) - 1;
      else homeStats.losses = (homeStats.losses || 0) - 1;

      awayStats.goalsFor = (awayStats.goalsFor || 0) - (prevAwayGoals || 0);
      awayStats.goalsAgainst = (awayStats.goalsAgainst || 0) - (prevHomeGoals || 0);
      awayStats.games = (awayStats.games || 0) - 1;
      
      awayStats.points = (awayStats.points || 0) - prevPoints.away;
      
      if (prevAwayGoals > prevHomeGoals) awayStats.wins = (awayStats.wins || 0) - 1;
      else if (prevHomeGoals === prevAwayGoals && (!prev.wentToPenalties || !isGroupStage)) awayStats.draws = (awayStats.draws || 0) - 1;
      else awayStats.losses = (awayStats.losses || 0) - 1;
    }

    // Apply new match
    homeStats.goalsFor = (homeStats.goalsFor || 0) + newHomeGoals;
    homeStats.goalsAgainst = (homeStats.goalsAgainst || 0) + newAwayGoals;
    homeStats.games = (homeStats.games || 0) + 1;
    
    const newPoints = calculatePoints(newHomeGoals, newAwayGoals, wentToPenalties, penaltyWinner);
    homeStats.points = (homeStats.points || 0) + newPoints.home;
    
    if (newHomeGoals > newAwayGoals) homeStats.wins = (homeStats.wins || 0) + 1;
    else if (newHomeGoals === newAwayGoals && (!wentToPenalties || !isGroupStage)) homeStats.draws = (homeStats.draws || 0) + 1;
    else homeStats.losses = (homeStats.losses || 0) + 1;

    awayStats.goalsFor = (awayStats.goalsFor || 0) + newAwayGoals;
    awayStats.goalsAgainst = (awayStats.goalsAgainst || 0) + newHomeGoals;
    awayStats.games = (awayStats.games || 0) + 1;
    
    awayStats.points = (awayStats.points || 0) + newPoints.away;
    
    if (newAwayGoals > newHomeGoals) awayStats.wins = (awayStats.wins || 0) + 1;
    else if (newHomeGoals === newAwayGoals && (!wentToPenalties || !isGroupStage)) awayStats.draws = (awayStats.draws || 0) + 1;
    else awayStats.losses = (awayStats.losses || 0) + 1;

    tx.set(matchRef, { ...payload, homeTeam: homeId, awayTeam: awayId }, { merge: true });
    tx.set(homeRef, { stats: homeStats }, { merge: true });
    tx.set(awayRef, { stats: awayStats }, { merge: true });
  });
}

function updateMatchCardUI(matchId, data) {
  const card = document.querySelector(`.match-card[data-match="${matchId}"]`);
  if (!card) return;

  const scoreHome = card.querySelector('.score-home');
  const scoreAway = card.querySelector('.score-away');
  if (scoreHome && scoreAway) {
    scoreHome.textContent = data.homeScore ?? '';
    scoreAway.textContent = data.awayScore ?? '';
    return;
  }

  let scoreEl = card.querySelector('.match-score');
  if (!scoreEl) {
    scoreEl = document.createElement('div');
    scoreEl.className = 'match-score';
    scoreEl.style.fontWeight = '700';
    scoreEl.style.marginTop = '8px';
    const actions = card.querySelector('.match-actions');
    actions.parentNode.insertBefore(scoreEl, actions);
  }
  scoreEl.textContent = `${data.homeScore} - ${data.awayScore}`;
}

if (db) {
  try {
    db.collection('matches').onSnapshot((snap) => {
      snap.forEach(doc => {
        updateMatchCardUI(doc.id, doc.data());
      });
    });
  } catch (err) {
    console.warn('Erro escutando matches:', err.message || err);
  }
}
