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

const businessSearch = document.getElementById("business-search");
const businessStatusFilter = document.getElementById(
  "business-status-filter"
);
const businessSort = document.getElementById("business-sort");

let businessesData = [];


if (!supabaseUrl || !supabaseKey) {
  loginError.textContent =
    "Website configuration could not be loaded.";

  throw new Error("Missing Supabase configuration.");
}


const supabaseClient = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);


function showLogin() {
  loginSection.style.display = "flex";
  dashboard.style.display = "none";
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function renderBusinesses() {
  const searchTerm =
    businessSearch.value.trim().toLowerCase();

  const status =
    businessStatusFilter.value;

  const sort =
    businessSort.value;


  let filteredBusinesses =
    businessesData.filter((business) => {
      const searchableText = [
        business.business_name,
        business.business_code,
        business.owner_email
      ]
        .join(" ")
        .toLowerCase();


      const matchesSearch =
        searchableText.includes(searchTerm);


      let matchesStatus = true;

      if (status === "active") {
        matchesStatus =
          business.is_active === true;
      }

      if (status === "inactive") {
        matchesStatus =
          business.is_active === false;
      }


      return matchesSearch && matchesStatus;
    });


  filteredBusinesses =
    [...filteredBusinesses].sort((a, b) => {
      if (sort === "oldest") {
        return (
          new Date(a.created_at) -
          new Date(b.created_at)
        );
      }

      if (sort === "name") {
        return String(a.business_name)
          .localeCompare(
            String(b.business_name)
          );
      }

      return (
        new Date(b.created_at) -
        new Date(a.created_at)
      );
    });


  if (filteredBusinesses.length === 0) {
    businessesContainer.innerHTML = `
      <p style="color:#6b7280;">
        No businesses match your search.
      </p>
    `;

    return;
  }


  businessesContainer.innerHTML =
    filteredBusinesses
      .map((business) => {
        const businessName =
          escapeHtml(business.business_name);

        const businessCode =
          escapeHtml(business.business_code);

        const ownerEmail =
          escapeHtml(business.owner_email);

        const reviewUrl =
          escapeHtml(
            business.google_review_url
          );


        return `
          <div>
            <h3>${businessName}</h3>

            <p>
              <strong>Business code:</strong>
              ${businessCode}
            </p>

            <p>
              <strong>Owner email:</strong>
              ${ownerEmail}
            </p>

            <p>
              <strong>Status:</strong>
              ${
                business.is_active
                  ? "Active"
                  : "Inactive"
              }
            </p>

            <p>
              <a
                href="${reviewUrl}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Google review link
              </a>
            </p>
          </div>
        `;
      })
      .join("");
}


async function loadBusinesses() {
  businessesContainer.innerHTML =
    "<p>Loading businesses...</p>";


  const { data, error } =
    await supabaseClient.rpc(
      "get_admin_businesses"
    );


  if (error) {
    businessesContainer.innerHTML = `
      <p>Could not load businesses.</p>
    `;

    console.error(error);
    return;
  }


  businessesData = data || [];

  document.getElementById(
    "stat-businesses"
  ).textContent =
    businessesData.length;


  renderBusinesses();
}


async function showDashboard() {
  loginSection.style.display = "none";
  dashboard.style.display = "block";

  await loadBusinesses();
}


async function checkLogin() {
  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();


  if (session) {
    await showDashboard();
  } else {
    showLogin();
  }
}


businessSearch.addEventListener(
  "input",
  renderBusinesses
);


businessStatusFilter.addEventListener(
  "change",
  renderBusinesses
);


businessSort.addEventListener(
  "change",
  renderBusinesses
);


loginButton.addEventListener(
  "click",
  async () => {
    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;


    loginError.textContent = "";


    if (!email || !password) {
      loginError.textContent =
        "Please enter your email and password.";

      return;
    }


    loginButton.disabled = true;
    loginButton.textContent =
      "Logging in...";


    const { error } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });


    loginButton.disabled = false;
    loginButton.textContent =
      "Log in";


    if (error) {
      loginError.textContent =
        "Incorrect email or password.";

      return;
    }


    passwordInput.value = "";

    await showDashboard();
  }
);


logoutButton.addEventListener(
  "click",
  async () => {
    await supabaseClient.auth.signOut();

    showLogin();
  }
);


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
