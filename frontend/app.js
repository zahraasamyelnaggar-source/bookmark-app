const API_URL = 'https://bookmark-app-production-98c0.up.railway.app/api';
let isRegisterMode = false;

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  document.getElementById('authTitle').textContent = isRegisterMode ? 'Register' : 'Login';
  document.querySelector('#authSection button').textContent = isRegisterMode ? 'Register' : 'Login';
  document.querySelector('#authSection .secondary').textContent = isRegisterMode
    ? 'Switch to Login'
    : 'Switch to Register';
}

async function handleAuth() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = '';

  const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorDiv.textContent = data.error || (data.errors && data.errors[0].msg) || 'Something went wrong';
      return;
    }

    localStorage.setItem('token', data.token);
    showApp();
  } catch (err) {
    errorDiv.textContent = 'Could not connect to server';
  }
}

function logout() {
  localStorage.removeItem('token');
  document.getElementById('appSection').classList.add('hidden');
  document.getElementById('authSection').classList.remove('hidden');
}

function showApp() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('appSection').classList.remove('hidden');
  loadBookmarks();
}

async function loadBookmarks() {
  const token = localStorage.getItem('token');
  const listDiv = document.getElementById('bookmarkList');

  try {
    const res = await fetch(`${API_URL}/bookmarks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const bookmarks = await res.json();

    if (!res.ok) {
      listDiv.innerHTML = '<p>Could not load bookmarks.</p>';
      return;
    }

    if (bookmarks.length === 0) {
      listDiv.innerHTML = '<p>No bookmarks yet — add one above!</p>';
      return;
    }

    listDiv.innerHTML = bookmarks
      .map(
        (b) => `
      <div class="bookmark">
        <a href="${b.url}" target="_blank">${b.title}</a>
        <p>${b.description || ''}</p>
        <button class="danger" onclick="deleteBookmark(${b.id})">Delete</button>
      </div>
    `
      )
      .join('');
  } catch (err) {
    listDiv.innerHTML = '<p>Could not connect to server.</p>';
  }
}

async function createBookmark() {
  const token = localStorage.getItem('token');
  const title = document.getElementById('bmTitle').value;
  const url = document.getElementById('bmUrl').value;
  const description = document.getElementById('bmDescription').value;

  try {
    const res = await fetch(`${API_URL}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, url, description }),
    });

    if (res.ok) {
      document.getElementById('bmTitle').value = '';
      document.getElementById('bmUrl').value = '';
      document.getElementById('bmDescription').value = '';
      loadBookmarks();
    } else {
      const data = await res.json();
      alert(data.error || 'Could not add bookmark');
    }
  } catch (err) {
    alert('Could not connect to server');
  }
}

async function deleteBookmark(id) {
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/bookmarks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadBookmarks();
    } else {
      alert('Could not delete bookmark');
    }
  } catch (err) {
    alert('Could not connect to server');
  }
}

window.onload = () => {
  const token = localStorage.getItem('token');
  if (token) {
    showApp();
  }
};