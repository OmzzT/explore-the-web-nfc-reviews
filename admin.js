const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL;
const supabaseKey = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY;

const loginSection =
  document.getElementById("login-section");

const dashboard =
  document.getElementById("dashboard");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const loginButton =
  document.getElementById("login-button");

const logoutButton =
  document.getElementById("logout-button");

const loginError =
  document.getElementById("login-error");

const businessesContainer =
  document.getElementById("businesses");

const businessSearch =
  document.getElementById("business-search");

const businessStatusFilter =
  document.getElementById(
    "business-status-filter"
  );

const businessSort =
  document.getElementById("business-sort");

const statBusinesses =
  document.getElementById("stat-businesses");

const wizardBusinessName =
  document.getElementById(
    "wizard-business-name"
  );

const wizardOwnerEmail =
  document.getElementById(
    "wizard-owner-email"
  );

const wizardGoogleUrl =
  document.getElementById(
    "wizard-google-url"
  );

const wizardBusinessCode =
  document.getElementById(
    "wizard-business-code"
  );

const wizardCardCount =
  document.getElementById(
    "wizard-card-count"
  );

const wizardCreateButton =
  document.getElementById(
    "wizard-create-button"
  );


let businessesData = [];


if (!supabaseUrl || !supabaseKey) {

  loginError.textContent =
    "Website configuration could not be loaded.";

  throw new Error(
    "Missing Supabase configuration."
  );

}


const supabaseClient =
  window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  );


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showLogin() {

  loginSection.style.display = "flex";
  dashboard.style.display = "none";

}


function clearWizard() {

  wizardBusinessName.value = "";
  wizardOwnerEmail.value = "";
  wizardGoogleUrl.value = "";
  wizardBusinessCode.value = "";
  wizardCardCount.value = "1";

}


