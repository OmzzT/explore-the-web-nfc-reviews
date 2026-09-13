const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL;
const supabaseKey = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY;

const businessesContainer = document.getElementById("businesses");

async function loadBusinesses() {
  businessesContainer.innerHTML = "<p>Loading businesses...</p>";

  // We will connect this securely to Supabase next.
}

loadBusinesses();
