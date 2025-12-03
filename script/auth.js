// Initialize Firebase from runtime-generated config (firebase-config.js)
if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
  if (!firebase.apps.length) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
} else {
  console.warn('FIREBASE_CONFIG not found. Make sure firebase-config.js is generated and loaded before auth.js');
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

