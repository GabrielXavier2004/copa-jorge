// Configuração do Firebase (compartilhada)
const firebaseConfig = {
    apiKey: "AIzaSyBhMWuCx4MqBUZu35s4ZcGk_EXcqfeS5Yc",
    authDomain: "fsm-cup.firebaseapp.com",
    projectId: "fsm-cup",
    storageBucket: "fsm-cup.firebasestorage.app",
    messagingSenderId: "800855291916",
    appId: "1:800855291916:web:43851e7e0ab36702085629"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Autenticação contra a collection 'users' (email + password)
async function loginFromFirestore(email, password) {
  try {
    const db = firebase.firestore();
    const usersSnap = await db.collection('users').where('email', '==', email).get();
    
    if (usersSnap.empty) {
      throw new Error('Email não encontrado.');
    }
    
    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    
    // Verificar senha (em produção, use hash bcrypt no backend)
    if (userData.password !== password) {
      throw new Error('Senha incorreta.');
    }
    
    // Salvar dados do usuário no localStorage
    localStorage.setItem('currentUser', JSON.stringify({
      id: userDoc.id,
      email: userData.email,
      name: userData.name || 'Admin'
    }));
    
    return { id: userDoc.id, email: userData.email, name: userData.name };
  } catch (err) {
    throw err;
  }
}

// Verificar se usuário está logado
function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

// Fazer logout
function logout() {
  localStorage.removeItem('currentUser');
}

// Helper para verificar autenticação (compatível com admin.html)
function checkAuth() {
  return new Promise((resolve) => {
    const user = getCurrentUser();
    resolve(user);
  });
}

