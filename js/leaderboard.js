document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.getElementById("menu-btn");
  const navLinks = document.getElementById("nav-links");

  if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.classList.toggle("active");
      navLinks.classList.toggle("open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        menuButton.classList.remove("active");
        navLinks.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      });
    });
  }

  const supabaseUrl = "https://ydeczzyvfgwwmfornfef.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZWN6enl2Zmd3d21mb3JuZmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Njc1ODksImV4cCI6MjA4MzU0MzU4OX0.IBNkcqDJtQSurdKaic94iRrc4NYnO8m1e1bQzbkkstc";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  const leaderboardList = document.getElementById("leaderboard-list");
  let isRefreshing = false;
  let hasLoaded = false;

  async function renderLeaderboard() {
    if (isRefreshing) return;
    isRefreshing = true;
    if (!hasLoaded) leaderboardList.setAttribute("aria-busy", "true");

    try {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("username, balance")
        .order("balance", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!users || users.length === 0) {
        leaderboardList.replaceChildren();
        const empty = document.createElement("li");
        empty.className = "state-row";
        empty.textContent = "No contributors yet. Be the first to earn DUZ.";
        leaderboardList.appendChild(empty);
        return;
      }

      const fragment = document.createDocumentFragment();
      users.forEach((user, index) => {
        const row = document.createElement("li");
        const memberCell = document.createElement("div");
        memberCell.className = "member-cell";

        const rank = document.createElement("span");
        rank.className = "rank-number" + (index < 3 ? " rank-" + ["one", "two", "three"][index] : "");
        rank.textContent = String(index + 1);

        const avatar = document.createElement("span");
        avatar.className = "member-avatar";
        const username = String(user.username || "DAUUZ member");
        avatar.textContent = username.trim().charAt(0).toUpperCase() || "D";
        avatar.setAttribute("aria-hidden", "true");

        const identity = document.createElement("div");
        const name = document.createElement("div");
        name.className = "member-name";
        name.textContent = username;
        const caption = document.createElement("div");
        caption.className = "member-caption";
        caption.textContent = index === 0 ? "Leading contributor" : "Community contributor";
        identity.append(name, caption);
        memberCell.append(rank, avatar, identity);

        const balance = document.createElement("div");
        balance.className = "member-balance";
        const amount = Number(user.balance || 0);
        balance.append(document.createTextNode((Number.isFinite(amount) ? amount : 0).toFixed(6)));
        const unit = document.createElement("small");
        unit.textContent = "DUZ";
        balance.appendChild(unit);

        row.append(memberCell, balance);
        fragment.appendChild(row);
      });

      leaderboardList.replaceChildren(fragment);
      hasLoaded = true;
    } catch (error) {
      if (!hasLoaded) {
        leaderboardList.replaceChildren();
        const errorRow = document.createElement("li");
        errorRow.className = "state-row";
        errorRow.textContent = "We couldn't load the rankings. Please refresh the page to try again.";
        leaderboardList.appendChild(errorRow);
      }
      console.error("Leaderboard refresh failed:", error);
    } finally {
      isRefreshing = false;
      leaderboardList.setAttribute("aria-busy", "false");
    }
  }

  renderLeaderboard();
  window.setInterval(renderLeaderboard, 20000);
});
