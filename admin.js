const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL;
const supabaseKey = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY;

/* =========================
   ELEMENTS
========================= */

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

const statBusinesses = document.getElementById("stat-businesses");
const statActiveCards = document.getElementById("stat-active-cards");
const statTaps = document.getElementById("stat-taps");
const statGoogleClicks = document.getElementById("stat-google-clicks");
const statFeedback = document.getElementById("stat-feedback");

const wizardBusinessName = document.getElementById(
  "wizard-business-name"
);
const wizardOwnerEmail = document.getElementById(
  "wizard-owner-email"
);
const wizardGoogleUrl = document.getElementById(
  "wizard-google-url"
);
const wizardBusinessCode = document.getElementById(
  "wizard-business-code"
);
const wizardCardCount = document.getElementById(
  "wizard-card-count"
);
const wizardCreateButton = document.getElementById(
  "wizard-create-button"
);

/* =========================
   DATA
========================= */

let businessesData = [];
let nfcCardsData = [];
let feedbackData = [];

let nfcSearchTerm = "";
let feedbackSearchTerm = "";
let feedbackRatingFilter = "all";

let analyticsData = {
  nfc_taps: 0,
  google_redirects: 0,
  private_feedback: 0
};

/* =========================
   CONFIG
========================= */

if (!supabaseUrl || !supabaseKey) {
  loginError.textContent =
    "Website configuration could not be loaded.";

  throw new Error("Missing Supabase configuration.");
}

const supabaseClient = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

/* =========================
   HELPERS
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function percentage(value, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function showLogin() {
  loginSection.style.display = "flex";
  dashboard.style.display = "none";
}

function clearWizard() {
  if (wizardBusinessName) {
    wizardBusinessName.value = "";
  }

  if (wizardOwnerEmail) {
    wizardOwnerEmail.value = "";
  }

  if (wizardGoogleUrl) {
    wizardGoogleUrl.value = "";
  }

  if (wizardBusinessCode) {
    wizardBusinessCode.value = "";
  }

  if (wizardCardCount) {
    wizardCardCount.value = "1";
  }
}

/* =========================
   BUSINESSES
========================= */

