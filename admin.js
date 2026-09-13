const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL;
const supabaseKey = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY;

const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const loginError = document.getElementById("login-error");
const businessesContainer = document.getElementById("businesses");

if (!supabaseUrl || !supabaseKey) {
  loginError.textContent = "Website configuration could not be loaded.";
  throw new Error("Missing Supabase configuration.");
}

const supabaseClient = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

function showLogin() {
  loginSection.style.display = "block";
  dashboard.style.display = "none";
}

function showDashboard() {
  loginSection.style.display = "none";
  dashboard.style.display = "block";

  businessesContainer.innerHTML =
    "<p>Logged in successfully. Business data will be connected next.</p>";
}

async function checkLogin() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    showDashboard();
  } else {
    showLogin();
  }
}

loginButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginError.textContent = "";

  if (!email || !password) {
    loginError.textContent = "Please enter your email and password.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  loginButton.disabled = false;
  loginButton.textContent = "Log in";

  if (error) {
    loginError.textContent = "Incorrect email or password.";
    return;
  }

  passwordInput.value = "";
  showDashboard();
});

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showDashboard();
  } else {
    showLogin();
  }
});

checkLogin();
