const cfg = window.APP_CONFIG || {};
const SUPABASE_URL = cfg.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = cfg.SUPABASE_PUBLISHABLE_KEY;
let cardCode = "";
let business = null;
let selectedRating = 0;

function show(id) {
  document.querySelectorAll("main > section").forEach(section => section.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

async function rpc(name, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await response.text());
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : null;
}

async function start() {
  cardCode = (new URLSearchParams(location.search).get("card") || "").trim().toUpperCase();
  if (!cardCode || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return show("badLink");
  try {
    const rows = await rpc("get_nfc_card", { p_card_code: cardCode });
    if (!Array.isArray(rows) || rows.length === 0) return show("badLink");
    business = rows[0];
    document.getElementById("businessName").textContent = business.business_name;
    document.title = `${business.business_name} – Feedback`;
    show("rating");
  } catch (error) {
    console.error(error);
    show("badLink");
  }
}

async function chooseRating(stars) {
  selectedRating = stars;
  if (stars >= 4) {
    try { await rpc("record_google_redirect", { p_card_code: cardCode }); } catch (error) { console.error(error); }
    location.href = business.google_review_url;
    return;
  }
  document.getElementById("ratingPill").textContent = "★".repeat(stars) + "☆".repeat(5 - stars) + `  ${stars}/5`;
  show("feedback");
  setTimeout(() => document.getElementById("comment").focus(), 120);
}

async function submitFeedback() {
  const comment = document.getElementById("comment").value.trim();
  const button = document.getElementById("sendBtn");
  const errorBox = document.getElementById("feedbackError");
  if (!comment) {
    errorBox.textContent = "Please write a short comment before sending.";
    errorBox.classList.remove("hidden");
    return;
  }
  errorBox.classList.add("hidden");
  button.disabled = true;
  button.textContent = "Sending…";
  try {
    await rpc("submit_private_feedback", { p_card_code: cardCode, p_rating: selectedRating, p_comment: comment });
    show("thanks");
  } catch (error) {
    console.error(error);
    errorBox.textContent = "Something went wrong. Please try again.";
    errorBox.classList.remove("hidden");
    button.disabled = false;
    button.textContent = "Send private feedback";
  }
}

document.querySelectorAll(".stars button").forEach(button => button.addEventListener("click", () => chooseRating(Number(button.dataset.rating))));
document.getElementById("sendBtn").addEventListener("click", submitFeedback);
start();