function renderBusinesses() {

  const searchTerm =
    businessSearch
      ?.value
      .trim()
      .toLowerCase() || "";


  const status =
    businessStatusFilter?.value ||
    "all";


  const sort =
    businessSort?.value ||
    "newest";


  let filteredBusinesses =
    businessesData.filter(
      (business) => {

        const searchableText = [
          business.business_name,
          business.business_code,
          business.owner_email
        ]
          .join(" ")
          .toLowerCase();


        const matchesSearch =
          searchableText.includes(
            searchTerm
          );


        let matchesStatus = true;


        if (status === "active") {

          matchesStatus =
            business.is_active === true;

        }


        if (status === "inactive") {

          matchesStatus =
            business.is_active === false;

        }


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  filteredBusinesses =
    [...filteredBusinesses].sort(
      (a, b) => {

        if (sort === "oldest") {

          return (
            new Date(a.created_at) -
            new Date(b.created_at)
          );

        }


        if (sort === "name") {

          return String(
            a.business_name
          ).localeCompare(
            String(b.business_name)
          );

        }


        return (
          new Date(b.created_at) -
          new Date(a.created_at)
        );

      }
    );


  if (
    filteredBusinesses.length === 0
  ) {

    businessesContainer.innerHTML = `
      <p style="color:#6b7280;">
        No businesses match your search.
      </p>
    `;

    return;

  }


  businessesContainer.innerHTML =
    filteredBusinesses
      .map(
        (business) => {

          const businessName =
            escapeHtml(
              business.business_name
            );

          const businessCode =
            escapeHtml(
              business.business_code
            );

          const ownerEmail =
            escapeHtml(
              business.owner_email
            );

          const reviewUrl =
            escapeHtml(
              business.google_review_url
            );


          return `
            <div>

              <h3>
                ${businessName}
              </h3>

              <p>
                <strong>
                  Business code:
                </strong>

                ${businessCode}
              </p>

              <p>
                <strong>
                  Owner email:
                </strong>

                ${ownerEmail}
              </p>

              <p>
                <strong>
                  Status:
                </strong>

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

        }
      )
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
      <p>
        Could not load businesses.
      </p>
    `;

    console.error(
      "Business loading error:",
      error
    );

    return;

  }


  businessesData =
    data || [];


  if (statBusinesses) {

    statBusinesses.textContent =
      businessesData.length;

  }


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
    await supabaseClient.auth
      .getSession();


  if (session) {

    await showDashboard();

  } else {

    showLogin();

  }

}


/* ---------------------------
   CREATE NEW CUSTOMER
---------------------------- */

async function createCustomer() {

  const businessName =
    wizardBusinessName.value.trim();

  const ownerEmail =
    wizardOwnerEmail.value.trim();

  const googleReviewUrl =
    wizardGoogleUrl.value.trim();

  const businessCode =
    wizardBusinessCode
      .value
      .trim()
      .toUpperCase();

  const cardCount =
    Number(
      wizardCardCount.value
    );


  if (
    !businessName ||
    !ownerEmail ||
    !googleReviewUrl ||
    !businessCode
  ) {

    alert(
      "Please complete all customer fields."
    );

    return;

  }


  try {

    new URL(googleReviewUrl);

  } catch {

    alert(
      "Please enter a valid Google review link."
    );

    return;

  }


  wizardCreateButton.disabled = true;

  wizardCreateButton.textContent =
    "Creating customer...";


  const { data, error } =
    await supabaseClient.rpc(
      "admin_create_customer",
      {
        p_business_name:
          businessName,

        p_owner_email:
          ownerEmail,

        p_google_review_url:
          googleReviewUrl,

        p_business_code:
          businessCode,

        p_card_count:
          cardCount
      }
    );


  wizardCreateButton.disabled = false;

  wizardCreateButton.textContent =
    "Create Customer";


  if (error) {

    console.error(
      "Create customer error:",
      error
    );


    if (
      error.message
        ?.toLowerCase()
        .includes(
          "business code already exists"
        )
    ) {

      alert(
        "That business code already exists. Please choose another code."
      );

      return;

    }


    alert(
      "Customer could not be created. Please try again."
    );

    return;

  }


  const createdCards =
    data || [];


  const cardDetails =
    createdCards
      .map(
        (row) => {

          const cardCode =
            row.card_code;

          const cardUrl =
            `${window.location.origin}/?card=${encodeURIComponent(
              cardCode
            )}`;


          return (
            `${cardCode}\n` +
            `${cardUrl}`
          );

        }
      )
      .join("\n\n");


  alert(
    `Customer created successfully! ✅\n\n` +
    `Business: ${businessName}\n` +
    `Business code: ${businessCode}\n\n` +
    `NFC card(s):\n${cardDetails}`
  );


  clearWizard();


  await loadBusinesses();


  if (
    typeof window.openAdminSection ===
    "function"
  ) {

    window.openAdminSection(
      "businesses-page"
    );

  }

}


/* ---------------------------
   SEARCH / FILTER / SORT
---------------------------- */

if (businessSearch) {

  businessSearch.addEventListener(
    "input",
    renderBusinesses
  );

}


if (businessStatusFilter) {

  businessStatusFilter.addEventListener(
    "change",
    renderBusinesses
  );

}


if (businessSort) {

  businessSort.addEventListener(
    "change",
    renderBusinesses
  );

}


/* ---------------------------
   CREATE CUSTOMER BUTTON
---------------------------- */

if (wizardCreateButton) {

  wizardCreateButton.addEventListener(
    "click",
    createCustomer
  );

}


/* ---------------------------
   LOGIN
---------------------------- */

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


/* ---------------------------
   LOGOUT
---------------------------- */

logoutButton.addEventListener(
  "click",
  async () => {

    await supabaseClient.auth
      .signOut();

    showLogin();

  }
);


/* ---------------------------
   AUTH CHANGES
---------------------------- */

supabaseClient.auth
  .onAuthStateChange(
    async (_event, session) => {

      if (session) {

        await showDashboard();

      } else {

        showLogin();

      }

    }
  );


checkLogin();
