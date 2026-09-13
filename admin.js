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

async function loadBusinesses() {
  businessesContainer.innerHTML = "<p>Loading businesses...</p>";

  const { data, error } = await supabaseClient.rpc(
    "get_admin_businesses"
  );

  if (error) {
    businessesContainer.innerHTML =
      "<p>Could not load businesses.</p>";

    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    businessesContainer.innerHTML =
      "<p>No businesses found.</p>";
    return;
  }

  businessesContainer.innerHTML = data
    .map(
      (business) => `
        <div style="
          border:1px solid #ddd;
          padding:16px;
          margin:12px 0;
          border-radius:8px;
        ">
          <h3>${business.business_name}</h3>

          <p>
            <strong>Business code:</strong>
            ${business.business_code}
          </p>

          <p>
            <strong>Owner email:</strong>
            ${business.owner_email}
          </p>

          <p>
            <strong>Status:</strong>
            ${business.is_active ? "Active" : "Inactive"}
          </p>

          <p>
            <a
              href="${business.google_review_url}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Google review link
            </a>
          </p>
        </div>
      `
    )
    .join("");
}

async function showDashboard() {
  loginSection.style.display = "none";
  dashboard.style.display = "block";

  await loadBusinesses();
}

async function checkLogin() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    await showDashboard();
  } else {
    showLogin();
  }
}

loginButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginError.textContent = "";

  if (!email || !password) {
    loginError.textContent =
      "Please enter your email and password.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  loginButton.disabled = false;
  loginButton.textContent = "Log in";

  if (error) {
    loginError.textContent =
      "Incorrect email or password.";
    return;
  }

  passwordInput.value = "";
  await showDashboard();
});

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

supabaseClient.auth.onAuthStateChange(
  async (_event, session) => {
    if (session) {
      await showDashboard();
    } else {
      showLogin();
    }
  }
);

checkLogin();