function renderBusinesses() {
  if (!businessesContainer) {
    return;
  }

  const searchTerm =
    businessSearch?.value.trim().toLowerCase() || "";

  const status =
    businessStatusFilter?.value || "all";

  const sort =
    businessSort?.value || "newest";

  let filteredBusinesses = businessesData.filter(
    (business) => {
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
    }
  );

  filteredBusinesses = [...filteredBusinesses].sort(
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
          escapeHtml(business.google_review_url);

        return `
          <div>

            <h3>
              ${businessName}
            </h3>

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
  if (!businessesContainer) {
    return;
  }

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

    console.error(
      "Business loading error:",
      error
    );

    return;
  }

  businessesData = data || [];

  if (statBusinesses) {
    statBusinesses.textContent =
      businessesData.length;
  }

  renderBusinesses();
}

/* =========================
   NFC CARDS
========================= */

function getNfcPanel() {
  const page =
    document.getElementById("nfc-page");

  return page?.querySelector(".panel") || null;
}

function renderNfcCards() {
  const panel = getNfcPanel();

  if (!panel) {
    return;
  }

  const filteredCards = nfcCardsData.filter(
    (card) => {
      const searchableText = [
        card.card_code,
        card.business_name,
        card.label
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        nfcSearchTerm
      );
    }
  );

  const rows = filteredCards
    .map((card) => {
      const cardCode =
        escapeHtml(card.card_code);

      const businessName =
        escapeHtml(card.business_name);

      const label =
        escapeHtml(card.label || "NFC Card");

      const createdAt =
        escapeHtml(
          formatDate(card.created_at)
        );

      const cardUrl = `https://reviewcard.uk/?card=${encodeURIComponent(card.card_code)}`;

      return `
        <div style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          background:#fff;
          display:grid;
          grid-template-columns:
            minmax(160px,1fr)
            minmax(180px,1.4fr)
            minmax(100px,.7fr)
            auto;
          gap:18px;
          align-items:center;
        ">

          <div>
            <div style="
              font-size:12px;
              color:#6b7280;
              margin-bottom:5px;
            ">
              CARD CODE
            </div>

            <strong style="font-size:17px;">
              ${cardCode}
            </strong>

            <div style="
              color:#6b7280;
              font-size:13px;
              margin-top:5px;
            ">
              ${label}
            </div>
          </div>

          <div>
            <div style="
              font-size:12px;
              color:#6b7280;
              margin-bottom:5px;
            ">
              BUSINESS
            </div>

            <strong>
              ${businessName}
            </strong>

            <div style="
              color:#6b7280;
              font-size:13px;
              margin-top:5px;
            ">
              Created ${createdAt}
            </div>
          </div>

          <div>
            <div style="
              font-size:12px;
              color:#6b7280;
              margin-bottom:5px;
            ">
              STATUS
            </div>

            <span style="
              display:inline-block;
              padding:6px 10px;
              border-radius:999px;
              background:${
                card.is_active
                  ? "#dcfce7"
                  : "#f3f4f6"
              };
              color:${
                card.is_active
                  ? "#166534"
                  : "#6b7280"
              };
              font-size:12px;
              font-weight:700;
            ">
              ${
                card.is_active
                  ? "ACTIVE"
                  : "INACTIVE"
              }
            </span>
          </div>

          <div style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            justify-content:flex-end;
          ">

            <a
              href="${cardUrl}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display:inline-block;
                padding:9px 12px;
                border-radius:9px;
                background:#111827;
                color:white;
                text-decoration:none;
                font-size:13px;
                font-weight:700;
              "
            >
              Open Card
            </a>

            <button
              type="button"
              class="copy-card-link"
              data-url="${escapeHtml(cardUrl)}"
              style="
                border:1px solid #d1d5db;
                background:white;
                padding:9px 12px;
                border-radius:9px;
                font-size:13px;
                font-weight:700;
              "
            >
              Copy URL
            </button>

          </div>

        </div>
      `;
    })
    .join("");

  panel.innerHTML = `
    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      flex-wrap:wrap;
      margin-bottom:18px;
    ">

      <div>
        <h2 style="
          margin:0 0 5px;
          font-size:20px;
        ">
          All NFC Cards
        </h2>

        <p style="
          margin:0;
          color:#6b7280;
          font-size:14px;
        ">
          ${nfcCardsData.length}
          card${
            nfcCardsData.length === 1
              ? ""
              : "s"
          }
          in your network
        </p>
      </div>

      <input
        id="nfc-card-search"
        type="search"
        value="${escapeHtml(nfcSearchTerm)}"
        placeholder="Search card or business..."
        style="
          min-width:280px;
          padding:11px 13px;
          border:1px solid #d1d5db;
          border-radius:10px;
          outline:none;
        "
      >

    </div>

    <div style="
      display:grid;
      gap:12px;
    ">
      ${
        filteredCards.length
          ? rows
          : `
            <div style="
              padding:40px 20px;
              text-align:center;
              color:#6b7280;
              border:1px dashed #d1d5db;
              border-radius:14px;
            ">
              No NFC cards match your search.
            </div>
          `
      }
    </div>
  `;

  const searchInput =
    document.getElementById(
      "nfc-card-search"
    );

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      (event) => {
        nfcSearchTerm =
          event.target.value
            .trim()
            .toLowerCase();

        renderNfcCards();

        const nextSearch =
          document.getElementById(
            "nfc-card-search"
          );

        if (nextSearch) {
          nextSearch.focus();

          nextSearch.setSelectionRange(
            nextSearch.value.length,
            nextSearch.value.length
          );
        }
      }
    );
  }

  document
    .querySelectorAll(".copy-card-link")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const url = button.dataset.url;

          try {
            await navigator.clipboard.writeText(
              url
            );

            const oldText =
              button.textContent;

            button.textContent =
              "Copied ✓";

            setTimeout(() => {
              button.textContent =
                oldText;
            }, 1500);
          } catch {
            window.prompt(
              "Copy this NFC URL:",
              url
            );
          }
        }
      );
    });
}

async function loadNfcCards() {
  const panel = getNfcPanel();

  if (!panel) {
    return;
  }

  panel.innerHTML =
    "<p>Loading NFC cards...</p>";

  const { data, error } =
    await supabaseClient.rpc(
      "get_admin_nfc_cards"
    );

  if (error) {
    panel.innerHTML = `
      <p>Could not load NFC cards.</p>
    `;

    console.error(
      "NFC card loading error:",
      error
    );

    return;
  }

  nfcCardsData = data || [];

  if (statActiveCards) {
    statActiveCards.textContent =
      nfcCardsData.filter(
        (card) =>
          card.is_active === true
      ).length;
  }

  renderNfcCards();
}

