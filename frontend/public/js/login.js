const tabLogin = document.getElementById('tabLogin');
const tabSignin = document.getElementById('tabSignin');
const formTitle = document.getElementById('formTitle');
const nameField = document.getElementById('nameField');
const roleField = document.getElementById('roleField');
const submitLabel = document.getElementById('submitLabel');
const authForm = document.getElementById('authForm');
const formError = document.getElementById('formError');

let mode = 'login'; // 'login' | 'signin' (signin = create account, per mockup wording)

// If already logged in, go straight to dashboard
if (localStorage.getItem('taskify_token')) {
  window.location.href = './dashboard.html';
}

function setMode(newMode) {
  mode = newMode;
  formError.classList.add('hidden');

  if (mode === 'login') {
    tabLogin.classList.add('bg-white', 'text-primary');
    tabLogin.classList.remove('text-white/80');
    tabSignin.classList.remove('bg-white', 'text-primary');
    tabSignin.classList.add('text-white/80');
    formTitle.textContent = 'LOGIN';
    submitLabel.textContent = 'LOGIN';
    nameField.classList.add('hidden');
    roleField.classList.add('hidden');
  } else {
    tabSignin.classList.add('bg-white', 'text-primary');
    tabSignin.classList.remove('text-white/80');
    tabLogin.classList.remove('bg-white', 'text-primary');
    tabLogin.classList.add('text-white/80');
    formTitle.textContent = 'SIGN IN';
    submitLabel.textContent = 'CREATE ACCOUNT';
    nameField.classList.remove('hidden');
    roleField.classList.remove('hidden');
  }
}

tabLogin.addEventListener('click', () => setMode('login'));
tabSignin.addEventListener('click', () => setMode('signin'));

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value.trim();
  const role = document.getElementById('role').value.trim();

  try {
    let result;
    if (mode === 'login') {
      result = await TaskifyAPI.login(email, password);
    } else {
      if (!name) throw new Error('Please enter your full name');
      if (!role) throw new Error('Please enter your job title / role');
      result = await TaskifyAPI.register(name, email, password, role);
    }
    saveSession(result.token, result.user);
    window.location.href = './dashboard.html';
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.remove('hidden');
  }
});

setMode('login');