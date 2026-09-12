let cardCode = "";
let business = null;
let selectedRating = 0;

function show(id) {
  document.querySelectorAll("main > section").forEach(section => section.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

async function api(action, payload) {
  const response = await fetch("/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });

  if (!response.ok) throw new Error(await response.text());
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : null;
}

async function start() {
  cardCode = (new URLSearchParams(window.location.search).get("card") || "").trim().toUpperCase();
  if (!cardCode) return show("badLink");

  try {
    const rows = await api("get_card", { cardCode });
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
    try {
      await api("google_redirect", { cardCode });
    } catch (error) {
      console.error(error);
    }
    window.location.href = business.google_review_url;
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
    await api("private_feedback", { cardCode, rating: selectedRating, comment });
    show("thanks");
  } catch (error) {
    console.error(error);
    errorBox.textContent = "Something went wrong. Please try again.";
    errorBox.classList.remove("hidden");
    button.disabled = false;
    button.textContent = "Send private feedback";
  }
}

document.querySelectorAll(".stars button").forEach(button => {
  button.addEventListener("click", () => chooseRating(Number(button.dataset.rating)));
});

document.getElementById("sendBtn").addEventListener("click", submitFeedback);
start();