/* =========================
   FEEDBACK
========================= */

function getFeedbackPanel() {
  const page =
    document.getElementById(
      "feedback-page"
    );

  return page?.querySelector(".panel") || null;
}

function renderStars(rating) {
  const safeRating = Math.max(
    0,
    Math.min(
      5,
      Number(rating) || 0
    )
  );

  return (
    "★".repeat(safeRating) +
    "☆".repeat(5 - safeRating)
  );
}

function renderFeedback() {
  const panel = getFeedbackPanel();

  if (!panel) {
    return;
  }

  const filteredFeedback =
    feedbackData.filter((item) => {
      const searchableText = [
        item.business_name,
        item.business_code,
        item.card_code,
        item.comment
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(
          feedbackSearchTerm
        );

      const matchesRating =
        feedbackRatingFilter === "all" ||
        String(item.rating) ===
          feedbackRatingFilter;

      return (
        matchesSearch &&
        matchesRating
      );
    });

  const rows = filteredFeedback
    .map((item) => {
      const businessName =
        escapeHtml(item.business_name);

      const businessCode =
        escapeHtml(item.business_code);

      const cardCode =
        escapeHtml(
          item.card_code || "Unknown card"
        );

      const comment =
        escapeHtml(
          item.comment ||
            "No written comment."
        );

      const rating =
        Number(item.rating) || 0;

      return `
        <div style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:20px;
          background:white;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:18px;
            flex-wrap:wrap;
            margin-bottom:14px;
          ">

            <div>
              <h3 style="
                margin:0 0 5px;
                font-size:18px;
              ">
                ${businessName}
              </h3>

              <div style="
                color:#6b7280;
                font-size:13px;
              ">
                ${businessCode}
                • Card ${cardCode}
              </div>
            </div>

            <div style="text-align:right;">
              <div style="
                color:#d97706;
                font-size:20px;
                letter-spacing:2px;
                font-weight:700;
              ">
                ${renderStars(rating)}
              </div>

              <div style="
                color:#6b7280;
                font-size:12px;
                margin-top:4px;
              ">
                ${rating}/5 rating
              </div>
            </div>

          </div>

          <div style="
            background:#f9fafb;
            border:1px solid #f0f1f3;
            border-radius:11px;
            padding:14px 16px;
            line-height:1.6;
            color:#374151;
          ">
            ${comment}
          </div>

        </div>
      `;
    })
    .join("");

  panel.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:16px;
      flex-wrap:wrap;
      margin-bottom:18px;
    ">

      <div>
        <h2 style="
          margin:0 0 5px;
          font-size:20px;
        ">
          Feedback Inbox
        </h2>

        <p style="
          margin:0;
          color:#6b7280;
          font-size:14px;
        ">
          ${feedbackData.length}
          feedback entr${
            feedbackData.length === 1
              ? "y"
              : "ies"
          }
        </p>
      </div>

      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      ">

        <input
          id="feedback-search"
          type="search"
          value="${escapeHtml(
            feedbackSearchTerm
          )}"
          placeholder="Search business or comment..."
          style="
            min-width:280px;
            padding:11px 13px;
            border:1px solid #d1d5db;
            border-radius:10px;
            outline:none;
          "
        >

        <select
          id="feedback-rating-filter"
          style="
            padding:11px 13px;
            border:1px solid #d1d5db;
            border-radius:10px;
            background:white;
          "
        >
          <option
            value="all"
            ${
              feedbackRatingFilter ===
              "all"
                ? "selected"
                : ""
            }
          >
            All ratings
          </option>

          <option
            value="1"
            ${
              feedbackRatingFilter ===
              "1"
                ? "selected"
                : ""
            }
          >
            1 star
          </option>

          <option
            value="2"
            ${
              feedbackRatingFilter ===
              "2"
                ? "selected"
                : ""
            }
          >
            2 stars
          </option>

          <option
            value="3"
            ${
              feedbackRatingFilter ===
              "3"
                ? "selected"
                : ""
            }
          >
            3 stars
          </option>
        </select>

      </div>

    </div>

    <div style="
      display:grid;
      gap:12px;
    ">
      ${
        filteredFeedback.length
          ? rows
          : `
            <div style="
              padding:50px 20px;
              text-align:center;
              color:#6b7280;
              border:1px dashed #d1d5db;
              border-radius:14px;
            ">
              No feedback matches your filters.
            </div>
          `
      }
    </div>
  `;

  const search =
    document.getElementById(
      "feedback-search"
    );

  if (search) {
    search.addEventListener(
      "input",
      (event) => {
        feedbackSearchTerm =
          event.target.value
            .trim()
            .toLowerCase();

        renderFeedback();

        const nextSearch =
          document.getElementById(
            "feedback-search"
          );

        if (nextSearch) {
          nextSearch.focus();

          nextSearch.setSelectionRange(
            nextSearch.value.length,
            nextSearch.value.length
          );
        }
      }
    );
  }

  const ratingFilter =
    document.getElementById(
      "feedback-rating-filter"
    );

  if (ratingFilter) {
    ratingFilter.addEventListener(
      "change",
      (event) => {
        feedbackRatingFilter =
          event.target.value;

        renderFeedback();
      }
    );
  }
}

async function loadFeedback() {
  const panel = getFeedbackPanel();

  if (!panel) {
    return;
  }

  panel.innerHTML =
    "<p>Loading feedback...</p>";

  const { data, error } =
    await supabaseClient.rpc(
      "get_admin_feedback"
    );

  if (error) {
    panel.innerHTML = `
      <p>Could not load feedback.</p>
    `;

    console.error(
      "Feedback loading error:",
      error
    );

    return;
  }

  feedbackData = data || [];

  renderFeedback();
}

/* =========================
   ANALYTICS
========================= */

function getAnalyticsPage() {
  return document.getElementById(
    "analytics-page"
  );
}

function renderAnalytics() {
  const page = getAnalyticsPage();

  if (!page) {
    return;
  }

  const statNumbers =
    page.querySelectorAll(
      ".stat-number"
    );

  if (statNumbers[0]) {
    statNumbers[0].textContent =
      analyticsData.nfc_taps;
  }

  if (statNumbers[1]) {
    statNumbers[1].textContent =
      analyticsData.google_redirects;
  }

  if (statNumbers[2]) {
    statNumbers[2].textContent =
      analyticsData.private_feedback;
  }

  if (statTaps) {
    statTaps.textContent =
      analyticsData.nfc_taps;
  }

  if (statGoogleClicks) {
    statGoogleClicks.textContent =
      analyticsData.google_redirects;
  }

  if (statFeedback) {
    statFeedback.textContent =
      analyticsData.private_feedback;
  }

  const panel =
    page.querySelector(".panel");

  if (!panel) {
    return;
  }

  const taps =
    Number(
      analyticsData.nfc_taps
    ) || 0;

  const redirects =
    Number(
      analyticsData.google_redirects
    ) || 0;

  const feedback =
    Number(
      analyticsData.private_feedback
    ) || 0;

  const resolvedActions =
    redirects + feedback;

  panel.innerHTML = `
    <div style="
      margin-bottom:20px;
    ">
      <h2 style="
        margin:0 0 6px;
        font-size:20px;
      ">
        Performance Overview
      </h2>

      <p style="
        margin:0;
        color:#6b7280;
        font-size:14px;
      ">
        Live activity from your NFC review network.
      </p>
    </div>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(
          3,
          minmax(180px,1fr)
        );
      gap:14px;
      margin-bottom:20px;
    ">

      <div style="
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:18px;
        background:#f9fafb;
      ">
        <div style="
          color:#6b7280;
          font-size:12px;
          margin-bottom:8px;
        ">
          GOOGLE REDIRECT RATE
        </div>

        <div style="
          font-size:28px;
          font-weight:800;
        ">
          ${percentage(
            redirects,
            taps
          )}
        </div>

        <div style="
          color:#6b7280;
          font-size:13px;
          margin-top:6px;
        ">
          ${redirects} redirect${
            redirects === 1
              ? ""
              : "s"
          }
          from ${taps} card opens
        </div>
      </div>

      <div style="
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:18px;
        background:#f9fafb;
      ">
        <div style="
          color:#6b7280;
          font-size:12px;
          margin-bottom:8px;
        ">
          PRIVATE FEEDBACK RATE
        </div>

        <div style="
          font-size:28px;
          font-weight:800;
        ">
          ${percentage(
            feedback,
            taps
          )}
        </div>

        <div style="
          color:#6b7280;
          font-size:13px;
          margin-top:6px;
        ">
          ${feedback} feedback entr${
            feedback === 1
              ? "y"
              : "ies"
          }
        </div>
      </div>

      <div style="
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:18px;
        background:#f9fafb;
      ">
        <div style="
          color:#6b7280;
          font-size:12px;
          margin-bottom:8px;
        ">
          RECORDED OUTCOMES
        </div>

        <div style="
          font-size:28px;
          font-weight:800;
        ">
          ${resolvedActions}
        </div>

        <div style="
          color:#6b7280;
          font-size:13px;
          margin-top:6px;
        ">
          Google redirects + private feedback
        </div>
      </div>

    </div>

    <div style="
      padding:15px 16px;
      border-radius:12px;
      background:#f9fafb;
      border:1px solid #e5e7eb;
      color:#6b7280;
      font-size:13px;
      line-height:1.6;
    ">
      <strong style="color:#374151;">
        Tracking note:
      </strong>
      card-open tracking started when the new analytics code was deployed,
      so older visits from before that deployment are not included in the NFC
      Taps total.
    </div>
  `;
}

async function loadAnalytics() {
  const { data, error } =
    await supabaseClient.rpc(
      "get_admin_analytics"
    );

  if (error) {
    console.error(
      "Analytics loading error:",
      error
    );

    return;
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  analyticsData = {
    nfc_taps:
      Number(
        row?.nfc_taps
      ) || 0,

    google_redirects:
      Number(
        row?.google_redirects
      ) || 0,

    private_feedback:
      Number(
        row?.private_feedback
      ) || 0
  };

  renderAnalytics();
}

/* =========================
   CREATE CUSTOMER
========================= */

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
    Number(wizardCardCount.value);

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
      .map((row) => {
        const cardCode =
          row.card_code;

        const cardUrl = `https://reviewcard.uk/?card=${encodeURIComponent(cardCode)}`;

        return (
          `${cardCode}\n` +
          `${cardUrl}`
        );
      })
      .join("\n\n");

  alert(
    `Customer created successfully! ✅\n\n` +
    `Business: ${businessName}\n` +
    `Business code: ${businessCode}\n\n` +
    `NFC card(s):\n${cardDetails}`
  );

  clearWizard();

  await Promise.all([
    loadBusinesses(),
    loadNfcCards(),
    loadAnalytics()
  ]);

  if (
    typeof window.openAdminSection ===
    "function"
  ) {
    window.openAdminSection(
      "businesses-page"
    );
  }
}

/* =========================
   DASHBOARD
========================= */

async function showDashboard() {
  loginSection.style.display =
    "none";

  dashboard.style.display =
    "block";

  await Promise.all([
    loadBusinesses(),
    loadNfcCards(),
    loadFeedback(),
    loadAnalytics()
  ]);
}

/* =========================
   LOGIN CHECK
========================= */

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

/* =========================
   CONTROLS
========================= */

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

const nfcNavigationButton =
  document.querySelector(
    '[data-section="nfc-page"]'
  );

if (nfcNavigationButton) {
  nfcNavigationButton.addEventListener(
    "click",
    loadNfcCards
  );
}

const feedbackNavigationButton =
  document.querySelector(
    '[data-section="feedback-page"]'
  );

if (feedbackNavigationButton) {
  feedbackNavigationButton.addEventListener(
    "click",
    loadFeedback
  );
}

const analyticsNavigationButton =
  document.querySelector(
    '[data-section="analytics-page"]'
  );

if (analyticsNavigationButton) {
  analyticsNavigationButton.addEventListener(
    "click",
    loadAnalytics
  );
}

if (wizardCreateButton) {
  wizardCreateButton.addEventListener(
    "click",
    createCustomer
  );
}

/* =========================
   LOGIN
========================= */

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

/* =========================
   LOGOUT
========================= */

logoutButton.addEventListener(
  "click",
  async () => {
    await supabaseClient.auth.signOut();

    showLogin();
  }
);

/* =========================
   AUTH
========================= */

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
